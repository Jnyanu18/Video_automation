"""540p proxy transcode pipeline.

All analysis runs against lightweight 540p proxies. Conforming and final render
conform strictly from the original media files.
"""

from __future__ import annotations

import logging
import os
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple

from footage.schema import MediaFile

logger = logging.getLogger("footage.proxy")


def create_single_proxy(
    media: MediaFile,
    work_dir: Path | str,
    overwrite: bool = False,
) -> str:
    """Generate a single 540p proxy for a media file.
    
    Timebase:
    - proxy video duration matches source duration (t_src == t_proxy) at 25 fps.
    
    Returns:
        Absolute path to the created or existing proxy file.
    """
    if media.error:
        logger.warning("Skipping proxy for errored media %s: %s", media.media_id, media.error)
        return ""

    proxies_dir = Path(work_dir) / "proxies"
    proxies_dir.mkdir(parents=True, exist_ok=True)
    out_path = (proxies_dir / f"{media.media_id}.mp4").resolve()

    # Skip transcode if valid proxy already exists and overwrite is False
    if not overwrite and out_path.is_file() and out_path.stat().st_size > 1024:
        return str(out_path)

    cmd = [
        "ffmpeg",
        "-y",
        "-i", str(Path(media.path).resolve()),
        "-vf", "scale=-2:540",
        "-r", "25",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "30",
    ]

    if media.has_audio:
        cmd.extend(["-c:a", "aac", "-b:a", "96k"])
    else:
        cmd.append("-an")

    cmd.extend(["-movflags", "+faststart", str(out_path)])

    proc = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    if proc.returncode != 0:
        err_msg = proc.stderr.strip().splitlines()[-1] if proc.stderr else "unknown error"
        raise RuntimeError(f"Proxy transcode failed for {media.path}: {err_msg}")

    return str(out_path)


def generate_proxies(
    media_list: List[MediaFile],
    work_dir: Path | str,
    max_workers: Optional[int] = None,
    on_progress: Optional[Callable[[str, int, int], None]] = None,
) -> Tuple[Dict[str, str], float]:
    """Transcode proxies in parallel across CPU cores.
    
    Returns:
        (mapping of media_id -> proxy_path, total_proxy_wall_seconds)
    """
    if max_workers is None:
        cpu = os.cpu_count() or 2
        max_workers = max(1, cpu - 1)

    t0 = time.perf_counter()
    proxy_map: Dict[str, str] = {}
    valid_media = [m for m in media_list if not m.error]
    total = len(valid_media)
    completed = 0

    if not valid_media:
        return proxy_map, 0.0

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_media = {
            executor.submit(create_single_proxy, m, work_dir): m
            for m in valid_media
        }

        for future in as_completed(future_to_media):
            m = future_to_media[future]
            completed += 1
            try:
                p_path = future.result()
                proxy_map[m.media_id] = p_path
                m.proxy_path = p_path
            except Exception as e:
                logger.error("Failed proxy generation for %s: %s", m.media_id, e)
                m.error = f"Proxy generation error: {e}"

            if on_progress:
                on_progress(m.media_id, completed, total)

    elapsed = time.perf_counter() - t0
    return proxy_map, elapsed
