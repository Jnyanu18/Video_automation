"""FootageIndex v2 read, write, validation, and end-to-end indexing pipeline."""

from __future__ import annotations

import json
import logging
import os
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Dict, List, Optional

from footage.moments import build_moments
from footage.probe import probe_file, walk_media_files
from footage.proxy import generate_proxies
from footage.schema import FootageIndex, IndexStats, MediaFile, Shot, SpeechSegment, SyncGroup
from footage.shots import detect_shot_boundaries
from footage.metrics import compute_shot_metrics, load_audio_track
from footage.speech import transcribe_speech_shots
from footage.sync import build_sync_groups
from footage.triage import TriageConfig, triage_shots

logger = logging.getLogger("footage.index")


def read_index(path: Path | str) -> FootageIndex:
    """Read and validate a FootageIndex v2 file with Pydantic."""
    p = Path(path).resolve()
    raw = p.read_text(encoding="utf-8")
    return FootageIndex.model_validate_json(raw)


def write_index(index: FootageIndex, out_path: Path | str) -> Path:
    """Atomically write FootageIndex to disk."""
    dest = Path(out_path).resolve()
    dest.parent.mkdir(parents=True, exist_ok=True)

    tmp = dest.with_name(f"{dest.name}.tmp.{uuid.uuid4().hex[:8]}")
    payload = index.model_dump_json(indent=2)

    with open(tmp, "w", encoding="utf-8") as f:
        f.write(payload)
        f.flush()
        os.fsync(f.fileno())

    os.replace(tmp, dest)
    return dest


def index_footage(
    source_dir: Path | str,
    work_dir: Path | str,
    out_path: Optional[Path | str] = None,
    project_id: Optional[str] = None,
    camera_map: Optional[Dict[str, str]] = None,
    triage_config: Optional[TriageConfig] = None,
    on_progress: Optional[Callable[[str, float], None]] = None,
) -> FootageIndex:
    """Execute the Phase 1 zero-model indexing pass on a footage directory.
    
    Pipeline:
    1. Probe media files and extract metadata.
    2. Transcode 540p proxies in parallel across CPU cores.
    3. Multi-camera audio synchronization and sync groups.
    4. Detect shot boundaries on proxies.
    5. Calculate L0 metrics (motion, focus, exposure, audio RMS, audio class, faces).
    6. L1 triage ladder (keep_score, reject_reason, deduplication).
    7. Faster-Whisper transcription on eligible speech shots.
    8. Group overlapping shots across cameras into unified Moments.
    9. Calculate acceptance statistics and write index atomically.
    """
    t_start = time.perf_counter()
    src = Path(source_dir).resolve()
    work = Path(work_dir).resolve()
    work.mkdir(parents=True, exist_ok=True)

    proj_id = project_id or src.name or f"proj_{uuid.uuid4().hex[:8]}"

    if on_progress:
        on_progress("Discovering media files", 0.05)

    file_paths = walk_media_files(src)
    if not file_paths:
        logger.warning("No video files found in %s", src)

    # 1. Probe files in parallel
    if on_progress:
        on_progress("Probing media files", 0.10)

    cpu = os.cpu_count() or 2
    with ThreadPoolExecutor(max_workers=max(1, cpu)) as ex:
        futures = [ex.submit(probe_file, fp, f"m{i:03d}", camera_map) for i, fp in enumerate(file_paths, start=1)]
        media_list: List[MediaFile] = [f.result() for f in futures]

    total_source_seconds = sum(m.duration for m in media_list if not m.error)

    # 2. Transcode proxies in parallel
    if on_progress:
        on_progress("Transcoding 540p proxies", 0.20)

    _proxy_map, proxy_wall_seconds = generate_proxies(media_list, work)

    # 3. Multi-camera synchronization
    if on_progress:
        on_progress("Synchronizing camera audio", 0.40)

    sync_groups = build_sync_groups(media_list)

    # 4 & 5. Shot detection and metrics in parallel
    if on_progress:
        on_progress("Detecting shots and computing metrics", 0.55)

    valid_proxies = [m for m in media_list if not m.error and m.proxy_path]

    def _process_media_shots(m: MediaFile) -> List[Shot]:
        import cv2
        shot_bounds = detect_shot_boundaries(m.proxy_path, m.duration)
        shots: List[Shot] = []
        audio_track = load_audio_track(m.proxy_path) if m.has_audio else None
        cap = cv2.VideoCapture(str(m.proxy_path))
        try:
            for s_start, s_end in shot_bounds:
                metrics = compute_shot_metrics(
                    m.proxy_path,
                    s_start,
                    s_end,
                    has_audio=m.has_audio,
                    cap=cap,
                    audio_track=audio_track,
                )
                shots.append(
                    Shot(
                        shot_id="",  # assigned deterministically below
                        media_id=m.media_id,
                        start=round(s_start, 3),
                        end=round(s_end, 3),
                        motion=metrics["motion"],
                        focus=metrics["focus"],
                        exposure=metrics["exposure"],
                        audio_rms=metrics["audio_rms"],
                        audio_class=metrics["audio_class"],
                        faces=metrics["faces"],
                        face_area=metrics["face_area"],
                    )
                )
        finally:
            cap.release()
        return shots

    all_shots: List[Shot] = []
    cpu = os.cpu_count() or 2
    with ThreadPoolExecutor(max_workers=max(1, cpu - 1)) as ex:
        shot_lists = list(ex.map(_process_media_shots, valid_proxies))
    for sl in shot_lists:
        all_shots.extend(sl)

    # Assign deterministic shot IDs
    for idx, s in enumerate(all_shots, start=1):
        s.shot_id = f"s{idx:05d}"

    # 6. Triage ladder
    if on_progress:
        on_progress("Applying triage ladder", 0.75)

    cfg = triage_config or TriageConfig()
    all_shots = triage_shots(all_shots, cfg)

    # 7. Faster-Whisper speech transcription on eligible shots
    if on_progress:
        on_progress("Transcribing speech segments", 0.85)

    all_speech: List[SpeechSegment] = []
    for m in media_list:
        if m.error or not m.has_audio:
            continue
        m_shots = [s for s in all_shots if s.media_id == m.media_id]
        speech_segs = transcribe_speech_shots(m.path, m.media_id, m_shots)
        all_speech.extend(speech_segs)

    # 8. Multi-camera Moments
    if on_progress:
        on_progress("Grouping cross-camera moments", 0.95)

    moments = build_moments(all_shots, media_list, sync_groups, all_speech)

    # 9. Compute stats
    t_end = time.perf_counter()
    index_wall_seconds = max(0.001, t_end - t_start)
    kept_seconds = sum(s.duration for s in all_shots if s.reject_reason is None)
    keep_ratio = kept_seconds / max(total_source_seconds, 0.001)
    realtime_factor = total_source_seconds / index_wall_seconds

    if keep_ratio > 0.25:
        print(
            f"WARNING: keep_ratio ({keep_ratio:.3f}) exceeds target maximum 0.25. Triage ladder may need adjustment.",
            file=sys.stderr,
            flush=True,
        )

    stats = IndexStats(
        total_source_seconds=round(total_source_seconds, 2),
        media_count=len(media_list),
        shots=len(all_shots),
        moments=len(moments),
        kept_seconds=round(kept_seconds, 2),
        keep_ratio=round(keep_ratio, 4),
        proxy_seconds=round(proxy_wall_seconds, 2),
        index_wall_seconds=round(index_wall_seconds, 2),
        realtime_factor=round(realtime_factor, 2),
        model_calls=0,
    )

    created_at = datetime.now(timezone.utc).isoformat()
    index = FootageIndex(
        index_version=2,
        project_id=proj_id,
        created_at=created_at,
        source_dirs=[str(src)],
        media=media_list,
        sync_groups=sync_groups,
        shots=all_shots,
        moments=moments,
        speech=all_speech,
        stats=stats,
    )

    if out_path:
        write_index(index, out_path)

    if on_progress:
        on_progress("Indexing complete", 1.0)

    return index
