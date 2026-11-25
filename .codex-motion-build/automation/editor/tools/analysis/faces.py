"""track_faces: sample frames, detect faces, output a smoothed normalized reframe track.

Detector backends (detector=, default "auto"):
  - "opencv-haar"  : bundled Haar cascade (models/), works fully offline. Frontal faces only.
  - "mediapipe"    : MediaPipe Tasks FaceDetector; needs model_path= to a .tflite (not bundled; download blocked here).
  - "fixture"      : JSON {"faces":[{"t":0.0,"boxes":[[x,y,w,h],...]}]} in normalized coords; for tests.
  - a callable(frame_bgr, t) -> [(x, y, w, h), ...] normalized 0..1 (inject for tests / custom models).
  - "auto"         : mediapipe if model_path given, else opencv-haar.
Output track point = {"t": seconds(source), "cx": 0..1, "cy": 0..1}: the point to keep centered in the crop.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Callable

from ._common import new_plan, out, probe, resolve_video, workdir_path, write_json

MODELS = Path(__file__).parent / "models"


def _haar_detector(cascade: str = "haarcascade_frontalface_default.xml") -> Callable:
    import cv2

    clf = cv2.CascadeClassifier(str(MODELS / cascade))
    if clf.empty():
        raise RuntimeError(f"could not load cascade {cascade}")

    def detect(frame, t):
        h, w = frame.shape[:2]
        scale = 640.0 / w if w > 640 else 1.0
        small = cv2.resize(frame, None, fx=scale, fy=scale) if scale != 1.0 else frame
        gray = cv2.equalizeHist(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY))
        sh, sw = gray.shape[:2]
        min_sz = max(24, int(min(sw, sh) * 0.06))
        boxes = clf.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(min_sz, min_sz))
        return [(float(x) / sw, float(y) / sh, float(bw) / sw, float(bh) / sh) for x, y, bw, bh in boxes]

    return detect


def _mediapipe_detector(model_path: str) -> Callable:
    import mediapipe as mp
    from mediapipe.tasks import python as mpp
    from mediapipe.tasks.python import vision

    opts = vision.FaceDetectorOptions(base_options=mpp.BaseOptions(model_asset_path=model_path),
                                      min_detection_confidence=0.5)
    det = vision.FaceDetector.create_from_options(opts)

    def detect(frame, t):
        import cv2
        h, w = frame.shape[:2]
        img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        res = det.detect(img)
        return [(b.origin_x / w, b.origin_y / h, b.width / w, b.height / h)
                for b in (d.bounding_box for d in res.detections)]

    return detect


def _fixture_detector(path: str) -> Callable:
    entries = sorted(json.loads(Path(path).read_text())["faces"], key=lambda e: e["t"])

    def detect(frame, t):
        best = None
        for e in entries:  # nearest entry at or before t (hold)
            if e["t"] <= t + 1e-6:
                best = e
        return [tuple(b) for b in (best or {"boxes": []})["boxes"]]

    return detect


def make_detector(detector, model_path=None, fixture=None) -> tuple[str, Callable]:
    if callable(detector):
        return "custom", detector
    name = detector or "auto"
    if name == "auto":
        name = "mediapipe" if model_path else "opencv-haar"
    if name == "opencv-haar":
        return name, _haar_detector()
    if name == "mediapipe":
        if not model_path:
            raise ValueError("mediapipe detector needs model_path= (.tflite)")
        return name, _mediapipe_detector(model_path)
    if name == "fixture":
        fixture = fixture or os.environ.get("CE_FACES_FIXTURE")
        if not fixture:
            raise ValueError("fixture detector needs faces_fixture=")
        return name, _fixture_detector(fixture)
    raise ValueError(f"unknown detector {name!r}")


def pick_face(boxes, prev):
    """Choose the subject: largest face, but prefer continuity (nearest to previous) when sizes are comparable."""
    if not boxes:
        return None
    if prev is None:
        return max(boxes, key=lambda b: b[2] * b[3])
    biggest = max(b[2] * b[3] for b in boxes)

    def score(b):
        cx, cy = b[0] + b[2] / 2, b[1] + b[3] / 2
        dist = ((cx - prev[0]) ** 2 + (cy - prev[1]) ** 2) ** 0.5
        return (b[2] * b[3]) / biggest - 2.0 * dist

    return max(boxes, key=score)


def smooth_track(raw: list[dict], alpha: float = 0.35, deadband: float = 0.01, max_speed: float | None = None) -> list[dict]:
    """EMA smoothing + deadband (ignore jitter < deadband) + optional max speed (norm units per second)."""
    if not raw:
        return []
    res = []
    cx, cy = raw[0]["cx"], raw[0]["cy"]
    pt = raw[0]["t"]
    for p in raw:
        tx, ty = cx + alpha * (p["cx"] - cx), cy + alpha * (p["cy"] - cy)
        if max_speed is not None:
            lim = max_speed * max(p["t"] - pt, 0.0)
            tx, ty = cx + max(-lim, min(lim, tx - cx)), cy + max(-lim, min(lim, ty - cy))
        if abs(tx - cx) >= deadband or abs(ty - cy) >= deadband:
            cx, cy = tx, ty
        pt = p["t"]
        res.append({"t": round(p["t"], 3), "cx": round(min(1.0, max(0.0, cx)), 4),
                    "cy": round(min(1.0, max(0.0, cy)), 4)})
    return res


def track_faces(plan: dict, video: str | None = None, sample_fps: float = 5.0, detector=None,
                model_path: str | None = None, faces_fixture: str | None = None, smooth: float = 0.35,
                max_speed: float | None = 1.0, start: float = 0.0, end: float | None = None,
                set_reframe: bool = True, workdir: str | None = None, **_) -> dict:
    import cv2

    path = resolve_video(plan, video)
    info = probe(path)
    if not info["has_video"]:
        raise ValueError("no video stream")
    name, detect = make_detector(detector, model_path, faces_fixture)
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise RuntimeError(f"cannot open {path}")
    dur = info["duration"]
    end = min(end if end is not None else dur, dur)
    step = 1.0 / max(sample_fps, 0.1)
    raw, hits, total, prev = [], 0, 0, None
    t = max(start, 0.0)
    try:
        while t < end - 1e-6:
            cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000.0)
            ok, frame = cap.read()
            if not ok:
                break
            total += 1
            f = pick_face(detect(frame, t), prev)
            if f is not None:
                hits += 1
                prev = (f[0] + f[2] / 2, f[1] + f[3] / 2)
                raw.append({"t": t, "cx": prev[0], "cy": prev[1], "w": f[2], "h": f[3], "found": True})
            elif prev is not None:  # hold last position through detection gaps
                raw.append({"t": t, "cx": prev[0], "cy": prev[1], "w": None, "h": None, "found": False})
            else:
                raw.append({"t": t, "cx": None, "cy": None, "w": None, "h": None, "found": False})
            t += step
    finally:
        cap.release()

    warnings = []
    first = next((p for p in raw if p["cx"] is not None), None)
    for p in raw:  # back-fill leading frames before first detection
        if p["cx"] is None and first:
            p["cx"], p["cy"] = first["cx"], first["cy"]
    coverage = hits / total if total else 0.0
    if not first:
        warnings.append("no faces detected; reframe mode set to 'center'")
        track, mode = [{"t": round(start, 3), "cx": 0.5, "cy": 0.5}], "center"
    else:
        track, mode = smooth_track([p for p in raw if p["cx"] is not None], alpha=smooth, max_speed=max_speed), "face-follow"
        if coverage < 0.3:
            warnings.append(f"faces found in only {coverage:.0%} of sampled frames; track is mostly held positions")
    p2 = new_plan(plan)
    if set_reframe:
        p2["reframe"] = {"mode": mode, "track": track}
    result = {"video": str(path), "detector": name, "sample_fps": sample_fps, "frames_sampled": total,
              "frames_with_face": hits, "coverage": round(coverage, 3), "mode": mode, "track": track,
              "raw": [{k: (round(v, 4) if isinstance(v, float) else v) for k, v in p.items()} for p in raw]}
    result["file"] = write_json(workdir_path(workdir, "face_track.json"), result)
    return out(p2, result, warnings)
