"""detect_silences: ffmpeg silencedetect -> silence + speech intervals (source seconds)."""
from __future__ import annotations

import re
import subprocess

from ._common import new_plan, out, probe, resolve_video, workdir_path, write_json


def parse_silencedetect(stderr: str, duration: float) -> list[dict]:
    """Parse silencedetect log. A silence running to EOF has no silence_end: close it at duration."""
    silences, cur = [], None
    for line in stderr.splitlines():
        m = re.search(r"silence_start: (-?[\d.]+)", line)
        if m:
            cur = max(0.0, float(m.group(1)))
            continue
        m = re.search(r"silence_end: (-?[\d.]+)", line)
        if m and cur is not None:
            silences.append({"start": round(cur, 3), "end": round(min(float(m.group(1)), duration), 3)})
            cur = None
    if cur is not None:
        silences.append({"start": round(cur, 3), "end": round(duration, 3)})
    return [s for s in silences if s["end"] > s["start"]]


def invert(silences: list[dict], duration: float, min_len: float = 0.05) -> list[dict]:
    speech, pos = [], 0.0
    for s in sorted(silences, key=lambda x: x["start"]):
        if s["start"] - pos >= min_len:
            speech.append({"start": round(pos, 3), "end": s["start"]})
        pos = max(pos, s["end"])
    if duration - pos >= min_len:
        speech.append({"start": round(pos, 3), "end": round(duration, 3)})
    return speech


def detect_silences(plan: dict, video: str | None = None, noise_db: float = -35, min_len: float = 0.5,
                    workdir: str | None = None, **_) -> dict:
    path = resolve_video(plan, video)
    info = probe(path)
    warnings = []
    if not info["has_audio"]:
        warnings.append("video has no audio stream; whole clip treated as one silence")
        silences = [{"start": 0.0, "end": info["duration"]}]
    else:
        proc = subprocess.run(
            ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vn", "-af",
             f"silencedetect=noise={noise_db}dB:d={min_len}", "-f", "null", "-"],
            capture_output=True, text=True,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg silencedetect failed: {proc.stderr[-400:]}")
        silences = parse_silencedetect(proc.stderr, info["duration"])
    speech = invert(silences, info["duration"])
    result = {
        "video": str(path), "duration": info["duration"], "noise_db": noise_db, "min_len": min_len,
        "silences": silences, "speech": speech,
        "silence_total": round(sum(s["end"] - s["start"] for s in silences), 3),
    }
    result["file"] = write_json(workdir_path(workdir, "silences.json"), result)
    return out(new_plan(plan), result, warnings)
