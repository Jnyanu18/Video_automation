"""Small ffmpeg/OpenCV helpers shared by styles/ and evals/ (both owned by agent H)."""
from __future__ import annotations

import json
import re
import subprocess
from typing import List, Tuple

import numpy as np


def probe(path: str) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path],
        capture_output=True, text=True, check=True,
    ).stdout
    info = json.loads(out)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    dur = float(info["format"].get("duration") or (v or {}).get("duration") or 0)
    fps = 0.0
    if v and v.get("r_frame_rate") and "/" in v["r_frame_rate"]:
        n, d = v["r_frame_rate"].split("/")
        fps = float(n) / float(d) if float(d) else 0.0
    return {
        "duration": dur,
        "width": int(v["width"]) if v else 0,
        "height": int(v["height"]) if v else 0,
        "fps": round(fps, 3),
        "has_audio": a is not None,
        "has_video": v is not None,
    }


def decode_audio(path: str, sr: int = 16000) -> np.ndarray:
    """Mono float32 samples in [-1, 1]; empty array if no audio stream."""
    p = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", str(sr), "-f", "s16le", "-"],
        capture_output=True,
    )
    if p.returncode != 0 or not p.stdout:
        return np.zeros(0, dtype=np.float32)
    return np.frombuffer(p.stdout, dtype=np.int16).astype(np.float32) / 32768.0


def rms_db(x: np.ndarray, floor: float = -100.0) -> float:
    if x.size == 0:
        return floor
    r = float(np.sqrt(np.mean(np.square(x, dtype=np.float64))))
    return max(floor, 20 * np.log10(r)) if r > 0 else floor


def window_db(samples: np.ndarray, sr: int, win: float = 0.05) -> np.ndarray:
    n = max(1, int(sr * win))
    k = len(samples) // n
    if k == 0:
        return np.zeros(0)
    w = samples[: k * n].reshape(k, n).astype(np.float64)
    r = np.sqrt(np.mean(w * w, axis=1))
    return 20 * np.log10(np.maximum(r, 1e-5))


def find_silences(samples: np.ndarray, sr: int, thresh_db: float = -35.0,
                  min_dur: float = 0.25, win: float = 0.05) -> List[Tuple[float, float]]:
    """Silent spans [(start, end)] where windowed RMS stays below thresh_db for >= min_dur."""
    db = window_db(samples, sr, win)
    out, start = [], None
    for i, v in enumerate(db):
        if v < thresh_db:
            if start is None:
                start = i
        elif start is not None:
            if (i - start) * win >= min_dur:
                out.append((start * win, i * win))
            start = None
    if start is not None and (len(db) - start) * win >= min_dur:
        out.append((start * win, len(db) * win))
    return out


def integrated_lufs(path: str) -> Tuple[float | None, float | None]:
    """(integrated LUFS, loudness range) via ffmpeg ebur128, or (None, None)."""
    p = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-vn", "-af", "ebur128", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    txt = p.stderr
    i = txt.rfind("Summary:")
    if i < 0:
        return None, None
    tail = txt[i:]
    mi = re.search(r"I:\s+(-?[\d.]+)\s+LUFS", tail)
    ml = re.search(r"LRA:\s+(-?[\d.]+)\s+LU", tail)
    return (float(mi.group(1)) if mi else None, float(ml.group(1)) if ml else None)


def load_transcript_words(obj) -> list:
    """Normalise a transcript to [{'word','start','end'}]. Accepts a list of words, {'words': [...]},
    or {'segments': [{'words': [...]}]} (whisper-like). Times in seconds."""
    if isinstance(obj, str):
        with open(obj) as f:
            obj = json.load(f)
    if isinstance(obj, dict):
        if "words" in obj:
            obj = obj["words"]
        elif "segments" in obj:
            obj = [w for s in obj["segments"] for w in s.get("words", [])]
        else:
            obj = []
    words = []
    for w in obj or []:
        txt = w.get("word", w.get("text", ""))
        words.append({"word": str(txt).strip(), "start": float(w["start"]), "end": float(w["end"])})
    return words
