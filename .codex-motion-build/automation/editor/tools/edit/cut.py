"""Cutting tools: edit `keep` (source time)."""
from __future__ import annotations

import json
from pathlib import Path

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


WORD_GUARD = 0.03  # seconds kept clear on both sides of every spoken word


def _transcript_words(workdir) -> list[dict]:
    """Words saved by `transcribe` in <workdir>/transcript.json ([] when there is none)."""
    if not workdir:
        return []
    f = Path(workdir) / "transcript.json"
    try:
        data = json.loads(f.read_text(encoding="utf-8")) if f.is_file() else {}
    except (OSError, ValueError):
        return []
    words = data.get("words") if isinstance(data, dict) else data
    return sorted(({"start": float(w["start"]), "end": float(w["end"])} for w in (words or []) if "start" in w and "end" in w),
                  key=lambda w: w["start"])


def _merge_close(cuts: list[tuple[float, float]], words: list[dict], min_island: float) -> list[tuple[float, float]]:
    """Join neighbouring cuts whose gap is a tiny island with no speech in it (noise between two silences)."""
    cuts = sorted(cuts)
    out: list[list[float]] = []
    for a, b in cuts:
        if out and a - out[-1][1] < min_island and not any(w["end"] > out[-1][1] and w["start"] < a for w in words):
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return [(a, b) for a, b in out]


def cut_silences(plan: dict, silences: list, min_silence: float = 0.5, padding: float = 0.08,
                 keep_gap: float = 0.0, snap_to_words: bool = True, min_island: float = 0.3,
                 workdir: str | None = None, **_) -> dict:
    """Remove silent ranges (source time, e.g. from detect_silences) from keep.

    Only silences >= min_silence long are cut; `padding` seconds of each silence edge are kept so speech is not clipped.
    keep_gap: leave this many seconds of the silence (split in the middle) as a breath.
    snap_to_words (default): when `transcribe` has run, a cut never touches a spoken word (0.03 s clear on both sides), so
    no cut lands inside a word. Cuts separated by a speechless island shorter than min_island are joined, so no slivers remain.
    """
    warnings: list[str] = []
    sil = parse_ranges(silences, "silence")
    words = _transcript_words(workdir) if snap_to_words else []
    dur = float((plan.get("source") or {}).get("duration") or 0)
    raw = []
    for s, e in sil:
        if e - s < min_silence:
            continue
        cs = s if s <= 0.001 else s + padding              # silence touching the file start/end: cut right to the edge,
        ce = e if (dur and e >= dur - 0.001) else e - padding  # otherwise padding would leave a useless sliver
        if ce - cs > 0:
            raw.append((cs, ce))
    cuts = []
    for cs, ce in _merge_close(raw, words, min_island):  # tiny speechless islands between two silences are noise, not content
        pieces = [(cs, ce)]
        if keep_gap > 0 and ce - cs > keep_gap:
            mid = (cs + ce) / 2
            pieces = [(cs, mid - keep_gap / 2), (mid + keep_gap / 2, ce)]
        if words:
            zones = [(w["start"] - WORD_GUARD, w["end"] + WORD_GUARD) for w in words]
            pieces = [p for piece in pieces for p in subtract([piece], zones) if p[1] - p[0] >= 0.05]
        cuts.extend(pieces)
    if sil and not words and snap_to_words:
        warnings.append("no transcript yet: cuts follow the audio only and may land inside a word. Call transcribe first.")
    before = _current(plan)
    after = subtract(before, cuts)
    if words:  # a kept scrap shorter than min_island that holds no spoken word is noise (e.g. a tail after the last word)
        after = [sp for sp in after if sp[1] - sp[0] >= min_island or any(w["end"] > sp[0] and w["start"] < sp[1] for w in words)] or after
    if not sil:
        warnings.append("no silences supplied; plan unchanged")
    return _finish(plan, before, after, warnings, {"silences_cut": len(cuts), "snapped_to_words": bool(words)})


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
