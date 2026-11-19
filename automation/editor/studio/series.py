"""Episodic series planning: a multi-episode arc where every episode ends on an open loop that the next one pays off.

With an LLM configured the arc is written for the topic and niche; without one a clearly-labelled structural template is
produced (generated_by = "template") so the UI can say so. Progress is computed from the storyboards linked to episodes.
"""
from __future__ import annotations

import json
import re
from typing import Any, Callable, Dict, List, Optional

from .store import Store

EPISODE_STATUSES = ("OUTLINED", "SCRIPTED", "STORYBOARDED", "RENDERED", "PUBLISHED")

SYSTEM = ("You plan short-form video series. Reply with ONLY JSON: "
          '{"episodes":[{"title":str,"hook":str,"cliffhanger":str,"continuity":str}]}. '
          "Rules: exactly N episodes; each hook is one punchy sentence (<=14 words) that works as on-screen text in the first 2 seconds; "
          "every episode except the last ends with a cliffhanger that opens a loop the NEXT episode closes; the last episode's "
          "cliffhanger is a share/comment call to action; continuity says what visual or narrative thread carries over. No hashtags.")


def template_episodes(title: str, niche: str, n: int, angle: str) -> List[Dict[str, str]]:
    eps = []
    for i in range(1, n + 1):
        if i == 1:
            t, hook, cliff = f"{title}: the mistake", f"The biggest lie about {niche}.", f"In part 2: the counter-intuitive fix."
        elif i == n:
            t, hook, cliff = f"{title}: the system", f"How to run {niche} on autopilot.", "Comment ‘PLAYBOOK’ and I will send the full template."
        else:
            t, hook, cliff = f"{title}: part {i}", f"The step in {niche} almost everyone skips.", f"In part {i + 1}: how to execute it."
        eps.append({"title": t, "hook": hook, "cliffhanger": cliff, "continuity": f"Open on the last frame of episode {i - 1}." if i > 1 else f"Angle: {angle}"})
    return eps


def _parse(text: str, n: int) -> Optional[List[Dict[str, str]]]:
    m = re.search(r"\{.*\}", text or "", re.S)
    if not m:
        return None
    try:
        eps = json.loads(m.group(0)).get("episodes")
    except ValueError:
        return None
    if not isinstance(eps, list) or len(eps) < n:
        return None
    out = []
    for e in eps[:n]:
        if not isinstance(e, dict) or not str(e.get("title", "")).strip() or not str(e.get("hook", "")).strip():
            return None
        out.append({k: str(e.get(k, "")).strip() for k in ("title", "hook", "cliffhanger", "continuity")})
    return out


def llm_episodes(client: Any, title: str, niche: str, n: int, angle: str) -> Optional[List[Dict[str, str]]]:
    if client is None or not getattr(client, "api_key", None):
        return None
    try:
        resp = client.messages.create(
            model=getattr(client, "model", None) or "claude-sonnet-5-5", system=SYSTEM, max_tokens=1500,
            messages=[{"role": "user", "content": f"N={n}\nSeries title: {title}\nNiche/audience: {niche}\nHook angle: {angle}"}])
        blocks = resp.get("content", []) if isinstance(resp, dict) else getattr(resp, "content", [])
        text = "".join((b.get("text", "") if isinstance(b, dict) else getattr(b, "text", "")) for b in blocks)
    except Exception:
        return None
    return _parse(text, n)


def create_series(store: Store, title: str, niche: str, n: int, angle: str, client: Any = None,
                  planner: Optional[Callable] = None) -> dict:
    title, niche = title.strip(), niche.strip()
    if not title or not niche:
        raise ValueError("title and niche are required")
    if not 2 <= n <= 12:
        raise ValueError("episodes_count must be between 2 and 12")
    eps = (planner or llm_episodes)(client, title, niche, n, angle)
    by = "llm" if eps else "template"
    eps = eps or template_episodes(title, niche, n, angle)
    sid = store.new_id("ser")
    series = {
        "id": sid, "title": title, "niche": niche, "angle": angle, "status": "ACTIVE", "generated_by": by,
        "episodes": [{"episode_number": i, **e, "status": "SCRIPTED" if i == 1 else "OUTLINED", "storyboard_id": None}
                     for i, e in enumerate(eps, 1)],
    }
    store.put("series", sid, series)
    store.log("series", f"Planned series “{title}” ({n} episodes, {by})", id=sid)
    return series


def with_progress(store: Store, series: dict) -> dict:
    """Series plus progress derived from the linked storyboards and publishing items (no invented metrics)."""
    sbs = {s["id"]: s for s in store.all("storyboards")}
    pubs = [p for p in store.all("publishing") if p.get("status") == "PUBLISHED"]
    published_sbs = {p.get("storyboard_id") for p in pubs}
    eps = []
    for e in series["episodes"]:
        sb = sbs.get(e.get("storyboard_id") or "")
        status = e["status"]
        if sb:
            status = "PUBLISHED" if sb["id"] in published_sbs else ("RENDERED" if sb.get("latest_render") else "STORYBOARDED")
        eps.append({**e, "status": status,
                    "score": ((sb or {}).get("storyboard") or {}).get("scorecard", {}).get("score") if sb else None})
    done = lambda st: sum(1 for e in eps if EPISODE_STATUSES.index(e["status"]) >= EPISODE_STATUSES.index(st))  # noqa: E731
    return {**series, "episodes": eps, "progress": {
        "total": len(eps), "storyboarded": done("STORYBOARDED"), "rendered": done("RENDERED"), "published": done("PUBLISHED")}}


def update_episode(store: Store, sid: str, number: int, fields: Dict[str, Any]) -> dict:
    allowed = {k: str(v).strip() for k, v in fields.items() if k in ("title", "hook", "cliffhanger", "continuity") and v is not None}
    if any(not v for k, v in allowed.items() if k in ("title", "hook")):
        raise ValueError("title and hook cannot be empty")

    def fn(s):
        ep = next((e for e in s["episodes"] if e["episode_number"] == number), None)
        if ep is None:
            raise KeyError(number)
        ep.update(allowed)
    rec = store.update("series", sid, fn)
    if rec is None:
        raise KeyError(sid)
    return rec


def link_storyboard(store: Store, sid: str, number: int, storyboard_id: str) -> None:
    def fn(s):
        ep = next((e for e in s["episodes"] if e["episode_number"] == number), None)
        if ep is None:
            raise KeyError(number)
        ep["storyboard_id"] = storyboard_id
        ep["status"] = "STORYBOARDED"
    if store.update("series", sid, fn) is None:
        raise KeyError(sid)


def episode_prompt(series: dict, number: int) -> str:
    ep = next(e for e in series["episodes"] if e["episode_number"] == number)
    total = len(series["episodes"])
    parts = [f"Series “{series['title']}” for {series['niche']}. Episode {number} of {total}: “{ep['title']}”.",
             f"Open with this hook within 2 seconds: {ep['hook']}"]
    if number > 1:
        prev = series["episodes"][number - 2]
        parts.append(f"Pay off the previous episode's open loop: {prev['cliffhanger']}")
    if ep.get("cliffhanger"):
        parts.append(("End with this call to action: " if number == total else "End on this open loop for the next episode: ") + ep["cliffhanger"])
    if ep.get("continuity"):
        parts.append(f"Continuity: {ep['continuity']}")
    return " ".join(parts)
