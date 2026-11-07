"""transcribe: pluggable word-level speech-to-text.

Backends (select with backend=, env CE_TRANSCRIBE_BACKEND, default "auto"):
  - "fixture"        : read words from a JSON file (transcript_fixture= or env CE_TRANSCRIPT_FIXTURE). For tests/offline.
  - "faster-whisper" : local faster-whisper model (needs model download on first use).
  - "auto"           : fixture if one is given, else faster-whisper.
  - any name added with register_backend(name, fn); fn(video_path, **opts) -> {"words": [...], "language": str|None}
Word format everywhere: {"word": str, "start": float, "end": float}  (seconds, source time).
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Callable

from ._common import new_plan, out, resolve_video, workdir_path, write_json

_BACKENDS: dict[str, Callable[..., dict]] = {}


def register_backend(name: str, fn: Callable[..., dict]) -> None:
    _BACKENDS[name] = fn


def normalize_words(raw) -> list[dict]:
    """Accept list of words, {"words": [...]}, or whisper-like {"segments":[{"words":[...]}]}."""
    if isinstance(raw, dict):
        if "words" in raw:
            raw = raw["words"]
        elif "segments" in raw:
            raw = [w for seg in raw["segments"] for w in seg.get("words", [])]
        else:
            raise ValueError("fixture JSON needs 'words' or 'segments'")
    words = []
    for w in raw:
        text = str(w.get("word", w.get("text", ""))).strip()
        if not text:
            continue
        s, e = float(w["start"]), float(w["end"])
        if e < s:
            raise ValueError(f"word {text!r} has end < start")
        words.append({"word": text, "start": round(s, 3), "end": round(e, 3)})
    words.sort(key=lambda w: w["start"])
    return words


def _fixture(video: Path, transcript_fixture: str | None = None, **_) -> dict:
    p = transcript_fixture or os.environ.get("CE_TRANSCRIPT_FIXTURE")
    if not p:
        raise ValueError("fixture backend needs transcript_fixture= or CE_TRANSCRIPT_FIXTURE")
    raw = json.loads(Path(p).read_text())
    lang = raw.get("language") if isinstance(raw, dict) else None
    return {"words": normalize_words(raw), "language": lang}


def _faster_whisper(video: Path, model_size: str = "base", language: str | None = None, **_) -> dict:
    from faster_whisper import WhisperModel  # lazy: heavy import

    model = WhisperModel(model_size, compute_type="int8")
    # decode with ffmpeg ourselves: faster-whisper's PyAV decoder breaks on some PyAV versions (open() metadata_errors)
    import subprocess

    import numpy as np
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    audio = np.frombuffer(raw, dtype=np.float32)
    segments, info = model.transcribe(audio, word_timestamps=True, language=language)
    words = [{"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)}
             for seg in segments for w in (seg.words or []) if w.word.strip()]
    return {"words": words, "language": getattr(info, "language", None)}


register_backend("fixture", _fixture)
register_backend("faster-whisper", _faster_whisper)

_END = (".", "?", "!", "。", "？", "！")


def group_segments(words: list[dict], max_gap: float = 0.7, max_words: int = 14) -> list[dict]:
    """Group words into caption-sized segments on sentence end, long pauses, or word count."""
    segs, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        nxt = words[i + 1] if i + 1 < len(words) else None
        if nxt is None or w["word"].endswith(_END) or nxt["start"] - w["end"] > max_gap or len(cur) >= max_words:
            segs.append({"text": " ".join(x["word"] for x in cur), "start": cur[0]["start"],
                         "end": cur[-1]["end"], "words": cur})
            cur = []
    return segs


def transcribe(plan: dict, video: str | None = None, backend: str | None = None, workdir: str | None = None,
               **opts) -> dict:
    path = resolve_video(plan, video)
    backend = backend or os.environ.get("CE_TRANSCRIBE_BACKEND", "auto")
    if backend == "auto":
        backend = "fixture" if (opts.get("transcript_fixture") or os.environ.get("CE_TRANSCRIPT_FIXTURE")) \
            else "faster-whisper"
    if backend not in _BACKENDS:
        raise ValueError(f"unknown transcribe backend {backend!r}; have {sorted(_BACKENDS)}")
    warnings = []
    try:
        res = _BACKENDS[backend](path, **opts)
        status = "ok"
    except (ValueError, FileNotFoundError, json.JSONDecodeError):
        raise  # caller/config error: surface it
    except Exception as exc:  # model download blocked, missing dep, decode error...
        res = {"words": [], "language": None}
        status = "unavailable"
        warnings.append(f"transcription backend {backend!r} failed: {type(exc).__name__}: {exc}. "
                        "Words are EMPTY, which does not mean the video has no speech.")
    words = res["words"]
    result = {"video": str(path), "backend": backend, "status": status, "language": res.get("language"),
              "words": words, "segments": group_segments(words), "text": " ".join(w["word"] for w in words)}
    result["file"] = write_json(workdir_path(workdir, "transcript.json"), result)
    return out(new_plan(plan), result, warnings)
