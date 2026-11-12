"""The director: decides WHAT to show and hear for a reel, from its transcript, and turns that into editor tool steps.

One structured LLM call proposes a plan (hook, speaker card, diagram beats, zooms, sound effects, closing call to action).
Everything it proposes is then validated and snapped to the transcript by plain code, and executed by the same deterministic
recipe runner as a hand-written recipe. With no LLM (or when it answers badly) a heuristic planner produces a plainer plan.

The rules in SYSTEM come from the studio's own `direction` and `story-loops` skills (vishnu-studio/.claude/skills).
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional, Tuple

from services.render import diagrams

HOOK_END = 2.6
MAX_BEATS, MAX_ZOOMS, MAX_SFX = 7, 4, 5
MAX_CUSTOM = 2
CTA_SECONDS = 2.0

SYSTEM = """You are the director of a short vertical reel (Instagram Reels / TikTok / Shorts). You are given the transcript of one talking-head
video with timestamps. Decide what is SEEN and HEARD on top of it. Reply with ONLY one JSON object.

Direction rules (from the studio's playbook):
- A new picture for each idea: every key claim gets an animated diagram that SHOWS the sentence, not a headline repeating it.
- The first sentence is acted out in the first 2.6 seconds with a short hook title that works with the sound off.
- Nothing static for long: spread diagrams across the video, with a short gap between them. Never one headline sitting alone.
- Story loops: open a question early, pay it off in the middle, leave exactly one loop open at the end (the call to action).
- Use ONLY facts, names and numbers that appear in the transcript. Never invent a number, a name or a claim. Copy names exactly as spoken.
- Text is tiny and plain: hook up to 9 words; diagram labels 1 to 5 words; no emojis, no hashtags, no em dashes.
- Sound effects are rare and meaningful (3 to 5): a whoosh on the first word, a pop on a key number, a riser before the main point.

Diagram templates (pick the one that matches what is being SAID):
- "counter": a number counting up.  {"value": 2600, "suffix": "+", "caption": "users on X"}        (use when a number is spoken)
- "versus": two cards with meters. {"left": {"tag": "EASY", "text": "...", "value": 1.0, "tone": "good"}, "right": {"tag": "HARD", "text": "...", "value": 0.3, "tone": "bad"}}   (a contrast: easy/hard, old/new, before/after)
- "brands": {"top": ["AWS", "Google Cloud"], "top_caption": "build their own agents", "bottom": "Ascorp", "bottom_caption": "the agent for everyone else"}   (others vs us)
- "flow": {"steps": ["Ask", "Preview the change", "Approve", "Done"]}   (2 to 5 steps of a process, each up to 22 characters)
- "shift": {"from": "Click through menus", "to": "Just ask an agent"}   (from an old way to a new way)

- "custom": {"idea": "the agent asks the user for approval before deleting rows"}   (ONLY when the speaker explains a mechanism or
  relationship that none of the five templates above can show. At most 2 per video, 5 to 9 seconds each. Describe the idea in one plain
  sentence using only what the speaker says; a separate designer draws it. Prefer a template whenever one fits.)

JSON shape (times are SOURCE seconds taken from the transcript; every beat is 3 to 9 seconds):
{"hook": {"text": "..."},
 "speaker": {"name": "...", "role": "..."} or null,
 "beats": [{"template": "counter", "start": 0.0, "end": 0.0, ...template fields...}],
 "zooms": [{"start": 0.0, "end": 0.0}],
 "sfx": [{"name": "whoosh", "at": 0.0}],
 "cta": {"text": "..."} or null}
Constraints: at most 7 beats, 4 zooms, 5 sound effects. The speaker card is only for a name the speaker actually says. The first beat starts at 4.7 s or later
(the speaker card uses the first seconds). Leave the last 2.6 seconds free for the call to action (a short line asking the viewer to send or save the reel)."""


# ------------------------------------------------------------------------------------------- transcript helpers
def sentences(transcript: dict) -> List[dict]:
    segs = transcript.get("segments") or []
    if segs:
        return [{"start": float(s["start"]), "end": float(s["end"]), "text": str(s["text"]).strip()} for s in segs if str(s.get("text", "")).strip()]
    out, cur = [], []
    for w in transcript.get("words") or []:
        cur.append(w)
        if re.search(r"[.!?]$", str(w["word"]).strip()) or len(cur) >= 18:
            out.append({"start": float(cur[0]["start"]), "end": float(cur[-1]["end"]), "text": " ".join(str(x["word"]).strip() for x in cur)})
            cur = []
    if cur:
        out.append({"start": float(cur[0]["start"]), "end": float(cur[-1]["end"]), "text": " ".join(str(x["word"]).strip() for x in cur)})
    return out


def _words_text(txt: str, n: int) -> str:
    return " ".join(txt.split()[:n]).strip(" ,;:-")


def _snap(t: float, anchors: List[float], tol: float) -> float:
    best = min(anchors, key=lambda a: abs(a - t), default=None)
    return best if best is not None and abs(best - t) <= tol else t


# ------------------------------------------------------------------------------------------- heuristic planner
_HOOK_WORDS = {"easy", "hard", "never", "most", "why", "how", "nobody", "truth", "secret", "mistake", "but", "actually", "wrong"}


def plan_heuristic(sents: List[dict], duration: float, sfx_names: List[str]) -> dict:
    """A plainer plan with no LLM: hook from the most striking early sentence, a counter for each spoken number, an
    EASY/HARD card when the speaker contrasts them, three zooms and a few sound effects."""
    head = " ".join(s["text"] for s in sents if s["start"] < 14)
    m = re.search(r"\b(?i:i'?m|i am|my name is)\s+([A-Z][a-z]{2,15})\b", head)
    org = re.search(r"\b(?:sole\s+|co-?)?founder\s+of\s+([A-Z][\w]{2,20})", head)
    speaker = {"name": m.group(1), "role": f"Founder, {org.group(1)}" if org else ""} if m else None

    def score(s):
        words = re.findall(r"[a-z']+", s["text"].lower())
        return (3 if re.search(r"\d", s["text"]) else 0) + 2 * len(_HOOK_WORDS & set(words)) + (1 if 5 <= len(words) <= 16 else 0)
    pool = [s for s in sents if s["start"] <= duration * 0.6] or sents
    best = max(pool, key=score) if pool else None
    hook = {"text": _words_text(best["text"], 9)} if best else {"text": "Watch this"}

    beats: List[dict] = []
    first_start = 4.7 if speaker else 3.4
    for s in sents:
        if s["end"] < first_start + 1.5 or s["end"] > duration - CTA_SECONDS - 0.6:
            continue
        s = {**s, "start": max(s["start"], first_start)}  # a sentence that begins under the speaker card starts its card after it
        num = re.search(r"\b(\d[\d,]*)(?:\.\d+)?\s*(\+|k|m)?\s+((?:[A-Za-z']+\s?){1,4})", s["text"])
        if num:
            try:
                value = float(num.group(1).replace(",", ""))
            except ValueError:
                continue
            if value >= 2:
                cap = (num.group(3).strip() + " " + "").strip()
                beats.append({"template": "counter", "start": s["start"], "end": max(s["end"], s["start"] + 3.2), "value": value,
                              "suffix": "+" if "more than" in s["text"].lower() or num.group(2) == "+" else "", "caption": cap[:50] or "people"})
    easy = next((s for s in sents if re.search(r"\beasy\b", s["text"], re.I) and s["start"] >= first_start), None)
    hard = next((s for s in sents if re.search(r"\bhard\b", s["text"], re.I) and easy and 0 < s["start"] - easy["start"] < 14), None)
    if easy and hard:
        beats.append({"template": "versus", "start": easy["start"], "end": max(hard["end"], easy["start"] + 5),
                      "left": {"tag": "EASY", "text": _words_text(easy["text"].split(" is ")[0] if " is " in easy["text"] else easy["text"], 6)[:44], "value": 1.0, "tone": "good"},
                      "right": {"tag": "HARD", "text": _words_text(re.sub(r"^.*?\bhard\b( part)?( is)?( to)?", "", hard["text"], flags=re.I) or hard["text"], 7)[:44], "value": 0.3, "tone": "bad"}})
    beats.sort(key=lambda b: b["start"])

    mids = [s for s in sents if duration * 0.15 < s["start"] < duration - 6]
    zooms = [{"start": s["start"], "end": min(s["end"], s["start"] + 2.0)} for s in mids[:: max(1, len(mids) // 3)]][:3]
    first_word = sents[0]["start"] if sents else 0.0
    sfx = [{"name": "whoosh", "at": first_word}] + [{"name": "pop", "at": b["start"]} for b in beats[:3]]
    return {"hook": hook, "speaker": speaker, "beats": beats, "zooms": zooms, "sfx": sfx, "cta": {"text": "Send this to someone who needs it."}}


# ------------------------------------------------------------------------------------------- validation
def clean(raw: Any, duration: float, sents: List[dict], sfx_names: List[str]) -> Tuple[dict, List[str]]:
    """Validate and repair a plan from the LLM or the heuristic. Invalid items are dropped with a warning, never guessed."""
    warn: List[str] = []
    raw = raw if isinstance(raw, dict) else {}
    starts = [s["start"] for s in sents]
    ends = [s["end"] for s in sents]
    plan: Dict[str, Any] = {"hook": None, "speaker": None, "beats": [], "zooms": [], "sfx": [], "cta": None}

    h = (raw.get("hook") or {}).get("text") if isinstance(raw.get("hook"), dict) else None
    h = " ".join(str(h or "").split())
    if h:
        plan["hook"] = {"text": _words_text(h, 10)[:70], "start": 0.0, "end": min(HOOK_END, duration)}
    else:
        warn.append("no hook title was proposed")

    sp = raw.get("speaker")
    if isinstance(sp, dict) and str(sp.get("name", "")).strip():
        plan["speaker"] = {"name": str(sp["name"]).strip()[:24], "role": str(sp.get("role", "")).strip()[:40]}

    first_ok = 4.7 if plan["speaker"] else 3.4
    last_ok = duration - CTA_SECONDS - 0.6
    taken: List[Tuple[float, float]] = []
    for i, b in enumerate(raw.get("beats") or []):
        if len(plan["beats"]) >= MAX_BEATS:
            warn.append("more than 7 diagram beats were proposed; extras dropped")
            break
        if not isinstance(b, dict):
            continue
        try:
            st = _snap(float(b["start"]), starts, 1.0)
            en = _snap(float(b["end"]), ends, 1.0)
        except (KeyError, TypeError, ValueError):
            warn.append(f"beat {i + 1}: missing or invalid start/end")
            continue
        st, en = max(st, first_ok), min(en, last_ok)
        if en - st < 3.0:
            warn.append(f"beat {i + 1}: only {max(en - st, 0):.1f}s fits there (needs 3s); dropped")
            continue
        en = min(en, st + 9.0)
        if any(st < e + 0.3 and en > s - 0.3 for s, e in taken):
            warn.append(f"beat {i + 1}: overlaps another diagram; dropped")
            continue
        prm = {k: v for k, v in b.items() if k not in ("start", "end")}
        if prm.get("template") == "custom":  # designed later by studio.animator; only the idea is checked here
            idea = str(prm.get("idea", "")).strip()
            if len(idea) < 8 or sum(1 for x in plan["beats"] if x.get("template") == "custom") >= MAX_CUSTOM:
                warn.append(f"beat {i + 1}: custom animation needs an idea (and at most {MAX_CUSTOM} per video); dropped")
                continue
            near = " ".join(s["text"] for s in sents if s["end"] > st and s["start"] < en)[:300]
            taken.append((st, en))
            plan["beats"].append({"template": "custom", "idea": idea[:200], "spoken": near, "start": round(st, 3), "end": round(en, 3)})
            continue
        try:
            diagrams.validate(prm)
        except diagrams.DiagramError as e:
            warn.append(f"beat {i + 1} ({prm.get('template')}): {e}; dropped")
            continue
        if prm["template"] == "flow" and en - st < 0.55 * len(prm["steps"]) + 1.4:
            warn.append(f"beat {i + 1}: too short for {len(prm['steps'])} steps; dropped")
            continue
        taken.append((st, en))
        plan["beats"].append({**prm, "start": round(st, 3), "end": round(en, 3)})
    plan["beats"].sort(key=lambda x: x["start"])

    zt: List[Tuple[float, float]] = []
    for z in raw.get("zooms") or []:
        try:
            st = _snap(float(z["start"]), starts, 0.8)
            en = min(float(z["end"]), st + 3.0)
        except (KeyError, TypeError, ValueError):
            continue
        if en - st < 1.2 or st < HOOK_END or en > duration - 1.0 or any(st < e and en > s for s, e in zt) or len(zt) >= MAX_ZOOMS:
            continue
        zt.append((st, en))
    plan["zooms"] = [{"start": round(s, 3), "end": round(e, 3)} for s, e in sorted(zt)]

    last = -9.0
    cands = []
    for s in raw.get("sfx") or []:
        if not isinstance(s, dict):
            continue
        if s.get("name") not in sfx_names:
            warn.append(f"unknown sound effect {s.get('name')!r} dropped")
            continue
        try:
            cands.append((float(s["at"]), s["name"]))
        except (KeyError, TypeError, ValueError):
            continue
    for at, name in sorted(cands):
        if len(plan["sfx"]) >= MAX_SFX:
            break
        at = _snap(at, starts, 0.3)
        if 0 <= at <= duration and at - last >= 1.0:
            plan["sfx"].append({"name": name, "at": round(at, 3)})
            last = at

    cta = raw.get("cta")
    ctext = " ".join(str((cta or {}).get("text", "") if isinstance(cta, dict) else "").split())
    if ctext:
        plan["cta"] = {"text": ctext[:60], "start": round(max(duration - CTA_SECONDS, 0.0), 3), "end": round(duration, 3)}
    else:
        warn.append("no closing call to action was proposed")
    return plan, warn


# ------------------------------------------------------------------------------------------- LLM
def _json(text: str) -> Optional[dict]:
    m = re.search(r"\{.*\}", text or "", re.S)
    if not m:
        return None
    try:
        d = json.loads(m.group(0))
    except ValueError:
        return None
    return d if isinstance(d, dict) else None


def build_message(sents: List[dict], duration: float, style: str, instruction: str, sfx_names: List[str]) -> str:
    lines = "\n".join(f"[{s['start']:.1f}-{s['end']:.1f}] {s['text']}" for s in sents)
    return (f"Video length: {duration:.1f} s. Style preset: {style}.\n"
            + (f"Extra instruction from the editor: {instruction}\n" if instruction.strip() else "")
            + f"Available sound effects: {', '.join(sfx_names)}\n\nTranscript:\n{lines}")


def plan_with_llm(client: Any, sents: List[dict], duration: float, style: str, instruction: str, sfx_names: List[str]) -> Optional[dict]:
    """One structured call (one retry on unparseable output). Returns the raw proposal or None."""
    if client is None or not getattr(client, "api_key", None) or not sents:
        return None
    msgs = [{"role": "user", "content": build_message(sents, duration, style, instruction, sfx_names)}]
    for attempt in range(2):
        try:
            resp = client.messages.create(model=getattr(client, "model", None) or "claude-sonnet-5-5", system=SYSTEM, messages=msgs, max_tokens=2500)
            blocks = resp.get("content", []) if isinstance(resp, dict) else getattr(resp, "content", [])
            text = "".join((b.get("text", "") if isinstance(b, dict) else getattr(b, "text", "")) for b in blocks)
        except Exception:
            return None
        d = _json(text)
        if d is not None:
            return d
        msgs += [{"role": "assistant", "content": text or "(empty)"}, {"role": "user", "content": "That was not a single valid JSON object. Reply with ONLY the JSON object."}]
    return None


def make_plan(client: Any, transcript: dict, duration: float, style: str, instruction: str, sfx_names: List[str]) -> Tuple[dict, str, List[str]]:
    """(plan, source, warnings). source is 'llm' or 'heuristic'."""
    sents = sentences(transcript)
    if not sents:
        raise ValueError("the transcript has no speech, so there is nothing to direct (silent footage needs a hand-written recipe)")
    raw = plan_with_llm(client, sents, duration, style, instruction, sfx_names)
    if raw is not None:
        plan, warn = clean(raw, duration, sents, sfx_names)
        if plan["hook"] and (plan["beats"] or len(sents) < 4):
            return plan, "llm", warn
        warn.append("the LLM plan had no hook or no usable diagram beats; used the heuristic planner")
        plan2, w2 = clean(plan_heuristic(sents, duration, sfx_names), duration, sents, sfx_names)
        return plan2, "heuristic", warn + w2
    plan, warn = clean(plan_heuristic(sents, duration, sfx_names), duration, sents, sfx_names)
    return plan, "heuristic", (["no LLM answered; used the heuristic planner (plainer, fewer diagrams)"] + warn)


# ------------------------------------------------------------------------------------------- plan -> tool steps
def to_steps(plan: dict) -> List[dict]:
    steps: List[dict] = []
    if plan.get("hook"):
        h = plan["hook"]
        steps.append({"tool": "add_title", "input": {"text": h["text"], "start": h["start"], "end": h["end"], "y": 0.30, "size": 52, "box": True, "style": "bold"}})
    if plan.get("speaker"):
        sp = plan["speaker"]
        steps.append({"tool": "add_lower_third", "input": {"name": sp["name"], "subtitle": sp.get("role", ""), "start": 0.6, "end": 4.6}})
    for b in plan.get("beats", []):
        if b.get("template") == "custom":
            if not b.get("scene"):
                continue  # never designed (or the design failed): leave it out
            steps.append({"tool": "add_diagram", "input": {"template": "custom", "scene": b["scene"], "start": b["start"], "end": b["end"]}})
            continue
        steps.append({"tool": "add_diagram", "input": dict(b)})
    for z in plan.get("zooms", []):
        steps.append({"tool": "add_zoom", "input": {"start": z["start"], "end": z["end"], "scale": 1.12, "cx": 0.5, "cy": 0.38}})
    for s in plan.get("sfx", []):
        steps.append({"tool": "add_sfx", "input": {"name": s["name"], "at": s["at"]}})
    if plan.get("cta"):
        c = plan["cta"]
        steps.append({"tool": "add_title", "input": {"text": c["text"], "start": c["start"], "end": c["end"], "y": 0.30, "size": 52, "box": True, "style": "bold"}})
    return steps


def base_steps(max_words: int = 6, noise_db: float = -22, min_silence: float = 0.25) -> List[dict]:
    """Transcribe, tighten silences without cutting words, karaoke captions."""
    return [
        {"tool": "transcribe", "input": {}},
        {"tool": "detect_silences", "input": {"noise_db": noise_db, "min_len": min_silence}},
        {"tool": "cut_silences", "input": {"silences": "$silences", "min_silence": min_silence, "padding": 0.05}},
        {"tool": "set_captions", "input": {"from_transcript": True, "style": "karaoke", "max_words": max_words, "max_chars": 46}},
    ]
