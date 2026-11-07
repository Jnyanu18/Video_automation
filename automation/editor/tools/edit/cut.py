"""Cutting tools: edit `keep` (source time)."""
from __future__ import annotations

from ._common import clone, out, parse_ranges, spans_to_keep, subtract
from .timeline import normalize_keep, output_duration


def _current(plan: dict) -> list[tuple[float, float]]:
    return normalize_keep(plan.get("keep"), plan.get("source", {}).get("duration"))


def _finish(plan, before, spans, warnings, extra=None):
    new = clone(plan)
    new["keep"] = spans_to_keep(spans)
    if not spans:
        warnings.append("result keeps nothing: the output would be empty")
    res = {"kept_before": round(sum(e - s for s, e in before), 3),
           "kept_after": round(sum(e - s for s, e in spans), 3),
           "output_duration": round(output_duration(new), 3), "segments": len(spans)}
    res["removed"] = round(res["kept_before"] - res["kept_after"], 3)
    res.update(extra or {})
    return out(new, res, warnings)


def cut_silences(plan: dict, silences: list, min_silence: float = 0.5, padding: float = 0.08,
                 keep_gap: float = 0.0, **_) -> dict:
    """Remove silent ranges (source time, e.g. from detect_silences) from keep.

    Only silences >= min_silence long are cut; `padding` seconds of each silence edge are kept so
    speech is not clipped. keep_gap: leave this many seconds of the silence (split in the middle) as a breath.
    """
    warnings: list[str] = []
    sil = parse_ranges(silences, "silence")
    cuts = []
    for s, e in sil:
        if e - s < min_silence:
            continue
        cs, ce = s + padding, e - padding
        if keep_gap > 0 and ce - cs > keep_gap:
            mid = (cs + ce) / 2
            cuts.append((cs, mid - keep_gap / 2))
            cuts.append((mid + keep_gap / 2, ce))
        elif ce > cs:
            cuts.append((cs, ce))
    before = _current(plan)
    after = subtract(before, cuts)
    if not sil:
        warnings.append("no silences supplied; plan unchanged")
    return _finish(plan, before, after, warnings, {"silences_cut": len(cuts)})


def cut_segments(plan: dict, remove: list | None = None, keep: list | None = None, **_) -> dict:
    """Remove `remove` ranges from the current keep, or (if `keep` given) replace keep with those ranges.

    All times are SOURCE seconds. If both are given, keep is applied first, then remove.
    """
    if remove is None and keep is None:
        raise ValueError("provide `remove` and/or `keep`")
    warnings: list[str] = []
    dur = plan.get("source", {}).get("duration")
    before = _current(plan)
    spans = before
    if keep is not None:
        spans = normalize_keep([{"start": s, "end": e} for s, e in parse_ranges(keep, "keep")], dur)
        if dur is not None and any(e > dur + 1e-6 for _, e in parse_ranges(keep, "keep")):
            warnings.append("some keep ranges extend past source duration and were clamped")
    if remove:
        rm = parse_ranges(remove, "remove")
        spans = subtract(spans, rm)
        if not any(min(e, re) - max(s, rs) > 1e-6 for rs, re in rm for s, e in before):
            warnings.append("remove ranges did not overlap any kept footage")
    return _finish(plan, before, spans, warnings)
