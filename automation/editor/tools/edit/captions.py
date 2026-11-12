"""Caption tools (SOURCE time; services/render remaps via timeline.remap_to_output)."""
from __future__ import annotations

import re

from ._common import clone, out
from .styles import CAPTION_STYLES, DEFAULT_STYLE

_SENT_END = re.compile(r"[.!?]$")


def _group_words(words: list[dict], max_words: int, max_gap: float, max_chars: int, min_dur: float = 0.8) -> list[dict]:
    groups, cur = [], []
    def flush():
        if cur:
            groups.append({"text": " ".join(w["word"].strip() for w in cur), "start": cur[0]["start"],
                           "end": cur[-1]["end"], "words": [dict(w) for w in cur]})
            cur.clear()
    for w in words:
        if cur and (len(cur) >= max_words or w["start"] - cur[-1]["end"] > max_gap
                    or len(" ".join(x["word"] for x in cur + [w])) > max_chars):
            flush()
        cur.append(w)
        if _SENT_END.search(w["word"].strip()):
            flush()
    flush()
    return _linger(_merge_flashes(groups, max_gap, max_chars, min_dur))


def _linger(groups: list[dict], target_cps: float = 18.0, max_extra: float = 0.4) -> list[dict]:
    """Keep a fast line on screen a little after the last word is spoken (never into the next line), so it can be read."""
    for i, g in enumerate(groups):
        need = len(g["text"]) / target_cps - (g["end"] - g["start"])
        if need <= 0:
            continue
        room = (groups[i + 1]["start"] - 0.03 if i + 1 < len(groups) else g["end"] + max_extra) - g["end"]
        g["end"] = round(g["end"] + max(0.0, min(need, max_extra, room)), 3)
    return groups


def _merge_flashes(groups: list[dict], max_gap: float, max_chars: int, min_dur: float) -> list[dict]:
    """A caption that is on screen for less than min_dur cannot be read. Join it to a neighbour when they are close in time
    and the result still fits max_chars; a lone short line after a long pause stays as it is."""
    i = 0
    while i < len(groups):
        g = groups[i]
        if g["end"] - g["start"] >= min_dur:
            i += 1
            continue
        cand = []
        if i + 1 < len(groups):
            cand.append((groups[i + 1]["start"] - g["end"], i, i + 1))
        if i > 0:
            cand.append((g["start"] - groups[i - 1]["end"], i - 1, i))
        cand = [c for c in cand if c[0] <= max_gap and not _SENT_END.search(groups[c[1]]["text"].strip())  # never merge across a sentence end
                and len(groups[c[1]]["text"]) + 1 + len(groups[c[2]]["text"]) <= max_chars]
        if not cand:
            i += 1
            continue
        _, a, b = min(cand)
        A, B = groups[a], groups[b]
        groups[a:b + 1] = [{"text": A["text"] + " " + B["text"], "start": A["start"], "end": B["end"], "words": A["words"] + B["words"]}]
        i = max(a, 0)
    return groups


def set_captions(plan: dict, captions: list | None = None, words: list | None = None, style: str | None = None,
                 mode: str = "replace", max_words: int | None = None, max_gap: float = 0.6,
                 max_chars: int = 42, from_transcript: bool = False, workdir: str | None = None,
                 min_duration: float = 0.9, **_) -> dict:
    """Set captions from explicit [{text,start,end}] or word timings [{word,start,end}] (source seconds).

    from_transcript=true reads the words that `transcribe` saved to <workdir>/transcript.json, so a long video does not
    need its whole transcript pasted through the model (tool results are truncated).

    Words are grouped into short caption lines (max_words, split at pauses > max_gap and at sentence ends).
    mode: replace | append. Captions overlapping an existing item are NOT rejected, but warned about.
    """
    if from_transcript:
        import json
        from pathlib import Path
        f = Path(workdir or ".") / "transcript.json"
        if captions is not None or words is not None:
            raise ValueError("from_transcript cannot be combined with `captions` or `words`")
        if not f.is_file():
            raise ValueError("no transcript saved yet: call transcribe first")
        data = json.loads(f.read_text(encoding="utf-8"))
        words = data.get("words") if isinstance(data, dict) else data
        if not words:
            raise ValueError("the saved transcript has no words (silent or unrecognised audio)")
    if (captions is None) == (words is None):
        raise ValueError("provide exactly one of `captions` or `words`")
    if mode not in ("replace", "append"):
        raise ValueError("mode must be replace|append")
    style = style or DEFAULT_STYLE
    if style not in CAPTION_STYLES:
        raise ValueError(f"unknown style {style!r}; available: {sorted(CAPTION_STYLES)}")
    warnings: list[str] = []
    if words is not None:
        mw = max_words or CAPTION_STYLES[style].get("max_words", 4)
        ws = []
        for w in words:
            if not str(w.get("word", "")).strip():
                continue
            ws.append({"word": str(w["word"]), "start": float(w["start"]), "end": float(w["end"])})
        ws.sort(key=lambda w: w["start"])
        items = _group_words(ws, mw, max_gap, max_chars, min_dur=float(min_duration))
    else:
        items = []
        for c in captions:
            items.append({"text": str(c["text"]), "start": float(c["start"]), "end": float(c["end"])})
        items.sort(key=lambda c: c["start"])
    clean = []
    for c in items:
        if not c["text"].strip():
            warnings.append("skipped an empty caption")
            continue
        if c["end"] <= c["start"]:
            warnings.append(f"skipped caption with non-positive duration: {c['text']!r}")
            continue
        clean.append(c)
    new = clone(plan)
    existing = [] if mode == "replace" else list(new.get("captions") or [])
    used = {c["id"] for c in existing}
    n = 0
    for c in clean:
        n += 1
        while f"c{n}" in used:
            n += 1
        cap = {"id": f"c{n}", "text": c["text"].strip(), "start": round(c["start"], 3),
               "end": round(c["end"], 3), "style": style}
        if "words" in c:
            cap["words"] = c["words"]
        used.add(cap["id"])
        existing.append(cap)
    existing.sort(key=lambda c: (c["start"], c["end"]))
    for a, b in zip(existing, existing[1:]):
        if b["start"] < a["end"] - 1e-6:
            warnings.append(f"captions {a['id']} and {b['id']} overlap")
    new["captions"] = existing
    return out(new, {"count": len(clean), "total": len(existing), "style": style}, warnings)


def style_captions(plan: dict, style: str | None = None, caption_ids: list | None = None,
                   list_styles: bool = False, **_) -> dict:
    """Apply a named caption style to all (or the given) captions. list_styles=true just lists styles."""
    if list_styles or style is None:
        return out(clone(plan), {"styles": {k: v["description"] for k, v in CAPTION_STYLES.items()}})
    if style not in CAPTION_STYLES:
        raise ValueError(f"unknown style {style!r}; available: {sorted(CAPTION_STYLES)}")
    new = clone(plan)
    warnings = []
    ids = set(caption_ids) if caption_ids else None
    if ids:
        missing = ids - {c["id"] for c in new.get("captions", [])}
        if missing:
            warnings.append(f"unknown caption ids: {sorted(missing)}")
    n = 0
    for c in new.get("captions", []):
        if ids is None or c["id"] in ids:
            c["style"] = style
            n += 1
    if not new.get("captions"):
        warnings.append("plan has no captions to style")
    return out(new, {"styled": n, "style": style, "style_def": CAPTION_STYLES[style]}, warnings)
