"""Shot boundary detection using PySceneDetect."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Tuple

logger = logging.getLogger("footage.shots")


def detect_shot_boundaries(
    proxy_path: Path | str,
    duration: float,
    threshold: float = 27.0,
    min_scene_len: float = 0.5,
) -> List[Tuple[float, float]]:
    """Detect shot boundaries within a proxy video.
    
    Timebase:
    - Returns list of (start_seconds, end_seconds) in proxy/source time (t_proxy).
    
    Args:
        proxy_path: Path to the 540p proxy video file.
        duration: Total duration of the proxy video in seconds (t_proxy).
        threshold: PySceneDetect ContentDetector sensitivity threshold.
        min_scene_len: Minimum scene length in seconds.
        
    Returns:
        List of (start, end) tuples covering the full duration.
    """
    p = Path(proxy_path).resolve()
    if not p.is_file() or duration <= 0.05:
        return [(0.0, max(0.0, duration))]

    try:
        from scenedetect import ContentDetector, SceneManager, open_video

        video = open_video(str(p))
        scene_manager = SceneManager()
        scene_manager.add_detector(ContentDetector(threshold=threshold, min_scene_len=int(min_scene_len * 25.0)))
        scene_manager.detect_scenes(video, frame_skip=1, show_progress=False)
        scene_list = scene_manager.get_scene_list()

        if not scene_list:
            return [(0.0, float(duration))]

        shots: List[Tuple[float, float]] = []
        for start_tc, end_tc in scene_list:
            t_s = max(0.0, float(start_tc.get_seconds()))
            t_e = min(duration, float(end_tc.get_seconds()))
            if t_e > t_s:
                shots.append((t_s, t_e))

        if not shots:
            return [(0.0, float(duration))]

        # Ensure full duration coverage (e.g. from 0.0 to shots[0][0] if gap)
        if shots[0][0] > 0.05:
            shots.insert(0, (0.0, shots[0][0]))
        if shots[-1][1] < duration - 0.05:
            shots.append((shots[-1][1], duration))

        return shots

    except Exception as e:
        logger.warning("Scene detection fallback for %s: %s", p, e)
        return [(0.0, float(duration))]
