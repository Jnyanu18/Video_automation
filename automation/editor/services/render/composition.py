"""Build a Hyperframes project (index.html + local GSAP + assets) for captions/overlays on the cut video."""
from __future__ import annotations

import html
import json
import shutil
from pathlib import Path

# GSAP must come from a local file: CDNs are blocked in the sandbox/worker.
_HERE = Path(__file__).resolve().parent
GSAP_CANDIDATES = [
    _HERE / "vendor" / "gsap.min.js",
    _HERE.parents[1] / "app" / "test-video" / "vendor" / "gsap.min.js",
]
VIDEO_EXT = {".mp4", ".mov", ".webm", ".m4v", ".mkv"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}

CAPTION_STYLES = {
    # style -> (css, entrance tween kwargs)
    "bold-pop": ("font-weight:800;color:#fff;-webkit-text-stroke:0;text-shadow:0 4px 18px rgba(0,0,0,.85);"
                 "text-transform:uppercase", {"scale": 0.7, "opacity": 0, "duration": 0.14, "ease": "back.out(2)"}),
    "clean": ("font-weight:600;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.8)",
              {"opacity": 0, "y": 12, "duration": 0.18, "ease": "power2.out"}),
    "boxed": ("font-weight:700;color:#fff;background:rgba(0,0,0,.65);padding:.25em .6em;border-radius:.3em",
              {"opacity": 0, "duration": 0.12}),
    "highlight": ("font-weight:800;color:#111;background:#ffd400;padding:.2em .55em;border-radius:.3em",
                  {"scale": 0.85, "opacity": 0, "duration": 0.14, "ease": "back.out(2)"}),
    # word-by-word: the whole line shows, the word being spoken lights up (needs caption `words`, see below)
    "karaoke": ("font-weight:800;color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.85);text-transform:uppercase",
                {"opacity": 0, "y": 10, "duration": 0.12, "ease": "power2.out"}),
}
KARAOKE_ACTIVE = "#ffd400"
DEFAULT_STYLE = "bold-pop"
# Canonical caption style names come from tools/edit/styles.py (bold-pop, clean-lower, karaoke, boxed).
# Map them (and legacy names) onto the looks implemented here.
STYLE_ALIASES = {"clean-lower": "clean"}


def resolve_style(name) -> str:
    name = STYLE_ALIASES.get(name, name)
    return name if name in CAPTION_STYLES else DEFAULT_STYLE


def find_gsap() -> Path:
    for c in GSAP_CANDIDATES:
        if c.exists():
            return c
    raise FileNotFoundError("gsap.min.js not found; place it at services/render/vendor/gsap.min.js")


def _esc(t) -> str:
    return html.escape(str(t), quote=True)


def _num(x) -> str:
    return f"{float(x):.3f}"


def _tween(vars_: dict) -> str:
    return json.dumps(vars_)


def _clamp(items: list[dict], duration: float) -> list[dict]:
    res = []
    for it in items:
        s, e = max(0.0, float(it["start"])), min(duration, float(it["end"]))
        if e - s >= 0.04:
            res.append({**it, "start": s, "end": e})
    return res


def _stage_asset(src: str, proj: Path, name: str) -> str | None:
    p = Path(src)
    if not p.is_file():
        return None
    (proj / "assets").mkdir(exist_ok=True)
    dst = proj / "assets" / f"{name}{p.suffix.lower()}"
    shutil.copy(p, dst)
    return f"assets/{dst.name}"


def build_composition(proj: Path, cut_video: Path, duration: float, captions: list[dict],
                      overlays: list[dict], w: int, h: int, fps: float) -> list[str]:
    """Write proj/index.html. captions/overlays must already be in OUTPUT time. Returns warnings."""
    warnings: list[str] = []
    proj.mkdir(parents=True, exist_ok=True)
    (proj / "vendor").mkdir(exist_ok=True)
    shutil.copy(find_gsap(), proj / "vendor" / "gsap.min.js")
    shutil.copy(cut_video, proj / "cut.mp4")
    s = min(w, h) / 1080.0  # scale all px sizes relative to a 1080 short side
    px = lambda v: f"{v * s:.1f}px"  # noqa: E731

    els: list[str] = []
    js: list[str] = []

    def clip(idn, st, en, cls, inner, extra_style=""):
        els.append(f'<div id="{idn}" class="clip {cls}" data-start="{_num(st)}" data-duration="{_num(en - st)}" '
                   f'data-track-index="{{TRACK}}" style="{extra_style}">{inner}</div>')

    # --- overlays (below captions in z-order) ---
    for i, o in enumerate(_clamp(overlays, duration)):
        kind, prm = o.get("kind"), o.get("params") or {}
        st, en, oid = o["start"], o["end"], f"ov{i}"
        if kind == "broll":
            ref = _stage_asset(str(o.get("asset", "")), proj, oid)
            if not ref:
                warnings.append(f"overlay {o.get('id')}: asset not found: {o.get('asset')}")
                continue
            if Path(ref).suffix in VIDEO_EXT:
                inner = f'<video id="{oid}v" src="{ref}" muted playsinline style="width:100%;height:100%;object-fit:cover"></video>'
                # video inside clip wrapper: time the wrapper only
                inner = inner.replace(f'id="{oid}v"', f'id="{oid}v" data-start="0" data-duration="{_num(en - st)}"')
            else:
                inner = f'<img src="{ref}" style="width:100%;height:100%;object-fit:cover"/>'
            clip(oid, st, en, "ov-full", inner)
            js.append(f'tl.from("#{oid}",{{opacity:0,duration:0.2}},{_num(st)});')
        elif kind == "title":
            sub = f'<div class="sub">{_esc(prm["subtitle"])}</div>' if prm.get("subtitle") else ""
            clip(oid, st, en, "ov-title", f'<div class="ti" id="{oid}i"><div class="tt">{_esc(prm.get("text", o.get("asset", "")))}</div>{sub}</div>')
            js.append(f'tl.from("#{oid}i",{{y:{40 * s:.0f},opacity:0,duration:0.4,ease:"power3.out"}},{_num(st)});')
        elif kind == "lower-third":
            _sub = prm.get("subtitle") or prm.get("title")
            sub = f'<div class="sub">{_esc(_sub)}</div>' if _sub else ""
            clip(oid, st, en, "ov-lt", f'<div class="lt" id="{oid}i"><div class="tt">{_esc(prm.get("name", prm.get("text", o.get("asset", ""))))}</div>{sub}</div>')
            js.append(f'tl.from("#{oid}i",{{x:{-80 * s:.0f},opacity:0,duration:0.4,ease:"power3.out"}},{_num(st)});')
        elif kind == "graphic":
            ref = _stage_asset(str(o.get("asset", "")), proj, oid) if o.get("asset") else None
            if ref and Path(ref).suffix in IMAGE_EXT:
                clip(oid, st, en, "ov-gfx", f'<img id="{oid}i" src="{ref}" style="max-width:100%;max-height:100%"/>')
            elif prm.get("text"):
                clip(oid, st, en, "ov-gfx", f'<div class="tt" id="{oid}i">{_esc(prm["text"])}</div>')
            else:
                warnings.append(f"overlay {o.get('id')}: graphic has no image asset or params.text (block ids unsupported)")
                continue
            js.append(f'tl.from("#{oid}i",{{scale:0.8,opacity:0,duration:0.3,ease:"back.out(1.6)"}},{_num(st)});')
        else:
            warnings.append(f"overlay {o.get('id')}: unknown kind {kind!r}")

    # --- captions ---
    for i, c in enumerate(_clamp(captions, duration)):
        requested = c.get("style") or DEFAULT_STYLE
        style = resolve_style(requested)
        if style == DEFAULT_STYLE and requested != DEFAULT_STYLE:
            warnings.append(f"caption {c.get('id')}: unknown style {requested!r}, using {DEFAULT_STYLE}")
        css, tw = CAPTION_STYLES[style]
        cid = f"cap{i}"
        words = [w for w in (c.get("words") or []) if str(w.get("word", "")).strip()]
        if style == "karaoke" and not words:
            warnings.append(f"caption {c.get('id')}: karaoke needs word timings (use set_captions with words); "
                            "showing the whole line highlighted instead")
            css, tw = CAPTION_STYLES["highlight"]
            style = "highlight"
        if style == "karaoke":
            spans = " ".join(f'<span class="w" id="{cid}w{k}">{_esc(str(wd["word"]).strip())}</span>' for k, wd in enumerate(words))
            clip(cid, c["start"], c["end"], "cap", f'<span class="ct" id="{cid}t" style="{css}">{spans}</span>')
            js.append(f'tl.from("#{cid}t",{_tween(tw)},{_num(c["start"])});')
            for k, wd in enumerate(words):  # light up while the word is spoken, back to white after (NB: `w` is the frame width)
                ws, we = max(float(wd["start"]), c["start"]), min(float(wd["end"]), c["end"])
                if we - ws < 0.02:
                    continue
                js.append(f'tl.to("#{cid}w{k}",{{color:"{KARAOKE_ACTIVE}",scale:1.14,duration:0.06,ease:"power2.out"}},{_num(ws)});')
                js.append(f'tl.to("#{cid}w{k}",{{color:"#ffffff",scale:1,duration:0.06,ease:"power2.in"}},{_num(we)});')
            continue
        clip(cid, c["start"], c["end"], "cap", f'<span class="ct" id="{cid}t" style="{css}">{_esc(c["text"])}</span>')
        js.append(f'tl.from("#{cid}t",{_tween(tw)},{_num(c["start"])});')

    body = "\n  ".join(els)
    body = body.replace("{TRACK}", "1")  # Studio lane only; paint order is z-index

    doc = f"""<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width={w}, height={h}"/>
<script src="vendor/gsap.min.js"></script>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:{w}px;height:{h}px;overflow:hidden;background:#000;font-family:sans-serif}}
#stage{{position:relative;width:{w}px;height:{h}px;overflow:hidden}}
#main{{position:absolute;left:0;top:0;width:{w}px;height:{h}px;z-index:0}}
.ov-full{{position:absolute;inset:0;z-index:5;overflow:hidden}}
.ov-title{{position:absolute;inset:0;z-index:6;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 {px(120)}}}
.ov-lt{{position:absolute;left:{px(110)};bottom:{h * 0.26:.0f}px;z-index:6}}
.ov-gfx{{position:absolute;inset:{px(110)};z-index:6;display:flex;align-items:center;justify-content:center}}
.tt{{color:#fff;font-weight:800;font-size:{px(72)};text-shadow:0 4px 18px rgba(0,0,0,.8)}}
.sub{{color:#eee;font-weight:500;font-size:{px(38)};margin-top:{px(8)};text-shadow:0 2px 10px rgba(0,0,0,.8)}}
.lt{{background:rgba(0,0,0,.6);border-left:{px(8)} solid #ff7a00;padding:{px(16)} {px(28)}}}
.lt .tt{{font-size:{px(44)}}}
.cap{{position:absolute;left:0;right:0;bottom:{h * 0.12:.0f}px;z-index:10;text-align:center;padding:0 {px(110)}}}
.ct{{display:inline-block;font-size:{px(64)};line-height:1.2}}
.w{{display:inline-block;transform-origin:50% 70%}}
</style></head><body>
<div id="stage" data-composition-id="edit" data-start="0" data-duration="{_num(duration)}" data-width="{w}" data-height="{h}" data-fps="{fps:g}">
  <video id="main" class="clip" data-start="0" data-duration="{_num(duration)}" data-track-index="0" data-has-audio="true" src="cut.mp4" playsinline></video>
  {body}
</div>
<script>
const tl = gsap.timeline({{paused:true}});
{chr(10).join(js)}
window.__timelines = window.__timelines || {{}};
window.__timelines["edit"] = tl;
</script></body></html>"""
    (proj / "index.html").write_text(doc)
    (proj / "meta.json").write_text(json.dumps({"name": "edit"}))
    return warnings
