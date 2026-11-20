"""Media probe and directory scanning using ffprobe."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import stat
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from footage.schema import MediaFile

logger = logging.getLogger("footage.probe")

VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".m4v", ".webm"}

# Reparse point attribute flag on Windows (0x400)
FILE_ATTRIBUTE_REPARSE_POINT = 0x400


def is_reparse_point(path: Path) -> bool:
    """Check if a path is a Windows junction or symlink."""
    if os.path.islink(path):
        return True
    try:
        st = os.stat(path, follow_symlinks=False)
        attrs = getattr(st, "st_file_attributes", 0)
        return bool(attrs & FILE_ATTRIBUTE_REPARSE_POINT)
    except (OSError, AttributeError):
        return False


def walk_media_files(source_dir: Path | str) -> List[Path]:
    """Safely walk directories and collect video files.
    
    Skips Windows junctions and symlinks to prevent duplicate tree traversals.
    """
    root = Path(source_dir).resolve()
    if root.is_file():
        if root.suffix.lower() in VIDEO_EXTENSIONS:
            return [root]
        return []

    collected: List[Path] = []
    
    for dirpath, dirnames, filenames in os.walk(str(root), followlinks=False):
        # Filter out junctions/symlinks from dirnames in-place so os.walk does not recurse into them
        current_dir = Path(dirpath)
        valid_dirs = []
        for d in dirnames:
            sub = current_dir / d
            if not is_reparse_point(sub):
                valid_dirs.append(d)
        dirnames[:] = valid_dirs

        for f in filenames:
            p = current_dir / f
            if p.suffix.lower() in VIDEO_EXTENSIONS:
                collected.append(p)

    return sorted(collected, key=lambda x: str(x).lower())


def compute_checksum(path: Path | str, fast_limit: int = 2 * 1024 * 1024) -> str:
    """Compute deterministic checksum of file for change detection.
    
    For files under fast_limit (2MB), hashes entire file.
    For larger files, hashes first 1MB + last 1MB + size to keep probe fast on 50GB clips.
    """
    p = Path(path)
    try:
        size = p.stat().st_size
        h = hashlib.sha256()
        h.update(str(size).encode("utf-8"))
        with open(p, "rb") as f:
            if size <= fast_limit:
                while chunk := f.read(65536):
                    h.update(chunk)
            else:
                h.update(f.read(1024 * 1024))
                f.seek(max(0, size - 1024 * 1024))
                h.update(f.read(1024 * 1024))
        return h.hexdigest()
    except Exception as e:
        logger.warning("Failed checksum for %s: %s", path, e)
        return ""


def infer_camera_id(
    path: Path,
    device_metadata: Dict[str, str],
    camera_map: Optional[Dict[str, str]] = None,
) -> Tuple[str, str]:
    """Infer camera ID from overrides, parent folder names, and ffprobe tags.
    
    Returns:
        (camera_id, decision_reason)
    """
    # 1. Caller explicit camera_map override
    if camera_map:
        for pattern, cid in camera_map.items():
            if pattern.lower() in str(path).lower():
                return cid, f"camera_map match: {pattern}"

    # 2. Check parent folder hierarchy
    for parent in path.parents:
        p_name = parent.name.upper()
        # Common patterns: CAM_A, CAM-B, CAMERA_1, A001, CAM1, etc.
        m = re.search(r"\b(CAM(?:ERA)?[-_]?[A-Z0-9]+)\b", p_name)
        if m:
            return m.group(1).replace("-", "_"), f"parent folder: {parent.name}"
        if re.match(r"^[A-Z]\d{3,}$", p_name):  # e.g. A001, B002
            return f"CAM_{p_name[0]}", f"parent reel folder: {parent.name}"

    # 3. Check device metadata tags
    make = device_metadata.get("make") or device_metadata.get("camera_make") or ""
    model = device_metadata.get("model") or device_metadata.get("camera_model") or ""
    serial = device_metadata.get("com.apple.quicktime.camera.serial_number") or ""
    if make or model:
        dev_id = f"{make}_{model}_{serial}".strip("_").replace(" ", "_")
        return dev_id[:16], "device metadata tags"

    # 4. Check filename prefixes e.g. CAM_A_001.mp4, A001_..., C0001.mp4
    fn = path.name.upper()
    m_fn = re.match(r"^(CAM[-_]?[A-Z0-9]+)", fn)
    if m_fn:
        return m_fn.group(1).replace("-", "_"), "filename prefix"
    if re.match(r"^[A-Z]\d{3,}", fn):
        return f"CAM_{fn[0]}", "filename camera index"

    return "CAM_DEFAULT", "default fallback"


def parse_fps(rate_str: str) -> float:
    """Safely parse ffprobe fps fraction e.g. '25/1' or '30000/1001'."""
    try:
        if "/" in rate_str:
            num, den = rate_str.split("/", 1)
            d = float(den)
            return float(num) / d if d != 0 else 25.0
        return float(rate_str)
    except Exception:
        return 25.0


def probe_file(
    path: Path | str,
    media_id: str,
    camera_map: Optional[Dict[str, str]] = None,
) -> MediaFile:
    """Run ffprobe on a media file and return a MediaFile record.
    
    Documented timebase:
    - duration: source seconds (t_src)
    
    If probe fails, returns MediaFile with error field set.
    """
    p = Path(path).resolve()
    if not p.is_file():
        return MediaFile(
            media_id=media_id,
            path=str(p),
            camera_id="CAM_UNKNOWN",
            duration=0.0,
            fps=25.0,
            width=0,
            height=0,
            codec="unknown",
            has_audio=False,
            error=f"File not found: {p}",
        )

    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_format",
        "-show_streams",
        "-of", "json",
        str(p),
    ]

    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=30.0,
        )
    except Exception as e:
        return MediaFile(
            media_id=media_id,
            path=str(p),
            camera_id="CAM_UNKNOWN",
            duration=0.0,
            fps=25.0,
            width=0,
            height=0,
            codec="unknown",
            has_audio=False,
            error=f"ffprobe execution failed: {e}",
        )

    if proc.returncode != 0:
        return MediaFile(
            media_id=media_id,
            path=str(p),
            camera_id="CAM_UNKNOWN",
            duration=0.0,
            fps=25.0,
            width=0,
            height=0,
            codec="unknown",
            has_audio=False,
            error=f"ffprobe error: {proc.stderr.strip()}",
        )

    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError as e:
        return MediaFile(
            media_id=media_id,
            path=str(p),
            camera_id="CAM_UNKNOWN",
            duration=0.0,
            fps=25.0,
            width=0,
            height=0,
            codec="unknown",
            has_audio=False,
            error=f"Invalid ffprobe JSON: {e}",
        )

    fmt = data.get("format", {})
    streams = data.get("streams", [])

    video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

    if not video_stream:
        return MediaFile(
            media_id=media_id,
            path=str(p),
            camera_id="CAM_UNKNOWN",
            duration=float(fmt.get("duration", 0.0)),
            fps=0.0,
            width=0,
            height=0,
            codec="none",
            has_audio=audio_stream is not None,
            error="No video stream found in file",
        )

    duration = float(video_stream.get("duration") or fmt.get("duration") or 0.0)
    fps = parse_fps(video_stream.get("r_frame_rate") or video_stream.get("avg_frame_rate") or "25/1")
    width = int(video_stream.get("width") or 0)
    height = int(video_stream.get("height") or 0)
    codec = str(video_stream.get("codec_name") or "unknown")
    has_audio = audio_stream is not None

    tags = {**fmt.get("tags", {}), **video_stream.get("tags", {})}
    # Lowercase tag keys for uniform lookup
    norm_tags = {k.lower(): str(v) for k, v in tags.items()}

    start_wallclock = (
        norm_tags.get("creation_time")
        or norm_tags.get("com.apple.quicktime.creationdate")
    )
    if not start_wallclock:
        # Fallback to file modification time in ISO format
        mtime = p.stat().st_mtime
        start_wallclock = datetime.fromtimestamp(mtime).isoformat()

    camera_id, _reason = infer_camera_id(p, norm_tags, camera_map)
    checksum = compute_checksum(p)

    return MediaFile(
        media_id=media_id,
        path=str(p),
        camera_id=camera_id,
        duration=duration,
        fps=fps,
        width=width,
        height=height,
        codec=codec,
        has_audio=has_audio,
        start_wallclock=start_wallclock,
        checksum=checksum,
    )
