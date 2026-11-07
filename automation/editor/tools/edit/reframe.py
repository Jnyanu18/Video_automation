"""Vertical reframing + preview frames."""
from __future__ import annotations

import subprocess
from pathlib import Path

from ._common import clone, out
from .timeline import normalize_keep, output_duration, output_to_source, segments


def crop_width_frac(src_w: int, src_h: int, out_w: int, out_h: int) -> float:
    """Fraction of source width covered by the crop window at full source height."""
    return min(1.0, (out_h and (out_w / out_h) * src_h) / src_w) if src_w else 1.0


def _smooth(track: list[dict], alpha: float) -> list[dict]:
    res, px, py = [], None, None
    for p in track:
        cx, cy = p["cx"], p["cy"]
        if px is not None:
            cx, cy = px + alpha * (cx - px), py + alpha * (cy - py)
        px, py = cx, cy
        res.append({"t": p["t"], "cx": cx, "cy": cy})
    return res


def reframe_vertical(plan: dict, mode: str = "face-follow", track: list | None = None,
                     width: int = 1080, height: int = 1920, smoothing: float = 0.3, **_) -> dict:
    """Set output to vertical and the crop mode. track = [{t,cx,cy}] in SOURCE time (from track_faces).

    cx is clamped so the crop window stays inside the frame. smoothing in (0,1]: 1 = no smoothing.
    """
    if mode not in ("face-follow", "center", "none"):
        raise ValueError("mode must be face-follow|center|none")
    if not (0 < smoothing <= 1):
        raise ValueError("smoothing must be in (0, 1]")
    warnings: list[str] = []
    new = clone(plan)
    src = new.get("source", {})
    fps = new.get("output", {}).get("fps") or src.get("fps") or 30
    if mode == "none":
        new["output"] = {"width": src.get("width", width), "height": src.get("height", height), "fps": fps}
        new["reframe"] = {"mode": "none", "track": []}
        return out(new, {"mode": mode}, warnings)
    new["output"] = {"width": int(width), "height": int(height), "fps": fps}
    pts = []
    if mode == "face-follow":
        if not track:
            warnings.append("face-follow requested without a track; fell back to center")
            mode = "center"
        else:
            half = crop_width_frac(src.get("width", 0), src.get("height", 0), width, height) / 2
            for p in sorted(track, key=lambda p: p["t"]):
                cx = min(max(float(p["cx"]), half), 1 - half)
                cy = min(max(float(p.get("cy", 0.5)), 0.0), 1.0)
                pts.append({"t": round(float(p["t"]), 3), "cx": cx, "cy": cy})
            pts = [{"t": p["t"], "cx": round(p["cx"], 4), "cy": round(p["cy"], 4)} for p in _smooth(pts, smoothing)]
    if mode == "center":
        pts = [{"t": 0.0, "cx": 0.5, "cy": 0.5}]
    new["reframe"] = {"mode": mode, "track": pts}
    return out(new, {"mode": mode, "points": len(pts), "output": new["output"]}, warnings)


def _crop_at(plan: dict, t_src: float) -> tuple[float, float] | None:
    rf = plan.get("reframe") or {}
    if rf.get("mode", "none") == "none" or not rf.get("track"):
        return None
    tr = rf["track"]
    if t_src <= tr[0]["t"]:
        return tr[0]["cx"], tr[0]["cy"]
    for a, b in zip(tr, tr[1:]):
        if a["t"] <= t_src <= b["t"]:
            f = (t_src - a["t"]) / max(b["t"] - a["t"], 1e-9)
            return a["cx"] + f * (b["cx"] - a["cx"]), a["cy"] + f * (b["cy"] - a["cy"])
    return tr[-1]["cx"], tr[-1]["cy"]


def preview_frame(plan: dict, time: float = 0.0, workdir: str = ".", time_base: str = "output",
                  filename: str | None = None, max_width: int = 720, **_) -> dict:
    """Extract one JPEG frame (with the reframe crop applied) so Claude can look at it.

    time_base: 'output' (time in the edited video, default) or 'source'. Captions/overlays are NOT burned in
    (render_preview does that); this is a cheap framing/cut check.
    """
    warnings: list[str] = []
    if time_base not in ("output", "source"):
        raise ValueError("time_base must be output|source")
    if time_base == "output":
        if not segments(plan):
            raise ValueError("plan keeps nothing; no frames to preview")
        t_src = output_to_source(plan, time)
        if t_src is None:
            dur = output_duration(plan)
            raise ValueError(f"time {time} is outside output duration {dur:.2f}")
    else:
        t_src = float(time)
    src = Path(plan["source"]["path"])
    if not src.exists():
        raise FileNotFoundError(f"source video not found: {src}")
    wd = Path(workdir)
    wd.mkdir(parents=True, exist_ok=True)
    name = filename or f"preview_{time_base}_{time:.2f}.jpg".replace(" ", "")
    dest = wd / name
    vf = []
    crop = _crop_at(plan, t_src)
    sw, sh = plan["source"].get("width"), plan["source"].get("height")
    ow, oh = plan.get("output", {}).get("width"), plan.get("output", {}).get("height")
    if crop and sw and sh and ow and oh:
        cw = min(sw, round(sh * ow / oh))
        x = int(round(min(max(crop[0] * sw - cw / 2, 0), sw - cw)))
        vf.append(f"crop={cw // 2 * 2}:{sh // 2 * 2}:{x}:0")
    vf.append(f"scale='min({max_width},iw)':-2")
    cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{t_src:.3f}", "-i", str(src), "-frames:v", "1",
           "-vf", ",".join(vf), "-q:v", "3", str(dest)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not dest.exists():
        raise RuntimeError(f"ffmpeg failed: {r.stderr.strip()[:300]}")
    return out(clone(plan), {"path": str(dest), "source_time": round(t_src, 3), "time": time}, warnings)
