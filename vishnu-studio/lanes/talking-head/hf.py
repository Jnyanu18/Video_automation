"""Talking head on HyperFrames (the default engine since 2026-10-25): python lanes/talking-head/hf.py <slug> [build|stills|render]

Turns work/edit.json (from plan.py) and work/cut.mp4 into a HyperFrames project in videos/<slug>/hf/: the face
(full frame, or the bottom half for layout: split), one "beats" scene with every card, number, chip, panel, the
name tag and the end card, and one "captions" scene. Only style: clay is drawn here (the brand look); every other
look, and the liquid glass, pixel screen and over-the-shoulder effects in their Remotion form, stay in Remotion:
set engine: remotion in edit.md for those (see CLAUDE.md, "Which engine").

  build         write the project (storyboard.py and render.py call this themselves)
  stills T,...  PNG frames at those seconds into hf/stills/, returns their paths in order
  render OUT    render the picture and the voice to OUT (one worker: the laptop overheats on more)

Music is not mixed here: render.py puts it under the voice afterwards with kit/music.py, as for Remotion.
"""
import html
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "kit"))  # common.py
from common import ROOT, read_json, video_dir

HF = "hyperframes@0.8.197"  # pinned, so a video re-renders the same way later
NPX = shutil.which("npx") or "npx"
FONTS = ROOT / "kit" / "hf" / "fonts"
INK = "#3d2766"
FILLS = ["#FFF0B8", "#C9E4FF", "#BFF0D4", "#FFD6E7", "#FFD6A8", "#E9DDFB"]
HALF = 960
UNSUPPORTED = {"shoulder"}

CSS = f"""
@font-face {{ font-family: "Fredoka"; src: url("assets/fonts/Fredoka.woff2") format("woff2"); font-weight: 300 700; }}
#root {{ position: absolute; inset: 0; font-family: "Fredoka", sans-serif; color: {INK}; }}
.clay {{ border-radius: 44px; box-shadow: inset -10px -12px 22px rgba(0,0,0,0.13), inset 10px 12px 22px rgba(255,255,255,0.75),
        0 26px 44px rgba(40,20,80,0.35); }}
.fill {{ position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }}
.half {{ position: absolute; left: 0; top: 0; width: 1080px; height: {HALF}px; overflow: hidden; }}
.room {{ background: #E9DDFB; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; padding: 50px 60px; }}
.blob {{ position: absolute; border-radius: 999px; }}
.low {{ display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding: 0 70px 520px; }}
.pill {{ display: inline-block; padding: 10px 44px; font-weight: 700; white-space: nowrap; }}
.card {{ background: #F7F2FF; padding: 30px 42px; font-weight: 600; font-size: 70px; line-height: 1.12; text-align: center; }}
.mark {{ display: inline-block; padding: 0 18px; margin: 4px 2px; border-radius: 26px; }}
.num {{ font-weight: 700; line-height: 1.05; }}
.row {{ width: 960px; display: flex; align-items: center; gap: 20px; padding: 8px 16px; background: #F7F2FF; border-radius: 34px; }}
.chip {{ padding: 6px 20px; font-weight: 700; font-size: 40px; width: 210px; text-align: center; flex-shrink: 0; border-radius: 26px; }}
.shot {{ background: #C8A27A; display: flex; align-items: center; justify-content: center; }}
.tape {{ position: absolute; width: 190px; height: 50px; background: rgba(255,244,200,0.8); }}
.note {{ position: absolute; background: #1b1b1b; color: #fff; font-family: "Fredoka"; font-weight: 600; font-size: 50px; padding: 8px 26px; }}
"""


def esc(s):
    return html.escape(str(s), quote=True)


def fill(i):
    return FILLS[i % len(FILLS)]


def fit(text, top):
    return int(min(top, 1700 / max(4, len(text))))


class Scene:
    """Collects timed clips and their GSAP lines for one sub-composition."""

    def __init__(self, sid):
        self.sid, self.html, self.js, self.n = sid, [], [], 0

    def clip(self, start, dur, inner, cls="fill", style=""):
        self.n += 1
        cid = f"{self.sid}{self.n}"
        self.html.append(f'<div id="{cid}" class="clip {cls}" data-start="{start:.3f}" data-duration="{max(0.2, dur):.3f}" '
                         f'style="{style}">{inner}</div>')
        return cid

    def pop(self, sel, t, tilt=0.0, out=None):
        """Lands like a ball of clay: grows past full size and settles; leaves quicker."""
        self.js.append(f'tl.fromTo("{sel}", {{scale: 0.45, opacity: 0, rotation: 0}}, {{scale: 1, opacity: 1, rotation: {tilt}, '
                       f'duration: 0.45, ease: "back.out(2.2)", immediateRender: false}}, {t:.3f});')
        if out is not None:
            self.js.append(f'tl.to("{sel}", {{scale: 0.85, opacity: 0, duration: 0.16, ease: "power2.in"}}, {max(t + 0.3, out - 0.16):.3f});')

    def write(self, path, extra_css=""):
        path.write_text(f"""<template>
  <style>{CSS}{extra_css}</style>
  <div id="root" data-composition-id="{self.sid}" data-width="1080" data-height="1920" data-layout-allow-overlap data-layout-allow-overflow>
    {"".join(self.html)}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    {"".join(self.js)}
    window.__timelines["{self.sid}"] = tl;
  </script>
</template>
""", encoding="utf-8")


def room(inner, bg="#E9DDFB", half=True):
    blobs = ('<div class="blob clay" style="background:#FFD6A8;width:300px;height:300px;right:-110px;top:-90px"></div>'
             '<div class="blob clay" style="background:#BFF0D4;width:200px;height:200px;left:-80px;bottom:-60px"></div>')
    return f'<div class="{"half" if half else "fill"} room" style="background:{bg}">{blobs}{inner}</div>'


def panel(sc, b, half, assets):
    """One top-half scene of a split layout, drawn in clay; screenshots of posts stay paper cutout."""
    look, parts, at, end = b["look"], b["parts"], b["at"], b["at"] + b["dur"]
    if look == "shot":
        src = Path(parts[0])
        dst = assets / "broll" / src.name
        dst.parent.mkdir(exist_ok=True)
        shutil.copy2(ROOT / "videos" / src, dst)
        note = f'<div class="note" id="{sc.sid}n{sc.n + 1}" style="right:60px;bottom:60px">{esc(parts[1])}</div>' if len(parts) > 1 else ""
        cid = sc.clip(at, b["dur"], f'<div class="half shot"><div class="pic" style="position:relative;background:#fff;padding:14px;'
                      f'box-shadow:0 18px 30px rgba(0,0,0,0.4)"><img src="assets/broll/{esc(src.name)}" style="display:block;width:900px;'
                      f'max-height:720px;object-fit:contain"><div class="tape" style="left:-30px;top:-18px;transform:rotate(-14deg)"></div>'
                      f'<div class="tape" style="right:-30px;bottom:-12px;transform:rotate(-10deg)"></div></div>{note}</div>')
        sc.js.append(f'tl.fromTo("#{cid} .pic", {{scale: 1.25, rotation: 0, opacity: 0}}, {{scale: 1, rotation: -3, opacity: 1, duration: 0.4, '
                     f'ease: "power3.out", immediateRender: false}}, {at:.3f});')
        if note:
            sc.pop(f"#{cid} .note", at + 0.35, -4)
        return
    items = []
    if look in ("kinetic",):
        for i, raw in enumerate(parts):
            hot = raw.startswith("*")
            line = raw.lstrip("*")
            items.append((f'<div class="pill clay p" style="background:{"#FFF0B8" if hot else "#F7F2FF"};font-size:{fit(line, 170 if hot else 120)}px;'
                          f'border-radius:50px">{esc(line)}</div>', 0.17 * i, 2 if i % 2 else -2))
    elif look == "term":
        step = max(0.2, b["dur"] * 0.55 / len(parts))
        rows = []
        for i, raw in enumerate(parts):
            warn = raw.startswith("!")
            line = raw.lstrip("!")
            rows.append(f'<div class="clay p" style="background:{"#FFB4C8" if warn else "#C9E4FF" if i == 0 else "#fff"};border-radius:28px;'
                        f'padding:10px 26px;font-weight:{700 if warn else 600};font-size:{56 if warn else fit(line, 54)}px;white-space:nowrap">{esc(line)}</div>')
        dots = "".join(f'<div class="clay" style="background:{c};width:30px;height:30px;border-radius:999px"></div>' for c in ("#FFB4C8", "#FFF0B8", "#BFF0D4"))
        win = (f'<div class="clay w" style="background:#F7F2FF;border-radius:50px;width:920px;padding:26px 34px 34px;display:flex;'
               f'flex-direction:column;gap:18px"><div style="display:flex;gap:12px;margin-bottom:6px">{dots}</div>{"".join(rows)}</div>')
        cid = sc.clip(at, b["dur"], room(win) if half else room(win, half=False))
        sc.pop(f"#{cid} .w", at)
        for i in range(len(parts)):
            sc.js.append(f'tl.fromTo("#{cid} .p:nth-of-type({i + 2})", {{scale: 0.5, opacity: 0}}, {{scale: 1, opacity: 1, duration: 0.4, '
                         f'ease: "back.out(2.2)", immediateRender: false}}, {at + 0.15 + i * step:.3f});')
        return
    elif look == "alert":
        items.append((f'<div class="pill clay p" style="background:#FFB4C8;border-radius:90px;padding:30px 70px;font-size:{fit(parts[0], 190)}px;'
                      f'line-height:1">{esc(parts[0])}</div>', 0, -3))
        if len(parts) > 1:
            items.append((f'<div class="clay p" style="background:#fff;border-radius:40px;padding:16px 36px;font-weight:600;font-size:54px;'
                          f'text-align:center;max-width:920px">{esc(parts[1])}</div>', 0.27, 2))
    elif look == "count":
        if len(parts) > 2:
            items.append((f'<div class="pill clay p" style="background:#FFD6E7;border-radius:999px;padding:8px 30px;font-weight:600;font-size:40px">{esc(parts[2])}</div>', 0, -3))
        items.append((f'<div class="clay num p" style="background:#FFF0B8;border-radius:70px;padding:10px 80px;font-size:300px">{esc(parts[0])}</div>', 0.1, 2))
        items.append((f'<div class="clay p" style="background:#fff;border-radius:36px;padding:12px 34px;font-weight:600;font-size:52px;'
                      f'text-align:center;max-width:940px">{esc(parts[1])}</div>', 0.27, 0))
    elif look == "doodle":
        step = max(0.2, b["dur"] * 0.5 / len(parts))
        for i, l in enumerate(parts):
            l = re.sub(r"^\d+\.\s*", "", l)
            items.append((f'<div class="p" style="display:flex;align-items:center;gap:26px"><div class="clay" style="background:{fill(i + 2)};'
                          f'width:110px;height:110px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-weight:700;'
                          f'font-size:70px">{i + 1}</div><div class="clay" style="background:#F7F2FF;border-radius:44px;padding:14px 44px;'
                          f'font-weight:700;font-size:96px">{esc(l)}</div></div>', i * step, 2 if i % 2 else -2))
    elif look == "versions":
        items.append(versions_title("Run at least", False))
        items += versions_rows(parts, False)
    else:
        raise SystemExit(f"panel look '{look}' has no clay version yet; use engine: remotion or one of kinetic, term, alert, count, "
                         f"doodle, versions, shot")
    cid = sc.clip(at, b["dur"], room("".join(x for x, _, _ in items)) if half else room("".join(x for x, _, _ in items), half=False))
    for i, (_, d, tilt) in enumerate(items):
        sc.pop(f"#{cid} .p:nth-of-type({i + 3})", at + d, tilt)


def versions_title(title, tall):
    return (f'<div class="pill clay p" style="background:#FFD6E7;border-radius:999px;padding:{"16px 50px" if tall else "8px 40px"};'
            f'font-size:{90 if tall else 60}px">{esc(title)}</div>', 0, -2)


def versions_rows(parts, tall):
    out = []
    for i, row in enumerate(parts):
        name, _, rest = row.partition(":")
        out.append((f'<div class="row clay p" style="padding:{"16px 22px" if tall else "8px 16px"}"><div class="chip clay" style="background:{fill(i)};'
                    f'font-size:{50 if tall else 40}px;width:{250 if tall else 210}px">{esc(name.strip())}</div><div style="font-weight:600;'
                    f'font-size:{46 if tall else 38}px">{esc(rest.strip())}</div></div>', 0.13 + i * 0.13, 0))
    return out


def card(sc, b, i):
    text, mark = b["text"], b.get("mark") or ""
    body = esc(text)
    if mark and mark in text:
        a, _, c = text.partition(mark)
        body = f'{esc(a)}<span class="mark clay" style="background:{fill(i)}">{esc(mark)}</span>{esc(c)}'
    cid = sc.clip(b["at"], b["dur"], f'<div class="card clay p">{body}</div>', cls="fill low")
    sc.pop(f"#{cid} .p", b["at"], 1.5 if i % 2 else -1.5, b["at"] + b["dur"])


def stat(sc, b, i):
    v = b.get("value", b.get("endValue", 0))
    dec = b.get("decimals", 0)
    num = f"{b.get('prefix', '')}{v:,.{dec}f}{b.get('suffix', '')}"
    label = b.get("label") or b.get("title", "").lower()
    cid = sc.clip(b["at"], b["dur"], f'<div class="clay p" style="background:{fill(i)};border-radius:60px;padding:36px 70px;text-align:center">'
                  f'<div class="num" style="font-size:170px">{esc(num)}</div><div style="font-weight:500;font-size:44px;margin-top:6px">{esc(label)}</div></div>',
                  cls="fill low")
    sc.pop(f"#{cid} .p", b["at"], 2 if i % 2 else -2, b["at"] + b["dur"])


def chips(sc, b):
    rows = "".join(f'<div class="p" style="margin-left:{90 if k % 2 else -90}px"><div class="pill clay" style="background:{fill(k + 1)};'
                   f'border-radius:999px;padding:18px 44px;font-weight:600;font-size:60px">{esc(it["text"])}</div></div>' for k, it in enumerate(b["items"]))
    cid = sc.clip(b["at"], b["dur"], f'<div style="display:flex;flex-direction:column;align-items:center;gap:26px">{rows}</div>', cls="fill low")
    for k, it in enumerate(b["items"]):
        sc.pop(f"#{cid} .p:nth-of-type({k + 1})", it["at"], 3 if k % 2 else -3)
    sc.js.append(f'tl.to("#{cid} .p", {{opacity: 0, duration: 0.2}}, {b["at"] + b["dur"] - 0.2:.3f});')


def hero(sc, b):
    """The full-screen moment: the sentence lands word by word on clay pills in a clay room."""
    words = b.get("words") or []
    pills = "".join(f'<div class="p"><div class="pill clay" style="background:{fill(i)};border-radius:50px;padding:14px 40px;font-size:130px">'
                    f'{esc(w["text"])}</div></div>' for i, w in enumerate(words))
    inner = (f'<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:30px;max-width:920px">{pills}</div>')
    cid = sc.clip(b["at"], b["dur"], room(inner, half=False))
    for i, w in enumerate(words):
        sc.pop(f"#{cid} .p:nth-of-type({i + 1})", w["start"], 3 if i % 2 else -3)


def build(slug):
    d = video_dir(slug)
    work = d / "work"
    edit = read_json(work / "edit.json")
    if edit.get("style") != "clay":
        raise SystemExit(f"style '{edit.get('style')}' is drawn only in Remotion. Set engine: remotion in edit.md, or style: clay.")
    bad = [b["kind"] for b in edit["beats"] if b["kind"] in UNSUPPORTED]
    if bad:
        raise SystemExit(f"{', '.join(sorted(set(bad)))} exists only in Remotion. Set engine: remotion in edit.md for this video.")
    hf = d / "hf"
    comp, assets = hf / "compositions", hf / "assets"
    for p in (comp, assets / "fonts", assets / "sfx"):
        p.mkdir(parents=True, exist_ok=True)
    shutil.copy2(FONTS / "Fredoka.woff2", assets / "fonts" / "Fredoka.woff2")
    shutil.copy2(work / "cut.mp4", assets / "cut.mp4")
    video, total = edit["videoSeconds"], edit["videoSeconds"] + (edit["endSeconds"] if edit.get("endCard") else 0)
    split = edit.get("layout") == "split"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-sseof", "-0.2", "-i", str(work / "cut.mp4"), "-frames:v", "1",
                    str(assets / "last.jpg")], check=True)

    sc = Scene("beats")
    versions = None
    for i, b in enumerate(edit["beats"]):
        k = b["kind"]
        if k == "panel":
            panel(sc, b, True, assets)
            if b["look"] == "versions":
                versions = b
        elif k == "text":
            card(sc, b, i)
        elif k in ("stat", "glass"):
            stat(sc, b, i)
        elif k == "chips":
            chips(sc, b)
        elif k == "screen":
            hero(sc, b)
        elif k == "broll":
            src = Path(b["src"])
            shutil.copy2(ROOT / "videos" / src, assets / src.name)
            tag = (f'<img src="assets/{esc(src.name)}" style="width:100%;height:100%;object-fit:cover">' if b.get("image") else
                   f'<video src="assets/{esc(src.name)}" muted playsinline style="width:100%;height:100%;object-fit:cover"></video>')
            sc.clip(b["at"], b["dur"], tag)
    lt = edit.get("lowerThird")
    if lt:
        cid = sc.clip(lt["at"], min(3.0, video - lt["at"]), f'<div class="clay p" style="position:absolute;left:64px;bottom:560px;background:#FFD6E7;'
                      f'border-radius:36px;padding:20px 34px"><div style="font-weight:700;font-size:58px;line-height:1.05">{esc(lt["name"])}</div>'
                      f'<div style="font-weight:500;font-size:32px;margin-top:4px">{esc(lt["line"])}</div></div>')
        sc.pop(f"#{cid} .p", lt["at"] + 0.2, -2, lt["at"] + min(3.0, video - lt["at"]))
    ec = edit.get("endCard")
    if ec:
        if split and versions:
            items = [versions_title("Screenshot this", True)] + versions_rows(versions["parts"], True)
            cid = sc.clip(video, edit["endSeconds"], room("".join(x for x, _, _ in items), half=False))
            for i, (_, dl, tilt) in enumerate(items):
                sc.pop(f"#{cid} .p:nth-of-type({i + 3})", video + dl, tilt)
        else:
            inner = (f'<div class="clay p" style="background:#F7F2FF;border-radius:56px;padding:50px 64px;font-weight:700;font-size:92px;'
                     f'text-align:center">{esc(ec["question"])}</div><div class="pill clay p" style="background:#BFF0D4;border-radius:999px;'
                     f'padding:18px 46px;font-weight:600;font-size:52px">{esc(ec["url"])}</div>')
            cid = sc.clip(video, edit["endSeconds"], f'<img src="assets/last.jpg" class="fill" style="object-fit:cover">'
                          f'<div class="fill" style="background:rgba(233,221,251,0.8);display:flex;flex-direction:column;align-items:center;'
                          f'justify-content:center;gap:46px">{inner}</div>')
            sc.pop(f"#{cid} .p:nth-of-type(1)", video, -2)
            sc.pop(f"#{cid} .p:nth-of-type(2)", video + 0.27, 3)
    sc.write(comp / "beats.html")

    cap = Scene("captions")
    groups, cur = [], []
    for w in edit["words"]:
        if cur and (len(cur) >= 3 or re.search(r"[.?!]$", cur[-1]["w"])):
            groups.append(cur)
            cur = []
        cur.append(w)
    if cur:
        groups.append(cur)
    top = HALF - 70 if split else 1920 - 340 - 120
    for g, ws in enumerate(groups):
        st = max(0.1, ws[0]["start"] - 0.05)
        en = ws[-1]["end"] + 0.25
        if g + 1 < len(groups):
            en = min(en, groups[g + 1][0]["start"] - 0.05)
        spans = "".join(f'<span class="w"><span class="bg clay"></span><span class="t">{esc(w["w"])}</span></span>' for w in ws)
        cid = cap.clip(st, en - st, f'<div class="line">{spans}</div>', cls="cap", style=f"top:{top}px")
        for k, w in enumerate(ws):
            sel = f"#{cid} .w:nth-of-type({k + 1})"
            cap.js.append(f'tl.fromTo("{sel} .bg", {{opacity: 0}}, {{opacity: 1, duration: 0.05, immediateRender: false}}, {w["start"]:.3f});'
                          f'tl.to("{sel} .bg", {{opacity: 0, duration: 0.05}}, {max(w["start"] + 0.06, w["end"] + 0.08):.3f});'
                          f'tl.fromTo("{sel} .t", {{color: "#ffffff"}}, {{color: "{INK}", duration: 0.05, immediateRender: false}}, {w["start"]:.3f});'
                          f'tl.to("{sel} .t", {{color: "#ffffff", duration: 0.05}}, {max(w["start"] + 0.06, w["end"] + 0.08):.3f});')
    cap.write(comp / "captions.html", f"""
.cap {{ position: absolute; left: 0; width: 1080px; height: 140px; }}
.line {{ display: flex; justify-content: center; align-items: center; gap: 18px; height: 140px; }}
.w {{ position: relative; display: inline-block; padding: 0 16px; }}
.w .bg {{ position: absolute; inset: 0; background: {FILLS[0]}; border-radius: 26px; opacity: 0; }}
.w .t {{ position: relative; font-weight: 700; font-size: 80px; color: #fff; -webkit-text-stroke: 7px {INK}; paint-order: stroke fill;
        text-shadow: 0 5px 0 {INK}, 0 10px 24px rgba(0,0,0,0.45); }}
""")

    face_box = f"top:{HALF}px;height:{1920 - HALF}px" if split else "top:0;height:1920px"
    zooms = "".join(f'tl.to("#cam", {{scale: {b["scale"]}, duration: {min(0.25, b["dur"] / 4):.3f}, ease: "power2.out"}}, {b["at"]:.3f});'
                    f'tl.to("#cam", {{scale: 1, duration: {min(0.25, b["dur"] / 4):.3f}, ease: "power2.in"}}, {b["at"] + b["dur"] - min(0.25, b["dur"] / 4):.3f});'
                    for b in edit["beats"] if b["kind"] == "zoom")
    sfx = []
    for i, b in enumerate(edit["beats"]):
        sounds = ([(b["at"], b["sound"])] if b.get("sound") else []) + \
                 ([(it["at"], b["itemSound"]) for it in b["items"][1:]] if b["kind"] == "chips" and b.get("itemSound") else [])
        for k, (t, s) in enumerate(sounds):
            name = Path(s).name
            shutil.copy2(ROOT / "videos" / s, assets / "sfx" / name)
            sfx.append(f'<audio id="sfx{i}x{k}" src="assets/sfx/{name}" data-start="{t:.3f}" data-volume="{edit.get("sfxVolume", 0.3)}"></audio>')
    (hf / "index.html").write_text(f"""<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #E9DDFB; }}
      #facebox {{ position: absolute; left: 0; width: 1080px; overflow: hidden; {face_box}; }}
      #cam {{ position: absolute; left: 0; top: {-HALF // 2 if split else 0}px; width: 1080px; height: 1920px; transform-origin: 50% {50 if split else 38}%; }}
      #face {{ width: 1080px; height: 1920px; object-fit: cover; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total:.3f}" data-width="1080" data-height="1920">
      <div id="facebox"><div id="cam"><video id="face" class="clip" src="assets/cut.mp4" data-start="0" data-duration="{video:.3f}"
        data-has-audio="true" playsinline data-track-index="0"></video></div></div>
      <div id="beats" data-composition-id="beats" data-composition-src="compositions/beats.html" data-start="0" data-duration="{total:.3f}"
        data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920" style="z-index:2"></div>
      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0"
        data-duration="{video:.3f}" data-track-index="2" data-track-kind="captions" data-width="1080" data-height="1920" style="z-index:3"></div>
      {"".join(sfx)}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      const tl = gsap.timeline({{ paused: true }});
      {zooms}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
""", encoding="utf-8")
    (hf / "package.json").write_text(json.dumps({"name": f"{slug}-hf", "private": True, "type": "module"}, indent=2), encoding="utf-8")
    (hf / "hyperframes.json").write_text(json.dumps({"paths": {"blocks": "compositions", "assets": "assets"}}, indent=2), encoding="utf-8")
    print(f"Built videos/{slug}/hf/ ({len(edit['beats'])} beats, {len(groups)} caption groups).")
    return hf


def hfrun(hf, *args, capture=False):
    cmd = [NPX, "--yes", HF, *args]
    if capture:
        return subprocess.run(cmd, cwd=hf, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return subprocess.run(cmd, cwd=hf, check=True)


def check(hf):
    r = hfrun(hf, "check", "--json", capture=True)
    out = r.stdout
    try:
        j = json.loads(out[out.index("{"):])
    except ValueError:
        raise SystemExit(f"hyperframes check gave no report:\n{(r.stdout + r.stderr)[-1500:]}")
    found = []

    def walk(o):
        if isinstance(o, dict):
            if "severity" in o and "code" in o:
                found.append(f"{o['severity']}: {o['code']} {o.get('selector') or ''} {str(o.get('message'))[:140]}")
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(j)
    for f in found:
        print("  check", f)
    if not j.get("ok"):
        raise SystemExit("hyperframes check failed; fix the errors above.")


def stills(slug, times):
    """PNG frames at the given seconds, in order, copied to hf/stills/s01.png ..."""
    hf = video_dir(slug) / "hf"
    r = hfrun(hf, "snapshot", "--at", ",".join(f"{t:.3f}" for t in times), capture=True)
    paths = re.findall(r"(\S*frame-\d+-at-[\d.]+s\.png)", r.stdout)
    if len(paths) < len(times):
        raise SystemExit(f"hyperframes snapshot gave {len(paths)} of {len(times)} frames:\n{(r.stdout + r.stderr)[-1500:]}")
    out = hf / "stills"
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir()
    res = []
    for n, p in enumerate(paths[:len(times)], 1):
        src = Path(p) if Path(p).is_absolute() else hf / p
        dst = out / f"s{n:02d}.png"
        shutil.copy2(src, dst)
        res.append(dst)
    return res


def render(slug, out):
    hf = video_dir(slug) / "hf"
    hfrun(hf, "render", "--workers", "1", "--quality", "high", "--output", str(out))


if __name__ == "__main__":
    slug, cmd = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "build")
    if cmd == "build":
        check(build(slug))
    elif cmd == "stills":
        print("\n".join(str(p) for p in stills(slug, [float(x) for x in sys.argv[3].split(",")])))
    elif cmd == "render":
        render(slug, Path(sys.argv[3]))
