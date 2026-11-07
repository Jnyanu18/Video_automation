"""Timeline math for EditPlans: source time <-> output (post-cut) time.

Conventions
- `keep` segments are in SOURCE time. Empty/inverted segments are ignored,
  overlapping or touching ones are merged (see `normalize_keep`).
- `remap_to_output(plan)` returns a NEW plan (input untouched) where:
    * `captions` and `overlays` are in OUTPUT time (clipped to kept ranges; an item
      spanning a cut is split into pieces with ids `<id>`, `<id>~2`, ...; items fully
      inside removed ranges are dropped)
    * `keep` is rewritten to the normalized segments in source time (unchanged meaning)
    * `reframe.track` points are remapped to output time (points in cut ranges dropped)
    * `timeline` = {"segments": [{"src_start","src_end","out_start","out_end","pieces":[...]}], "duration"}
    * `time_base` = "output" (so a second call is a no-op and returns a copy)

Speed and transitions (optional plan fields, all SOURCE time)
- `speed`: [{"id","start","end","factor"}]; output length of a source span is span/factor. A kept segment is split
  into `pieces` at speed boundaries; each piece has its own `factor`. Items (captions, overlays, zooms, mutes) are
  mapped piecewise-linearly, so an item spanning a speed change stays ONE item with a different length.
- `transitions`: [{"id","at","kind","duration"}]; `at` is a source time inside the gap between two kept segments
  (or the cut point). The two neighbouring segments overlap by the (clamped) duration, so every transition makes the
  output that much shorter; later segments shift earlier. `segments()` reports it as `overlap_in`.
"""
from __future__ import annotations

import copy

EPS = 1e-6
ROUND = 6


def _r(x: float) -> float:
    return round(x, ROUND)


def normalize_keep(keep: list[dict] | None, duration: float | None = None) -> list[tuple[float, float]]:
    """Sorted, merged, non-empty (start, end) pairs, clamped to [0, duration]."""
    spans = []
    for k in keep or []:
        s, e = float(k["start"]), float(k["end"])
        if duration is not None:
            s, e = max(0.0, s), min(e, float(duration))
        if e - s > EPS:
            spans.append((s, e))
    spans.sort()
    merged: list[list[float]] = []
    for s, e in spans:
        if merged and s <= merged[-1][1] + EPS:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return [(s, e) for s, e in merged]


MIN_FACTOR, MAX_FACTOR = 0.1, 16.0
TRANSITION_TOL = 0.011


def speed_ranges(plan: dict) -> list[tuple[float, float, float]]:
    """Sorted (start, end, factor) with factor != 1; overlaps resolved so the LATER list entry wins."""
    pts = sorted({0.0} | {float(x[k]) for x in plan.get("speed") or [] for k in ("start", "end")})
    res: list[tuple[float, float, float]] = []
    for a, b in zip(pts, pts[1:]):
        if b - a <= EPS:
            continue
        mid, f = (a + b) / 2, 1.0
        for x in plan.get("speed") or []:
            if float(x["start"]) <= mid <= float(x["end"]):
                f = min(max(float(x["factor"]), MIN_FACTOR), MAX_FACTOR)
        if abs(f - 1.0) > EPS:
            if res and abs(res[-1][2] - f) < EPS and abs(res[-1][1] - a) < EPS:
                res[-1] = (res[-1][0], b, f)
            else:
                res.append((a, b, f))
    return res


def _pieces(s: float, e: float, speeds: list[tuple[float, float, float]]) -> list[dict]:
    """Split source span [s, e] at speed boundaries. Pieces carry src_start/src_end/factor/length (output seconds)."""
    cuts = sorted({s, e} | {x for a, b, _ in speeds for x in (a, b) if s < x < e})
    res = []
    for a, b in zip(cuts, cuts[1:]):
        f = 1.0
        for sa, sb, sf in speeds:
            if sa - EPS <= (a + b) / 2 <= sb + EPS:
                f = sf
        res.append({"src_start": a, "src_end": b, "factor": f, "length": (b - a) / f})
    return res


def transition_at(plan: dict, left_end: float, right_start: float) -> dict | None:
    """The transition (if any) whose `at` lies in the gap [left_end, right_start] between two kept segments."""
    for t in plan.get("transitions") or []:
        if left_end - TRANSITION_TOL <= float(t["at"]) <= right_start + TRANSITION_TOL:
            return t
    return None


def segments(plan: dict) -> list[dict]:
    """Normalized segments with output offsets (speed- and transition-aware)."""
    spans = normalize_keep(plan.get("keep"), plan.get("source", {}).get("duration"))
    speeds = speed_ranges(plan)
    out, end, prev_len = [], 0.0, 0.0
    for i, (s, e) in enumerate(spans):
        pcs = _pieces(s, e, speeds)
        length = sum(p["length"] for p in pcs)
        overlap, tr = 0.0, None
        if i:
            tr = transition_at(plan, spans[i - 1][1], s)
            if tr:
                overlap = max(min(float(tr.get("duration", 0.5)), prev_len / 2, length / 2), 0.0)
        o0 = end - overlap
        off, pieces = o0, []
        for p in pcs:
            pieces.append({"src_start": _r(p["src_start"]), "src_end": _r(p["src_end"]), "factor": p["factor"],
                           "out_start": _r(off), "out_end": _r(off + p["length"])})
            off += p["length"]
        sg = {"src_start": _r(s), "src_end": _r(e), "out_start": _r(o0), "out_end": _r(off), "pieces": pieces}
        if tr and overlap > EPS:
            sg["overlap_in"] = _r(overlap)
            sg["transition"] = {"id": tr.get("id"), "kind": tr.get("kind", "crossfade"), "duration": _r(overlap)}
        out.append(sg)
        end, prev_len = off, length
    return out


def output_duration(plan: dict) -> float:
    segs = segments(plan)
    return segs[-1]["out_end"] if segs else 0.0


def _map_in_segment(sg: dict, t: float) -> float:
    """Source time -> output time inside one segment (t is clamped into the segment)."""
    t = min(max(t, sg["src_start"]), sg["src_end"])
    for p in sg["pieces"]:
        if p["src_start"] - EPS <= t <= p["src_end"] + EPS:
            return _r(p["out_start"] + (min(max(t, p["src_start"]), p["src_end"]) - p["src_start"]) / p["factor"])
    return sg["out_end"]


def source_to_output(plan: dict, t: float) -> float | None:
    """Map one source time to output time; None if t lies in a cut region."""
    return source_to_output_segs(segments(plan), t)


def output_to_source(plan: dict, t: float) -> float | None:
    """Inverse of source_to_output. Inside a transition overlap the outgoing (earlier) segment wins."""
    for sg in segments(plan):
        if sg["out_start"] - EPS <= t <= sg["out_end"] + EPS:
            for p in sg["pieces"]:
                if p["out_start"] - EPS <= t <= p["out_end"] + EPS:
                    return _r(p["src_start"] + (min(max(t, p["out_start"]), p["out_end"]) - p["out_start"]) * p["factor"])
    return None


def _clip(item: dict, segs: list[dict]) -> list[dict]:
    pieces = []
    for sg in segs:
        s, e = max(item["start"], sg["src_start"]), min(item["end"], sg["src_end"])
        if e - s > EPS:
            p = dict(item)
            p["start"] = _map_in_segment(sg, s)
            p["end"] = _map_in_segment(sg, e)
            if item.get("words"):  # word timings (karaoke) follow the same mapping, clipped to this piece
                p["words"] = [{**w, "start": _map_in_segment(sg, max(float(w["start"]), s)),
                               "end": _map_in_segment(sg, min(float(w["end"]), e))}
                              for w in item["words"] if min(float(w["end"]), e) - max(float(w["start"]), s) > EPS]
            pieces.append(p)
    # zero-length items (start == end) inside a kept segment survive as points
    if not pieces and item["end"] - item["start"] <= EPS:
        o = source_to_output_segs(segs, item["start"])
        if o is not None:
            p = dict(item)
            p["start"] = p["end"] = o
            pieces.append(p)
    for i, p in enumerate(pieces):
        if i:
            p["id"] = f"{item['id']}~{i + 1}"
    return pieces


def source_to_output_segs(segs: list[dict], t: float) -> float | None:
    for sg in segs:
        if sg["src_start"] - EPS <= t <= sg["src_end"] + EPS:
            return _map_in_segment(sg, t)
    return None


def remap_to_output(plan: dict) -> dict:
    new = copy.deepcopy(plan)
    if plan.get("time_base") == "output":
        return new
    segs = segments(plan)
    new["keep"] = [{"id": f"k{i + 1}", "start": sg["src_start"], "end": sg["src_end"]} for i, sg in enumerate(segs)]
    for key in ("captions", "overlays", "zooms"):
        if key == "zooms" and key not in plan:
            continue
        items = []
        for it in sorted(plan.get(key) or [], key=lambda x: (x["start"], x["end"])):
            items.extend(_clip(it, segs))
        new[key] = items
    if (plan.get("audio") or {}).get("mute"):
        items = []
        for it in sorted(plan["audio"]["mute"], key=lambda x: (x["start"], x["end"])):
            items.extend(_clip(it, segs))
        new["audio"]["mute"] = items
    rf = new.get("reframe")
    if rf and rf.get("track"):
        tr = []
        for pt in rf["track"]:
            o = source_to_output_segs(segs, pt["t"])
            if o is not None:
                q = dict(pt)
                q["t"] = o
                tr.append(q)
        rf["track"] = tr
    new["timeline"] = {"segments": segs, "duration": segs[-1]["out_end"] if segs else 0.0}
    new["time_base"] = "output"
    return new
