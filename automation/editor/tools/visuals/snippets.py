"""Hyperframes HTML generators for overlays (title, lower-third, graphic).

Each returns a complete standalone composition (index.html) with a transparent background, sized
``width`` x ``height``. GSAP is loaded from a LOCAL file (``gsap_src``, default ``vendor/gsap.min.js``
relative to the html); CDNs are blocked in this environment. Use ``write_project`` to materialise a
render-ready Hyperframes project dir (index.html + vendor/gsap.min.js + meta.json).

Patterns reused from the registry: yt-lower-third (slide-in card, ``.clip`` + data-start/duration,
paused gsap timeline registered on window.__timelines[compId]) and hw-title style type reveals.
"""
from __future__ import annotations

import html
import json
import shutil
from pathlib import Path

GSAP_SRC = "vendor/gsap.min.js"
ASSETS = Path(__file__).parent / "assets"

PALETTES = {
    "clean": {"bg": "rgba(15,15,15,0.88)", "ink": "#ffffff", "sub": "#c9c9c9", "accent": "#ff7a1a"},
    "light": {"bg": "rgba(255,255,255,0.94)", "ink": "#0f0f0f", "sub": "#555555", "accent": "#ff7a1a"},
    "bold": {"bg": "rgba(255,122,26,0.96)", "ink": "#111111", "sub": "#2a1a0a", "accent": "#111111"},
}


def _p(style):
    return PALETTES.get(style or "clean", PALETTES["clean"])


def _e(s) -> str:
    return html.escape(str(s), quote=True)


def _cid(overlay_id: str, kind: str) -> str:
    safe = "".join(c if c.isalnum() or c in "-_" else "-" for c in str(overlay_id or kind))
    return f"{kind}-{safe}"


def _doc(comp_id, w, h, duration, css, body, js, gsap_src) -> str:
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={w}, height={h}" />
    <script src="{_e(gsap_src)}"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: {w}px; height: {h}px; overflow: hidden; background: transparent; }}
      body {{ font-family: "Helvetica Neue", Arial, "DejaVu Sans", sans-serif; }}
{css}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="{comp_id}" data-start="0" data-duration="{duration}"
         data-width="{w}" data-height="{h}">
{body}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      var tl = gsap.timeline({{ paused: true }});
{js}
      window.__timelines["{comp_id}"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
"""


def title_html(text, subtitle="", duration=3.0, width=1920, height=1080, style="clean",
               overlay_id="t", gsap_src=GSAP_SRC, position="center") -> str:
    pal, cid = _p(style), _cid(overlay_id, "title")
    s = height / 1080
    top = {"center": "50%", "top": "22%", "bottom": "78%"}.get(position, "50%")
    css = f"""      #wrap {{ position: absolute; left: 0; right: 0; top: {top}; transform: translateY(-50%); text-align: center; padding: 0 {int(120*s)}px; }}
      #title {{ display: inline-block; color: {pal['ink']}; background: {pal['bg']}; padding: {int(28*s)}px {int(56*s)}px;
               border-radius: {int(18*s)}px; font-size: {int(96*s)}px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.08; }}
      #bar {{ height: {max(4,int(8*s))}px; width: {int(160*s)}px; margin: {int(18*s)}px auto 0; background: {pal['accent']}; border-radius: 4px; transform-origin: left; }}
      #sub {{ margin-top: {int(18*s)}px; color: #fff; text-shadow: 0 2px 12px rgba(0,0,0,.6); font-size: {int(40*s)}px; font-weight: 500; }}"""
    sub = f'<div id="sub" class="clip" data-start="0" data-duration="{duration}" data-track-index="2">{_e(subtitle)}</div>' if subtitle else ""
    body = f"""      <div id="wrap">
        <div id="title" class="clip" data-start="0" data-duration="{duration}" data-track-index="0">{_e(text)}</div>
        <div id="bar" class="clip" data-start="0" data-duration="{duration}" data-track-index="1"></div>
        {sub}
      </div>"""
    out_t = max(duration - 0.35, 0.3)
    js = f"""      gsap.set("#title", {{ opacity: 0, y: 40 }});
      gsap.set("#bar", {{ scaleX: 0 }});
      tl.to("#title", {{ opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }}, 0.05);
      tl.to("#bar", {{ scaleX: 1, duration: 0.5, ease: "power2.out" }}, 0.3);
      if (document.getElementById("sub")) {{
        gsap.set("#sub", {{ opacity: 0 }});
        tl.to("#sub", {{ opacity: 1, duration: 0.4 }}, 0.5);
        tl.to("#sub", {{ opacity: 0, duration: 0.25 }}, {out_t});
      }}
      tl.to("#title", {{ opacity: 0, y: -30, duration: 0.3, ease: "power2.in" }}, {out_t});
      tl.to("#bar", {{ opacity: 0, duration: 0.25 }}, {out_t});"""
    return _doc(cid, width, height, duration, css, body, js, gsap_src)


def lower_third_html(name, subtitle="", duration=4.0, width=1920, height=1080, style="clean",
                     overlay_id="lt", gsap_src=GSAP_SRC) -> str:
    pal, cid = _p(style), _cid(overlay_id, "lower-third")
    s = height / 1080
    css = f"""      #card {{ position: absolute; left: {int(80*s)}px; bottom: {int(120*s)}px; display: flex; align-items: stretch; gap: {int(20*s)}px;
              background: {pal['bg']}; border-radius: {int(14*s)}px; padding: {int(22*s)}px {int(36*s)}px {int(22*s)}px {int(24*s)}px;
              box-shadow: 0 6px 32px rgba(0,0,0,.25); max-width: {int(width*0.8)}px; }}
      #accent {{ width: {max(6,int(10*s))}px; border-radius: 5px; background: {pal['accent']}; transform-origin: top; }}
      #name {{ font-size: {int(48*s)}px; font-weight: 800; color: {pal['ink']}; letter-spacing: -0.01em; line-height: 1.15; }}
      #role {{ font-size: {int(30*s)}px; font-weight: 400; color: {pal['sub']}; margin-top: {int(4*s)}px; }}"""
    role = f'<div id="role">{_e(subtitle)}</div>' if subtitle else ""
    body = f"""      <div id="card" class="clip" data-start="0" data-duration="{duration}" data-track-index="0">
        <div id="accent"></div>
        <div><div id="name">{_e(name)}</div>{role}</div>
      </div>"""
    out_t = max(duration - 0.35, 0.6)
    js = f"""      gsap.set("#card", {{ x: -{int(width*0.5)}, opacity: 0 }});
      gsap.set("#accent", {{ scaleY: 0 }});
      tl.to("#card", {{ x: 0, opacity: 1, duration: 0.55, ease: "power3.out" }}, 0.05);
      tl.to("#accent", {{ scaleY: 1, duration: 0.4, ease: "power2.out" }}, 0.35);
      tl.to("#card", {{ x: -{int(width*0.5)}, opacity: 0, duration: 0.3, ease: "power3.in" }}, {out_t});"""
    return _doc(cid, width, height, duration, css, body, js, gsap_src)


def graphic_html(text, value="", duration=3.0, width=1920, height=1080, style="clean",
                 overlay_id="g", gsap_src=GSAP_SRC, variant="stat", position="top-right") -> str:
    """variant 'stat': big value + label (e.g. value='10x', text='faster'); 'callout': text pill."""
    pal, cid = _p(style), _cid(overlay_id, "graphic")
    s = height / 1080
    pos = {"top-right": f"top:{int(100*s)}px; right:{int(100*s)}px;", "top-left": f"top:{int(100*s)}px; left:{int(100*s)}px;",
           "center": "top:50%; left:50%; margin:0; transform:translate(-50%,-50%);",
           "bottom-right": f"bottom:{int(160*s)}px; right:{int(100*s)}px;"}.get(position, f"top:{int(100*s)}px; right:{int(100*s)}px;")
    css = f"""      #g {{ position: absolute; {pos} background: {pal['bg']}; border-radius: {int(22*s)}px; padding: {int(26*s)}px {int(44*s)}px;
            text-align: center; box-shadow: 0 8px 36px rgba(0,0,0,.3); border-bottom: {max(5,int(8*s))}px solid {pal['accent']}; }}
      #val {{ font-size: {int(120*s)}px; font-weight: 900; color: {pal['accent']}; line-height: 1; letter-spacing: -0.03em; }}
      #lbl {{ font-size: {int(44*s) if variant=='stat' else int(56*s)}px; font-weight: 700; color: {pal['ink']}; margin-top: {int(8*s) if variant=='stat' else 0}px; }}"""
    val = f'<div id="val">{_e(value)}</div>' if (variant == "stat" and value != "") else ""
    body = f"""      <div id="g" class="clip" data-start="0" data-duration="{duration}" data-track-index="0">
        {val}<div id="lbl">{_e(text)}</div>
      </div>"""
    out_t = max(duration - 0.3, 0.5)
    tx = "translate(-50%,-50%) " if position == "center" else ""
    js = f"""      gsap.set("#g", {{ opacity: 0, scale: 0.6, transformOrigin: "50% 50%" }});
      tl.to("#g", {{ opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }}, 0.05);
      if (document.getElementById("val")) {{
        var v = document.getElementById("val"), target = v.textContent, m = target.match(/^([^0-9]*)([0-9][0-9,.]*)(.*)$/);
        if (m) {{ var num = parseFloat(m[2].replace(/,/g, "")), o = {{ n: 0 }}, dec = (m[2].split(".")[1] || "").length;
          tl.to(o, {{ n: num, duration: 0.9, ease: "power2.out", onUpdate: function () {{ v.textContent = m[1] + o.n.toFixed(dec) + m[3]; }} }}, 0.2);
          tl.set(v, {{ textContent: target }}, 1.15); }}
      }}
      tl.to("#g", {{ opacity: 0, scale: 0.9, duration: 0.25, ease: "power2.in" }}, {out_t});"""
    if position == "center":
        # keep centring transform compatible with gsap scale
        js = js.replace('{ opacity: 0, scale: 0.6, transformOrigin: "50% 50%" }', '{ xPercent: -50, yPercent: -50, opacity: 0, scale: 0.6, transformOrigin: "50% 50%" }')
        css = css.replace("transform:translate(-50%,-50%);", "")
    return _doc(cid, width, height, duration, css, body, js, gsap_src)


def overlay_html(overlay: dict, width=1920, height=1080, gsap_src=GSAP_SRC) -> str:
    """Snippet for an EditPlan overlay entry (kind title|lower-third|graphic)."""
    k, p = overlay["kind"], overlay.get("params", {})
    dur = round(overlay["end"] - overlay["start"], 3)
    common = dict(duration=dur, width=width, height=height, style=p.get("style"), overlay_id=overlay.get("id", k), gsap_src=gsap_src)
    if k == "title":
        return title_html(p.get("text", ""), p.get("subtitle", ""), position=p.get("position", "center"), **common)
    if k == "lower-third":
        return lower_third_html(p.get("name", p.get("text", "")), p.get("subtitle", ""), **common)
    if k == "graphic":
        return graphic_html(p.get("text", ""), p.get("value", ""), variant=p.get("variant", "stat"),
                            position=p.get("position", "top-right"), **common)
    raise ValueError(f"no HTML snippet for overlay kind {k!r}")


def write_project(project_dir, html_text: str, name: str = "overlay") -> Path:
    """Create a render-ready Hyperframes project dir with a local GSAP copy."""
    d = Path(project_dir)
    (d / "vendor").mkdir(parents=True, exist_ok=True)
    shutil.copy(ASSETS / "gsap.min.js", d / "vendor" / "gsap.min.js")
    (d / "index.html").write_text(html_text)
    (d / "meta.json").write_text(json.dumps({"id": name, "name": name}))
    return d
