"""Carousel slides written from a reel's transcript, in the Vishnu studio's slides.md format.

An LLM drafts the slides as JSON (more reliable than asking for the markdown), plain code validates them against the studio's
rules and writes slides.md; `lanes/carousel/render.py` then renders them with Remotion (1080x1350 PNGs). Without an LLM a plain
template is built from the transcript and the page says so.
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

FIELDS = ("kicker", "title", "sub", "tip", "cta", "source")

SYSTEM = """You turn the transcript of one short talking video into an Instagram carousel (5 to 6 slides, one idea per slide).
Reply with ONLY one JSON object: {"slides": [{"kind": "cover"|"step", "kicker": "...", "title": "...", "sub": "...", "bullets": ["..."], "tip": "...", "cta": "..."}]}
Rules:
- Slide 1 is the cover: kicker (1 to 3 words, upper case), a title that makes the one point (wrap the 1 or 2 key words in [[double brackets]]), a short sub line.
- Middle slides are steps: kicker "STEP 1", "STEP 2"..., a title (up to 9 words), 2 to 4 bullets (each up to 14 words), and a tip only where the video actually gives a lesson.
- The last slide is a step or cover-style slide whose cta is one real next step for the reader (save, send, comment), never a price or an invented offer.
- Use ONLY what the transcript says. Never add a number, a name or a claim that is not in it. Copy names exactly as spoken.
- Plain words, short sentences. No em dashes. No emojis. No hashtags. No hype words.
- Never write square or round brackets in text other than the [[...]] highlight."""

_HYPE = re.compile(r"\b(game[- ]?changer|revolutionary|insane|mind[- ]?blowing)\b", re.I)
_EMOJI = re.compile("[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF\U0000FE0F]")


def _clean(s: Any, limit: int) -> str:
    t = str(s or "")
    t = _EMOJI.sub("", t).replace("—", ", ").replace("–", "-")
    t = re.sub(r"\((?:[^)]*)\)", "", t) if "[[" not in t else t
    t = _HYPE.sub("", t)
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r" ([,.;:!?])", r"\1", t)  # an em dash became ", ": no space before the comma
    if len(t) > limit:
        t = t[:limit].rsplit(" ", 1)[0].rstrip(",;:- ")
    return t


def validate(raw: Any) -> List[dict]:
    """Clean and check slides. Raises ValueError with a message a person can act on."""
    items = raw.get("slides") if isinstance(raw, dict) else raw
    if not isinstance(items, list):
        raise ValueError("no slides were produced")
    slides: List[dict] = []
    for i, s in enumerate(items[:8]):
        if not isinstance(s, dict):
            continue
        title = _clean(s.get("title"), 80)
        if not title:
            continue
        slide: Dict[str, Any] = {"kind": "cover" if i == 0 else "step", "bullets": []}
        slide["kicker"] = _clean(s.get("kicker"), 28).upper() if s.get("kicker") else ("" if i == 0 else f"STEP {i}")
        slide["title"] = title
        if s.get("sub"):
            slide["sub"] = _clean(s["sub"], 110)
        for b in (_clean(x, 120) for x in (s.get("bullets") or [])):
            if b and len(slide["bullets"]) < 4:
                slide["bullets"].append(b)
        for k in ("tip", "cta", "source"):
            if s.get(k):
                slide[k] = _clean(s[k], 160)
        slides.append(slide)
    if len(slides) < 3:
        raise ValueError("a carousel needs at least 3 usable slides")
    if not slides[-1].get("cta"):
        slides[-1]["cta"] = "Save this for later."
    return slides


def to_markdown(slides: List[dict], note: str = "") -> str:
    out = [f"<!-- {note} -->\n"] if note else []
    for s in slides:
        out.append(f"## {s['kind']}")
        for k in ("kicker", "title", "sub"):
            if s.get(k):
                out.append(f"{k}: {s[k]}")
        out += [f"- {b}" for b in s.get("bullets", [])]
        for k in ("tip", "cta", "source"):
            if s.get(k):
                out.append(f"{k}: {s[k]}")
        out.append("")
    return "\n".join(out)


def parse(text: str) -> List[dict]:
    """The studio's own parser (lanes/carousel/render.py), reproduced so slides can be checked before a render."""
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    slides = []
    for block in re.split(r"^## ", text, flags=re.M)[1:]:
        head, _, body = block.partition("\n")
        s: Dict[str, Any] = {"kind": head.strip().lower() or "step", "bullets": []}
        for line in body.splitlines():
            line = line.strip()
            if line.startswith("- "):
                s["bullets"].append(line[2:].strip())
                continue
            k, sep, v = line.partition(":")
            if sep and k.strip().lower() in FIELDS:
                s[k.strip().lower()] = v.strip()
        slides.append(s)
    return slides


def template(title: str, sentences: List[str]) -> List[dict]:
    """No LLM: cover from the title, step slides from groups of sentences, a plain closing ask."""
    body = [s for s in sentences if len(s.split()) >= 3]
    groups = [body[i:i + 2] for i in range(0, min(len(body), 8), 2)][:4]
    slides: List[dict] = [{"kind": "cover", "kicker": "", "title": _clean(title, 70) or "Worth saving", "bullets": []}]
    for n, g in enumerate(groups, 1):
        slides.append({"kind": "step", "kicker": f"STEP {n}", "title": _clean(" ".join(g[0].split()[:9]), 70),
                       "bullets": [_clean(x, 110) for x in g[1:]] or [_clean(g[0], 110)]})
    if slides[-1].get("bullets") is not None and len(slides) >= 3:
        slides[-1]["cta"] = "Save this for later."
    return validate(slides)


def generate(client: Any, title: str, sentences: List[str], instruction: str = "") -> Dict[str, Any]:
    if client is not None and getattr(client, "api_key", None) and sentences:
        msg = f"Title: {title}\n" + (f"Editor note: {instruction}\n" if instruction.strip() else "") + "Transcript:\n" + "\n".join(sentences)
        try:
            resp = client.messages.create(model=getattr(client, "model", None) or "claude-sonnet-5-5", system=SYSTEM, max_tokens=2500,
                                          messages=[{"role": "user", "content": msg}])
            blocks = resp.get("content", []) if isinstance(resp, dict) else getattr(resp, "content", [])
            text = "".join((b.get("text", "") if isinstance(b, dict) else getattr(b, "text", "")) for b in blocks)
            m = re.search(r"\{.*\}", text, re.S)
            return {"slides": validate(json.loads(m.group(0))), "generated_by": "llm"}
        except Exception:
            pass
    return {"slides": template(title, sentences), "generated_by": "template"}


def slugify(text: str, suffix: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (text or "carousel").lower()).strip("-")[:36].strip("-") or "carousel"
    return f"{base}-{suffix}"
