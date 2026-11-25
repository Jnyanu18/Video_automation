"""Source-time -> output-time remap. Uses tools/edit/timeline.py (owner E) when present, else a local fallback."""
from __future__ import annotations

import copy
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[2]


def _fallback_remap(plan: dict) -> dict:
    """Return a copy of plan whose captions/overlays are in OUTPUT (cut) time.

    Items fully outside every keep segment are dropped; items straddling a cut are
    clipped to the kept portion (split across segments if they span several).
    """
    out = copy.deepcopy(plan)
    segs, off = [], 0.0
    for s in plan.get("keep", []):
        segs.append((s["start"], s["end"], off))
        off += s["end"] - s["start"]

    def remap(items):
        res = []
        for it in items or []:
            pieces = []
            for a, b, o in segs:
                lo, hi = max(it["start"], a), min(it["end"], b)
                if hi - lo > 1e-3:
                    pieces.append((o + lo - a, o + hi - a))
            # merge pieces that touch (item spans adjacent segments)
            merged = []
            for p in pieces:
                if merged and abs(merged[-1][1] - p[0]) < 1e-3:
                    merged[-1] = (merged[-1][0], p[1])
                else:
                    merged.append(p)
            for n, (s, e) in enumerate(merged):
                c = dict(it)
                c["start"], c["end"] = round(s, 3), round(e, 3)
                if len(merged) > 1:
                    c["id"] = f'{it.get("id", "x")}_{n}'
                res.append(c)
        return res

    out["captions"] = remap(plan.get("captions"))
    out["overlays"] = remap(plan.get("overlays"))
    out["_remapped"] = True
    return out


def remap_to_output(plan: dict) -> dict:
    """Try tools.edit.timeline.remap_to_output lazily; fall back to the local version on any problem."""
    try:
        if str(_REPO) not in sys.path:
            sys.path.append(str(_REPO))
        from tools.edit.timeline import remap_to_output as ext  # type: ignore
        res = ext(copy.deepcopy(plan))
        if isinstance(res, dict) and "captions" in res:
            res.setdefault("_remapped", True)
            return res
    except Exception:
        pass
    return _fallback_remap(plan)
