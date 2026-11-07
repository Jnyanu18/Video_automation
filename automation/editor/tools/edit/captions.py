"""Caption tools (SOURCE time; services/render remaps via timeline.remap_to_output)."""
from __future__ import annotations

import re

from ._common import clone, out
from .styles import CAPTION_STYLES, DEFAULT_STYLE

_SENT_END = re.compile(r"[.!?]$")


def _group_words(words: list[dict], max_words: int, max_gap: float, max_chars: int) -> list[dict]:
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
    return groups


def set_captions(plan: dict, captions: list | None = None, words: list | None = None, style: str | None = None,
                 mode: str = "replace", max_words: int | None = None, max_gap: float = 0.6,
                 max_chars: int = 42, from_transcript: bool = False, workdir: str | None = None, **_) -> dict:
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
        items = _group_words(ws, mw, max_gap, max_chars)
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
