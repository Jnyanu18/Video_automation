"""Speech transcription with word-level timestamps using faster-whisper."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple
from ..schemas.analysis import WordTiming

log = logging.getLogger("reelforge.analysis.transcribe")

def transcribe_audio(video_path: Path | str, model_size: str = "base") -> Tuple[List[WordTiming], str, float]:
    """Transcribe video audio and return (word_timings, full_text, speech_wpm)."""
    v = Path(video_path)
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        log.warning("faster-whisper is not installed. Skipping transcription.")
        return [], "", 0.0

    try:
        # device="auto", compute_type="int8" is fast and works universally on CPU and GPU
        model = WhisperModel(model_size, device="auto", compute_type="int8")
        segments, info = model.transcribe(str(v), word_timestamps=True, vad_filter=True)

        word_timings: List[WordTiming] = []
        full_text_parts: List[str] = []

        for seg in segments:
            full_text_parts.append(seg.text.strip())
            if seg.words:
                for w in seg.words:
                    word_timings.append(WordTiming(
                        word=w.word.strip(),
                        start=round(w.start, 2),
                        end=round(w.end, 2),
                        probability=round(w.probability, 2)
                    ))

        full_text = " ".join(full_text_parts).strip()
        dur = info.duration or 1.0
        wpm = round((len(word_timings) / dur) * 60.0, 1) if dur > 0 else 160.0

        return word_timings, full_text, wpm
    except Exception as e:
        log.error("Transcription failed for %s: %s", v.name, e)
        return [], "", 0.0
