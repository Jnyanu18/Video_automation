"""suggest_broll_slots: find transcript moments where B-roll would help.

The scorer is pluggable: ``scorer(text: str) -> float|(float, reason)`` in [0, 1].
Default is a heuristic (concrete nouns, numbers, proper names, visual verbs) that needs no LLM.
``make_llm_scorer(client)`` wraps an injectable Anthropic-style client.
"""
from __future__ import annotations

import json
import re

from .providers import AssetProvider

STOP = set("""a an the and or but so if then than that this these those is are was were be been being am do does
did have has had i you he she it we they me him her us them my your his its our their to of in on at by for with
from as into about just really very like um uh yeah okay ok well right know mean think thing things stuff kind sort
gonna wanna got get going can could would should will not no yes there here what when where which who how why also
more most some any all one now back out up down over too lot""".split())
FILLER = {"um", "uh", "like", "you know", "i mean", "basically", "actually", "literally"}
# concrete / visualisable words boost the score
VISUAL = set("""city street road car train plane flight airport beach ocean sea mountain forest river lake sunset sunrise
sky rain snow fire food coffee kitchen restaurant market shop store office desk laptop computer phone screen code
data chart graph map building house home garden farm field tree flower animal dog cat bird bee drone robot machine
factory warehouse hospital school class students crowd people team meeting stage concert game stadium money cash
product package shipping delivery customers customer launch demo travel hike run swim cook build paint draw write
signup startup company website app""".split())
ABSTRACT = set("""idea ideas concept thought thoughts feel feeling believe opinion maybe perhaps important basically
honestly personally generally essentially""".split())
VISUAL_VERBS = set("""show showed see saw look looked watch watched walk walked drive drove fly flew build built
launch launched grow grew open opened visit visited travel traveled""".split())


def _words(text: str) -> list[str]:
    return re.findall(r"[A-Za-z0-9']+", text)


def heuristic_scorer(text: str) -> tuple[float, str]:
    ws = _words(text)
    if len(ws) < 4:
        return 0.0, "too short"
    low = [w.lower() for w in ws]
    content = [w for w in low if w not in STOP]
    vis = [w for w in low if w in VISUAL or w.rstrip("s") in VISUAL]
    verbs = [w for w in low if w in VISUAL_VERBS]
    nums = [w for w in ws if re.fullmatch(r"\d[\d,.]*", w)]
    caps = [w for i, w in enumerate(ws) if i > 0 and w[0].isupper() and w.lower() not in STOP and w != "I"]
    abstract = [w for w in low if w in ABSTRACT]
    density = len(content) / len(ws)
    score = (0.35 * min(len(vis) / 2, 1) + 0.15 * min(len(verbs), 1) + 0.15 * min(len(nums), 1)
             + 0.15 * min(len(caps) / 2, 1) + 0.2 * density - 0.15 * min(len(abstract), 2) / 2)
    score = max(0.0, min(1.0, score))
    bits = []
    if vis: bits.append("visual nouns: " + ", ".join(sorted(set(vis))[:4]))
    if caps: bits.append("names: " + ", ".join(caps[:3]))
    if nums: bits.append("numbers")
    if verbs: bits.append("visual verbs")
    return round(score, 3), "; ".join(bits) or "generic content"


def keyword_query(text: str, n: int = 3) -> str:
    """Pick the n most search-worthy words: visual words first, then other content words."""
    ws = [w for w in _words(text)]
    seen, ranked = set(), []
    for w in ws:
        lw = w.lower()
        if lw in STOP or lw in seen or len(lw) < 3 or re.fullmatch(r"\d+", lw):
            continue
        seen.add(lw)
        pri = 0 if (lw in VISUAL or lw.rstrip("s") in VISUAL) else (1 if w[0].isupper() else 2)
        ranked.append((pri, -len(lw), len(ranked), lw))
    ranked.sort()
    return " ".join(r[3] for r in ranked[:n])


def make_llm_scorer(client, model: str = "claude-sonnet-5-5"):
    """Scorer backed by an injectable client exposing ``client.messages.create(...)`` (Anthropic SDK shape).
    Falls back to the heuristic if the reply is not parseable JSON {"score": 0-1, "reason": str}."""
    def scorer(text: str):
        try:
            msg = client.messages.create(
                model=model, max_tokens=120,
                messages=[{"role": "user", "content":
                           'Rate 0-1 how much B-roll footage would improve this spoken line. Reply only JSON '
                           '{"score": number, "reason": string}.\n' + text}])
            raw = msg.content[0].text
            d = json.loads(raw[raw.find("{"): raw.rfind("}") + 1])
            return max(0.0, min(1.0, float(d["score"]))), str(d.get("reason", "llm"))
        except Exception:
            return heuristic_scorer(text)
    return scorer


def _segments(transcript, pause: float = 0.6, max_len: float = 6.0) -> list[dict]:
    """Normalise a transcript into [{text,start,end}].
    Accepts {"segments":[...]}, {"words":[{word,start,end}]}, or a bare list of either."""
    if isinstance(transcript, dict):
        if transcript.get("segments"):
            items = transcript["segments"]
        else:
            items = transcript.get("words", [])
    else:
        items = transcript or []
    if not items:
        return []
    if "text" in items[0] and "word" not in items[0]:
        return [{"text": s["text"].strip(), "start": float(s["start"]), "end": float(s["end"])} for s in items]
    segs, buf = [], []

    def flush():
        if buf:
            segs.append({"text": " ".join(w["word"].strip() for w in buf),
                         "start": float(buf[0]["start"]), "end": float(buf[-1]["end"])})
            buf.clear()
    for w in items:
        if buf and (w["start"] - buf[-1]["end"] > pause or w["end"] - buf[0]["start"] > max_len
                    or re.search(r"[.!?]$", buf[-1]["word"].strip())):
            flush()
        buf.append(w)
    flush()
    return segs


def suggest_broll_slots(plan: dict, transcript=None, workdir: str | None = None, max_slots: int = 5,
                        min_score: float = 0.3, min_duration: float = 1.5, max_duration: float = 4.0,
                        min_gap: float = 3.0, start_after: float = 1.0, scorer=None,
                        provider: AssetProvider | None = None, candidates_per_slot: int = 3, **_) -> dict:
    """Suggest B-roll slots. Does not modify the plan's overlays (suggestions only; apply with add_overlay)."""
    new_plan = json.loads(json.dumps(plan))
    warnings: list[str] = []
    scorer = scorer or heuristic_scorer
    if transcript is None:
        transcript = plan.get("transcript")
    segs = _segments(transcript)
    if not segs:
        return {"plan": new_plan, "result": {"slots": []}, "warnings": ["no transcript provided"]}
    keep = plan.get("keep") or []
    busy = [(o["start"], o["end"]) for o in plan.get("overlays", [])]
    scored = []
    for s in segs:
        if s["end"] - s["start"] < 0.8 or s["start"] < start_after:
            continue
        if keep and not any(s["start"] < k["end"] and s["end"] > k["start"] for k in keep):
            continue  # segment is cut away entirely
        r = scorer(s["text"])
        score, reason = r if isinstance(r, tuple) else (float(r), "custom scorer")
        if score >= min_score:
            scored.append({**s, "score": round(score, 3), "reason": reason})
    scored.sort(key=lambda x: (-x["score"], x["start"]))
    chosen: list[dict] = []
    for s in scored:
        if len(chosen) >= max_slots:
            break
        dur = min(max(s["end"] - s["start"], min_duration), max_duration)
        st, en = s["start"], s["start"] + dur
        if plan.get("source", {}).get("duration"):
            en = min(en, plan["source"]["duration"])
        if en - st < min_duration * 0.6:
            continue
        if any(st < b + 0 and en > a for a, b in busy):
            continue
        if any(st < c["end"] + min_gap and en > c["start"] - min_gap for c in chosen):
            continue
        slot = {"start": round(st, 2), "end": round(en, 2), "score": s["score"], "text": s["text"],
                "reason": s["reason"], "query": keyword_query(s["text"])}
        if provider is not None and slot["query"]:
            try:
                slot["candidates"] = provider.search(slot["query"], candidates_per_slot)
            except NotImplementedError:
                slot["candidates"] = []
                if "provider not implemented" not in " ".join(warnings):
                    warnings.append("asset provider not implemented; no candidates attached")
        chosen.append(slot)
    chosen.sort(key=lambda x: x["start"])
    for i, c in enumerate(chosen, 1):
        c["slot_id"] = f"s{i}"
    if not chosen:
        warnings.append("no moments scored above min_score")
    return {"plan": new_plan, "result": {"slots": chosen}, "warnings": warnings}
