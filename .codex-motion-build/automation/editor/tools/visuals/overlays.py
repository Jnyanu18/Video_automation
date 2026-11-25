"""add_overlay / add_title / add_lower_third: pure EditPlan transforms."""
from __future__ import annotations

import copy
import os
from pathlib import Path

from . import snippets

KINDS = ("broll", "lower-third", "title", "graphic", "diagram")


def _next_id(plan: dict) -> str:
    n = 0
    for o in plan.get("overlays", []):
        s = str(o.get("id", ""))
        if s.startswith("o") and s[1:].isdigit():
            n = max(n, int(s[1:]))
    return f"o{n + 1}"


def _fail(plan, msg):
    return {"plan": copy.deepcopy(plan), "result": {"error": msg}, "warnings": [msg]}


def add_overlay(plan: dict, kind: str, start: float, end: float, asset: str = "", params: dict | None = None,
                workdir: str | None = None, **_) -> dict:
    if kind not in KINDS:
        return _fail(plan, f"invalid kind {kind!r}; expected one of {KINDS}")
    try:
        start, end = float(start), float(end)
    except (TypeError, ValueError):
        return _fail(plan, "start/end must be numbers (seconds)")
    if not (start >= 0 and end > start):
        return _fail(plan, f"invalid time range {start}..{end}")
    new = copy.deepcopy(plan)
    warnings = []
    dur = new.get("source", {}).get("duration")
    if dur and end > dur:
        warnings.append(f"end {end} clamped to source duration {dur}")
        end = dur
        if end <= start:
            return _fail(plan, "overlay starts after source end")
    if kind == "broll":
        if not asset:
            return _fail(plan, "broll overlay requires asset (path)")
        if not os.path.isabs(asset) and workdir and (Path(workdir) / asset).exists():
            pass
        elif not Path(asset).exists():
            warnings.append(f"asset not found on disk: {asset}")
    elif not asset:
        asset = kind  # block id
    overlay = {"id": _next_id(new), "kind": kind, "start": round(start, 3), "end": round(end, 3),
               "asset": asset, "params": dict(params or {})}
    for o in new.get("overlays", []):
        if o["kind"] == kind and o["start"] < end and o["end"] > start:
            warnings.append(f"overlaps existing {kind} overlay {o['id']}")
    new.setdefault("overlays", []).append(overlay)
    new["overlays"].sort(key=lambda o: (o["start"], o["id"]))
    result = {"overlay": overlay}
    if workdir and kind not in ("broll", "diagram"):
        out = Path(workdir) / "overlays"
        out.mkdir(parents=True, exist_ok=True)
        o = plan.get("output", {})
        try:
            path = out / f"{overlay['id']}.html"
            path.write_text(snippets.overlay_html(overlay, o.get("width", 1920), o.get("height", 1080)))
            result["html_path"] = str(path)
        except ValueError as e:
            warnings.append(str(e))
    return {"plan": new, "result": result, "warnings": warnings}


def add_title(plan: dict, text: str, start: float = 0.0, end: float | None = None, subtitle: str = "",
              style: str = "clean", position: str = "center", y: float | None = None, size: float | None = None,
              box: bool = False, workdir: str | None = None, **_) -> dict:
    """Title card. y = vertical centre of the card as a fraction of the frame height (0 top .. 1 bottom; overrides position),
    size = font size in px on a 1080-wide frame (default 72), box = dark rounded box behind the text for legibility."""
    if not str(text).strip():
        return _fail(plan, "title text is empty")
    end = start + 3.0 if end is None else end
    p = {"text": text, "subtitle": subtitle, "style": style, "position": position}
    for k, v in (("y", y), ("size", size)):
        if v is not None:
            p[k] = float(v)
    if box:
        p["box"] = True
    return add_overlay(plan, "title", start, end, "title", p, workdir)


def add_lower_third(plan: dict, name: str, start: float, end: float | None = None, subtitle: str = "",
                    style: str = "clean", workdir: str | None = None, **_) -> dict:
    if not str(name).strip():
        return _fail(plan, "lower-third name is empty")
    end = start + 4.0 if end is None else end
    p = {"name": name, "subtitle": subtitle, "style": style}
    return add_overlay(plan, "lower-third", start, end, "lower-third", p, workdir)


def add_diagram(plan: dict, template: str, start: float, end: float, workdir: str | None = None, **kw) -> dict:
    """Animated explainer diagram over SOURCE time start..end, drawn in a panel below a talking head's face.
    Templates and their fields:
      flow    steps:[2-5 short labels]                      e.g. ["Ask","Preview","Approve","Done"]
      versus  left,right:{tag,text,value 0..1,tone good|bad}  e.g. EASY (value 1) vs HARD (value 0.3)
      counter value:number, suffix:"+", caption:"users"      a number counting up
      brands  top:[names], top_caption, bottom, bottom_caption  "big names do X; we do Y"
      shift   from:"Click through menus", to:"Just ask an agent"
    Keep every text short; show it for 3 to 8 seconds, never over a hook title."""
    from services.render.diagrams import DiagramError, validate
    prm = {"template": template}
    for k in ("steps", "left", "right", "value", "suffix", "caption", "top", "top_caption", "bottom", "bottom_caption", "from", "to", "scene"):
        if k in kw and kw[k] is not None:
            prm[k] = kw[k]
    try:
        validate(prm, float(end) - float(start))
    except DiagramError as e:
        return _fail(plan, f"diagram not added: {e}")
    if float(end) - float(start) < 2.0:
        return _fail(plan, "a diagram needs at least 2 seconds on screen to be understood")
    return add_overlay(plan, "diagram", start, end, "diagram", prm, workdir)
