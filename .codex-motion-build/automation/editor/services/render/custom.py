"""Custom animations from a fixed toolkit: a JSON scene -> validated -> SVG + GSAP.

An LLM designs a scene as plain data (elements on a 1000x400 canvas + motion entries). It never writes code:
this module checks the data against the toolkit's limits and compiles it to the same deterministic fromTo tweens the
built-in templates use. A bad scene is rejected with messages the LLM can act on (text that will not fit, an element off
the canvas, an unknown icon), not rendered badly.

Canvas: 1000 x 400 units, origin top-left. Colours are tokens, never hex values.
"""
from __future__ import annotations

import html
import re
from typing import Any, Callable, Dict, List, Tuple

W, H = 1000, 400
MARGIN = 8

COLORS = {  # token -> (fill/stroke colour, readable text colour on it)
    "ink": ("#ffffff", "#111111"), "muted": ("rgba(255,255,255,0.62)", "#111111"), "surface": ("rgba(255,255,255,0.13)", "#ffffff"),
    "accent": ("#ffd400", "#111111"), "good": ("#38d27a", "#111111"), "bad": ("#ff5d5d", "#111111"), "blue": ("#5aa9ff", "#111111"),
    "dark": ("#1b2236", "#ffffff"),
}
EFFECTS_ENTER = ("pop", "fade", "slide-left", "slide-right", "slide-up", "slide-down", "grow", "draw")
EFFECTS_EMPHASIS = ("pulse", "shake")
ELEMENT_TYPES = ("box", "circle", "text", "icon", "line", "bar", "badge")

# Feather-style 24x24 stroke icons (inner SVG only).
ICONS: Dict[str, str] = {
    "user": '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    "users": '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    "lock": '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "unlock": '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    "check": '<polyline points="20 6 9 17 4 12"/>',
    "x": '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    "bolt": '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    "cloud": '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
    "database": '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    "server": '<rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
    "chat": '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    "mail": '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    "gear": '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    "clock": '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    "chart": '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    "trending": '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    "globe": '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    "phone": '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    "code": '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    "dollar": '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    "star": '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    "heart": '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    "search": '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    "bell": '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    "file": '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>',
    "play": '<polygon points="5 3 19 12 5 21 5 3"/>',
    "link": '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    "cart": '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    "alert": '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    "bot": '<rect x="3" y="8" width="18" height="12" rx="3"/><circle cx="9" cy="14" r="1.5"/><circle cx="15" cy="14" r="1.5"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1"/>',
    "cursor": '<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>',
    "layers": '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    "eye": '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
}


class SceneError(ValueError):
    """A scene the toolkit refuses. The message lists every problem so an LLM can fix them all in one go."""


def text_width(text: str, size: float, weight: int = 700) -> float:
    """Approximate rendered width in canvas units for the studio's sans font (a deliberately slightly generous estimate)."""
    return len(text) * size * (0.60 if weight >= 700 else 0.56)


def _num(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _bbox(el: dict) -> Tuple[float, float, float, float]:
    """(x0, y0, x1, y1) of an element in canvas units, from its declared geometry."""
    t = el["type"]
    if t in ("box", "bar"):
        return el["x"], el["y"], el["x"] + el["w"], el["y"] + el["h"]
    if t == "circle":
        return el["x"] - el["r"], el["y"] - el["r"], el["x"] + el["r"], el["y"] + el["r"]
    if t == "icon":
        s = el["size"] / 2
        return el["x"] - s, el["y"] - s, el["x"] + s, el["y"] + s
    if t == "line":
        (x1, y1), (x2, y2) = el["from"], el["to"]
        return min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2)
    if t == "badge":
        w = text_width(el["text"], el["size"]) + 32
        return el["x"] - w / 2, el["y"] - el["size"], el["x"] + w / 2, el["y"] + el["size"] * 0.7
    w = text_width(el["text"], el["size"], el.get("weight", 700))  # text
    a = el.get("anchor", "middle")
    x0 = el["x"] - (w / 2 if a == "middle" else (w if a == "end" else 0))
    return x0, el["y"] - el["size"] * 0.85, x0 + w, el["y"] + el["size"] * 0.25


def validate(scene: Any, duration: float = 6.0) -> Dict[str, Any]:
    """Return the cleaned scene or raise SceneError listing every problem."""
    errs: List[str] = []
    if not isinstance(scene, dict) or not isinstance(scene.get("elements"), list):
        raise SceneError("scene must be an object with an `elements` list")
    els_in = scene["elements"]
    if not 2 <= len(els_in) <= 16:
        raise SceneError(f"use 2 to 16 elements (got {len(els_in)})")
    els: List[dict] = []
    ids: Dict[str, dict] = {}

    def tok(e, key, default):
        v = e.get(key, default)
        if v not in COLORS:
            errs.append(f"{e.get('id')}: {key} must be one of {', '.join(COLORS)} (got {v!r})")
            return default
        return v

    for i, raw in enumerate(els_in):
        if not isinstance(raw, dict):
            errs.append(f"element {i + 1} is not an object")
            continue
        eid, typ = raw.get("id"), raw.get("type")
        if not isinstance(eid, str) or not re.fullmatch(r"[a-z][a-z0-9_]{0,11}", eid):
            errs.append(f"element {i + 1}: id must be lower-case letters/digits/underscore, up to 12 chars (got {eid!r})")
            continue
        if eid in ids:
            errs.append(f"duplicate id {eid!r}")
            continue
        if typ not in ELEMENT_TYPES:
            errs.append(f"{eid}: type must be one of {', '.join(ELEMENT_TYPES)} (got {typ!r})")
            continue
        e: Dict[str, Any] = {"id": eid, "type": typ}
        need = {"box": ("x", "y", "w", "h"), "bar": ("x", "y", "w", "h"), "circle": ("x", "y", "r"), "icon": ("x", "y"), "text": ("x", "y"), "badge": ("x", "y")}.get(typ, ())
        for k in need:
            if not _num(raw.get(k)):
                errs.append(f"{eid}: {k} must be a number")
            else:
                e[k] = float(raw[k])
        if typ in ("box", "circle", "text", "badge"):
            lim = {"box": 28, "circle": 14, "text": 44, "badge": 14}[typ]
            t = str(raw.get("text", "")).strip()
            if typ in ("text", "badge") and not t:
                errs.append(f"{eid}: text is required")
            if len(t) > lim:
                errs.append(f"{eid}: text is {len(t)} characters, the limit for a {typ} is {lim}; shorten it")
            if re.search(r"[<>{}\[\]—]", t):
                errs.append(f"{eid}: text must not contain < > {{ }} [ ] or em dashes")
            e["text"] = t
        if typ == "box":
            e.update(fill=tok(raw, "fill", "surface"), size=float(raw.get("size", 30)), radius=float(raw.get("radius", 16)))
            if "stroke" in raw:
                e["stroke"] = tok(raw, "stroke", "ink")
        elif typ == "circle":
            e.update(fill=tok(raw, "fill", "surface"), size=float(raw.get("size", 28)))
            if _num(e.get("r")) and not 16 <= e["r"] <= 150:
                errs.append(f"{eid}: r must be 16 to 150")
        elif typ == "text":
            e.update(size=float(raw.get("size", 34)), weight=int(raw.get("weight", 700)), anchor=raw.get("anchor", "middle"), color=tok(raw, "color", "ink"))
            if e["anchor"] not in ("start", "middle", "end"):
                errs.append(f"{eid}: anchor must be start, middle or end")
        elif typ == "badge":
            e.update(fill=tok(raw, "fill", "accent"), size=float(raw.get("size", 26)))
        elif typ == "icon":
            if raw.get("name") not in ICONS:
                errs.append(f"{eid}: icon name must be one of {', '.join(sorted(ICONS))} (got {raw.get('name')!r})")
            e.update(name=raw.get("name"), size=float(raw.get("size", 72)), color=tok(raw, "color", "ink"))
            if not 28 <= e["size"] <= 160:
                errs.append(f"{eid}: icon size must be 28 to 160")
        elif typ == "line":
            for k in ("from", "to"):
                p = raw.get(k)
                if not (isinstance(p, list) and len(p) == 2 and all(_num(v) for v in p)):
                    errs.append(f"{eid}: {k} must be [x, y]")
                else:
                    e[k] = [float(p[0]), float(p[1])]
            e.update(color=tok(raw, "color", "ink"), width=float(raw.get("width", 4)), arrow=bool(raw.get("arrow", False)), dash=bool(raw.get("dash", False)))
            if "from" in e and "to" in e and abs(e["from"][0] - e["to"][0]) + abs(e["from"][1] - e["to"][1]) < 20:
                errs.append(f"{eid}: a line must be at least 20 units long")
        elif typ == "bar":
            v = raw.get("value", 1.0)
            if not _num(v) or not 0 <= v <= 1:
                errs.append(f"{eid}: value must be between 0 and 1")
            e.update(value=float(v) if _num(v) else 1.0, fill=tok(raw, "fill", "accent"))
            if _num(e.get("h")) and not 12 <= e["h"] <= 40:
                errs.append(f"{eid}: a bar's h must be 12 to 40")
        if typ in ("box", "circle", "text", "badge") and not 16 <= e.get("size", 30) <= 64:
            errs.append(f"{eid}: size must be 16 to 64")
        if typ == "box":
            if _num(e.get("w")) and e["w"] < 60 or _num(e.get("h")) and e["h"] < 36:
                errs.append(f"{eid}: a box must be at least 60 wide and 36 tall")
            if e["text"] and _num(e.get("w")) and text_width(e["text"], e["size"]) > e["w"] - 24:
                errs.append(f"{eid}: the text {e['text']!r} (about {text_width(e['text'], e['size']):.0f} units) does not fit a box {e['w']:.0f} wide; widen the box, shorten the text or lower size")
        if typ == "circle" and e["text"] and _num(e.get("r")) and text_width(e["text"], e["size"]) > e["r"] * 1.7:
            errs.append(f"{eid}: the text {e['text']!r} does not fit a circle of radius {e['r']:.0f}")
        ids[eid] = e
        els.append(e)

    for e in els:  # geometry: everything inside the canvas
        try:
            x0, y0, x1, y1 = _bbox(e)
        except (KeyError, TypeError):
            continue
        if x0 < MARGIN - 1 or y0 < MARGIN - 1 or x1 > W - MARGIN + 1 or y1 > H - MARGIN + 1:
            errs.append(f"{e['id']}: sticks out of the {W}x{H} canvas (spans x {x0:.0f}..{x1:.0f}, y {y0:.0f}..{y1:.0f}); keep everything within {MARGIN}..{W - MARGIN} by {MARGIN}..{H - MARGIN}")
    texts = [e for e in els if e["type"] in ("text", "badge")]
    for a in range(len(texts)):
        for b in range(a + 1, len(texts)):
            try:
                A, B = _bbox(texts[a]), _bbox(texts[b])
            except (KeyError, TypeError):
                continue
            ox, oy = min(A[2], B[2]) - max(A[0], B[0]), min(A[3], B[3]) - max(A[1], B[1])
            if ox > 6 and oy > 6:
                errs.append(f"{texts[a]['id']} and {texts[b]['id']} overlap; move one")

    # motion
    motion_in = scene.get("motion")
    if not isinstance(motion_in, list) or not motion_in:
        errs.append("`motion` must list at least one entry")
        motion_in = []
    if len(motion_in) > 28:
        errs.append("at most 28 motion entries")
    motion: List[dict] = []
    entered: Dict[str, float] = {}
    for i, m in enumerate(motion_in[:28]):
        if not isinstance(m, dict):
            errs.append(f"motion {i + 1} is not an object")
            continue
        eff = m.get("effect")
        if eff not in EFFECTS_ENTER + EFFECTS_EMPHASIS:
            errs.append(f"motion {i + 1}: effect must be one of {', '.join(EFFECTS_ENTER + EFFECTS_EMPHASIS)} (got {eff!r})")
            continue
        targets = m.get("target")
        targets = targets if isinstance(targets, list) else [targets]
        at = m.get("at", 0.3)
        dur = m.get("dur", 0.45)
        if not _num(at) or not 0 <= at <= max(duration - 0.8, 0.5):
            errs.append(f"motion {i + 1}: at must be 0 to {max(duration - 0.8, 0.5):.1f} seconds (the beat lasts {duration:.1f}s)")
            continue
        if not _num(dur) or not 0.15 <= dur <= 1.5:
            errs.append(f"motion {i + 1}: dur must be 0.15 to 1.5")
            continue
        for t in targets:
            if t not in ids:
                errs.append(f"motion {i + 1}: unknown target {t!r}")
                continue
            if eff == "draw" and ids[t]["type"] != "line":
                errs.append(f"motion {i + 1}: draw only works on a line (got {ids[t]['type']} {t})")
                continue
            if eff in EFFECTS_ENTER:
                if t in entered:
                    errs.append(f"{t} has two entrances; give each element one (pop, fade, slide-*, grow or draw)")
                    continue
                entered[t] = float(at)
            motion.append({"target": t, "effect": eff, "at": float(at), "dur": float(dur)})
    for m in motion:
        if m["effect"] in EFFECTS_EMPHASIS and m["target"] in entered and m["at"] < entered[m["target"]] + 0.2:
            errs.append(f"{m['target']}: {m['effect']} must start after its entrance")
    for e in els:  # an element with no entrance just appears; give it a quiet one instead of failing the scene
        if e["id"] not in entered:
            motion.append({"target": e["id"], "effect": "fade", "at": 0.2, "dur": 0.4})
            entered[e["id"]] = 0.2
    if len({round(v, 1) for v in entered.values()}) < 2 and len(els) > 2:
        errs.append("everything enters at the same moment; stagger the entrances over the beat so it reads as a story")
    if errs:
        raise SceneError("; ".join(errs[:12]) + (f"; and {len(errs) - 12} more" if len(errs) > 12 else ""))
    return {"elements": els, "motion": motion}


def _col(tok: str) -> str:
    return COLORS[tok][0]


def _text_on(fill_tok: str) -> str:
    return COLORS[fill_tok][1]


def _esc(s: Any) -> str:
    return html.escape(str(s), quote=True)


def _element_svg(e: dict, oid: str) -> str:
    t = e["type"]
    if t == "box":
        stroke = f' stroke="{_col(e["stroke"])}" stroke-width="3"' if e.get("stroke") else ""
        label = (f'<text x="{e["x"] + e["w"] / 2:.1f}" y="{e["y"] + e["h"] / 2:.1f}" text-anchor="middle" dominant-baseline="central" '
                 f'font-size="{e["size"]:.0f}" font-weight="700" fill="{_text_on(e["fill"])}">{_esc(e["text"])}</text>') if e["text"] else ""
        return f'<rect x="{e["x"]:.1f}" y="{e["y"]:.1f}" width="{e["w"]:.1f}" height="{e["h"]:.1f}" rx="{e["radius"]:.0f}" fill="{_col(e["fill"])}"{stroke}/>{label}'
    if t == "circle":
        label = (f'<text x="{e["x"]:.1f}" y="{e["y"]:.1f}" text-anchor="middle" dominant-baseline="central" font-size="{e["size"]:.0f}" '
                 f'font-weight="700" fill="{_text_on(e["fill"])}">{_esc(e["text"])}</text>') if e["text"] else ""
        return f'<circle cx="{e["x"]:.1f}" cy="{e["y"]:.1f}" r="{e["r"]:.1f}" fill="{_col(e["fill"])}"/>{label}'
    if t == "text":
        return (f'<text x="{e["x"]:.1f}" y="{e["y"]:.1f}" text-anchor="{e["anchor"]}" font-size="{e["size"]:.0f}" font-weight="{e["weight"]}" '
                f'fill="{_col(e["color"])}">{_esc(e["text"])}</text>')
    if t == "badge":
        w = text_width(e["text"], e["size"]) + 32
        h = e["size"] * 1.7
        return (f'<rect x="{e["x"] - w / 2:.1f}" y="{e["y"] - h / 2:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{h / 2:.1f}" fill="{_col(e["fill"])}"/>'
                f'<text x="{e["x"]:.1f}" y="{e["y"]:.1f}" text-anchor="middle" dominant-baseline="central" font-size="{e["size"]:.0f}" font-weight="800" '
                f'fill="{_text_on(e["fill"])}">{_esc(e["text"])}</text>')
    if t == "icon":
        s = e["size"] / 24.0
        return (f'<g transform="translate({e["x"] - e["size"] / 2:.1f} {e["y"] - e["size"] / 2:.1f}) scale({s:.3f})" fill="none" stroke="{_col(e["color"])}" '
                f'stroke-width="{max(1.6, 2.2 / max(s, 1) ):.2f}" stroke-linecap="round" stroke-linejoin="round">{ICONS[e["name"]]}</g>')
    if t == "bar":
        return (f'<rect x="{e["x"]:.1f}" y="{e["y"]:.1f}" width="{e["w"]:.1f}" height="{e["h"]:.1f}" rx="{e["h"] / 2:.1f}" fill="rgba(255,255,255,0.14)"/>'
                f'<rect x="{e["x"]:.1f}" y="{e["y"]:.1f}" width="{e["w"] * e["value"]:.1f}" height="{e["h"]:.1f}" rx="{e["h"] / 2:.1f}" fill="{_col(e["fill"])}"/>')
    # line (+ arrow head as its own element so it can appear when the line has drawn)
    (x1, y1), (x2, y2) = e["from"], e["to"]
    dash = ' stroke-dasharray="10 9"' if e["dash"] else ""
    return f'<path id="{oid}_{e["id"]}_ln" d="M{x1:.1f} {y1:.1f} L{x2:.1f} {y2:.1f}" fill="none" stroke="{_col(e["color"])}" stroke-width="{e["width"]:.0f}" stroke-linecap="round"{dash}/>'


def _arrow_head(e: dict, oid: str) -> str:
    import math
    (x1, y1), (x2, y2) = e["from"], e["to"]
    a = math.atan2(y2 - y1, x2 - x1)
    L = 12 + e["width"] * 2
    p1 = (x2 - L * math.cos(a - 0.45), y2 - L * math.sin(a - 0.45))
    p2 = (x2 - L * math.cos(a + 0.45), y2 - L * math.sin(a + 0.45))
    return f'<path id="{oid}_{e["id"]}_ah" d="M{p1[0]:.1f} {p1[1]:.1f} L{x2:.1f} {y2:.1f} L{p2[0]:.1f} {p2[1]:.1f}" fill="none" stroke="{_col(e["color"])}" stroke-width="{e["width"]:.0f}" stroke-linecap="round" stroke-linejoin="round"/>'


def _line_len(e: dict) -> float:
    (x1, y1), (x2, y2) = e["from"], e["to"]
    return ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5


def compile_scene(scene: Dict[str, Any], oid: str, st: float, en: float) -> Tuple[str, List[str]]:
    """(svg, gsap lines) for a validated scene. Times are absolute seconds on the output timeline."""
    els = {e["id"]: e for e in scene["elements"]}
    parts: List[str] = []
    for e in scene["elements"]:
        extra = _arrow_head(e, oid) if e["type"] == "line" and e["arrow"] else ""
        parts.append(f'<g id="{oid}_{e["id"]}" data-el="{e["id"]}" data-type="{e["type"]}" style="transform-box:fill-box;transform-origin:50% 50%">'
                     f'<g id="{oid}_{e["id"]}_p" style="transform-box:fill-box;transform-origin:50% 50%">{_element_svg(e, oid)}{extra}</g></g>')
    svg = (f'<svg viewBox="0 0 {W} {H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="overflow:visible" '
           f'font-family="inherit">{"".join(parts)}</svg>')
    js: List[str] = []
    for m in scene["motion"]:
        e, eff, at, d = els[m["target"]], m["effect"], st + m["at"], m["dur"]
        out, inner = f"#{oid}_{e['id']}", f"#{oid}_{e['id']}_p"
        if eff == "pop":
            js.append(f'tl.fromTo("{out}",{{opacity:0,scale:0.6}},{{opacity:1,scale:1,duration:{d},ease:"back.out(1.8)"}},{at:.3f});')
        elif eff == "fade":
            js.append(f'tl.fromTo("{out}",{{opacity:0}},{{opacity:1,duration:{d},ease:"power2.out"}},{at:.3f});')
        elif eff.startswith("slide-"):
            axis, sign = {"slide-left": ("x", -70), "slide-right": ("x", 70), "slide-up": ("y", 60), "slide-down": ("y", -60)}[eff]
            js.append(f'tl.fromTo("{out}",{{opacity:0,{axis}:{sign}}},{{opacity:1,{axis}:0,duration:{d},ease:"power3.out"}},{at:.3f});')
        elif eff == "grow":
            js.append(f'tl.fromTo("{out}",{{opacity:0,scaleX:0,transformOrigin:"0% 50%"}},{{opacity:1,scaleX:1,transformOrigin:"0% 50%",duration:{d},ease:"power2.out"}},{at:.3f});')
        elif eff == "draw":
            L = _line_len(e)
            js.append(f'tl.fromTo("#{oid}_{e["id"]}_ln",{{strokeDasharray:{L:.1f},strokeDashoffset:{L:.1f}}},{{strokeDashoffset:0,duration:{d},ease:"power2.inOut"}},{at:.3f});')
            if e.get("arrow"):
                js.append(f'tl.fromTo("#{oid}_{e["id"]}_ah",{{opacity:0}},{{opacity:1,duration:0.2}},{at + d * 0.85:.3f});')
        elif eff == "pulse":
            js.append(f'tl.fromTo("{inner}",{{scale:1}},{{scale:1.16,duration:{max(d / 2, 0.15):.2f},yoyo:true,repeat:1,ease:"power1.inOut"}},{at:.3f});')
        elif eff == "shake":
            js.append(f'tl.fromTo("{inner}",{{x:0}},{{x:9,duration:0.07,yoyo:true,repeat:5,ease:"power1.inOut"}},{at:.3f});')
    # arrow heads of lines that are not drawn must still follow their entrance
    for e in scene["elements"]:
        if e["type"] == "line" and e["arrow"] and not any(m["target"] == e["id"] and m["effect"] == "draw" for m in scene["motion"]):
            enter = next((m["at"] for m in scene["motion"] if m["target"] == e["id"]), 0.2)
            js.append(f'tl.fromTo("#{oid}_{e["id"]}_ah",{{opacity:0}},{{opacity:1,duration:0.2}},{st + enter:.3f});')
    return svg, js
