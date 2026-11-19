"""Extracts video frames at 0.5s intervals (2 fps) for analysis."""
from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Any

log = logging.getLogger("reelforge.frame_extractor")

def extract_frames(video_path: Path | str, frames_dir: Path | str, fps: float = 2.0) -> List[Path]:
    """Extract frames every 1/fps seconds (default 0.5s interval)."""
    v = Path(video_path)
    out_dir = Path(frames_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    pattern = str(out_dir / "frame_%04d.jpg")
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("FFmpeg is not installed on PATH.")

    cmd = [
        ffmpeg,
        "-y",
        "-i", str(v),
        "-vf", f"fps={fps}",
        "-q:v", "2",
        pattern
    ]
    
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        raise RuntimeError(f"FFmpeg frame extraction failed: {r.stderr[-300:]}")

    frames = sorted(out_dir.glob("frame_*.jpg"))
    log.info("Extracted %d frames from %s into %s", len(frames), v.name, out_dir)
    return frames
