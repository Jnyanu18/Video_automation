"""Scene cut detection using FFmpeg scene filter."""
from __future__ import annotations

import json
import logging
import re
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Any
from ..schemas.analysis import SceneCut

log = logging.getLogger("reelforge.analysis.cuts")

def detect_cuts(video_path: Path | str, threshold: float = 0.3) -> Dict[str, Any]:
    """Detect scene cuts using FFmpeg's scene score filter."""
    v = Path(video_path)
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("FFmpeg is not installed on PATH.")

    cmd = [
        ffmpeg,
        "-i", str(v),
        "-vf", f"select='gt(scene,{threshold})',showinfo",
        "-f", "null",
        "-"
    ]

    r = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    timestamps = [0.0]

    # Look for showinfo pts_time outputs
    for match in re.finditer(r"pts_time:([0-9.]+)", r.stderr):
        t = float(match.group(1))
        if t > timestamps[-1] + 0.3: # Minimum cut duration threshold (300ms)
            timestamps.append(round(t, 2))

    # Get total video duration
    from .audio import probe_video
    info = probe_video(v)
    total_dur = info.get("duration", timestamps[-1] if timestamps else 0.0)
    if total_dur > timestamps[-1]:
        timestamps.append(round(total_dur, 2))

    # Form SceneCut segments
    cuts: List[SceneCut] = []
    intervals = []
    for i in range(len(timestamps) - 1):
        s, e = timestamps[i], timestamps[i+1]
        dur = round(e - s, 2)
        if dur > 0:
            cuts.append(SceneCut(start=s, end=e, duration=dur))
            intervals.append(dur)

    avg_interval = round(sum(intervals) / len(intervals), 2) if intervals else total_dur
    return {
        "cuts": cuts,
        "cut_count": len(cuts),
        "avg_cut_interval": avg_interval,
        "intervals": intervals,
    }
