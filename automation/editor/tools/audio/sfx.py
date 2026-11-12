"""The studio's CC0 sound-effect library: where it lives, what is in it, and how each effect is categorised."""
from __future__ import annotations

import os
import subprocess
from functools import lru_cache
from pathlib import Path

_HERE = Path(__file__).resolve()

CATEGORY_KEYWORDS = (
    ("impact", ("hit", "punch", "drop", "bass", "thud", "impact", "stamp", "knock", "boing")),
    ("transition", ("whoosh", "swoosh", "swish", "swipe", "whip", "riser", "sweep", "glitch", "tape")),
    ("ui", ("click", "pop", "ding", "chime", "beep", "coin", "cash", "tick", "keypress", "typing", "lock", "error", "alarm")),
)


def sfx_dir() -> Path:
    """EDITOR_SFX_DIR, else the nearest assets/sfx above this file (works from the junction and the real folder)."""
    env = os.environ.get("EDITOR_SFX_DIR")
    if env and Path(env).is_dir():
        return Path(env)
    for parent in _HERE.parents:
        cand = parent / "assets" / "sfx"
        if cand.is_dir():
            return cand
    raise FileNotFoundError("sound-effect folder not found; set EDITOR_SFX_DIR to the folder that holds the .wav files")


def category_of(name: str) -> str:
    n = name.lower()
    for cat, keys in CATEGORY_KEYWORDS:
        if any(k in n for k in keys):
            return cat
    return "fx"


@lru_cache(maxsize=256)
def _duration(path: str, mtime: float) -> float | None:
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path],
                           capture_output=True, text=True, timeout=15)
        return round(float(r.stdout.strip()), 3)
    except Exception:
        return None


def catalog(with_duration: bool = False) -> list[dict]:
    d = sfx_dir()
    out = []
    for f in sorted(d.glob("*.wav")):
        item = {"name": f.stem, "file": f.name, "category": category_of(f.stem), "path": str(f)}
        if with_duration:
            item["duration"] = _duration(str(f), f.stat().st_mtime)
        out.append(item)
    return out


def resolve(name: str) -> Path:
    """Path of a named effect; raises ValueError listing the valid names (so the agent can correct itself)."""
    stem = Path(str(name)).stem.lower().strip()
    p = sfx_dir() / f"{stem}.wav"
    if not p.is_file():
        raise ValueError(f"unknown sound effect {name!r}. Available: {', '.join(i['name'] for i in catalog())}")
    return p
