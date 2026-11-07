"""detect_scenes: ffmpeg scene-change score -> shot list (source seconds)."""
from __future__ import annotations

import re
import subprocess

from ._common import new_plan, out, probe, resolve_video, workdir_path, write_json


def cuts_to_scenes(cuts: list[float], duration: float, min_scene: float = 0.0) -> list[dict]:
    """Turn cut timestamps into contiguous scenes, dropping cuts that would make a scene < min_scene."""
    kept, last = [], 0.0
    for c in sorted(cuts):
        if c - last >= min_scene and duration - c >= min_scene:
            kept.append(round(c, 3))
            last = c
    bounds = [0.0] + kept + [round(duration, 3)]
    return [{"index": i, "start": bounds[i], "end": bounds[i + 1]} for i in range(len(bounds) - 1)
            if bounds[i + 1] > bounds[i]]


def detect_scenes(plan: dict, video: str | None = None, threshold: float = 0.3, min_scene_len: float = 0.5,
                  workdir: str | None = None, **_) -> dict:
    path = resolve_video(plan, video)
    info = probe(path)
    if not info["has_video"]:
        raise ValueError("no video stream")
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-an", "-vf",
         f"select='gt(scene,{threshold})',showinfo", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg scene detect failed: {proc.stderr[-400:]}")
    cuts = [float(x) for x in re.findall(r"pts_time:([\d.]+)", proc.stderr)]
    scenes = cuts_to_scenes(cuts, info["duration"], min_scene_len)
    result = {"video": str(path), "duration": info["duration"], "threshold": threshold,
              "cuts": [s["start"] for s in scenes[1:]], "scenes": scenes}
    result["file"] = write_json(workdir_path(workdir, "scenes.json"), result)
    return out(new_plan(plan), result)
