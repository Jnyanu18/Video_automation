"""Shared helpers for edit tools."""
from __future__ import annotations

import copy
import json
from pathlib import Path

from .timeline import EPS, normalize_keep

SCHEMA_PATH = Path(__file__).with_name("editplan.schema.json")


def load_schema() -> dict:
    return json.loads(SCHEMA_PATH.read_text())


def out(plan: dict, result: dict | None = None, warnings: list[str] | None = None) -> dict:
    return {"plan": plan, "result": result or {}, "warnings": warnings or []}


def clone(plan: dict) -> dict:
    return copy.deepcopy(plan)


def spans_to_keep(spans: list[tuple[float, float]]) -> list[dict]:
    return [{"id": f"k{i + 1}", "start": round(s, 6), "end": round(e, 6)} for i, (s, e) in enumerate(spans)]


def subtract(spans: list[tuple[float, float]], cuts: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Remove `cuts` from `spans`; drops slivers shorter than EPS."""
    cuts = normalize_pairs(cuts)
    res = []
    for s, e in spans:
        cur = s
        for cs, ce in cuts:
            if ce <= cur or cs >= e:
                continue
            if cs > cur + EPS:
                res.append((cur, cs))
            cur = max(cur, ce)
        if e - cur > EPS:
            res.append((cur, e))
    return res


def normalize_pairs(pairs) -> list[tuple[float, float]]:
    return normalize_keep([{"start": a, "end": b} for a, b in pairs])


def parse_ranges(items, what: str) -> list[tuple[float, float]]:
    """Accept [{"start","end"}] or [[s,e]]; raises ValueError on bad input."""
    res = []
    for it in items or []:
        try:
            if isinstance(it, dict):
                s, e = float(it["start"]), float(it["end"])
            else:
                s, e = float(it[0]), float(it[1])
        except (KeyError, IndexError, TypeError, ValueError) as ex:
            raise ValueError(f"bad {what} entry {it!r}") from ex
        if s < 0 or e < s:
            raise ValueError(f"bad {what} range [{s}, {e}]")
        res.append((s, e))
    return res
