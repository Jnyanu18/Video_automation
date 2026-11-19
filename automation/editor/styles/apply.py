"""apply_style(plan, style) -> plan: push a style profile's edit_params into an EditPlan."""
from __future__ import annotations

import copy
import json
import re
from typing import List, Optional, Tuple

ASPECT_SIZES = {"9:16": (1080, 1920), "1:1": (1080, 1080), "16:9": (1920, 1080)}
HINT_RE = re.compile(r"\n?\[style_hints\] .*")


def _tighten_keeps(keep: List[dict], silences: List[Tuple[float, float]], max_pause: float,
                   min_seg: float = 0.4) -> List[dict]:
    """Shorten every silence (source time) longer than max_pause to max_pause by cutting its middle."""
    pieces = [(k["start"], k["end"]) for k in keep]
    for s, e in silences:
        if e - s <= max_pause + 1e-6:
            continue
        cut_a = s + max_pause / 2
        cut_b = e - max_pause / 2
        nxt = []
        for a, b in pieces:
            if cut_b <= a or cut_a >= b:
                nxt.append((a, b))
                continue
            if cut_a - a > 1e-6:
                nxt.append((a, cut_a))
            if b - cut_b > 1e-6:
                nxt.append((cut_b, b))
        pieces = nxt
    # drop fragments below the minimum, keeping order
    pieces = [p for p in pieces if p[1] - p[0] >= min_seg] or pieces
    return [{"id": f"k{i + 1}", "start": round(a, 3), "end": round(b, 3)} for i, (a, b) in enumerate(pieces)]


def _rechunk_captions(caps: List[dict], max_words: int) -> List[dict]:
    out = []
    for c in caps:
        words = c["text"].split()
        if len(words) <= max_words:
            out.append(dict(c))
            continue
        n = -(-len(words) // max_words)
        size = -(-len(words) // n)
        chunks = [words[i:i + size] for i in range(0, len(words), size)]
        total = sum(len(ch) for ch in chunks)
        t, dur = c["start"], c["end"] - c["start"]
        cw = c.get("words")
        timed = bool(cw) and len(cw) == len(words)  # per-word timings line up with the text: keep them (karaoke)
        for j, ch in enumerate(chunks):
            d = dur * len(ch) / total
            nc = dict(c)
            nc.pop("words", None)
            nc.update(text=" ".join(ch), start=round(t, 3), end=round(t + d, 3))
            if timed:
                ws = cw[j * size:j * size + len(ch)]
                nc.update(words=[dict(w) for w in ws], start=round(ws[0]["start"], 3), end=round(ws[-1]["end"], 3))
            out.append(nc)
            t += d
    for i, c in enumerate(out):
        c["id"] = f"c{i + 1}"
    return out


def apply_style(plan: dict, style: dict, style_path: Optional[str] = None,
                silences: Optional[List[Tuple[float, float]]] = None,
                set_output_size: bool = True) -> dict:
    """Return a modified COPY of `plan` carrying the style.

    - captions: style name set on every caption; long captions re-split to caption_max_words.
    - style_ref: style_path if given, else "styles/<name>.json".
    - output size: follows the style's aspect ratio (disable with set_output_size=False).
    - silences (optional, source-time spans): pauses longer than max_pause are shortened in `keep`.
      Without them the plan cannot be pause-tightened here (the plan has no silence data); the
      value is still recorded in the hints so the cutter can use it.
    - target_shot_length / max_pause / caption_position / target_lufs: recorded as a single
      `[style_hints] {json}` line in plan["notes"] (EditPlan has no first-class field for them).
    """
    p = copy.deepcopy(plan)
    ep = style["edit_params"]
    p["style_ref"] = style_path or f"styles/{style['name']}.json"

    if p.get("captions"):
        p["captions"] = _rechunk_captions(p["captions"], int(ep["caption_max_words"]))
        for c in p["captions"]:
            c["style"] = ep["caption_style"]

    if set_output_size and ep.get("output_aspect") in ASPECT_SIZES:
        w, h = ASPECT_SIZES[ep["output_aspect"]]
        out = dict(p.get("output") or {})
        out.update(width=w, height=h)
        out.setdefault("fps", (p.get("source") or {}).get("fps", 30))
        p["output"] = out

    if silences and p.get("keep"):
        p["keep"] = _tighten_keeps(p["keep"], silences, ep["max_pause"])

    hints = {k: ep[k] for k in ("max_pause", "target_shot_length", "caption_position", "target_lufs")
             if ep.get(k) is not None}
    notes = HINT_RE.sub("", p.get("notes") or "")
    p["notes"] = (notes + "\n" if notes else "") + "[style_hints] " + json.dumps(hints, sort_keys=True)
    return p
