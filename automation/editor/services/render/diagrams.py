"""Animated explainer diagrams drawn by the HyperFrames (browser) render.

An EditPlan overlay {"kind": "diagram", "params": {"template": ..., ...}} becomes a glass panel in the lower middle of the
frame, below a talking head's face. Templates:

  flow     steps:[...]                        numbered boxes that pop in with arrows, the last one lights up
  versus   left/right:{tag,text,value,tone}   two cards with meters that fill (e.g. EASY vs HARD)
  counter  value, suffix, caption             a number that counts up while user icons light up
  brands   top:[...], top_caption, bottom, bottom_caption   "big names do X, we do Y"
  shift    from, to                           a grid of menu tiles struck out, then a chat bubble ("click -> just ask")

Everything is inline SVG/HTML + GSAP tweens on the shared paused timeline, so frames are deterministic when the renderer seeks.
"""
from __future__ import annotations

import html
import json
from typing import Callable, List, Tuple

from . import custom as custom_mod

TEMPLATES = ("flow", "versus", "counter", "brands", "shift", "custom")
GOOD, BAD, GOLD, BLUE = "#38d27a", "#ff5d5d", "#ffd400", "#5aa9ff"


class DiagramError(ValueError):
    pass


def _e(v) -> str:
    return html.escape(str(v), quote=True)


def _txt(v, field: str, limit: int = 48) -> str:
    s = str(v or "").strip()
    if not s:
        raise DiagramError(f"{field} is required")
    if len(s) > limit:
        raise DiagramError(f"{field} is too long ({len(s)} > {limit} characters): keep diagram text short")
    return s


def validate(prm: dict, duration: float = 6.0) -> None:
    """Raise DiagramError with a message the agent can act on. Used by the add_diagram tool and the renderer."""
    t = prm.get("template")
    if t not in TEMPLATES:
        raise DiagramError(f"template must be one of {', '.join(TEMPLATES)}")
    if t == "custom":
        try:
            custom_mod.validate(prm.get("scene"), duration)
        except custom_mod.SceneError as e:
            raise DiagramError(f"custom scene: {e}")
    elif t == "flow":
        steps = prm.get("steps")
        if not isinstance(steps, list) or not 2 <= len(steps) <= 5:
            raise DiagramError("flow needs 2 to 5 steps")
        for i, s in enumerate(steps):
            _txt(s, f"steps[{i}]", 22)
    elif t == "versus":
        for side in ("left", "right"):
            d = prm.get(side)
            if not isinstance(d, dict):
                raise DiagramError(f"versus needs {side}: {{tag, text, value, tone}}")
            _txt(d.get("tag"), f"{side}.tag", 10)
            _txt(d.get("text"), f"{side}.text", 44)
            v = d.get("value", 1.0)
            if not isinstance(v, (int, float)) or not 0 <= v <= 1:
                raise DiagramError(f"{side}.value must be a number between 0 and 1")
    elif t == "counter":
        if not isinstance(prm.get("value"), (int, float)) or prm["value"] < 0:
            raise DiagramError("counter needs a non-negative number `value`")
        _txt(prm.get("caption"), "caption", 52)
    elif t == "brands":
        top = prm.get("top")
        if not isinstance(top, list) or not 1 <= len(top) <= 4:
            raise DiagramError("brands needs 1 to 4 names in `top`")
        for i, s in enumerate(top):
            _txt(s, f"top[{i}]", 16)
        _txt(prm.get("bottom"), "bottom", 18)
        _txt(prm.get("bottom_caption"), "bottom_caption", 40)
    elif t == "shift":
        _txt(prm.get("from"), "from", 30)
        _txt(prm.get("to"), "to", 30)


def css(px: Callable[[float], str], w: int, h: int) -> str:
    """Shared styles. px() scales a 1080-wide design size to the real frame."""
    return f"""
.ov-dia{{position:absolute;left:{px(44)};right:{px(44)};top:58%;height:21%;z-index:6}}
.dg{{width:100%;height:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:{px(18)};
  padding:{px(22)} {px(26)};background:rgba(12,17,30,.86);border:{px(2)} solid rgba(255,255,255,.16);border-radius:{px(26)};
  color:#fff;font-weight:700;text-align:center;box-shadow:0 {px(10)} {px(40)} rgba(0,0,0,.5)}}
.dg-col{{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:{px(12)};flex:1 1 0;min-width:0}}
.dg-node{{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:{px(10)};padding:{px(16)} {px(8)};
  border-radius:{px(18)};background:rgba(255,255,255,.1);font-size:{px(29)};line-height:1.15}}
.dg-num{{width:{px(44)};height:{px(44)};border-radius:50%;background:{GOLD};color:#111;display:flex;align-items:center;justify-content:center;font-size:{px(26)}}}
.dg-ring{{position:absolute;inset:-4px;border:{px(4)} solid {GOLD};border-radius:{px(22)};box-shadow:0 0 {px(22)} {GOLD};opacity:0;pointer-events:none}}
.dg-arrow{{flex:none;width:{px(34)};height:{px(34)}}}
.dg-tag{{padding:{px(4)} {px(16)};border-radius:{px(10)};font-size:{px(26)};letter-spacing:.06em;color:#111}}
.dg-txt{{font-size:{px(29)};line-height:1.15}}
.dg-meter{{width:88%;height:{px(18)};background:rgba(255,255,255,.14);border-radius:{px(10)};overflow:hidden}}
.dg-fill{{height:100%;border-radius:{px(10)}}}
.dg-vs{{flex:none;font-size:{px(26)};color:rgba(255,255,255,.6)}}
.dg-big{{font-size:{px(96)};line-height:1;color:{GOLD};font-weight:800}}
.dg-cap{{font-size:{px(29)};line-height:1.15;color:#fff}}
.dg-users{{display:flex;gap:{px(8)}}}
.dg-box{{padding:{px(12)} {px(26)};border-radius:{px(16)};background:rgba(255,255,255,.12);font-size:{px(34)}}}
.dg-box.acc{{background:{GOLD};color:#111}}
.dg-row{{display:flex;align-items:center;justify-content:center;gap:{px(14)};width:100%}}
.dg-grid{{display:grid;grid-template-columns:repeat(4,{px(34)});gap:{px(8)}}}
.dg-cell{{width:{px(34)};height:{px(26)};border-radius:{px(6)};background:rgba(255,255,255,.32)}}
.dg-bubble{{padding:{px(14)} {px(24)};border-radius:{px(22)} {px(22)} {px(22)} {px(6)};background:{BLUE};color:#fff;font-size:{px(31)}}}
"""


def _arrow(color: str = "#fff", down: bool = False) -> str:
    rot = ' style="transform:rotate(90deg)"' if down else ""
    return (f'<svg class="dg-arrow" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="3" stroke-linecap="round" '
            f'stroke-linejoin="round"{rot}><path d="M4 12h15M13 6l6 6-6 6"/></svg>')


def _user_icon(color: str, size: str) -> str:
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="{color}"><circle cx="12" cy="7.5" r="4.2"/>'
            f'<path d="M3.5 21c.7-4.6 4.2-7 8.5-7s7.8 2.4 8.5 7z"/></svg>')


def _lock_icon(color: str, size: str) -> str:
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2.4" '
            f'stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>')


def _check_icon(color: str, size: str) -> str:
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="3.4" '
            f'stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>')


def render(prm: dict, oid: str, st: float, en: float, px: Callable[[float], str]) -> Tuple[str, List[str]]:
    """(inner html of the panel, gsap lines). Times are absolute seconds on the output timeline."""
    dur = max(en - st, 0.6)
    validate(prm, dur)
    t = prm["template"]
    num = lambda v: round(float(px(v)[:-2]), 1)  # noqa: E731  GSAP vars need numbers; CSS needs '12.3px'

    js: List[str] = [f'tl.from("#{oid}p",{{opacity:0,y:{num(46)},duration:0.35,ease:"power3.out"}},{st:.3f});',
                     f'tl.fromTo("#{oid}p",{{opacity:1,y:0}},{{opacity:0,y:{num(30)},duration:0.25,ease:"power2.in"}},{max(st + 0.4, en - 0.3):.3f});']
    ids = lambda s: f"#{oid}{s}"  # noqa: E731

    if t == "custom":
        scene = custom_mod.validate(prm["scene"], dur)
        svg, tweens = custom_mod.compile_scene(scene, oid, st, en)
        return svg, js + tweens

    if t == "flow":
        steps = [str(s) for s in prm["steps"]]
        n = len(steps)
        gap = max(0.25, min(0.55, (dur - 1.3) / n))
        parts = []
        for i, s in enumerate(steps):
            ring = f'<span class="dg-ring" id="{oid}r"></span>' if i == n - 1 else ""
            parts.append(f'<div class="dg-node" id="{oid}n{i}" style="position:relative"><span class="dg-num">{i + 1}</span><span>{_e(s)}</span>{ring}</div>')
            if i < n - 1:
                parts.append(f'<span id="{oid}a{i}" style="display:flex">{_arrow()}</span>')
            at = st + 0.4 + i * gap
            js.append(f'tl.from("{ids("n%d" % i)}",{{opacity:0,y:{num(26)},scale:0.8,duration:0.35,ease:"back.out(1.8)"}},{at:.3f});')
            if i < n - 1:
                js.append(f'tl.from("{ids("a%d" % i)}",{{opacity:0,x:{num(-12)},duration:0.25}},{at + 0.18:.3f});')
        last = st + 0.4 + (n - 1) * gap + 0.4
        js.append(f'tl.fromTo("{ids("r")}",{{opacity:0}},{{opacity:1,duration:0.3,ease:"power2.out"}},{last:.3f});')
        return "".join(parts), js

    if t == "versus":
        cols = []
        for k, side in (("L", "left"), ("R", "right")):
            d = prm[side]
            tone = GOOD if d.get("tone", "good" if side == "left" else "bad") == "good" else BAD
            v = float(d.get("value", 1.0 if side == "left" else 0.3))
            icon = _lock_icon(tone, px(40)) if tone == BAD else _check_icon(tone, px(40))
            cols.append(f'<div class="dg-col" id="{oid}{k}"><span class="dg-tag" style="background:{tone}">{_e(d["tag"])}</span>'
                        f'<div class="dg-txt">{_e(d["text"])}</div><div class="dg-meter"><div class="dg-fill" id="{oid}{k}f" style="background:{tone};width:{v * 100:.0f}%"></div></div>'
                        f'<span id="{oid}{k}i" style="display:flex">{icon}</span></div>')
            base = st + 0.35 + (0.0 if k == "L" else 0.45)
            js.append(f'tl.from("{ids(k)}",{{opacity:0,x:{num(-60 if k == "L" else 60)},duration:0.4,ease:"power3.out"}},{base:.3f});')
            js.append(f'tl.fromTo("{ids(k + "f")}",{{scaleX:0,transformOrigin:"0% 50%"}},{{scaleX:1,transformOrigin:"0% 50%",duration:{0.7 if k == "L" else 1.3},ease:"power2.out"}},{base + 0.3:.3f});')
            js.append(f'tl.from("{ids(k + "i")}",{{scale:0,duration:0.35,ease:"back.out(2.4)"}},{base + 0.9:.3f});')
        return cols[0] + '<span class="dg-vs">VS</span>' + cols[1], js

    if t == "counter":
        value = float(prm["value"])
        suffix = str(prm.get("suffix", ""))
        steps = 16
        total = min(1.6, dur * 0.5)
        t0 = st + 0.35
        vals = [round(value * (1 - (1 - k / (steps - 1)) ** 2.4)) for k in range(steps)]
        spans = "".join(f'<span id="{oid}v{k}" style="grid-area:1/1">{_e(format(int(v), ",") + suffix)}</span>' for k, v in enumerate(vals))
        users = "".join(f'<span id="{oid}u{i}" style="display:flex">{_user_icon("#fff", px(34))}</span>' for i in range(10))
        body = (f'<div class="dg-col"><div class="dg-big" style="display:grid;justify-items:center">{spans}</div>'
                f'<div class="dg-cap">{_e(prm["caption"])}</div><div class="dg-users">{users}</div></div>')
        for k in range(steps):
            at = t0 + total * k / (steps - 1)
            if k < steps - 1:
                nxt = t0 + total * (k + 1) / (steps - 1)
                js.append(f'tl.fromTo("{ids("v%d" % k)}",{{opacity:0}},{{opacity:1,duration:0.01}},{at:.3f});')
                js.append(f'tl.fromTo("{ids("v%d" % k)}",{{opacity:1}},{{opacity:0,duration:0.01,immediateRender:false}},{nxt:.3f});')
            else:  # the final number is the page's natural state; just reveal it
                js.append(f'tl.fromTo("{ids("v%d" % k)}",{{opacity:0}},{{opacity:1,duration:0.01}},{at:.3f});')
        for i in range(10):
            js.append(f'tl.from("{ids("u%d" % i)}",{{opacity:0.15,scale:0.6,duration:0.2}},{st + 0.5 + i * 0.1:.3f});')
        return body, js

    if t == "brands":
        top = "".join(f'<span class="dg-box" id="{oid}b{i}">{_e(b)}</span>' for i, b in enumerate(prm["top"]))
        body = (f'<div class="dg-col"><div class="dg-row">{top}</div><div class="dg-cap" id="{oid}tc">{_e(prm.get("top_caption", ""))}</div>'
                f'<span id="{oid}ar" style="display:flex">{_arrow(down=True)}</span>'
                f'<div class="dg-row"><span class="dg-box acc" id="{oid}bt">{_e(prm["bottom"])}</span>'
                f'<span class="dg-cap" id="{oid}bc" style="text-align:left">{_e(prm["bottom_caption"])}</span></div></div>')
        for i in range(len(prm["top"])):
            js.append(f'tl.from("{ids("b%d" % i)}",{{opacity:0,y:{num(-20)},duration:0.3,ease:"back.out(1.7)"}},{st + 0.35 + i * 0.2:.3f});')
        js.append(f'tl.from("{ids("tc")}",{{opacity:0,duration:0.3}},{st + 0.6:.3f});')
        js.append(f'tl.from("{ids("ar")}",{{opacity:0,y:{num(-12)},duration:0.3}},{st + 1.1:.3f});')
        js.append(f'tl.from("{ids("bt")}",{{opacity:0,scale:0.7,duration:0.4,ease:"back.out(2)"}},{st + 1.4:.3f});')
        js.append(f'tl.from("{ids("bc")}",{{opacity:0,x:{num(-14)},duration:0.3}},{st + 1.7:.3f});')
        return body, js

    # shift: click through menus -> just ask
    cells = "".join(f'<span class="dg-cell" id="{oid}c{i}"></span>' for i in range(12))
    body = (f'<div class="dg-col"><div class="dg-grid" id="{oid}g">{cells}</div><div class="dg-cap" id="{oid}f" style="color:rgba(255,255,255,.7)">{_e(prm["from"])}</div></div>'
            f'<span id="{oid}ar" style="display:flex">{_arrow(GOLD)}</span>'
            f'<div class="dg-col"><div class="dg-bubble" id="{oid}bb">{_e(prm["to"])}</div><span id="{oid}ck" style="display:flex">{_check_icon(GOOD, px(38))}</span></div>')
    js.append(f'tl.from("{ids("g")}",{{opacity:0,duration:0.3}},{st + 0.3:.3f});')
    js.append(f'tl.from("{ids("f")}",{{opacity:0,duration:0.3}},{st + 0.4:.3f});')
    js.append(f'tl.fromTo("{ids("g")}",{{opacity:1}},{{opacity:0.25,duration:0.5}},{st + 1.3:.3f});')
    js.append(f'tl.from("{ids("ar")}",{{opacity:0,x:{num(-14)},duration:0.3}},{st + 1.2:.3f});')
    js.append(f'tl.from("{ids("bb")}",{{opacity:0,scale:0.6,transformOrigin:"0% 100%",duration:0.45,ease:"back.out(2)"}},{st + 1.6:.3f});')
    js.append(f'tl.from("{ids("ck")}",{{scale:0,duration:0.35,ease:"back.out(2.6)"}},{st + 2.2:.3f});')
    return body, js


def standalone_page(inner: str, js: List[str], oid: str, duration: float, px: Callable[[float], str], dest_dir, w: int = 1080, h: int = 1920) -> str:
    """A self-contained page holding ONE diagram panel on a dark background, with its paused GSAP timeline registered as
    window.__timelines.edit. Used to measure and screenshot a diagram without rendering a whole video. Returns the page path."""
    import shutil
    from pathlib import Path
    from .composition import find_gsap
    d = Path(dest_dir)
    (d / "vendor").mkdir(parents=True, exist_ok=True)
    shutil.copy(find_gsap(), d / "vendor" / "gsap.min.js")
    page = f"""<!doctype html><html><head><meta charset="utf-8"/><script src="vendor/gsap.min.js"></script><style>
*{{margin:0;padding:0;box-sizing:border-box}}html,body{{width:{w}px;height:{h}px;background:#0b1020;font-family:sans-serif;overflow:hidden}}
#stage{{position:relative;width:{w}px;height:{h}px}}{css(px, w, h)}
</style></head><body><div id="stage"><div class="clip ov-dia" id="{oid}" style="display:block"><div class="dg" id="{oid}p">{inner}</div></div></div>
<script>
gsap.defaults({{lazy:false}});
const tl = gsap.timeline({{paused:true}});
{chr(10).join(js)}
window.__timelines = window.__timelines || {{}};
window.__timelines["edit"] = tl;
</script></body></html>"""
    out = d / "index.html"
    out.write_text(page, encoding="utf-8")
    return str(out)
