"""Face presence detection and local face clustering."""

from __future__ import annotations

import logging
import threading
from typing import List, Tuple
import cv2
import numpy as np

logger = logging.getLogger("footage.faces")

_THREAD_LOCAL = threading.local()


def get_face_detector() -> cv2.CascadeClassifier:
    """Thread-local OpenCV Haar Cascade face detector."""
    detector = getattr(_THREAD_LOCAL, "detector", None)
    if detector is None:
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        detector = cv2.CascadeClassifier(cascade_path)
        _THREAD_LOCAL.detector = detector
    return detector


def detect_faces_in_frames(
    frames: List[np.ndarray],
) -> Tuple[int, float]:
    """Detect presence of faces across sampled BGR frames.
    
    Args:
        frames: List of 2-3 sampled BGR frames from a shot.
        
    Returns:
        (face_count, max_face_area_ratio) where max_face_area_ratio is in [0.0, 1.0].
    """
    if not frames:
        return 0, 0.0

    detector = get_face_detector()
    max_count = 0
    max_area_ratio = 0.0

    for frame in frames:
        if frame is None or frame.size == 0:
            continue
        h, w = frame.shape[:2]
        if h == 0 or w == 0:
            continue
        frame_area = float(h * w)

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # Downsample for fast detection
        scale = 320.0 / w if w > 320 else 1.0
        if scale < 1.0:
            small_gray = cv2.resize(gray, (320, int(h * scale)))
        else:
            small_gray = gray
        small_gray = cv2.equalizeHist(small_gray)
        
        try:
            detections = detector.detectMultiScale(
                small_gray,
                scaleFactor=1.2,
                minNeighbors=4,
                minSize=(24, 24),
            )
        except Exception as e:
            logger.warning("Face detection failed on frame: %s", e)
            detections = ()

        count = len(detections)
        if count > max_count:
            max_count = count

        for (x, y, fw, fh) in detections:
            # Scale coordinates back to original frame dimensions
            orig_area = (fw / scale) * (fh / scale)
            area_ratio = float(orig_area) / frame_area
            if area_ratio > max_area_ratio:
                max_area_ratio = area_ratio
            area_ratio = float(fw * fh) / frame_area
            if area_ratio > max_area_ratio:
                max_area_ratio = area_ratio

    return max_count, round(min(1.0, max_area_ratio), 4)


def cluster_faces_stub(
    face_crops: List[np.ndarray],
) -> List[int]:
    """Face clustering placeholder for Phase 2 agglomerative clustering."""
    # Phase 1: assign all detected faces to default cluster 0
    return [0] * len(face_crops)
