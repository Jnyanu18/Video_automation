"""Effect tools: set_speed, add_zoom, add_transition, set_color_grade, clear_effects.

All times are SOURCE seconds, like keep/captions. Each tool is pure: it returns a modified copy of the plan.
"""
from __future__ import annotations

from pathlib import Path

from tools.edit._common import clone, out
from tools.edit.timeline import (MAX_FACTOR, MIN_FACTOR, TRANSITION_TOL, normalize_keep, output_duration, segments,
                                 speed_ranges)

from .ffmpeg import GRADE_PRESETS, LIMITS, LUT_EXT, XFADE


def _kept(plan: dict) -> list[tuple[float, float]]:
    return normalize_keep(plan.get("keep"), plan.get("source", {}).get("duration"))


def _overlaps_kept(plan: dict, s: float, e: float) -> bool:
    return any(min(e, ke) - max(s, ks) > 1e-6 for ks, ke in _kept(plan))


def _range(start, end, what: str) -> tuple[float, float]:
    s, e = float(start), float(end)
    if s < 0 or e <= s:
        raise ValueError(f"bad {what} range [{s}, {e}]: need 0 <= start < end")
    return s, e


def set_speed(plan: dict, start: float, end: float, factor: float, **_) -> dict:
    """Change playback speed of source range [start, end] (video and audio together, pitch preserved).

    factor 2 = twice as fast, 0.5 = half speed, 1 = restore normal speed. A new range overrides any earlier
    speed set on the same footage.
    """
    s, e = _range(start, end, "speed")
    f = float(factor)
    warnings: list[str] = []
    if not MIN_FACTOR <= f <= MAX_FACTOR:
        raise ValueError(f"factor must be between {MIN_FACTOR} and {MAX_FACTOR}, got {f}")
    if not _overlaps_kept(plan, s, e):
        warnings.append("range does not overlap any kept footage; it has no visible effect")
    new = clone(plan)
    new["speed"] = list(plan.get("speed") or []) + [{"id": "tmp", "start": s, "end": e, "factor": f}]
    rs = speed_ranges(new)  # resolves overlaps (later wins) and drops factor-1 ranges
    new["speed"] = [{"id": f"s{i + 1}", "start": round(a, 6), "end": round(b, 6), "factor": ff}
                    for i, (a, b, ff) in enumerate(rs)]
    if not new["speed"]:
        del new["speed"]
    if f < 0.25:
        warnings.append("very slow motion makes the audio sound odd; consider muting that range")
    return out(new, {"speed_ranges": len(new.get("speed", [])),
                     "output_duration_before": round(output_duration(plan), 3),
                     "output_duration": round(output_duration(new), 3)}, warnings)


def add_zoom(plan: dict, start: float, end: float, scale: float = 1.25, cx: float = 0.5, cy: float = 0.5,
             ramp: float = 0.4, ease: str = "smooth", **_) -> dict:
    """Punch-in zoom on source range [start, end]: eases to `scale` (1.0-4.0) centred on (cx, cy) in 0..1,
    holds, then eases back out. ramp = seconds each way."""
    s, e = _range(start, end, "zoom")
    if not 1.0 < float(scale) <= 4.0:
        raise ValueError("scale must be > 1.0 and <= 4.0")
    if not (0 <= float(cx) <= 1 and 0 <= float(cy) <= 1):
        raise ValueError("cx and cy must be between 0 and 1")
    if float(ramp) <= 0:
        raise ValueError("ramp must be > 0")
    if ease not in ("smooth", "linear"):
        raise ValueError("ease must be 'smooth' or 'linear'")
    warnings: list[str] = []
    if not _overlaps_kept(plan, s, e):
        warnings.append("range does not overlap any kept footage; it has no visible effect")
    if float(ramp) * 2 > e - s:
        warnings.append("ramp is longer than half the zoom; it will be shortened")
    if float(scale) > 2.0:
        warnings.append("zoom above 2x will look soft on 1080p footage")
    new = clone(plan)
    zs = list(new.get("zooms") or [])
    nums = [int(str(z["id"])[1:]) for z in zs if str(z.get("id", "")).startswith("z") and str(z["id"])[1:].isdigit()]
    n = 1 + max(nums or [0])
    zs.append({"id": f"z{n}", "start": s, "end": e, "scale": float(scale), "cx": float(cx), "cy": float(cy),
               "ramp": float(ramp), "ease": ease})
    new["zooms"] = zs
    return out(new, {"id": f"z{n}", "zooms": len(zs)}, warnings)


def _gaps(plan: dict) -> list[tuple[float, float]]:
    k = _kept(plan)
    return [(a[1], b[0]) for a, b in zip(k, k[1:])]


def add_transition(plan: dict, kind: str = "crossfade", duration: float = 0.5, boundary: int | None = None,
                   at: float | None = None, all: bool = False, **_) -> dict:
    """Add a transition at a cut between two kept segments (the output gets `duration` shorter per transition).

    Pick the cut with `boundary` (0 = between the first and second kept segment), `at` (a source time near the cut),
    or `all=true` for every cut. kind: crossfade, fade-black, fade-white, dissolve, wipe-left/right/up/down,
    slide-left/right/up/down, smooth-left/right, circle-open/close, radial, pixelize, zoom-in.
    """
    if kind not in XFADE:
        raise ValueError(f"unknown transition '{kind}'. Choose from: {', '.join(sorted(XFADE))}")
    if not 0.05 <= float(duration) <= 3.0:
        raise ValueError("duration must be between 0.05 and 3.0 seconds")
    gaps = _gaps(plan)
    if not gaps:
        raise ValueError("the edit has a single kept segment: there is no cut to put a transition on")
    if all:
        picks = list(range(len(gaps)))
    elif boundary is not None:
        if not 0 <= int(boundary) < len(gaps):
            raise ValueError(f"boundary must be 0..{len(gaps) - 1}")
        picks = [int(boundary)]
    elif at is not None:
        picks = [min(range(len(gaps)), key=lambda i: abs((gaps[i][0] + gaps[i][1]) / 2 - float(at)))]
    else:
        raise ValueError("give boundary, at, or all=true")
    new = clone(plan)
    tr = list(new.get("transitions") or [])
    warnings: list[str] = []
    segs = segments(plan)
    for i in picks:
        a, b = gaps[i]
        mid = round((a + b) / 2, 6)
        tr = [t for t in tr if not (a - TRANSITION_TOL <= float(t["at"]) <= b + TRANSITION_TOL)]  # replace existing
        tr.append({"id": "tmp", "at": mid, "kind": kind, "duration": float(duration)})
        shorter = min(segs[i]["out_end"] - segs[i]["out_start"], segs[i + 1]["out_end"] - segs[i + 1]["out_start"])
        if float(duration) > shorter / 2 + 1e-9:
            warnings.append(f"transition at cut {i} is longer than half of the shorter neighbouring clip "
                            f"({shorter:.2f}s); it will be shortened to {shorter / 2:.2f}s")
    tr.sort(key=lambda t: float(t["at"]))
    for n, t in enumerate(tr, 1):
        t["id"] = f"t{n}"
    new["transitions"] = tr
    return out(new, {"transitions": len(tr), "applied_to_cuts": picks,
                     "output_duration": round(output_duration(new), 3)}, warnings)


def set_color_grade(plan: dict, preset: str | None = None, lut: str | None = None, exposure: float | None = None,
                    contrast: float | None = None, saturation: float | None = None, brightness: float | None = None,
                    reset: bool = False, **_) -> dict:
    """Grade the whole video: a `preset`, an optional 3D LUT file (.cube/.3dl), and manual exposure (EV, -3..3),
    contrast (1 = unchanged, 0.5..2), saturation (1 = unchanged, 0..3), brightness (-0.5..0.5).
    Fields not given keep their current value; reset=true clears the grade."""
    new = clone(plan)
    if reset:
        new.pop("color_grade", None)
        return out(new, {"color_grade": None})
    g = dict(new.get("color_grade") or {})
    if preset is not None:
        if preset not in GRADE_PRESETS:
            raise ValueError(f"unknown preset '{preset}'. Choose from: {', '.join(sorted(GRADE_PRESETS))}")
        g["preset"] = preset
    if lut is not None:
        p = Path(lut).expanduser()
        if not p.is_file():
            raise ValueError(f"LUT file not found: {lut}")
        if p.suffix.lower() not in LUT_EXT:
            raise ValueError("LUT must be a .cube or .3dl file")
        g["lut"] = str(p.resolve())
    for key, val in (("exposure", exposure), ("contrast", contrast), ("saturation", saturation),
                     ("brightness", brightness)):
        if val is None:
            continue
        lo, hi = LIMITS[key]
        if not lo <= float(val) <= hi:
            raise ValueError(f"{key} must be between {lo} and {hi}, got {val}")
        g[key] = float(val)
    if not g:
        raise ValueError("nothing to set: give preset, lut, exposure, contrast, saturation or brightness")
    new["color_grade"] = g
    return out(new, {"color_grade": g})


def clear_effects(plan: dict, kind: str, ids: list | None = None, **_) -> dict:
    """Remove effects. kind: speed | zooms | transitions | color_grade | all. `ids` limits it to some items."""
    kinds = ("speed", "zooms", "transitions", "color_grade")
    if kind != "all" and kind not in kinds:
        raise ValueError(f"kind must be one of {', '.join(kinds)} or all")
    new = clone(plan)
    removed = 0
    for k in kinds if kind == "all" else (kind,):
        if k not in new:
            continue
        if k == "color_grade" or not ids:
            removed += 1 if k == "color_grade" else len(new[k])
            del new[k]
        else:
            left = [x for x in new[k] if x.get("id") not in set(ids)]
            removed += len(new[k]) - len(left)
            if left:
                new[k] = left
            else:
                del new[k]
    return out(new, {"removed": removed, "output_duration": round(output_duration(new), 3)},
               [] if removed else ["nothing matched; plan unchanged"])
