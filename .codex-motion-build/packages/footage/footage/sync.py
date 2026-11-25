"""Multi-camera audio synchronization via audio envelope cross-correlation."""

from __future__ import annotations

import logging
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import numpy as np

from footage.schema import MediaFile, SyncGroup

logger = logging.getLogger("footage.sync")


def decode_mono_audio(
    media_path: Path | str,
    sample_rate: int = 8000,
    max_duration: Optional[float] = None,
) -> np.ndarray:
    """Decode audio file to mono float32 samples at given sample rate.
    
    Timebase:
    - samples cover source audio (t_src)
    """
    p = Path(media_path).resolve()
    if not p.is_file():
        return np.array([], dtype=np.float32)

    cmd = [
        "ffmpeg",
        "-v", "error",
        "-i", str(p),
        "-vn",
        "-ac", "1",
        "-ar", str(sample_rate),
    ]
    if max_duration:
        cmd.extend(["-t", f"{max_duration:.2f}"])
    cmd.extend(["-f", "f32le", "-"])

    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=60.0,
        )
    except Exception as e:
        logger.warning("Failed to decode audio for sync %s: %s", p, e)
        return np.array([], dtype=np.float32)

    if proc.returncode != 0 or not proc.stdout:
        return np.array([], dtype=np.float32)

    return np.frombuffer(proc.stdout, dtype=np.float32)


def compute_rms_envelope(
    samples: np.ndarray,
    sample_rate: int = 8000,
    window_sec: float = 0.05,
    hop_sec: float = 0.025,
) -> Tuple[np.ndarray, float]:
    """Calculate RMS envelope of audio signal.
    
    Returns:
        (envelope_array, hop_sec)
    """
    if len(samples) == 0:
        return np.array([], dtype=np.float32), hop_sec

    win_len = int(window_sec * sample_rate)
    hop_len = int(hop_sec * sample_rate)

    if len(samples) < win_len:
        return np.array([float(np.sqrt(np.mean(samples ** 2)))], dtype=np.float32), hop_sec

    # Framing using stride tricks or simple loop
    num_frames = 1 + (len(samples) - win_len) // hop_len
    shape = (num_frames, win_len)
    strides = (samples.strides[0] * hop_len, samples.strides[0])
    frames = np.lib.stride_tricks.as_strided(samples, shape=shape, strides=strides)

    envelope = np.sqrt(np.mean(frames ** 2, axis=1) + 1e-12)
    # Normalize envelope
    env_std = np.std(envelope)
    if env_std > 1e-6:
        envelope = (envelope - np.mean(envelope)) / env_std
    else:
        envelope = envelope - np.mean(envelope)

    return envelope.astype(np.float32), hop_sec


def cross_correlate_envelopes(
    env_ref: np.ndarray,
    env_target: np.ndarray,
    hop_sec: float,
    max_lag_sec: float = 300.0,
) -> Tuple[float, float]:
    """Find relative offset between two audio envelopes using FFT cross-correlation.
    
    Offset definition:
    offset = t_ref - t_target (seconds).
    
    Returns:
        (offset_seconds, confidence in [0.0, 1.0])
    """
    if len(env_ref) == 0 or len(env_target) == 0:
        return 0.0, 0.0

    n1, n2 = len(env_ref), len(env_target)
    n_fft = 1 << ((n1 + n2 - 1).bit_length())  # Next power of 2

    # FFT cross-correlation: corr = IFFT(FFT(ref) * conj(FFT(target)))
    f_ref = np.fft.rfft(env_ref, n=n_fft)
    f_target = np.fft.rfft(env_target, n=n_fft)
    corr = np.fft.irfft(f_ref * np.conj(f_target), n=n_fft)

    # Shift zero-lag to center: lags range from -(n2 - 1) to (n1 - 1)
    corr = np.concatenate((corr[-(n2 - 1):], corr[:n1]))
    lags = np.arange(-(n2 - 1), n1)

    # Restrict search within max_lag_sec if specified
    max_lag_frames = int(max_lag_sec / hop_sec)
    valid_mask = np.abs(lags) <= max_lag_frames
    if not np.any(valid_mask):
        return 0.0, 0.0

    corr_valid = corr[valid_mask]
    lags_valid = lags[valid_mask]

    peak_idx = int(np.argmax(corr_valid))
    peak_val = float(corr_valid[peak_idx])
    best_lag = int(lags_valid[peak_idx])

    # Calculate confidence based on peak prominence over noise floor
    mean_val = float(np.mean(corr_valid))
    std_val = float(np.std(corr_valid)) + 1e-9
    z_score = (peak_val - mean_val) / std_val

    # Normalize confidence to [0.0, 1.0]
    # Z-scores > 6 indicate very sharp unambiguous correlation peak
    confidence = float(np.clip((z_score - 2.0) / 6.0, 0.0, 1.0))
    offset_sec = float(-best_lag * hop_sec)

    return round(offset_sec, 3), round(confidence, 3)


def estimate_mtime_offset(media_ref: MediaFile, media_target: MediaFile) -> float:
    """Calculate time difference between start_wallclock timestamps or mtimes.
    
    Timebase:
    - Returns offset in wall-clock seconds (t_wall).
    """
    try:
        if media_ref.start_wallclock and media_target.start_wallclock:
            t1 = datetime.fromisoformat(media_ref.start_wallclock).timestamp()
            t2 = datetime.fromisoformat(media_target.start_wallclock).timestamp()
            return round(t2 - t1, 3)
    except Exception:
        pass

    try:
        p1 = Path(media_ref.path)
        p2 = Path(media_target.path)
        if p1.is_file() and p2.is_file():
            return round(p2.stat().st_mtime - p1.stat().st_mtime, 3)
    except Exception:
        pass

    return 0.0


def build_sync_groups(
    media_list: List[MediaFile],
    min_confidence: float = 0.35,
) -> List[SyncGroup]:
    """Synchronize multiple media files into camera groups.
    
    Returns:
        List of SyncGroup objects.
    """
    valid_media = [m for m in media_list if not m.error]
    if not valid_media:
        return []

    # If single file or all single camera
    if len(valid_media) == 1:
        return [
            SyncGroup(
                group_id="g1",
                media_ids=[valid_media[0].media_id],
                offsets={valid_media[0].media_id: 0.0},
                method="mtime",
                confidence=1.0,
            )
        ]

    # Pre-extract audio envelopes for media files that have audio
    envelopes: Dict[str, Tuple[np.ndarray, float]] = {}
    for m in valid_media:
        if m.has_audio:
            samples = decode_mono_audio(m.path, sample_rate=8000, max_duration=3600.0)
            if len(samples) > 0:
                envelopes[m.media_id] = compute_rms_envelope(samples, sample_rate=8000)

    # Choose first media file as anchor
    ref = valid_media[0]
    offsets: Dict[str, float] = {ref.media_id: 0.0}
    group_media_ids = [ref.media_id]
    overall_confidences: List[float] = [1.0]
    methods: List[str] = []

    ref_env = envelopes.get(ref.media_id)

    for target in valid_media[1:]:
        group_media_ids.append(target.media_id)
        target_env = envelopes.get(target.media_id)

        synced = False
        if ref_env and target_env:
            offset_sec, conf = cross_correlate_envelopes(
                ref_env[0], target_env[0], hop_sec=ref_env[1]
            )
            if conf >= min_confidence:
                offsets[target.media_id] = offset_sec
                overall_confidences.append(conf)
                methods.append("audio_xcorr")
                synced = True

        if not synced:
            mtime_off = estimate_mtime_offset(ref, target)
            offsets[target.media_id] = mtime_off
            overall_confidences.append(0.5)
            methods.append("mtime")

    method = "audio_xcorr" if any(m == "audio_xcorr" for m in methods) else "mtime"
    avg_conf = float(np.mean(overall_confidences))

    return [
        SyncGroup(
            group_id="g1",
            media_ids=group_media_ids,
            offsets=offsets,
            method=method,
            confidence=round(avg_conf, 2),
        )
    ]
