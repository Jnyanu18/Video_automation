"""Brand check reports attached to posts and renders. Reports only: they never block a job or a publish.

brand_report returns None when the account has no saved kit, so accounts without a kit are unaffected.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

from .store import load_kit
from .validator import check_output


def string_leaves(value: Any) -> List[str]:
    """Every string inside a nested dict/list, in order."""
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        out: List[str] = []
        for v in value.values():
            out += string_leaves(v)
        return out
    if isinstance(value, (list, tuple)):
        out = []
        for v in value:
            out += string_leaves(v)
        return out
    return []


def brand_report(work_dir: Path, owner: str, kind: str, output: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        kit = load_kit(work_dir, owner)
    except Exception as exc:  # a damaged kit file must not break a post or render
        return {"ok": None, "failures": [], "note": f"brand kit could not be read ({type(exc).__name__})"}
    if kit is None:
        return None
    failures = check_output(kit, output, kind=kind)
    return {"ok": not failures, "kind": kind, "failures": [f.to_dict() for f in failures],
            "kit_version": kit.version, "note": "Report only. Nothing was blocked."}
