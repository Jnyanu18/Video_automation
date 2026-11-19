"""Motion-graphics reels with no presenter: a JSON spec (scenes + sound cues) becomes a HyperFrames project.

Scene kinds: headline, pills, orb, demo (typed input + ticking steps), approval, stats, cta.
Style rules come from the studied references: hard light/dark alternation, one huge bold line with a single accent word,
UI cards, a brand-coloured wipe at every cut, text inside the platform-safe band (168..1330 px of 1920)."""
from __future__ import annotations

import html
import json
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List

from tools.audio import sfx as sfxlib

W, H = 1080, 1920
DEFAULT_BRAND = {"dark": "#0a0a0e", "light": "#f4f5ff", "ink_dark": "#f4f5ff", "ink_light": "#0a0a1a", "accent": "#ff8a4c",
                 "navy": "#1e1e5a", "accent_light": "#cf5415", "good": "#38d27a", "font": "Poppins"}
SAFE_TOP, SAFE_BOTTOM = 168, 1330


KINDS = ("headline", "pills", "orb", "demo", "approval", "stats", "cta", "kinetic", "chat", "versus2", "flow", "photos", "clips")


class ReelError(ValueError):
    pass


def _e(s: Any) -> str:
    return html.escape(str(s), quote=True)


def _words(text: str, accent: str, cls: str) -> str:
    """Split into word spans; text wrapped in *asterisks* (it may span several words) gets the accent class."""
    out, on = [], False
    for w in text.split(" "):
        if w.startswith("*"):
            on = True
        ends = w.endswith("*")
        out.append(f'<span class="w {cls}{" ac" if on else ""}">{_e(w.strip("*"))}</span>')
        if ends:
            on = False
    return "".join(out)


def validate(spec: dict) -> None:
    sc = spec.get("scenes")
    if not isinstance(sc, list) or not 3 <= len(sc) <= 12:
        raise ReelError("a reel needs 3 to 12 scenes")
    total = 0.0
    for i, s in enumerate(sc, 1):
        if s.get("kind") not in KINDS:
            raise ReelError(f"scene {i}: unknown kind {s.get('kind')!r}")
        if s.get("theme") not in ("light", "dark"):
            raise ReelError(f"scene {i}: theme must be light or dark")
        d = s.get("duration")
        if d is None and s.get("say"):
            d = 3.0  # resolved from the voiceover at build time
        if not isinstance(d, (int, float)) or not 1.5 <= d <= 12:
            raise ReelError(f"scene {i}: duration must be 1.5 to 9 seconds")
        total += d
        blob = json.dumps(s, ensure_ascii=False)
        if "—" in blob:
            raise ReelError(f"scene {i}: no em dashes in on-screen text")
    if not 12 <= total <= 60 and not any(x.get("say") for x in sc):
        raise ReelError(f"total length {total:.1f}s; a reel should be 12 to 45 seconds")
    if sc[0].get("kind") not in ("headline", "pills", "kinetic"):
        raise ReelError("the first scene must carry the hook as bold text (never an orb or a logo)")


def _scene_html(i: int, s: dict, t0: float, brand: dict) -> str:
    k, th = s["kind"], s["theme"]
    body = ""
    if k == "headline":
        sz = f' style="font-size:{int(s["size"])}px"' if s.get("size") else ""
        lines = "".join(f'<div class="ln"{sz}>{_words(l, brand["accent"], "hl")}</div>' for l in s["lines"])
        sub = f'<div class="sub">{_e(s["sub"])}</div>' if s.get("sub") else ""
        body = f'<div class="stack">{lines}{sub}</div>'
    elif k == "pills":
        pills = "".join(f'<div class="pill">{_e(p)}</div>' for p in s["items"])
        body = f'<div class="stack"><div class="ln small">{_words(s.get("title", ""), brand["accent"], "hl")}</div>{pills}<div class="typed">{_e(s["typed"])}</div></div>'
    elif k == "orb":
        lines = "".join(f'<div class="ln">{_words(l, brand["accent"], "hl")}</div>' for l in s["lines"])
        body = f'<div class="orbwrap" style="top:{190 if s.get("_chunks") else 420}px"><div class="orb"></div><div class="ring r1"></div><div class="ring r2"></div></div><div class="stack low">{lines}<div class="sub">{_e(s.get("sub", ""))}</div></div>'
    elif k == "demo":
        steps = "".join(f'<div class="step"><span class="chk">✓</span>{_e(x)}</div>' for x in s["steps"])
        body = (f'<div class="stack"><div class="ln small">{_words(s["title"], brand["accent"], "hl")}</div>'
                f'<div class="card"><div class="chead">{_e(s["card_title"])}</div><div class="field"><span class="ftext">{_e(s["input"])}</span></div>'
                f'<div class="btn">{_e(s["button"])}</div><div class="steps">{steps}</div></div><div class="sub">{_e(s.get("sub", ""))}</div></div>')
    elif k == "approval":
        body = (f'<div class="stack"><div class="ln">{_words(s["title"], brand["accent"], "hl")}</div>'
                f'<div class="card"><div class="chead">{_e(s["card_title"])}</div><div class="status wt">{_e(s["waiting"])}</div><div class="status dn">{_e(s["done"])}</div>'
                f'<div class="btn ok">{_e(s["button"])}</div></div><div class="sub">{_e(s.get("sub", ""))}</div></div>')
    elif k == "stats":
        four = " four" if len(s["items"]) >= 4 else ""
        rows = "".join(f'<div class="stat{four}"><div class="num">{_e(x["value"])}</div><div class="lab">{_e(x["label"])}</div></div>' for x in s["items"])
        body = f'<div class="stack"><div class="ln small">{_words(s["title"], brand["accent"], "hl")}</div>{rows}<div class="sub">{_e(s.get("sub", ""))}</div></div>'
    elif k == "cta":
        lines = "".join(f'<div class="ln">{_words(l, brand["accent"], "hl")}</div>' for l in s["lines"])
        body = f'<div class="stack">{lines}<div class="cbtn">{_e(s["button"])}</div><div class="url">{_e(s["url"])}</div></div>'
    elif k == "kinetic":
        ws = "".join(f'<div class="kw{" ac" if n in s.get("accent", []) else ""}">{_e(w)}</div>' for n, w in enumerate(s["words"]))
        body = f'<div class="stack kin">{ws}</div>'
    elif k == "chat":
        bub = "".join(f'<div class="bub {m["from"]}">{_e(m["text"])}</div>' for m in s["messages"])
        body = f'<div class="stack"><div class="chathead"><span class="dot"></span>{_e(s.get("title", "AILO agent"))}</div><div class="chat">{bub}</div></div>'
    elif k == "versus2":
        l = "".join(f'<div class="vrow">{_e(x)}</div>' for x in s["old"]["items"])
        r = "".join(f'<div class="vrow">{_e(x)}</div>' for x in s["new"]["items"])
        body = (f'<div class="stack"><div class="vs"><div class="col old"><div class="vtag">{_e(s["old"]["tag"])}</div>{l}</div>'
                f'<div class="col new"><div class="vtag">{_e(s["new"]["tag"])}</div>{r}</div></div></div>')
    elif k == "flow":
        nodes = []
        for n, x in enumerate(s["nodes"]):
            nodes.append(f'<div class="fn" id="s{i}f{n}"><div class="fic">{_e(x["icon"])}</div><div class="flab">{_e(x["label"])}</div></div>')
            if n < len(s["nodes"]) - 1:
                nodes.append('<div class="fcon"><div class="fline"></div></div>')
        body = f'<div class="stack"><div class="ln small">{_words(s.get("title", ""), brand["accent"], "hl")}</div><div class="fl">{"".join(nodes)}</div></div>'
    elif k == "photos":
        imgs = "".join(f'<img class="ph" src="{_e(m["_file"])}" alt=""/>' for m in s["images"])
        labs = "".join(f'<div class="plab">{_e(m.get("label", ""))}</div>' for m in s["images"])
        body = (f'<div class="stack"><div class="ln small">{_words(s.get("title", ""), brand["accent"], "hl")}</div>'
                f'<div class="pframe{" tall" if s.get("tall") else ""}">{imgs}</div><div class="plabs{" tall" if s.get("tall") else ""}">{labs}</div></div>')
    elif k == "clips":
        labs = "".join(f'<div class="plab">{_e(m.get("label", ""))}</div>' for m in s["clips"])
        body = (f'<div class="ctitle"><div class="ln small">{_words(s.get("title", ""), brand["accent"], "hl")}</div></div>'
                f'<div class="vframe"></div><div class="plabs cl">{labs}</div>')
    if k == "cta" and s.get("sub"):
        body = body.replace('<div class="url">', f'<div class="sub">{_e(s["sub"])}</div><div class="url">', 1)
    cap = ""
    if s.get("_chunks"):
        cap = '<div class="cap">' + "".join(
            f'<div class="cl">' + "".join(f'<span class="cw">{_e(w["text"])}</span>' for w in ch) + "</div>" for ch in s["_chunks"]) + "</div>"
        body = body.replace('class="stack', 'class="stack hascap', 1)
    return (f'<div id="s{i}" class="clip scene {th}" data-start="{t0:.2f}" data-duration="{s["duration"]:.2f}" data-track-index="{i}">{body}{cap}</div>')


def _scene_js(i: int, s: dict, t0: float) -> List[str]:
    k, a = s["kind"], f"#s{i}"
    j = [f'tl.fromTo("{a}", {{opacity: 0}}, {{opacity: 1, duration: 0.01}}, {t0:.2f});'] if i else []
    word = lambda sel, at: f'tl.fromTo("{a} {sel}", {{opacity: 0, y: 40, filter: "blur(10px)"}}, {{opacity: 1, y: 0, filter: "blur(0px)", duration: 0.42, stagger: 0.07, ease: "power3.out"}}, {at:.2f});'
    if i == 0:  # frame 0 is the thumbnail: the hook is already fully on screen, it only settles
        j.append(f'tl.fromTo("{a} .w", {{scale: 1.05, filter: "blur(1.5px)"}}, {{scale: 1, filter: "blur(0px)", duration: 0.4, stagger: 0.05, ease: "power3.out"}}, 0);')
    elif k in ("headline", "orb", "cta"):
        j.append(word(".w", t0 + 0.08))
    if k == "headline" and s.get("sub"):
        j.append(f'tl.fromTo("{a} .sub", {{opacity: 0, y: 24}}, {{opacity: 1, y: 0, duration: 0.45, ease: "power2.out"}}, {t0 + 0.9:.2f});')
    if k == "pills":
        j.append(word(".w", t0 + 0.05))
        j.append(f'tl.fromTo("{a} .pill", {{opacity: 0, x: -140, scale: 0.9}}, {{opacity: 1, x: 0, scale: 1, duration: 0.4, stagger: 0.28, ease: "back.out(1.6)"}}, {t0 + 0.35:.2f});')
        n = max(len(s["typed"]), 1)
        j.append(f'tl.fromTo("{a} .typed", {{clipPath: "inset(0 100% 0 0)", opacity: 1}}, {{clipPath: "inset(0 0% 0 0)", duration: {min(1.1, s["duration"] - 1.9):.2f}, ease: "steps({n})"}}, {t0 + 0.35 + 0.28 * len(s["items"]) + 0.3:.2f});')
    if k == "orb":
        j.append(f'tl.fromTo("{a} .orb", {{scale: 0.2, opacity: 0}}, {{scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.4)"}}, {t0 + 0.05:.2f});')
        j.append(f'tl.fromTo("{a} .ring", {{scale: 0.4, opacity: 0.9}}, {{scale: 2.4, opacity: 0, duration: 1.3, stagger: 0.35, ease: "power2.out"}}, {t0 + 0.5:.2f});')
        j.append(f'tl.fromTo("{a} .sub", {{opacity: 0, y: 24}}, {{opacity: 1, y: 0, duration: 0.5}}, {t0 + 1.5:.2f});')
    if k == "demo":
        j.append(word(".w", t0 + 0.05))
        j.append(f'tl.fromTo("{a} .card", {{opacity: 0, y: 60, scale: 0.96}}, {{opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out"}}, {t0 + 0.3:.2f});')
        n = max(len(s["input"]), 1)
        j.append(f'tl.fromTo("{a} .ftext", {{clipPath: "inset(0 100% 0 0)"}}, {{clipPath: "inset(0 0% 0 0)", duration: 0.8, ease: "steps({n})"}}, {t0 + 0.9:.2f});')
        press = t0 + 1.9
        j.append(f'tl.fromTo("{a} .btn", {{scale: 1}}, {{scale: 0.92, duration: 0.1, yoyo: true, repeat: 1, ease: "power1.inOut"}}, {press:.2f});')
        j.append(f'tl.fromTo("{a} .step", {{opacity: 0, x: -40}}, {{opacity: 1, x: 0, duration: 0.35, stagger: 0.4, ease: "power2.out"}}, {press + 0.3:.2f});')
        j.append(f'tl.fromTo("{a} .chk", {{scale: 0}}, {{scale: 1, duration: 0.3, stagger: 0.4, ease: "back.out(2.5)"}}, {press + 0.45:.2f});')
        j.append(f'tl.fromTo("{a} .sub", {{opacity: 0, y: 20}}, {{opacity: 1, y: 0, duration: 0.45}}, {press + 0.3 + 0.4 * len(s["steps"]) + 0.2:.2f});')
    if k == "approval":
        j.append(word(".w", t0 + 0.05))
        j.append(f'tl.fromTo("{a} .card", {{opacity: 0, y: 60, scale: 0.96}}, {{opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out"}}, {t0 + 0.4:.2f});')
        j.append(f'tl.fromTo("{a} .btn", {{scale: 1}}, {{scale: 0.9, duration: 0.1, yoyo: true, repeat: 1}}, {t0 + 1.8:.2f});')
        j.append(f'tl.fromTo("{a} .btn", {{backgroundColor: "#2a2a3a"}}, {{backgroundColor: "#38d27a", duration: 0.25}}, {t0 + 1.9:.2f});')
        j.append(f'tl.fromTo("{a} .wt", {{opacity: 1}}, {{opacity: 0, duration: 0.12}}, {t0 + 1.95:.2f});')
        j.append(f'tl.fromTo("{a} .dn", {{opacity: 0, y: 14}}, {{opacity: 1, y: 0, duration: 0.3}}, {t0 + 2.05:.2f});')
        j.append(f'tl.fromTo("{a} .sub", {{opacity: 0, y: 20}}, {{opacity: 1, y: 0, duration: 0.45}}, {t0 + 2.3:.2f});')
    if k == "stats":
        j.append(word(".w", t0 + 0.05))
        j.append(f'tl.fromTo("{a} .stat", {{opacity: 0, y: 70, scale: 0.94}}, {{opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.55, ease: "back.out(1.3)"}}, {t0 + 0.4:.2f});')
        j.append(f'tl.fromTo("{a} .sub", {{opacity: 0}}, {{opacity: 1, duration: 0.4}}, {t0 + 0.4 + 0.55 * len(s["items"]) + 0.3:.2f});')
    if k == "cta":
        j.append(f'tl.fromTo("{a} .cbtn", {{opacity: 0, scale: 0.8}}, {{opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.8)"}}, {t0 + 1.1:.2f});')
        j.append(f'tl.fromTo("{a} .url", {{opacity: 0, y: 20}}, {{opacity: 1, y: 0, duration: 0.45}}, {t0 + 1.6:.2f});')
    if k == "kinetic":
        wt = s.get("_wt") or [0.15 + 0.5 * n for n in range(len(s["words"]))]
        for n, off in enumerate(wt[: len(s["words"])]):
            if i == 0 and n == 0:  # the thumbnail already shows the first word
                j.append(f'tl.fromTo("{a} .kw:nth-child(1)", {{scale: 1.18}}, {{scale: 1, duration: 0.35, ease: "power3.out"}}, 0);')
                continue
            j.append(f'tl.fromTo("{a} .kw:nth-child({n + 1})", {{opacity: 0, scale: 1.7, y: -40}}, {{opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "back.out(1.7)"}}, {t0 + off:.2f});')
    if k == "chat":
        bt = s.get("_bt") or [0.5 + 1.0 * n for n in range(len(s["messages"]))]
        j.append(f'tl.fromTo("{a} .chathead", {{opacity: 0, y: -20}}, {{opacity: 1, y: 0, duration: 0.4}}, {t0 + 0.1:.2f});')
        for n, off in enumerate(bt[: len(s["messages"])]):
            j.append(f'tl.fromTo("{a} .bub:nth-child({n + 1})", {{opacity: 0, y: 50, scale: 0.88}}, {{opacity: 1, y: 0, scale: 1, duration: 0.38, ease: "back.out(1.5)"}}, {t0 + off:.2f});')
    if k == "photos":
        n_ = len(s["images"])
        per = max(0.8, (s["duration"] - 0.9) / max(n_, 1))
        j.append(word(".w", t0 + 0.05))
        j.append(f'tl.fromTo("{a} .pframe", {{opacity: 0, y: 50, scale: 0.95}}, {{opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out"}}, {t0 + 0.25:.2f});')
        for n in range(n_):
            at = t0 + 0.4 + n * per
            j.append(f'tl.fromTo("{a} .ph:nth-child({n + 1})", {{opacity: 0, scale: 1.12}}, {{opacity: 1, scale: 1, duration: 0.45, ease: "power2.out"}}, {at:.2f});')
            j.append(f'tl.fromTo("{a} .plab:nth-child({n + 1})", {{opacity: 0, y: 24}}, {{opacity: 1, y: 0, duration: 0.3}}, {at + 0.1:.2f});')
            if n < n_ - 1:
                j.append(f'tl.fromTo("{a} .ph:nth-child({n + 1})", {{opacity: 1}}, {{opacity: 0, duration: 0.2, immediateRender: false}}, {at + per - 0.05:.2f});')
                j.append(f'tl.fromTo("{a} .plab:nth-child({n + 1})", {{opacity: 1}}, {{opacity: 0, duration: 0.15, immediateRender: false}}, {at + per - 0.05:.2f});')
    if k == "clips":
        n_ = len(s["clips"])
        per = max(0.8, (s["duration"] - 0.6) / max(n_, 1))
        j.append(word(".w", t0 + 0.05))
        j.append(f'tl.fromTo("{a} .vframe", {{opacity: 0, y: 50, scale: 0.95}}, {{opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out"}}, {t0 + 0.2:.2f});')
        for n in range(n_):
            at = t0 + 0.4 + n * per
            j.append(f'tl.fromTo("{a} .plab:nth-child({n + 1})", {{opacity: 0, y: 24}}, {{opacity: 1, y: 0, duration: 0.3}}, {at + 0.1:.2f});')
            if n < n_ - 1:
                j.append(f'tl.fromTo("{a} .plab:nth-child({n + 1})", {{opacity: 1}}, {{opacity: 0, duration: 0.15, immediateRender: false}}, {at + per - 0.05:.2f});')
    if k == "versus2":
        d = s["duration"]
        j.append(f'tl.fromTo("{a} .old", {{opacity: 0, x: -80}}, {{opacity: 1, x: 0, duration: 0.45, ease: "power3.out"}}, {t0 + 0.2:.2f});')
        j.append(f'tl.fromTo("{a} .old .vrow", {{opacity: 0, x: -30}}, {{opacity: 1, x: 0, duration: 0.3, stagger: 0.4}}, {t0 + 0.5:.2f});')
        tn = t0 + float(s.get("new_at", d * 0.46))
        j.append(f'tl.fromTo("{a} .old", {{opacity: 1}}, {{opacity: 0.28, duration: 0.4, immediateRender: false}}, {tn:.2f});')
        j.append(f'tl.fromTo("{a} .new", {{opacity: 0, x: 80, scale: 0.95}}, {{opacity: 1, x: 0, scale: 1, duration: 0.5, ease: "back.out(1.4)"}}, {tn:.2f});')
        j.append(f'tl.fromTo("{a} .new .vrow", {{opacity: 0, x: 30}}, {{opacity: 1, x: 0, duration: 0.3, stagger: 0.4}}, {tn + 0.3:.2f});')
    if k == "flow":
        n_ = len(s["nodes"])
        step = max(0.5, (s["duration"] - 1.6) / max(n_, 1))
        j.append(word(".w", t0 + 0.05))
        for n in range(n_):
            at = t0 + 0.5 + n * step
            j.append(f'tl.fromTo("#s{i}f{n}", {{opacity: 0, scale: 0.6}}, {{opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.8)"}}, {at:.2f});')
        j.append(f'tl.fromTo("{a} .fline", {{scaleY: 0}}, {{scaleY: 1, duration: {step * 0.7:.2f}, stagger: {step:.2f}, ease: "power1.inOut"}}, {t0 + 0.5 + 0.35:.2f});')
    chs = s.get("_chunks") or []
    for c, ch in enumerate(chs):
        st, en = ch[0]["start"], ch[-1]["end"] + 0.12
        if c + 1 < len(chs):
            en = min(en, chs[c + 1][0]["start"] - 0.09)
        en = max(en, st + 0.2)
        j.append(f'tl.fromTo("{a} .cl:nth-child({c + 1})", {{opacity: 0, y: 14}}, {{opacity: 1, y: 0, duration: 0.14}}, {t0 + st:.2f});')
        j.append(f'tl.fromTo("{a} .cl:nth-child({c + 1})", {{opacity: 1}}, {{opacity: 0, duration: 0.05, immediateRender: false}}, {t0 + en:.2f});')
        for w, wd in enumerate(ch):
            j.append(f'tl.fromTo("{a} .cl:nth-child({c + 1}) .cw:nth-child({w + 1})", {{color: "inherit"}}, {{color: "{"var(--acc)"}", duration: 0.06}}, {t0 + wd["start"]:.2f});')
    return j


CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:%(dark)s}
#root{--acc:%(accent)s;position:relative;width:1080px;height:1920px;overflow:hidden;font-family:'%(font)s',sans-serif}
.scene{position:absolute;inset:0}
.scene.dark{background:radial-gradient(900px 700px at 50%% 38%%, %(navy)s 0%%, %(dark)s 70%%);color:%(ink_dark)s}
.scene.light{background:radial-gradient(900px 700px at 50%% 30%%, #ffffff 0%%, %(light)s 75%%);color:%(ink_light)s}
.stack{position:absolute;left:90px;right:90px;top:%(top)spx;height:%(band)spx;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:26px;text-align:center}
.stack.low{top:980px;height:350px;justify-content:flex-start}
.ln{font-size:128px;font-weight:800;line-height:1.02;letter-spacing:-0.035em}
.ln.small{font-size:70px;font-weight:700;margin-bottom:10px}
.w{display:inline-block;margin:0 .13em}.hl.ac{color:%(accent)s}.scene.light .hl.ac,.scene.light .num{color:%(accent_light)s}
.sub{font-size:44px;font-weight:500;opacity:.75;line-height:1.25;max-width:880px}
.pill{width:760px;padding:26px 0;border-radius:999px;font-size:50px;font-weight:600;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.22)}
.typed{font-size:72px;font-weight:800;color:%(accent)s;margin-top:18px;clip-path:inset(0 100%% 0 0);letter-spacing:-0.02em}
.orbwrap{position:absolute;left:0;right:0;top:420px;height:480px}
.orb{position:absolute;left:390px;top:130px;width:300px;height:300px;border-radius:50%%;background:radial-gradient(circle at 38%% 34%%, #ffd2b4 0%%, %(accent)s 38%%, #b3470f 100%%);box-shadow:0 0 120px 40px rgba(255,138,76,.55)}
.ring{position:absolute;left:390px;top:130px;width:300px;height:300px;border-radius:50%%;border:3px solid %(accent)s}
.card{width:860px;border-radius:44px;padding:44px 46px;background:#fff;color:#0a0a1a;box-shadow:0 40px 90px rgba(10,10,40,.22);text-align:left;display:flex;flex-direction:column;gap:22px}
.scene.dark .card{background:#15152b;color:#f4f5ff;box-shadow:0 40px 90px rgba(0,0,0,.55);border:1.5px solid rgba(255,255,255,.12)}
.chead{font-size:34px;font-weight:700;opacity:.55;letter-spacing:.02em;text-transform:uppercase}
.field{height:96px;border-radius:24px;border:2.5px solid rgba(10,10,40,.16);display:flex;align-items:center;padding:0 28px;font-size:38px;font-weight:500;overflow:hidden;white-space:nowrap}
.ftext{display:inline-block;clip-path:inset(0 100%% 0 0)}
.btn{align-self:flex-start;padding:22px 52px;border-radius:999px;background:%(accent)s;color:#0a0a1a;font-size:42px;font-weight:700}
.btn.ok{background:#2a2a3a;color:#fff;align-self:center;padding:26px 90px}
.status{font-size:46px;font-weight:600}.status.dn{opacity:0;color:%(good)s;margin-top:-76px}
.steps{display:flex;flex-direction:column;gap:14px}
.step{font-size:40px;font-weight:600;display:flex;align-items:center;gap:20px}
.chk{width:52px;height:52px;border-radius:50%%;background:%(good)s;color:#0a0a1a;display:inline-flex;align-items:center;justify-content:center;font-size:32px;font-weight:800}
.stat{width:860px;border-radius:36px;padding:30px 44px;background:#fff;box-shadow:0 30px 70px rgba(10,10,40,.16);display:flex;align-items:center;gap:36px;text-align:left}
.stat.four{padding:14px 44px}.stat.four .num{font-size:84px}
.num{font-size:104px;font-weight:800;color:%(accent_light)s;letter-spacing:-0.04em;min-width:300px}
.lab{font-size:38px;font-weight:600;line-height:1.2;color:#0a0a1a}
.cbtn{margin-top:20px;padding:30px 70px;border-radius:999px;background:%(accent)s;color:#0a0a1a;font-size:50px;font-weight:700}
.url{font-size:46px;font-weight:600;opacity:.85;letter-spacing:.01em}
.stack.hascap{height:880px}.stack.low.hascap{top:640px;height:380px}
.kin{gap:0}.kw{font-size:190px;font-weight:900;line-height:1.0;letter-spacing:-0.05em}.kw.ac{color:%(accent)s}
.scene.light .kw.ac{color:%(accent_light)s}
.chathead{font-size:40px;font-weight:700;display:flex;align-items:center;gap:14px;opacity:.9}
.dot{width:20px;height:20px;border-radius:50%%;background:%(good)s}
.chat{width:900px;display:flex;flex-direction:column;gap:22px}
.bub{max-width:700px;padding:26px 34px;border-radius:44px;font-size:42px;font-weight:600;line-height:1.25;text-align:left}
.bub.user{align-self:flex-end;background:%(accent)s;color:#0a0a1a;border-bottom-right-radius:12px}
.bub.agent{align-self:flex-start;background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.18);border-bottom-left-radius:12px}
.scene.light .bub.agent{background:#fff;border:1.5px solid rgba(10,10,40,.12);box-shadow:0 12px 30px rgba(10,10,40,.1)}
.vs{width:930px;display:flex;flex-direction:column;gap:34px}
.col{border-radius:40px;padding:36px 42px;display:flex;flex-direction:column;gap:18px;text-align:left}
.col.old{background:rgba(255,255,255,.06);border:2px dashed rgba(255,255,255,.28)}
.col.new{background:%(accent)s;color:#0a0a1a}
.vtag{font-size:34px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.75}
.vrow{font-size:52px;font-weight:700;line-height:1.15}
.col.old .vrow{text-decoration:line-through;text-decoration-thickness:4px;opacity:.85}
.fl{display:flex;flex-direction:column;align-items:center;gap:0}
.fn{display:flex;align-items:center;gap:30px;width:760px;padding:12px 30px;border-radius:999px;background:rgba(255,255,255,.09);border:2px solid rgba(255,255,255,.2)}
.fic{width:84px;height:84px;border-radius:50%%;background:%(accent)s;color:#0a0a1a;font-size:46px;font-weight:800;display:flex;align-items:center;justify-content:center}
.flab{font-size:50px;font-weight:700}
.fcon{height:38px;width:6px}.fline{width:6px;height:38px;background:%(accent)s;transform-origin:top}
.cap{position:absolute;left:70px;right:70px;top:1090px;height:200px}
.cl{position:absolute;left:0;right:0;top:0;text-align:center;font-size:78px;font-weight:800;letter-spacing:-0.02em;line-height:1.12;opacity:0;text-shadow:0 4px 24px rgba(0,0,0,.35)}
.scene.light .cl{text-shadow:none;--acc:%(accent_light)s}
.cw{display:inline-block;margin:0 .12em}
.pframe{position:relative;width:860px;height:640px;border-radius:44px;background:#fff;box-shadow:0 30px 80px rgba(20,20,40,.22);overflow:hidden}
.ctitle{position:absolute;left:90px;right:90px;top:190px;height:150px;display:flex;align-items:flex-end;justify-content:center;text-align:center}
.vframe{position:absolute;left:90px;top:370px;width:900px;height:600px;border-radius:40px;background:#000;box-shadow:0 30px 80px rgba(0,0,0,.4)}
.plabs.cl{position:absolute;left:90px;top:990px;width:900px;height:70px}
.vid{position:absolute;left:90px;top:370px;width:900px;height:600px;border-radius:40px;object-fit:cover;z-index:10}
.pframe.tall{width:540px;height:810px}.plabs.tall{width:760px;height:64px}.pframe.tall .ph{object-fit:cover}
.ph{position:absolute;inset:0;width:100%%;height:100%%;object-fit:contain;opacity:0}
.plabs{position:relative;height:84px;width:860px}
.plab{position:absolute;left:0;right:0;top:0;text-align:center;font-size:54px;font-weight:800;color:%(accent_light)s;opacity:0}
.scene.dark .plab{color:%(accent)s}
.wipe{position:absolute;left:0;right:0;top:0;height:1920px;background:%(accent)s;z-index:50}
"""


LEAD = 0.25   # seconds of air before the voice starts in a scene
TAIL = 0.55


def _chunks(words: List[dict], per: int = 3, say: str = "") -> List[List[dict]]:
    """Groups of up to `per` words that never run across a sentence end. Uses the script's punctuation when the
    token count matches the voice's word count."""
    toks = say.split()
    if len(toks) == len(words):
        words = [{**w, "text": t.rstrip(".,;:") if not t.endswith(("?", "!")) else t} for w, t in zip(words, toks)]
        stops = {i for i, t in enumerate(toks) if t.endswith((".", "?", "!", ":", ";", ","))}
    else:
        stops = set()
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        if len(cur) >= per or i in stops:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def _cut_clips(s: dict, i: int, out: Path) -> None:
    """Cut each clip of a `clips` scene from the client's source video into a small silent mp4 inside the project."""
    if s["kind"] != "clips":
        return
    if not s.get("clips"):
        raise ReelError(f"scene {i + 1}: clips needs at least one clip")
    per = max(0.8, (float(s.get("duration") or 3.0) - 0.6) / len(s["clips"]))
    for n, m in enumerate(s["clips"]):
        src = Path(m["src"])
        if not src.is_file():
            raise ReelError(f"scene {i + 1}: video not found: {src}")
        fn = f"clip_{i}_{n}.mp4"
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(float(m["start"])), "-t", f"{per + 0.3:.2f}", "-i", str(src), "-an",
                            "-vf", "scale=900:-2,fps=30", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-g", "15", str(out / "assets" / fn)],
                           capture_output=True, text=True)
        if r.returncode != 0:
            raise ReelError(f"could not cut clip {n + 1} of scene {i + 1}: {r.stderr[-200:]}")
        m["_file"] = f"assets/{fn}"


def _resolve(spec: dict, out: Path, speak_fn, music_fn) -> dict:
    """Voice each spoken scene, fix its length to the voice, and compute caption / beat timings. Returns a resolved copy."""
    sp = json.loads(json.dumps(spec))
    validate(sp)
    n_sc = len(sp["scenes"])
    for i, s in enumerate(sp["scenes"]):
        if s["kind"] == "photos":
            if not s.get("images"):
                raise ReelError(f"scene {i + 1}: photos needs at least one image")
            for n, m in enumerate(s["images"]):
                src = Path(m["src"])
                if not src.is_file():
                    raise ReelError(f"scene {i + 1}: image not found: {src}")
                fn = f"img_{i}_{n}{src.suffix.lower()}"
                shutil.copy(str(src), out / "assets" / fn)
                m["_file"] = f"assets/{fn}"
        say = s.get("say")
        if not say:
            s.setdefault("duration", 3.0)
            _cut_clips(s, i, out)
            continue
        v = speak_fn(say, out / "assets" / f"vo{i}.mp3", s.get("voice") or sp.get("voice", "andrew"), s.get("rate") or sp.get("rate", "+6%"))
        words = [{"text": w["text"], "start": w["start"] + LEAD, "end": w["end"] + LEAD} for w in v["words"]]
        s["_vo"] = {"file": f"assets/vo{i}.mp3", "start": LEAD, "duration": v["duration"]}
        s["duration"] = round(max(float(s.get("duration") or 0), v["duration"] + LEAD + (0.9 if i == n_sc - 1 else TAIL)), 2)
        s["_chunks"] = _chunks(words, 3, say)
        _cut_clips(s, i, out)
        if s["kind"] == "kinetic":
            kw = s["words"]
            s["_wt"] = [w["start"] for w in words][: len(kw)] if len(words) >= len(kw) else None
            if s["_wt"] and len(words) != len(kw):  # more spoken words than slams: spread the slams over the speech
                idx = [round(n * (len(words) - 1) / max(len(kw) - 1, 1)) for n in range(len(kw))]
                s["_wt"] = [words[x]["start"] for x in idx]
        if s.get("new_at_word"):  # versus2: the new column enters when this spoken word is said
            hit = next((w for w in words if w["text"].lower().strip(".,") == s["new_at_word"].lower()), None)
            if hit:
                s["new_at"] = round(hit["start"] - 0.15, 2)
        if s["kind"] == "chat":
            ms = s["messages"]
            s["_bt"] = [float(m["at"]) if "at" in m else 0.5 + n * max((s["duration"] - 1.6) / max(len(ms), 1), 0.6) for n, m in enumerate(ms)]
    music = sp.get("music")
    if music:
        total = sum(x["duration"] for x in sp["scenes"])
        music_fn(music["style"], total, out / "assets" / "music.wav", int(music.get("seed", 7)))
    total = sum(x["duration"] for x in sp["scenes"])
    if not 12 <= total <= 60:
        raise ReelError(f"total length {total:.1f}s; a reel should be 12 to 60 seconds")
    return sp


def build(spec: dict, out_dir: Path, speak_fn=None, music_fn=None) -> Path:
    """Write a HyperFrames project for `spec` into out_dir and return the index.html path."""
    from studio import musicgen, voice
    out = Path(out_dir)
    (out / "assets").mkdir(parents=True, exist_ok=True)
    spec = _resolve(spec, out, speak_fn or voice.speak, music_fn or (lambda st, secs, path, seed: musicgen.make(st, secs, path, seed)))
    brand = {**DEFAULT_BRAND, **(spec.get("brand") or {})}
    scenes = spec["scenes"]
    total = sum(s["duration"] for s in scenes)
    parts, js, t = [], [], 0.0
    starts = []
    for i, s in enumerate(scenes):
        parts.append(_scene_html(i, s, t, brand))
        js += _scene_js(i, s, t)
        starts.append(t)
        t += s["duration"]
    for i, s_ in enumerate(scenes):  # videos live at the top level (never nested in a timed scene) and need ids
        if s_["kind"] == "clips":
            per = max(0.8, (s_["duration"] - 0.6) / len(s_["clips"]))
            for n, m in enumerate(s_["clips"]):
                parts.append(f'<video id="vid_{i}_{n}" class="clip vid" src="{_e(m["_file"])}" muted playsinline data-start="{starts[i] + 0.4 + n * per:.2f}" data-duration="{per:.2f}" data-track-index="{50 + n}"></video>')
    # wipes at every cut (covers the swap, then leaves)
    wipes = []
    for i, st in enumerate(starts[1:], 1):
        wipes.append(f'<div id="wipe{i}" class="clip wipe" data-start="{st - 0.3:.2f}" data-duration="0.62" data-track-index="30"></div>')
        js.append(f'tl.fromTo("#wipe{i}", {{y: 1920}}, {{y: 0, duration: 0.26, ease: "power3.in"}}, {st - 0.3:.2f});')
        js.append(f'tl.fromTo("#wipe{i}", {{y: 0}}, {{y: -1920, duration: 0.3, ease: "power3.out", immediateRender: false}}, {st + 0.02:.2f});')
    # sound: voice, music, then effects (per-scene offsets, automatic whooshes on cuts, plus any absolute cues)
    audio, copied, n = [], set(), 0

    def add_sfx(name: str, at: float, volume: float, length: float) -> None:
        nonlocal n
        src = sfxlib.resolve(name)
        if not src:
            raise ReelError(f"unknown sound effect {name!r}")
        fn = f"{name}.wav"
        if fn not in copied:
            shutil.copy(str(src), out / "assets" / fn)
            copied.add(fn)
        audio.append(f'<audio id="sfx{n}" src="assets/{fn}" data-start="{max(at, 0):.2f}" data-duration="{length:.2f}" data-volume="{volume}" data-track-index="{40 + n}"></audio>')
        n += 1

    for i, s in enumerate(scenes):
        if s.get("_vo"):
            audio.append(f'<audio id="vo{i}" src="{s["_vo"]["file"]}" data-start="{starts[i] + s["_vo"]["start"]:.2f}" data-duration="{s["_vo"]["duration"]:.2f}" data-volume="1" data-track-index="{20 + i}"></audio>')
    if spec.get("music"):
        audio.append(f'<audio id="music" src="assets/music.wav" data-start="0" data-duration="{total:.2f}" data-volume="{float(spec["music"].get("volume", 0.22))}" data-track-index="10"></audio>')
    if spec.get("auto_whoosh", True):
        for st in starts[1:]:
            add_sfx("whoosh", st - 0.28, 0.45, 0.6)
    for i, s in enumerate(scenes):
        if s["kind"] == "photos" and not s.get("no_auto_sfx"):
            per = max(0.8, (s["duration"] - 0.9) / len(s["images"]))
            for n_ in range(len(s["images"])):
                add_sfx("pop", starts[i] + 0.4 + n_ * per, 0.3, 0.5)
        for c in s.get("sfx", []):
            add_sfx(c["name"], starts[i] + float(c["at"]), float(c.get("volume", 0.5)), float(c.get("length", 0.8)))
    for c in spec.get("sfx", []):
        add_sfx(c["name"], float(c["at"]), float(c.get("volume", 0.6)), float(c.get("length", 2)))
    css = CSS % {**brand, "top": SAFE_TOP, "band": SAFE_BOTTOM - SAFE_TOP}
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=1080, height=1920"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>{css}</style></head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{total:.2f}" data-width="1080" data-height="1920">
{chr(10).join(parts)}
{chr(10).join(wipes)}
{chr(10).join(audio)}
</div>
<script>
gsap.defaults({{lazy: false}});
const tl = gsap.timeline({{paused: true}});
{chr(10).join(js)}
window.__timelines = window.__timelines || {{}};
window.__timelines["main"] = tl;
tl.seek(0);
</script></body></html>
"""
    (out / "index.html").write_text(page, encoding="utf-8")
    (out / "reel.json").write_text(json.dumps(spec, indent=2), encoding="utf-8")
    return out / "index.html"
