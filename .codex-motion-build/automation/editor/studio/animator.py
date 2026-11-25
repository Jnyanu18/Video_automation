"""Custom animations: ask the LLM (Gemini by default) to design a small scene from the fixed toolkit in
services/render/custom.py, then check it three ways (schema/geometry, real browser measurement, retry with the
exact problems) before it is allowed into an edit. The model never writes code; it writes a JSON scene."""
from __future__ import annotations

import json
import re
from typing import Any, Callable, Dict, List, Optional, Tuple

from services.render import custom
from studio import animprobe
from studio.director import _json

EXAMPLE = {
    "elements": [
        {"id": "user", "type": "icon", "name": "user", "x": 130, "y": 210, "size": 96, "color": "ink"},
        {"id": "agent", "type": "icon", "name": "bot", "x": 870, "y": 210, "size": 96, "color": "blue"},
        {"id": "arr", "type": "line", "from": [200, 210], "to": [790, 210], "arrow": True, "color": "muted", "width": 5},
        {"id": "ask", "type": "box", "x": 250, "y": 60, "w": 340, "h": 90, "text": "Delete 12 rows?", "fill": "accent"},
        {"id": "ok", "type": "badge", "x": 500, "y": 320, "text": "YES", "fill": "good"},
    ],
    "motion": [
        {"target": "user", "effect": "pop", "at": 0.3},
        {"target": "arr", "effect": "draw", "at": 0.8, "dur": 0.9},
        {"target": "ask", "effect": "slide-up", "at": 1.2},
        {"target": "agent", "effect": "pop", "at": 1.9},
        {"target": "ok", "effect": "pop", "at": 2.9},
        {"target": "ok", "effect": "pulse", "at": 3.4},
    ],
}

SYSTEM = f"""You are the motion designer for short vertical videos. A speaker says an idea that none of our ready-made diagram
templates (counter, versus, brands, flow, shift) can show. You design ONE small animated diagram that makes the idea
understandable at a glance on a phone, from a fixed toolkit. You do not write code. You reply with a single JSON object.

CANVAS: {custom.W} wide by {custom.H} tall units. Keep every element inside {custom.MARGIN}..{custom.W - custom.MARGIN} horizontally and
{custom.MARGIN}..{custom.H - custom.MARGIN} vertically. The diagram sits on a dark panel, so use the colour tokens below.

COLOUR TOKENS (the only colours allowed): ink (white), muted (grey), surface (translucent card), accent (yellow, the one
thing to look at), good (green), bad (red), blue, dark.

ELEMENTS (each has a short lower-case id of up to 12 letters, digits or underscores):
- icon:   {{id,type:"icon",name,x,y,size(28-160),color}}  x,y is the CENTRE. name is one of: {", ".join(sorted(custom.ICONS))}
- box:    {{id,type:"box",x,y,w,h,text(max 28 chars),fill,size(16-64),stroke?}}  x,y is the TOP-LEFT; w>=60, h>=36; the text must fit w-24
- circle: {{id,type:"circle",x,y,r(16-150),text(max 14),fill,size}}  x,y is the CENTRE
- text:   {{id,type:"text",x,y,text(max 44),size(16-64),color,anchor:start|middle|end}}  y is the baseline
- badge:  {{id,type:"badge",x,y,text(max 14),fill,size}}  a pill, x,y is the CENTRE
- line:   {{id,type:"line",from:[x,y],to:[x,y],color,width,arrow:true|false,dash:true|false}}  at least 20 long
- bar:    {{id,type:"bar",x,y,w,h(12-40),value(0-1),fill}}  a progress bar, x,y is the TOP-LEFT

MOTION: a list of {{target (id or list of ids), effect, at (seconds from the start of the beat), dur (0.15-1.5, optional)}}.
- Entrances (EXACTLY one per element): {", ".join(custom.EFFECTS_ENTER)}. "draw" is only for lines.
- Emphasis (after the entrance, optional): {", ".join(custom.EFFECTS_EMPHASIS)}.
- Stagger the entrances so the picture builds in the order the speaker explains it. Do not enter everything at once.
- The last entrance must be at least 0.8 s before the beat ends, so the finished picture is visible for a moment.

DESIGN RULES
- One idea per diagram. 4 to 9 elements. Show the mechanism (who asks whom, what flows where, what gets blocked), not decoration.
- Words are short labels, not sentences: 1 to 3 words per label. No em dashes, no < > {{ }} [ ] in text.
- Use accent for the single most important element, good for the safe or successful state, bad for the blocked or risky one.
- Left to right is the order of events. Leave clear space between elements; never overlap two pieces of text.
- Icons carry meaning, so pick the one that matches (lock for blocked, check for approved, bot for the agent, user for the person).

REPLY FORMAT: only a JSON object {{"elements":[...],"motion":[...]}}. No prose, no code fences.

EXAMPLE for the idea "the agent asks the user for approval before it deletes rows":
{json.dumps(EXAMPLE, separators=(",", ":"))}
"""


def _ask(client: Any, messages: List[dict]) -> str:
    resp = client.messages.create(model=getattr(client, "model", None) or "claude-sonnet-5-5", system=SYSTEM, messages=messages, max_tokens=2500)
    blocks = resp.get("content", []) if isinstance(resp, dict) else getattr(resp, "content", [])
    return "".join((b.get("text", "") if isinstance(b, dict) else getattr(b, "text", "")) for b in blocks)


def design(client: Any, idea: str, duration: float, spoken: str = "", probe: bool = True, tries: int = 3,
           probe_fn: Callable = animprobe.probe) -> Tuple[Optional[dict], List[str]]:
    """Return (validated scene or None, log). The log lists each rejected attempt so the UI can show what happened."""
    log: List[str] = []
    if client is None or not getattr(client, "api_key", None):
        return None, ["no LLM is configured, so no custom animation was designed"]
    brief = (f"Idea to visualise: {idea}\n" + (f"What the speaker says at that moment: {spoken}\n" if spoken else "")
             + f"The beat lasts {duration:.1f} seconds.")
    msgs: List[dict] = [{"role": "user", "content": brief}]
    for n in range(1, tries + 1):
        try:
            text = _ask(client, msgs)
        except Exception as e:  # network / quota: nothing more to try
            return None, log + [f"the LLM call failed: {str(e)[:160]}"]
        raw = _json(text)
        problems: List[str] = []
        scene = None
        if raw is None:
            problems.append("that was not a single valid JSON object")
        else:
            try:
                scene = custom.validate(raw, duration)
            except custom.SceneError as e:
                problems.append(str(e))
        if scene is not None and probe and animprobe.available():
            try:
                found = probe_fn(scene, duration)["issues"]
            except Exception as e:
                found = []
                log.append(f"attempt {n}: the browser check could not run ({str(e)[:100]}); using the geometry check only")
            problems += found
        if not problems:
            log.append(f"attempt {n}: accepted")
            return scene, log
        log.append(f"attempt {n}: rejected: {'; '.join(problems)[:400]}")
        msgs += [{"role": "assistant", "content": text or "(empty)"},
                 {"role": "user", "content": "Fix these problems and reply with the full corrected JSON object only: " + "; ".join(problems)}]
    return None, log


def fill_custom(client: Any, beats: List[dict], emit: Optional[Callable[[str], None]] = None) -> Tuple[List[dict], List[str]]:
    """For every {template:'custom', idea} beat, design a scene. Beats that fail are dropped (the video is still good without
    them) and reported as warnings."""
    out: List[dict] = []
    warns: List[str] = []
    for b in beats:
        if b.get("template") != "custom":
            out.append(b)
            continue
        dur = float(b["end"]) - float(b["start"])
        if emit:
            emit(f"Designing custom animation: {b.get('idea', '')[:60]}")
        scene, log = design(client, str(b.get("idea", "")), dur, str(b.get("spoken", "")))
        if scene is None:
            warns.append(f"custom animation at {b['start']:.1f}s dropped: {log[-1] if log else 'no result'}")
            continue
        out.append({**b, "scene": scene, "design_log": log})
    return out, warns
