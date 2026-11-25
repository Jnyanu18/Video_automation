"""Post text for a finished reel (Instagram, YouTube Short, X), following the studio's `captions` playbook.

Paste-ready text contains ONLY the words to publish: no notes, no counts, no bracketed asides. `sanitize` enforces that in code,
so it holds even when the model slips. Without an LLM a plain template built from the transcript is returned (and marked as such).
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

SYSTEM = """You write the post text for one finished short video, from what the video actually says. Reply with ONLY one JSON object:
{"instagram": {"caption": "...", "cover_text": "..."}, "youtube_short": {"title": "...", "description": "..."}, "x": {"post": "...", "reply": "..."}}
Rules for every platform:
- First person, plain words, short sentences. No em dashes. No emojis. No hype words (game changer, revolutionary, insane, mind-blowing).
- The first line is the hook and must work alone, because it is all that shows before "more".
- Say only what the video says. Never add a number, a name or a claim that is not in the transcript.
- End on one real question or one clear next step, never both. Never a price, never "free while we launch".
- Paste-ready text contains ONLY the words to publish: never an instruction, a count, a note, "[your name]", or any bracketed or parenthetical aside.
Instagram: hook in the first 125 characters, then a short body with line breaks, then at most three hashtags at the end. cover_text is 2 to 4 words.
YouTube Short: title up to 100 characters (the real promise, no clickbait the video does not pay off); description starts with two lines that work alone.
X: one post under 240 characters, hook in the first line, one question at the end, at most one hashtag; reply is one line for the link or series."""

_EMOJI = re.compile("[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF\U0000FE0F]")
_ASIDE = re.compile(r"\[[^\]]*\]|\([^)]*\)")
_HYPE = re.compile(r"\b(game[- ]?changer|revolutionary|insane|mind[- ]?blowing)\b", re.I)


def sanitize(text: Any, limit: Optional[int] = None) -> str:
    s = str(text or "")
    s = _ASIDE.sub("", s)
    s = _EMOJI.sub("", s)
    s = s.replace("—", ", ").replace("–", "-").replace(" -- ", ", ")
    s = _HYPE.sub("", s)
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r" *\n *", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s).strip()
    s = re.sub(r" ([,.!?])", r"\1", s)
    if limit and len(s) > limit:
        cut = s[:limit].rsplit(" ", 1)[0].rstrip(",;:- ") if " " in s[:limit] else s[:limit]
        s = cut + ("." if not cut.endswith((".", "!", "?")) and len(cut) < limit else "")
    return s


def clean(raw: dict) -> dict:
    ig = raw.get("instagram") or {}
    yt = raw.get("youtube_short") or {}
    x = raw.get("x") or {}
    caption = sanitize(ig.get("caption"), 2200)
    tags = list(dict.fromkeys(re.findall(r"#\w+", caption)))
    body = re.sub(r"\s*#\w+", "", caption).strip()
    if tags:
        body = body + "\n\n" + " ".join(tags[:3])
    xp = sanitize(x.get("post"), 240)
    xtags = re.findall(r"#\w+", xp)
    if len(xtags) > 1:
        for t in xtags[1:]:
            xp = xp.replace(t, "").strip()
    return {
        "instagram": {"caption": body, "cover_text": sanitize(ig.get("cover_text"), 32)},
        "youtube_short": {"title": sanitize(yt.get("title"), 100), "description": sanitize(yt.get("description"), 4000)},
        "x": {"post": xp, "reply": sanitize(x.get("reply"), 240)},
    }


def template(hook: str, sentences: List[str], title: str) -> dict:
    """No LLM: plain, true-to-the-video text from the transcript (marked by generated_by='template')."""
    hook = sanitize(hook or title or (sentences[0] if sentences else "New reel"), 110).rstrip(".")
    body = " ".join(sentences[:2])
    return clean({
        "instagram": {"caption": f"{hook}.\n\n{sanitize(body, 300)}\n\nWhat would you do?", "cover_text": " ".join(hook.split()[:4])},
        "youtube_short": {"title": hook, "description": f"{hook}.\n\n{sanitize(body, 400)}"},
        "x": {"post": f"{hook}. What do you think?", "reply": ""},
    })


def generate(client: Any, hook: str, sentences: List[str], title: str, instruction: str = "") -> Dict[str, Any]:
    base = template(hook, sentences, title)
    if client is None or not getattr(client, "api_key", None) or not sentences:
        return {**base, "generated_by": "template"}
    msg = f"Title: {title}\nHook on screen: {hook}\n" + (f"Editor note: {instruction}\n" if instruction.strip() else "") + "Transcript:\n" + "\n".join(sentences)
    try:
        resp = client.messages.create(model=getattr(client, "model", None) or "claude-sonnet-5-5", system=SYSTEM, max_tokens=1500,
                                      messages=[{"role": "user", "content": msg}])
        blocks = resp.get("content", []) if isinstance(resp, dict) else getattr(resp, "content", [])
        text = "".join((b.get("text", "") if isinstance(b, dict) else getattr(b, "text", "")) for b in blocks)
        m = re.search(r"\{.*\}", text, re.S)
        out = clean(json.loads(m.group(0))) if m else None
    except Exception:
        out = None
    if not out or not out["instagram"]["caption"] or not out["x"]["post"] or not out["youtube_short"]["title"]:
        return {**base, "generated_by": "template"}
    return {**out, "generated_by": "llm"}
