"""L0 local metrics: motion, focus, exposure, audio RMS, audio class, faces."""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Tuple
import cv2
import numpy as np

from footage.faces import detect_faces_in_frames

logger = logging.getLogger("footage.metrics")


def sample_frames_for_shot(
    video_path: Path | str,
    start: float,
    end: float,
    sample_fps: float = 2.0,
    max_samples: int = 3,
    cap: Optional[cv2.VideoCapture] = None,
) -> Tuple[List[np.ndarray], List[np.ndarray]]:
    """Sample frames within a shot interval.
    
    Timebase:
    - start, end: proxy seconds (t_proxy)
    
    Returns:
        (bgr_frames, gray_frames)
    """
    should_release = False
    if cap is None:
        p = Path(video_path).resolve()
        if not p.is_file():
            return [], []
        cap = cv2.VideoCapture(str(p))
        should_release = True

    if not cap.isOpened():
        return [], []

    dur = max(0.01, end - start)
    count = 2 if dur < 3.0 else min(max_samples, max(2, int(dur * sample_fps)))
    sample_times = np.linspace(start + 0.1 * dur, end - 0.1 * dur, count)

    bgr_frames: List[np.ndarray] = []
    gray_frames: List[np.ndarray] = []

    for t in sample_times:
        cap.set(cv2.CAP_PROP_POS_MSEC, float(t * 1000.0))
        ret, frame = cap.read()
        if ret and frame is not None and frame.size > 0:
            bgr_frames.append(frame)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray_frames.append(gray)

    if should_release:
        cap.release()
    return bgr_frames, gray_frames


def compute_motion(gray_frames: List[np.ndarray]) -> float:
    """Mean absolute frame difference on sampled frames.
    
    Returns:
        motion score normalized in [0.0, 1.0].
        Dead static tripod: ~0.00-0.02
        Gentle handheld / natural movement: ~0.05-0.30
        Rapid whip pan / chaotic motion: >0.45
    """
    if len(gray_frames) < 2:
        return 0.05  # Neutral default for single frame

    diffs = []
    for i in range(len(gray_frames) - 1):
        f1 = gray_frames[i]
        f2 = gray_frames[i + 1]
        if f1.shape != f2.shape:
            f2 = cv2.resize(f2, (f1.shape[1], f1.shape[0]))
        diff = cv2.absdiff(f1, f2)
        diffs.append(np.mean(diff) / 255.0)

    # Scale so typical moderate motion lands nicely in 0.1-0.5
    raw_diff = float(np.mean(diffs))
    score = min(1.0, raw_diff * 4.0)
    return round(score, 4)


def compute_focus(gray_frames: List[np.ndarray]) -> float:
    """Variance of Laplacian across sampled frames.
    
    Returns:
        Normalized focus score in [0.0, 1.0].
        Out of focus / blurry: < 0.20
        Acceptable sharpness: 0.30 - 0.60
        Razor sharp: > 0.70
    """
    if not gray_frames:
        return 0.0

    scores = []
    for g in gray_frames:
        # Resize to standardized width for resolution-invariant laplacian variance
        target_w = 480
        if g.shape[1] > 0 and g.shape[1] != target_w:
            h = int(g.shape[0] * (target_w / g.shape[1]))
            std_g = cv2.resize(g, (target_w, max(1, h)))
        else:
            std_g = g
        var_lap = float(cv2.Laplacian(std_g, cv2.CV_32F).var())
        # Map variance (0 to ~200+) to [0.0, 1.0] using smooth curve
        norm = var_lap / (var_lap + 50.0) if var_lap > 0 else 0.0
        scores.append(norm)

    return round(float(np.mean(scores)), 4)


def compute_exposure(gray_frames: List[np.ndarray]) -> float:
    """Mean luma penalized by clipped pixel fraction.
    
    Returns:
        Exposure score in [0.0, 1.0].
        Under-exposed / near black: < 0.15
        Balanced exposure: 0.35 - 0.65
        Over-exposed / blown-out: > 0.85
    """
    if not gray_frames:
        return 0.5

    lumas = []
    for g in gray_frames:
        mean_luma = float(np.mean(g)) / 255.0
        # Check fraction of under-exposed and blown pixels
        clipped_low = float(np.mean(g < 10))
        clipped_high = float(np.mean(g > 245))
        
        # Penalize if heavily clipped
        if clipped_low > 0.70:
            mean_luma = min(mean_luma, 0.10)
        elif clipped_high > 0.60:
            mean_luma = max(mean_luma, 0.90)

        lumas.append(mean_luma)

    return round(float(np.mean(lumas)), 4)


def load_audio_track(media_path: Path | str, sample_rate: int = 8000) -> Optional[np.ndarray]:
    """Load entire audio track of a media or proxy file into a float32 mono array."""
    p = Path(media_path).resolve()
    if not p.is_file():
        return None

    cmd = [
        "ffmpeg",
        "-v", "error",
        "-i", str(p),
        "-vn",
        "-ac", "1",
        "-ar", str(sample_rate),
        "-f", "f32le",
        "-",
    ]
    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20.0)
        if proc.returncode == 0 and proc.stdout:
            return np.frombuffer(proc.stdout, dtype=np.float32)
    except Exception as e:
        logger.warning("Failed to load audio track for %s: %s", p, e)
    return None


def classify_audio_samples(samples: np.ndarray) -> Tuple[float, str]:
    """Calculate RMS energy and classify audio content from PCM float32 samples.
    
    Classes:
    - 'silence', 'speech', 'music', 'applause', 'noise'
    """
    if samples is None or len(samples) == 0:
        return 0.0, "silence"

    rms = float(np.sqrt(np.mean(samples ** 2)))
    if rms < 0.008:
        return round(rms, 4), "silence"

    frame_size = 512
    num_frames = len(samples) // frame_size
    if num_frames == 0:
        return round(rms, 4), "noise"

    frames = samples[:num_frames * frame_size].reshape(num_frames, frame_size)
    frame_rms = np.sqrt(np.mean(frames ** 2, axis=1) + 1e-12)
    rms_std = float(np.std(frame_rms))
    rms_mean = float(np.mean(frame_rms))
    crest_factor = rms_std / (rms_mean + 1e-6)

    windowed = frames * np.hanning(frame_size)
    fft_mag = np.abs(np.fft.rfft(windowed, axis=1)) + 1e-10
    power = fft_mag ** 2
    geom_mean = np.exp(np.mean(np.log(power), axis=1))
    arith_mean = np.mean(power, axis=1)
    flatness = float(np.mean(geom_mean / arith_mean))

    zcr = float(np.mean(np.abs(np.diff(np.signbit(samples)))))

    if crest_factor > 0.45 and 0.12 <= flatness <= 0.55:
        audio_cls = "speech"
    elif flatness < 0.18 and crest_factor < 0.55:
        audio_cls = "music"
    elif zcr > 0.25 and flatness > 0.40 and crest_factor > 0.35:
        audio_cls = "applause"
    elif flatness > 0.50:
        audio_cls = "noise"
    else:
        audio_cls = "speech" if crest_factor > 0.30 else "noise"

    return round(rms, 4), audio_cls


def compute_audio_metrics(
    media_path: Path | str,
    start: float,
    end: float,
    has_audio: bool = True,
    audio_track: Optional[np.ndarray] = None,
    sample_rate: int = 8000,
) -> Tuple[float, str]:
    """Calculate audio RMS energy and classify audio content.
    
    Timebase:
    - start, end: source/proxy seconds (t_src / t_proxy)
    
    Classes:
    - 'silence', 'speech', 'music', 'applause', 'noise'
    
    Returns:
        (audio_rms, audio_class)
    """
    if not has_audio or (end - start) < 0.1:
        return 0.0, "silence"

    if audio_track is not None:
        idx_start = max(0, int(start * sample_rate))
        idx_end = min(len(audio_track), int(end * sample_rate))
        if idx_end > idx_start:
            return classify_audio_samples(audio_track[idx_start:idx_end])
        return 0.0, "silence"

    p = Path(media_path).resolve()
    dur = max(0.1, end - start)

    cmd = [
        "ffmpeg",
        "-v", "error",
        "-ss", f"{start:.3f}",
        "-t", f"{dur:.3f}",
        "-i", str(p),
        "-vn",
        "-ac", "1",
        "-ar", str(sample_rate),
        "-f", "f32le",
        "-",
    ]

    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=10.0,
        )
    except Exception as e:
        logger.warning("Audio decoding failed for %s: %s", p, e)
        return 0.0, "silence"

    if proc.returncode != 0 or not proc.stdout:
        return 0.0, "silence"

    samples = np.frombuffer(proc.stdout, dtype=np.float32)
    return classify_audio_samples(samples)


def compute_shot_metrics(
    proxy_path: Path | str,
    start: float,
    end: float,
    has_audio: bool = True,
    cap: Optional[cv2.VideoCapture] = None,
    audio_track: Optional[np.ndarray] = None,
    audio_sr: int = 8000,
) -> Dict[str, Any]:
    """Compute all L0 metrics for a shot.
    
    Timebase:
    - start, end: proxy/source seconds (t_proxy / t_src)
    """
    bgr_frames, gray_frames = sample_frames_for_shot(proxy_path, start, end, cap=cap)

    motion = compute_motion(gray_frames)
    focus = compute_focus(gray_frames)
    exposure = compute_exposure(gray_frames)

    # Faces detection on sampled BGR frames
    face_count, max_face_area = detect_faces_in_frames(bgr_frames)

    # Audio metrics
    audio_rms, audio_class = compute_audio_metrics(
        proxy_path,
        start,
        end,
        has_audio,
        audio_track=audio_track,
        sample_rate=audio_sr,
    )

    return {
        "motion": motion,
        "focus": focus,
        "exposure": exposure,
        "audio_rms": audio_rms,
        "audio_class": audio_class,
        "faces": face_count,
        "face_area": max_face_area,
    }

    return {
        "motion": motion,
        "focus": focus,
        "exposure": exposure,
        "audio_rms": audio_rms,
        "audio_class": audio_class,
        "faces": face_count,
        "face_area": max_face_area,
    }
