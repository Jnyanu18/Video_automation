"""Faster-Whisper speech transcription and speaker turn extraction."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, List, Optional

from footage.schema import Shot, SpeechSegment, WordTimestamp

logger = logging.getLogger("footage.speech")

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

    speech_segments: List[SpeechSegment] = []
    current_speaker_idx = 1
    last_speech_end = 0.0

    for shot in eligible_shots:
        try:
            # Transcribe segment within shot
            segments, _info = model.transcribe(
                str(p),
                word_timestamps=True,
                clip_timestamps=[(shot.start, shot.end)],
                temperature=0.0,
            )

            for seg in segments:
                text = (seg.text or "").strip()
                if not text:
                    continue

                # Check pause structure for speaker turns
                seg_start = float(seg.start)
                seg_end = float(seg.end)

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
                                start=round(float(getattr(w, "start", seg_start)), 3),
                                end=round(float(getattr(w, "end", seg_end)), 3),
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
