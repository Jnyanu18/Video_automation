"""540p proxy transcode pipeline.

All analysis runs against lightweight 540p proxies. Conforming and final render
conform strictly from the original media files.
"""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple

from footage.schema import MediaFile

logger = logging.getLogger("footage.proxy")


@dataclass
class ProxyConfig:
    """Documented configuration for 540p proxy generation.
    
    All worker limits and segment thresholds are centralized here.
    """
    # Cap worker count at os.cpu_count() - 1 per spec
    max_workers: int = max(1, (os.cpu_count() or 2) - 1)
    # Target segment duration in seconds for intra-file parallel transcoding
    segment_duration: float = 12.0
    # Minimum file duration to trigger intra-file segmentation
    min_split_duration: float = 24.0


def _transcode_segment(
    src_path: Path,
    chunk_path: Path,
    start: float,
    end: float,
    has_audio: bool,
) -> Path:
    """Transcode a temporal chunk of a media file to 540p."""
    cmd = [
        "ffmpeg",
        "-y",
        "-threads", "2",
        "-ss", f"{start:.3f}",
        "-to", f"{end:.3f}",
        "-i", str(src_path),
        "-vf", "scale=-2:540",
        "-r", "25",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "30",
        "-sws_flags", "fast_bilinear",
    ]
    if has_audio:
        cmd.extend(["-c:a", "aac", "-b:a", "96k"])
    else:
        cmd.append("-an")

    cmd.extend(["-movflags", "+faststart", str(chunk_path)])

    proc = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if proc.returncode != 0:
        err_msg = proc.stderr.strip().splitlines()[-1] if proc.stderr else "unknown error"
        raise RuntimeError(f"Chunk transcode failed ({start:.1f}-{end:.1f}s): {err_msg}")

    return chunk_path


def create_single_proxy(
    media: MediaFile,
    work_dir: Path | str,
    overwrite: bool = False,
    config: Optional[ProxyConfig] = None,
) -> str:
    """Generate a single 540p proxy for a media file.
    
    Timebase:
    - proxy video duration matches source duration (t_src == t_proxy) at 25 fps.
    
    Returns:
        Absolute path to the created or existing proxy file.
    """
    cfg = config or ProxyConfig()

    if media.error:
        logger.warning("Skipping proxy for errored media %s: %s", media.media_id, media.error)
        return ""

    proxies_dir = Path(work_dir) / "proxies"
    proxies_dir.mkdir(parents=True, exist_ok=True)
    out_path = (proxies_dir / f"{media.media_id}.mp4").resolve()

    # Skip transcode if valid proxy already exists and overwrite is False
    if not overwrite and out_path.is_file() and out_path.stat().st_size > 1024:
        return str(out_path)

    src_p = Path(media.path).resolve()
    dur = media.duration

    # If file duration qualifies for intra-file parallel segmentation
    if dur >= cfg.min_split_duration and cfg.max_workers > 1:
        tmp_chunks_dir = proxies_dir / f"tmp_{media.media_id}"
        tmp_chunks_dir.mkdir(parents=True, exist_ok=True)

        segments: List[Tuple[float, float, Path]] = []
        cur = 0.0
        seg_idx = 0
        while cur < dur:
            nxt = min(dur, cur + cfg.segment_duration)
            if (dur - nxt) < (cfg.segment_duration * 0.4):
                nxt = dur
            c_out = tmp_chunks_dir / f"chunk_{seg_idx:04d}.mp4"
            segments.append((cur, nxt, c_out))
            seg_idx += 1
            cur = nxt

        try:
            with ThreadPoolExecutor(max_workers=cfg.max_workers) as ex:
                futures = [
                    ex.submit(_transcode_segment, src_p, c_out, s, e, media.has_audio)
                    for (s, e, c_out) in segments
                ]
                for f in futures:
                    f.result()

            # Concat chunks using ffmpeg concat demuxer
            concat_list_path = tmp_chunks_dir / "concat_list.txt"
            with open(concat_list_path, "w", encoding="utf-8") as f:
                for _, _, c_out in segments:
                    f.write(f"file '{c_out.resolve().as_posix()}'\n")

            cmd_concat = [
                "ffmpeg",
                "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", str(concat_list_path),
                "-c", "copy",
                "-movflags", "+faststart",
                str(out_path),
            ]
            proc = subprocess.run(cmd_concat, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if proc.returncode != 0:
                err_msg = proc.stderr.strip().splitlines()[-1] if proc.stderr else "unknown error"
                raise RuntimeError(f"Concat failed for {media.media_id}: {err_msg}")

            return str(out_path)
        finally:
            shutil.rmtree(tmp_chunks_dir, ignore_errors=True)

    # Direct single-pass transcode
    cmd = [
        "ffmpeg",
        "-y",
        "-threads", "2",
        "-i", str(src_p),
        "-vf", "scale=-2:540",
        "-r", "25",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "30",
        "-sws_flags", "fast_bilinear",
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
    config: Optional[ProxyConfig] = None,
    on_progress: Optional[Callable[[str, int, int], None]] = None,
) -> Tuple[Dict[str, str], float]:
    """Transcode proxies in parallel across CPU cores.
    
    Returns:
        (mapping of media_id -> proxy_path, total_proxy_wall_seconds)
    """
    cfg = config or ProxyConfig()
    workers = max_workers or cfg.max_workers

    t0 = time.perf_counter()
    proxy_map: Dict[str, str] = {}
    valid_media = [m for m in media_list if not m.error]
    total = len(valid_media)
    completed = 0

    if not valid_media:
        return proxy_map, 0.0

    # If few files (e.g. 1 or 2 files), allow intra-file segmentation to maximize core usage
    # If many files, file-level parallelism saturates workers without overhead
    single_cfg = ProxyConfig(
        max_workers=workers if len(valid_media) < workers else 1,
        segment_duration=cfg.segment_duration,
        min_split_duration=cfg.min_split_duration,
    )

    with ThreadPoolExecutor(max_workers=workers) as executor:
        future_to_media = {
            executor.submit(create_single_proxy, m, work_dir, False, single_cfg): m
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
