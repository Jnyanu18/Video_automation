"""Faster-Whisper speech transcription and speaker turn extraction."""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path
from typing import Any, List, Optional
import numpy as np

from footage.schema import Shot, SpeechSegment, WordTimestamp

logger = logging.getLogger("footage.speech")

# PyAV 19 compatibility
try:
    import av
    _orig_av_open = av.open
    def _safe_av_open(*args, **kwargs):
        kwargs.pop("metadata_errors", None)
        return _orig_av_open(*args, **kwargs)
    av.open = _safe_av_open
except Exception:
    pass

_WHISPER_MODEL: Any = None


def get_whisper_model(model_size: str = "base") -> Any:
    """Lazy-load Faster-Whisper model on CPU."""
    global _WHISPER_MODEL
    if _WHISPER_MODEL is None:
        try:
            from faster_whisper import WhisperModel
            _WHISPER_MODEL = WhisperModel(model_size, device="cpu", compute_type="int8")
        except Exception as e:
            logger.warning("Failed to initialize faster-whisper: %s", e)
            _WHISPER_MODEL = None
    return _WHISPER_MODEL


def _load_audio_16k(file_path: Path | str) -> Optional[np.ndarray]:
    """Load audio as 16kHz mono float32 numpy array using ffmpeg."""
    cmd = [
        "ffmpeg",
        "-v", "error",
        "-i", str(Path(file_path).resolve()),
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-f", "f32le",
        "-",
    ]
    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30.0)
        if proc.returncode == 0 and proc.stdout:
            return np.frombuffer(proc.stdout, dtype=np.float32)
    except Exception as e:
        logger.warning("Failed to load 16k audio for %s: %s", file_path, e)
    return None


def transcribe_speech_shots(
    media_path: Path | str,
    media_id: str,
    shots: List[Shot],
    model_size: str = "base",
) -> List[SpeechSegment]:
    """Transcribe speech in qualified shots (audio_class == 'speech' and duration >= 2s).
    
    Timebases:
    - shot.start, shot.end: source seconds (t_src)
    - SpeechSegment start, end: source seconds (t_src)
    - WordTimestamp start, end: source seconds (t_src)
    
    Returns:
        List of SpeechSegment records.
    """
    eligible_shots = [
        s for s in shots
        if s.audio_class == "speech" and (s.end - s.start) >= 2.0
    ]

    if not eligible_shots:
        return []

    p = Path(media_path).resolve()
    if not p.is_file():
        return []

    model = get_whisper_model(model_size)
    if model is None:
        return []

    # Decode audio to 16kHz PCM once in memory for the whole file
    audio_16k = _load_audio_16k(p)
    if audio_16k is None or len(audio_16k) == 0:
        return []

    speech_segments: List[SpeechSegment] = []
    current_speaker_idx = 1
    last_speech_end = 0.0

    for shot in eligible_shots:
        try:
            s_idx = max(0, int(shot.start * 16000))
            e_idx = min(len(audio_16k), int(shot.end * 16000))
            if e_idx <= s_idx:
                continue

            shot_audio = audio_16k[s_idx:e_idx]

            segments, _info = model.transcribe(
                shot_audio,
                word_timestamps=True,
                temperature=0.0,
            )

            for seg in segments:
                text = (seg.text or "").strip()
                if not text:
                    continue

                # Translate segment times back to source file timebase (t_src)
                seg_start = shot.start + float(seg.start)
                seg_end = shot.start + float(seg.end)

                # Check pause structure for speaker turns
                if seg_start - last_speech_end > 2.5 and last_speech_end > 0.0:
                    current_speaker_idx = 2 if current_speaker_idx == 1 else 1

                last_speech_end = seg_end
                speaker_id = f"S{current_speaker_idx}"

                words: List[WordTimestamp] = []
                for w in (getattr(seg, "words", None) or []):
                    w_text = getattr(w, "word", "").strip()
                    if w_text:
                        words.append(
                            WordTimestamp(
                                word=w_text,
                                start=round(shot.start + float(getattr(w, "start", seg.start)), 3),
                                end=round(shot.start + float(getattr(w, "end", seg.end)), 3),
                            )
                        )

                speech_segments.append(
                    SpeechSegment(
                        media_id=media_id,
                        start=round(seg_start, 3),
                        end=round(seg_end, 3),
                        speaker=speaker_id,
                        text=text,
                        words=words,
                    )
                )

        except Exception as e:
            logger.warning("Transcription error for shot %s: %s", shot.shot_id, e)

    return speech_segments
