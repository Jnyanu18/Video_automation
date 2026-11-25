"""Multi-camera moment grouping from time-aligned shots."""

from __future__ import annotations

import logging
from typing import Dict, List, Optional

from footage.schema import MediaFile, Moment, MomentAngle, MomentSpeech, Shot, SpeechSegment, SyncGroup

logger = logging.getLogger("footage.moments")


def build_moments(
    shots: List[Shot],
    media_list: List[MediaFile],
    sync_groups: List[SyncGroup],
    speech_segments: Optional[List[SpeechSegment]] = None,
    overlap_threshold_sec: float = 0.5,
) -> List[Moment]:
    """Group time-overlapping shots across cameras into unified Moments.
    
    Timebases:
    - shot.start, shot.end: source seconds (t_src)
    - SyncGroup.offsets: media offset relative to group origin (t_wall)
    - Moment.t_start, Moment.t_end: synced wall-clock seconds (t_wall)
    
    Returns:
        List of Moment records, each containing angles sorted by quality descending.
    """
    if not shots:
        return []

    media_map: Dict[str, MediaFile] = {m.media_id: m for m in media_list}

    # Map media_id to sync offset
    offset_map: Dict[str, float] = {}
    for sg in sync_groups:
        for mid, off in sg.offsets.items():
            offset_map[mid] = off

    # Decorate shots with wall-clock timing
    annotated: List[tuple[float, float, Shot, str]] = []
    for s in shots:
        off = offset_map.get(s.media_id, 0.0)
        t_wall_start = round(off + s.start, 3)
        t_wall_end = round(off + s.end, 3)
        cam_id = media_map.get(s.media_id).camera_id if s.media_id in media_map else "CAM_DEFAULT"
        annotated.append((t_wall_start, t_wall_end, s, cam_id))

    # Sort primarily by start wall-clock time
    annotated.sort(key=lambda x: (x[0], x[1]))

    # Cluster overlapping shots
    clusters: List[List[tuple[float, float, Shot, str]]] = []
    for item in annotated:
        t_s, t_e, s, cam = item
        if not clusters:
            clusters.append([item])
            continue

        last_cluster = clusters[-1]
        cluster_end = max(x[1] for x in last_cluster)

        # Overlaps if current start is within cluster_end - overlap_threshold
        if t_s <= (cluster_end - overlap_threshold_sec):
            last_cluster.append(item)
        else:
            clusters.append([item])

    # Convert clusters to Moment objects
    moments: List[Moment] = []
    speech_list = speech_segments or []

    for i, cluster in enumerate(clusters, start=1):
        m_id = f"mo{i:04d}"
        t_start = min(x[0] for x in cluster)
        t_end = max(x[1] for x in cluster)

        angles: List[MomentAngle] = [
            MomentAngle(
                shot_id=shot.shot_id,
                camera_id=cam,
                quality=shot.keep_score,
            )
            for _, _, shot, cam in cluster
        ]

        # Best angle first by keep_score
        angles.sort(key=lambda a: a.quality, reverse=True)
        best_quality = angles[0].quality if angles else 0.0

        # Check for overlapping speech in wall-clock time
        matched_speech: Optional[MomentSpeech] = None
        for sp in speech_list:
            sp_off = offset_map.get(sp.media_id, 0.0)
            sp_wall_start = sp_off + sp.start
            sp_wall_end = sp_off + sp.end
            # Overlap check
            if max(t_start, sp_wall_start) < min(t_end, sp_wall_end):
                matched_speech = MomentSpeech(text=sp.text, speaker=sp.speaker)
                break

        moments.append(
            Moment(
                moment_id=m_id,
                t_start=round(t_start, 3),
                t_end=round(t_end, 3),
                angles=angles,
                keep_score=best_quality,
                speech=matched_speech,
            )
        )

    return moments
