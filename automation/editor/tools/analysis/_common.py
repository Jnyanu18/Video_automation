"""Shared helpers for analysis tools (no heavy imports at module load)."""
from __future__ import annotations

import copy
import json
import subprocess
from pathlib import Path


def new_plan(plan: dict | None) -> dict:
    """Deep copy so tools stay pure w.r.t. their input plan."""
    return copy.deepcopy(plan) if plan else {"version": 1}


def out(plan: dict, result: dict, warnings: list[str] | None = None) -> dict:
    return {"plan": plan, "result": result, "warnings": list(warnings or [])}


def resolve_video(plan: dict | None, video: str | None) -> Path:
    p = video or ((plan or {}).get("source") or {}).get("path")
    if not p:
        raise ValueError("no video given: pass video=... or set plan.source.path")
    path = Path(p)
    if not path.exists():
        raise FileNotFoundError(f"video not found: {path}")
    return path


def workdir_path(workdir: str | None, name: str) -> Path | None:
    if not workdir:
        return None
    d = Path(workdir)
    d.mkdir(parents=True, exist_ok=True)
    return d / name


def write_json(path: Path | None, data) -> str | None:
    if path is None:
        return None
    path.write_text(json.dumps(data, indent=2))
    return str(path)


def probe(video: Path) -> dict:
    """ffprobe -> {duration,width,height,fps,has_audio,has_video,video_codec,audio_codec}."""
    raw = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(video)],
        capture_output=True, text=True, check=True,
    ).stdout
    info = json.loads(raw)
    v = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), None)
    a = next((s for s in info.get("streams", []) if s.get("codec_type") == "audio"), None)
    dur = info.get("format", {}).get("duration") or (v or {}).get("duration") or 0
    fps = 0.0
    if v:
        num, _, den = (v.get("avg_frame_rate") or v.get("r_frame_rate") or "0/1").partition("/")
        try:
            fps = float(num) / float(den or 1) if float(den or 1) else 0.0
        except ValueError:
            fps = 0.0
    return {
        "duration": round(float(dur), 3),
        "width": int(v["width"]) if v else None,
        "height": int(v["height"]) if v else None,
        "fps": round(fps, 3) if fps else None,
        "has_video": v is not None,
        "has_audio": a is not None,
        "video_codec": v.get("codec_name") if v else None,
        "audio_codec": a.get("codec_name") if a else None,
    }
