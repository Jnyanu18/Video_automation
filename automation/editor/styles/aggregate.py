"""Combine the style profiles of several reference videos into one (ported from ReelForge's aggregator).

Numbers use the median (one odd reel cannot drag the style), choices use the majority. The result is a normal style
profile, so apply_style and the dashboard's style list treat it like any other.
"""
from __future__ import annotations

import statistics
from collections import Counter
from typing import Any, Dict, List, Optional

SCHEMA_VERSION = 1


def _median(values: List[Optional[float]], ndigits: int = 3) -> Optional[float]:
    xs = [float(v) for v in values if v is not None]
    return round(statistics.median(xs), ndigits) if xs else None


def _mode(values: List[Any]) -> Any:
    xs = [v for v in values if v is not None]
    return Counter(xs).most_common(1)[0][0] if xs else None


def aggregate(profiles: List[Dict[str, Any]], name: str) -> Dict[str, Any]:
    if not profiles:
        raise ValueError("no reference profiles to combine")
    eps = [p.get("edit_params") or {} for p in profiles]
    pacing = [p.get("pacing") or {} for p in profiles]
    words = max(1, int(round(_median([e.get("caption_max_words") for e in eps], 1) or 4)))
    edit = {
        "max_pause": _median([e.get("max_pause") for e in eps], 2) or 0.25,
        "target_shot_length": _median([e.get("target_shot_length") for e in eps], 2),
        "caption_style": _mode([e.get("caption_style") for e in eps]) or "bold-pop",
        "caption_max_words": words,
        "caption_position": _mode([e.get("caption_position") for e in eps]) or "bottom",
        "output_aspect": _mode([e.get("output_aspect") for e in eps]) or "9:16",
        "target_lufs": _median([e.get("target_lufs") for e in eps], 1),
    }
    colors = []
    for p in profiles:
        top = ((p.get("palette") or {}).get("colors") or [None])[0]
        if top:
            colors.append(top)
    return {
        "schema_version": SCHEMA_VERSION, "name": name, "learned_from": len(profiles),
        "sources": [(p.get("source") or {}).get("path") for p in profiles],
        "pacing": {
            "avg_shot_length": _median([x.get("avg_shot_length") for x in pacing]),
            "cuts_per_minute": _median([x.get("cuts_per_minute") for x in pacing], 2),
            "p90_pause": _median([x.get("p90_pause") for x in pacing]),
            "shot_count": None,
        },
        "edit_params": edit,
        "palette": {"colors": colors},
    }
