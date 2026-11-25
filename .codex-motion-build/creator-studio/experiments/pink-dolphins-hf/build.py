"""Writes index.html, compositions/*.html and the captions for the HyperFrames version of pink-dolphins.

Same narration, same 18 cues and the same dolphin artwork as the Remotion version
(remotion/src/lanes/animated/pink-dolphins.tsx), so the two can be compared on rendering and motion alone.
Run: python build.py, then npx hyperframes check / snapshot / render.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
VIDEO = HERE.parents[1] / "videos" / "pink-dolphins"
cues = json.loads((VIDEO / "cues.json").read_text(encoding="utf-8"))
words = json.loads((VIDEO / "words.json").read_text(encoding="utf-8"))
C = {c["id"]: c for c in cues}
END = 67.5
INK, ACCENT = "#fff4e6", "#ff8fb3"
GREY_TOP, GREY_BELLY, PINK_TOP, PINK_BELLY = "#5f6b73", "#aeb7bc", "#df5f8b", "#ffc3d4"

BODY = "M 300 10 C 262 2, 205 -4, 172 -14 C 152 -70, 92 -86, 40 -80 C -40 -75, -150 -52, -240 -16 C -260 -9, -275 -6, -287 -5 L -287 5 C -262 18, -150 58, -40 70 C 60 76, 140 52, 180 26 C 220 22, 268 22, 300 14 Z"
FLUKES = "M -278 0 C -318 -48, -348 -70, -378 -76 C -362 -36, -348 -12, -334 0 C -348 12, -362 36, -378 76 C -348 70, -318 48, -278 0 Z"
DORSAL = "M -30 -77 C -70 -104, -118 -100, -150 -62 Z"
FLIPPER = "M 60 46 C 40 110, -10 142, -48 138 C -32 100, -4 70, 18 52 Z"
SCARS = ["M 110 -52 C 96 -32, 82 -12, 70 8", "M -20 -62 C -30 -36, -46 -16, -62 0", "M 34 18 C 12 30, -14 40, -40 46",
         "M -120 -42 C -136 -22, -150 -6, -172 4", "M 150 -12 C 130 0, 114 12, 98 28", "M -60 -22 C -80 -6, -100 10, -126 18",
         "M -190 -22 C -206 -10, -222 0, -240 4", "M 62 -34 C 44 -16, 32 0, 22 16"]


def dolphin(i, pink=True, scars=False):
    """One dolphin: <g id=i> is the one GSAP moves; its parts are static except the flukes and the colours."""
    top, belly = (PINK_TOP, PINK_BELLY) if pink else (GREY_TOP, GREY_BELLY)
    sc = "".join(f'<path id="{i}-sc{n}" d="{d}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" '
                 f'stroke="#ffe3ec" stroke-width="5" fill="none" stroke-linecap="butt"/>' for n, d in enumerate(SCARS)) if scars else ""
    return (f'§DOL§<defs><linearGradient id="{i}-g" gradientUnits="userSpaceOnUse" x1="0" y1="-86" x2="0" y2="76">'
            f'<stop id="{i}-gt" offset="0" stop-color="{top}"/><stop id="{i}-gb" offset="1" stop-color="{belly}"/></linearGradient></defs>'
            f'<g id="{i}"><g id="{i}-fl"><path d="{FLUKES}" fill="url(#{i}-g)"/></g>'
            f'<path d="{DORSAL}" fill="url(#{i}-g)"/><path d="{BODY}" fill="url(#{i}-g)"/>'
            f'<ellipse cx="108" cy="-54" rx="56" ry="17" fill="#fff" opacity="0.16"/>'
            f'<path d="{FLIPPER}" fill="url(#{i}-g)"/><circle cx="150" cy="-18" r="6" fill="#1a1013"/>'
            f'<path d="M 298 13 C 260 16, 225 18, 190 20" stroke="#2a1b22" stroke-opacity="0.35" stroke-width="3" fill="none"/>{sc}</g>§/DOL§')


def swim(i, dur, period=0.36):
    """Flukes beat for the whole scene: a finite yoyo, so every frame is a function of time."""
    n = max(1, int(dur / period))
    return (f'tl.fromTo("#{i}-fl", {{rotation: -12, svgOrigin: "-280 0"}}, {{rotation: 12, svgOrigin: "-280 0", duration: {period}, '
            f'ease: "sine.inOut", yoyo: true, repeat: {n}}}, 0);')


def colour(i, t, d, pink):
    top, belly = (PINK_TOP, PINK_BELLY) if pink else (GREY_TOP, GREY_BELLY)
    return (f'tl.to("#{i}-gt", {{attr: {{"stop-color": "{top}"}}, duration: {d}, ease: "power2.inOut"}}, {t});'
            f'tl.to("#{i}-gb", {{attr: {{"stop-color": "{belly}"}}, duration: {d}, ease: "power2.inOut"}}, {t});')


def word_in(sel, t):
    return f'tl.fromTo("{sel}", {{opacity: 0, filter: "blur(10px)", scale: 1.06}}, {{opacity: 1, filter: "blur(0px)", scale: 1, duration: 0.35, ease: "expo.out"}}, {t});'


def word_out(sel, t):
    return f'tl.to("{sel}", {{opacity: 0, filter: "blur(8px)", duration: 0.2, ease: "power3.in"}}, {t});'


FONT = 'font-family: "Playfair Display", serif; font-weight: 700; color: ' + INK
LABEL = 'font-family: "Outfit", sans-serif; color: ' + INK

scenes = []  # (id, start, end, css, svg, html_over_svg, js)


def scene(sid, a, b, css, svg, over, js):
    scenes.append((sid, a, b, css, svg, over, js))


def rel(t, a):
    return round(t - a, 3)


# 1. River at dusk: the dolphin arcs out, glows pink, the pink drains, it splashes back.
a, b = 0.0, C["boto"]["start"]
jungle = ("<path d='M0 900 L0 760 C60 700 90 740 130 690 C170 650 220 700 260 660 C300 610 360 680 410 640 "
          "C470 600 520 670 580 630 C640 590 700 660 760 620 C820 580 880 650 940 610 C1000 580 1040 640 1080 610 L1080 900 Z' fill='#1a0f1f'/>")
svg1 = (f"<defs><linearGradient id='s1-sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#2b1640'/>"
        f"<stop offset='0.55' stop-color='#c2557a'/><stop offset='1' stop-color='#f6a96b'/></linearGradient>"
        f"<linearGradient id='s1-w' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#6e3b5c'/><stop offset='1' stop-color='#1d1430'/></linearGradient></defs>"
        f"<rect width='1080' height='1000' fill='url(#s1-sky)'/><circle cx='760' cy='560' r='120' fill='#ffd7a0' opacity='0.85'/>{jungle}"
        f"<g id='s1-arc'>{dolphin('s1-d')}</g>"
        f"<rect y='900' width='1080' height='1020' fill='url(#s1-w)'/>"
        f"<g id='s1-splash' opacity='0'>" + "".join(f"<circle cx='{540 + dx}' cy='{900 - dy}' r='{r}' fill='#ffe3ec'/>" for dx, dy, r in
                                                   [(-60, 30, 10), (-20, 60, 14), (30, 45, 12), (70, 20, 9), (0, 90, 8)]) + "</g>")
over1 = (f"<div id='s1-pink' style='position:absolute;top:300px;width:100%;text-align:center;{FONT};font-size:210px;letter-spacing:8px;"
         f"color:{ACCENT};text-shadow:0 6px 0 #2b1640, 0 10px 40px rgba(20,8,30,0.85), 0 0 60px rgba(255,143,179,0.6)'>PINK</div>")
p, bo = rel(C["pink"]["start"], a), rel(C["born"]["start"], a)
js1 = (f'tl.set("#s1-d", {{x: 0, y: 0}}, 0);'
       f'tl.fromTo("#s1-arc", {{x: 200, y: 1150, rotation: -38, transformOrigin: "400px 160px"}}, {{x: 540, y: 640, rotation: 0, transformOrigin: "400px 160px", duration: {p}, ease: "power3.out"}}, 0);'
       + colour("s1-d", 0, 0.01, True) + word_in("#s1-pink", p) + word_out("#s1-pink", bo + 0.3)
       + f'tl.fromTo("#s1-d", {{filter: "drop-shadow(0 0 0px #ff8fb3)"}}, {{filter: "drop-shadow(0 0 40px #ff8fb3)", duration: 0.5, ease: "power2.out"}}, {p});'
       + f'tl.to("#s1-d", {{filter: "drop-shadow(0 0 0px #ff8fb3)", duration: 0.4}}, {bo});'
       + colour("s1-d", bo, 1.4, False)
       + f'tl.to("#s1-arc", {{x: 880, y: 1120, rotation: 42, transformOrigin: "400px 160px", duration: 1.1, ease: "power3.in"}}, {bo + 1.2});'
       + f'tl.fromTo("#s1-splash", {{opacity: 0, scale: 0.4, svgOrigin: "540 900"}}, {{opacity: 1, scale: 1.3, svgOrigin: "540 900", duration: 0.35, ease: "expo.out"}}, {rel(b, a) - 0.45});'
       + f'tl.set("#s1-splash", {{x: 300}}, 0);' + swim("s1-d", rel(b, a)))
scene("s1", a, b, "", svg1, over1, js1)

# 2. Underwater: the boto swims across, the label lands, a grey calf joins.
a, b = C["boto"]["start"], C["size"]["start"]
rays = "".join(f"<polygon points='{x},0 {x + 80},0 {x + 260},1920 {x + 120},1920' fill='#bff4ff' opacity='0.05'/>" for x in (80, 340, 640, 900))
svg2 = (f"<defs><linearGradient id='s2-bg' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#2f6f73'/><stop offset='1' stop-color='#0b2229'/></linearGradient></defs>"
        f"<rect width='1080' height='1920' fill='url(#s2-bg)'/>{rays}<g id='s2-a'>{dolphin('s2-d')}</g><g id='s2-b'>{dolphin('s2-c', pink=False)}</g>")
over2 = (f"<div id='s2-lab' style='position:absolute;top:360px;width:100%;text-align:center'>"
         f"<div style='{LABEL};font-size:44px;letter-spacing:10px;opacity:0.8'>THE BOTO</div>"
         f"<div style='{FONT};font-size:110px;line-height:1.05;margin-top:16px'>Amazon<br>river dolphin</div></div>"
         "")
cv = rel(C["calves"]["start"], a)
js2 = (f'tl.fromTo("#s2-a", {{x: -400, y: 980, transformOrigin: "400px 160px"}}, {{x: 560, y: 960, transformOrigin: "400px 160px", duration: {rel(b, a)}, ease: "power1.out"}}, 0);'
       + word_in("#s2-lab", 0.5) + word_out("#s2-lab", cv - 0.2)
       + f'tl.fromTo("#s2-b", {{x: -260, y: 1120, scale: 0.5, transformOrigin: "400px 160px"}}, {{x: 380, y: 1080, scale: 0.5, transformOrigin: "400px 160px", duration: {rel(b, a) - cv}, ease: "power2.out"}}, {cv});'
       + swim("s2-d", rel(b, a)) + swim("s2-c", rel(b, a), 0.28))
scene("s2", a, b, "", svg2, over2, js2)

# 3. Size: the dolphin beside a standing person, a measuring line draws to 2.5 m.
a, b = C["size"]["start"], C["flood"]["start"]
person = ("<g id='s3-p' transform='translate(820 1310)'><circle cx='0' cy='-560' r='52' fill='none' stroke='#fff4e6' stroke-width='6'/>"
          "<path d='M 0 -500 L 0 -220 M 0 -220 L -60 0 M 0 -220 L 60 0 M 0 -440 L -90 -300 M 0 -440 L 90 -300' stroke='#fff4e6' stroke-width='6' fill='none' stroke-linecap='round'/></g>")
svg3 = (f"<rect width='1080' height='1920' fill='#151a24'/><rect y='1310' width='1080' height='4' fill='#fff4e6' opacity='0.25'/>"
        f"{person}<g id='s3-a'>{dolphin('s3-d')}</g>"
        f"<line id='s3-m' x1='60' y1='1420' x2='700' y2='1420' stroke='{ACCENT}' stroke-width='6' pathLength='1' stroke-dasharray='1 1' stroke-dashoffset='1'/>"
        f"<line x1='60' y1='1395' x2='60' y2='1445' stroke='{ACCENT}' stroke-width='6'/><line id='s3-e' x1='700' y1='1395' x2='700' y2='1445' stroke='{ACCENT}' stroke-width='6' opacity='0'/>")
over3 = f"<div id='s3-n' style='position:absolute;top:1480px;left:60px;width:640px;text-align:center;{FONT};font-size:150px;color:{ACCENT}'>~2.5 m</div>"
js3 = (f'tl.fromTo("#s3-a", {{x: 380, y: 1180, scale: 1.05, opacity: 0, transformOrigin: "400px 160px"}}, {{x: 380, y: 1180, scale: 1.05, opacity: 1, transformOrigin: "400px 160px", duration: 0.5, ease: "power2.out"}}, 0);'
       f'tl.fromTo("#s3-p", {{opacity: 0}}, {{opacity: 1, duration: 0.5}}, 0.6);'
       f'tl.to("#s3-m", {{attr: {{"stroke-dashoffset": 0}}, duration: 1.6, ease: "power2.inOut"}}, 1.2);'
       f'tl.to("#s3-e", {{opacity: 1, duration: 0.1}}, 2.8);' + word_in("#s3-n", 2.8) + swim("s3-d", rel(b, a), 0.5))
scene("s3", a, b, "", svg3, over3, js3)

# 4. Flood: the river climbs the trunks until the forest stands in it; the dolphin weaves between them.
a, b = C["flood"]["start"], C["neck"]["start"]
trunks = "".join(f"<rect x='{x}' y='300' width='{w}' height='1620' fill='#2a1d18'/>" for x, w in ((90, 70), (330, 90), (600, 60), (830, 100)))
svg4 = (f"<rect width='1080' height='1920' fill='#33402f'/><rect width='1080' height='700' fill='#5f7a4e' opacity='0.5'/>{trunks}"
        f"<g id='s4-a'>{dolphin('s4-d')}</g><rect id='s4-w' y='0' width='1080' height='1920' fill='#6b4b3a' opacity='0.72'/>"
        f"<rect id='s4-line' y='0' width='1080' height='6' fill='#ffe3ec' opacity='0.5'/>")
over4 = f"<div id='s4-t' style='position:absolute;top:240px;width:100%;text-align:center;{FONT};font-size:96px'>every rainy season</div>"
d4 = rel(b, a)
js4 = (f'tl.fromTo("#s4-w", {{y: 1700}}, {{y: 520, duration: 3.6, ease: "power2.inOut"}}, 0.3);'
       f'tl.fromTo("#s4-line", {{y: 1700}}, {{y: 520, duration: 3.6, ease: "power2.inOut"}}, 0.3);'
       + word_in("#s4-t", 0.2) + word_out("#s4-t", 2.4)
       + f'tl.fromTo("#s4-a", {{x: -380, y: 1300, scale: 0.8, transformOrigin: "400px 160px", rotation: 0}}, {{x: 230, y: 1150, rotation: -10, scale: 0.8, transformOrigin: "400px 160px", duration: 1.8, ease: "sine.inOut"}}, 2.6);'
       f'tl.to("#s4-a", {{x: 720, y: 1350, rotation: 12, transformOrigin: "400px 160px", duration: 1.8, ease: "sine.inOut"}}, 4.4);'
       f'tl.set("#s4-a", {{opacity: 1}}, 0);' + swim("s4-d", d4))
scene("s4", a, b, "", svg4, over4, js4)

# 5. Neck: close on the head, it turns sideways, an arc draws from nose to nose: 90 degrees.
a, b = C["neck"]["start"], C["muddy"]["start"]
svg5 = (f"<rect width='1080' height='1920' fill='#1d2f3a'/><g id='s5-a'>{dolphin('s5-d')}</g>"
        f"<path id='s5-arc' d='M 900 900 A 380 380 0 0 0 520 520' stroke='{ACCENT}' stroke-width='8' fill='none' pathLength='1' stroke-dasharray='1 1' stroke-dashoffset='1' stroke-linecap='butt'/>")
over5 = (f"<div id='s5-t' style='position:absolute;top:240px;width:100%;text-align:center;{FONT};font-size:92px'>its neck bones aren't fused</div>"
         f"<div id='s5-n' style='position:absolute;top:1300px;width:100%;text-align:center;{FONT};font-size:220px;color:{ACCENT}'>90°</div>")
js5 = (f'tl.set("#s5-a", {{x: 470, y: 1000, scale: 1.7, transformOrigin: "400px 160px"}}, 0);'
       + word_in("#s5-t", 0.3) + word_out("#s5-t", 2.6)
       + f'tl.to("#s5-a", {{rotation: -35, transformOrigin: "520px 160px", duration: 1.6, ease: "power3.inOut"}}, 2.8);'
       f'tl.to("#s5-arc", {{attr: {{"stroke-dashoffset": 0}}, duration: 1.6, ease: "power3.inOut"}}, 2.8);'
       + word_in("#s5-n", 4.2) + swim("s5-d", rel(b, a), 0.6))
scene("s5", a, b, "", svg5, over5, js5)

# 6. Muddy water, then sonar: the water clouds brown, rings pulse out, a hidden fish lights up.
a, b = C["muddy"]["start"], C["legend"]["start"]
so = rel(C["sonar"]["start"], a)
rings = "".join(f"<circle id='s6-r{n}' cx='640' cy='880' r='40' fill='none' stroke='{ACCENT}' stroke-width='6' opacity='0'/>" for n in range(6))
fish = "<g id='s6-f' opacity='0.08'><ellipse cx='880' cy='1180' rx='60' ry='26' fill='#ffe9a8'/><path d='M 820 1180 L 780 1150 L 780 1210 Z' fill='#ffe9a8'/></g>"
svg6 = (f"<rect width='1080' height='1920' fill='#2f6f73'/><rect id='s6-mud' width='1080' height='1920' fill='#6b4f33' opacity='0'/>"
        f"{fish}<g id='s6-a'>{dolphin('s6-d')}</g>{rings}"
        f"<rect id='s6-fog' width='1080' height='1920' fill='url(#s6-v)' opacity='0'/>"
        f"<defs><radialGradient id='s6-v' cx='0.5' cy='0.46' r='0.6'><stop offset='0.3' stop-color='#6b4f33' stop-opacity='0'/><stop offset='1' stop-color='#4a3622' stop-opacity='1'/></radialGradient></defs>")
over6 = (f"<div id='s6-t' style='position:absolute;top:240px;width:100%;text-align:center;{FONT};font-size:92px'>too muddy to see</div>"
         f"<div id='s6-n' style='position:absolute;top:1380px;width:100%;text-align:center'><div style='{FONT};font-size:200px;color:{ACCENT}'>80</div>"
         f"<div style='{LABEL};font-size:56px'>clicks a second, at most</div></div>")
js6 = (f'tl.set("#s6-a", {{x: 400, y: 900, scale: 1.1, transformOrigin: "400px 160px"}}, 0);'
       f'tl.to("#s6-mud", {{opacity: 0.85, duration: 1.4, ease: "power2.inOut"}}, 0.2);'
       f'tl.to("#s6-fog", {{opacity: 1, duration: 1.4, ease: "power2.inOut"}}, 0.6);'
       + word_in("#s6-t", 0.3) + word_out("#s6-t", so - 0.3)
       + "".join(f'tl.fromTo("#s6-r{n}", {{attr: {{r: 40}}, opacity: 0.9}}, {{attr: {{r: 640}}, opacity: 0, duration: 1.4, ease: "power1.out", immediateRender: false}}, {so + n * 0.55});' for n in range(6))
       + f'tl.to("#s6-f", {{opacity: 1, filter: "drop-shadow(0 0 30px #ffe9a8)", duration: 0.3, ease: "expo.out"}}, {so + 1.3});'
       + word_in("#s6-n", so + 2.2) + swim("s6-d", rel(b, a), 0.5))
scene("s6", a, b, "", svg6, over6, js6)

# 7. The legend: night, a full moon, a man on the bank, then dawn and an empty bank, one ripple.
a, b = C["legend"]["start"], C["why"]["start"]
mn, gn = rel(C["man"]["start"], a), rel(C["gone"]["start"], a)
man = ("<g id='s7-m' opacity='0'><circle cx='560' cy='800' r='34' fill='#0a0a14'/>"
       "<path d='M 520 840 L 600 840 L 610 1010 L 580 1010 L 575 1100 L 545 1100 L 540 1010 L 510 1010 Z' fill='#0a0a14'/></g>")
svg7 = (f"<rect id='s7-sky' width='1080' height='1100' fill='#0d1030'/><circle id='s7-moon' cx='540' cy='420' r='130' fill='#f4efe0'/>"
        f"<path d='M0 1100 L0 1020 C200 980 400 1040 600 1000 C800 960 950 1020 1080 990 L1080 1100 Z' fill='#05060f'/>{man}"
        f"<rect id='s7-w' y='1100' width='1080' height='820' fill='#22284d'/><rect id='s7-silver' y='1100' width='1080' height='820' fill='#c9d3e6' opacity='0'/>"
        f"<ellipse id='s7-rip' cx='560' cy='1220' rx='40' ry='10' fill='none' stroke='#ffe3ec' stroke-width='4' opacity='0'/>")
over7 = f"<div id='s7-t' style='position:absolute;top:1400px;width:100%;text-align:center;{FONT};font-size:80px;line-height:1.15'>people on the river<br>tell a story</div>"
js7 = (f'tl.fromTo("#s7-moon", {{y: 600}}, {{y: 0, duration: 2.6, ease: "power2.out"}}, 0);'
       f'tl.to("#s7-silver", {{opacity: 0.45, duration: 2.0, ease: "power2.inOut"}}, 0.6);'
       + word_in("#s7-t", 0.4) + word_out("#s7-t", mn - 0.3)
       + f'tl.to("#s7-m", {{opacity: 1, duration: 0.8, ease: "power2.out"}}, {mn + 0.3});'
       f'tl.to("#s7-m", {{opacity: 0, duration: 0.6, ease: "power2.in"}}, {gn - 0.2});'
       f'tl.to("#s7-sky", {{attr: {{fill: "#f2a37a"}}, duration: 1.0, ease: "power2.inOut"}}, {gn});'
       f'tl.to("#s7-moon", {{opacity: 0, duration: 0.8}}, {gn});'
       f'tl.to("#s7-w", {{attr: {{fill: "#7a5a6e"}}, duration: 1.0, ease: "power2.inOut"}}, {gn});'
       f'tl.to("#s7-silver", {{opacity: 0, duration: 0.8}}, {gn});'
       f'tl.fromTo("#s7-rip", {{opacity: 1, attr: {{rx: 30, ry: 8}}}}, {{opacity: 0, attr: {{rx: 300, ry: 60}}, duration: 2.0, ease: "power1.out", immediateRender: false}}, {gn + 0.6});')
scene("s7", a, b, "", svg7, over7, js7)

# 8. Why pink: close on a grey dolphin, scars draw and glow until it is pink; two males clash.
a, b = C["why"]["start"], C["endangered"]["start"]
sc, ml = rel(C["scars"]["start"], a), rel(C["males"]["start"], a)
bubbles = "".join(f"<circle id='s8-bb{n}' cx='{540 + (n * 73) % 300 - 150}' cy='{1000 + (n * 131) % 260 - 130}' r='{8 + n % 4 * 6}' fill='none' stroke='#ffe3ec' stroke-width='3' opacity='0'/>" for n in range(14))
svg8 = (f"<rect width='1080' height='1920' fill='#1c2a33'/><g id='s8-a'>{dolphin('s8-d', pink=False, scars=True)}</g>"
        f"<g id='s8-b' opacity='0'>{dolphin('s8-e', pink=True)}</g>{bubbles}")
over8 = (f"<div id='s8-why' style='position:absolute;top:300px;width:100%;text-align:center;{FONT};font-size:170px'>WHY <span style='color:{ACCENT}'>PINK?</span></div>"
         f"<div id='s8-sc' style='position:absolute;top:300px;width:100%;text-align:center;{FONT};font-size:200px;color:{ACCENT}'>SCARS</div>"
         "")
js8 = (f'tl.set("#s8-a", {{x: 560, y: 1000, scale: 1.7, transformOrigin: "400px 160px"}}, 0);'
       + word_in("#s8-why", 0.2) + word_out("#s8-why", sc - 0.25) + word_in("#s8-sc", sc)
       + "".join(f'tl.to("#s8-d-sc{n}", {{attr: {{"stroke-dashoffset": 0}}, duration: 0.45, ease: "power2.out"}}, {sc + 0.3 + n * 0.55});' for n in range(8))
       + colour("s8-d", sc + 0.6, 4.4, True) + word_out("#s8-sc", ml - 0.3)
       + f'tl.to("#s8-a", {{x: 430, y: 1000, scale: 1.0, rotation: 8, transformOrigin: "400px 160px", duration: 0.6, ease: "power3.inOut"}}, {ml});'
       f'tl.fromTo("#s8-b", {{opacity: 0, x: 760, y: 1040, transformOrigin: "400px 160px", scaleX: -1}}, {{opacity: 1, x: 690, y: 1020, scaleX: -1, transformOrigin: "400px 160px", duration: 0.5}}, {ml});'
       + "".join(f'tl.fromTo("#s8-bb{n}", {{opacity: 0.9, y: 0}}, {{opacity: 0, y: -220, duration: 1.4, ease: "power1.out", immediateRender: false}}, {ml + 0.4 + n * 0.08});' for n in range(14))
       + f'tl.to("#s8-a", {{x: 1500, y: 900, rotation: -6, transformOrigin: "400px 160px", duration: 1.6, ease: "power3.in"}}, {ml + 1.7});'
       + swim("s8-d", rel(b, a), 0.5) + swim("s8-e", rel(b, a), 0.45))
scene("s8", a, b, "", svg8, over8, js8)

# 9. Endangered: a net drifts down, a dam wall rises, the stamp lands; they fade, one pink dolphin swims to the sun.
a, b = C["endangered"]["start"], END
en = rel(C["end"]["start"], a)
net = "".join(f"<line x1='{x}' y1='0' x2='{x}' y2='900' stroke='#d9d2c3' stroke-width='3' opacity='0.6'/>" for x in range(60, 1080, 80)) + \
      "".join(f"<line x1='0' y1='{y}' x2='1080' y2='{y}' stroke='#d9d2c3' stroke-width='3' opacity='0.6'/>" for y in range(40, 900, 80))
svg9 = (f"<rect width='1080' height='1920' fill='#24343c'/><circle id='s9-sun' cx='860' cy='760' r='150' fill='#ffcf8a' opacity='0'/>"
        f"<g id='s9-a'>{dolphin('s9-d')}</g><g id='s9-net'>{net}</g>"
        f"<rect id='s9-dam' x='0' y='1500' width='1080' height='420' fill='#6d6a66'/>")
over9 = (f"<div id='s9-st' style='position:absolute;top:640px;width:100%;text-align:center'><span style='display:inline-block;border:10px solid #ff5a5a;"
         f"padding:10px 40px;{LABEL};font-weight:700;font-size:120px;color:#ff5a5a;letter-spacing:6px'>ENDANGERED</span></div>"
         f"<div id='s9-t' style='position:absolute;top:260px;width:100%;text-align:center;{FONT};font-size:84px;line-height:1.15'>the pinkest ones<br>fought the hardest</div>")
js9 = (f'tl.set("#s9-a", {{x: 300, y: 1150, scale: 1.0, transformOrigin: "400px 160px"}}, 0);'
       f'tl.fromTo("#s9-net", {{y: -900}}, {{y: 0, duration: 2.0, ease: "power2.out"}}, 0.2);'
       f'tl.fromTo("#s9-dam", {{y: 420}}, {{y: 0, duration: 1.6, ease: "power3.out"}}, 1.0);'
       f'tl.fromTo("#s9-st", {{opacity: 0, scale: 2.2, rotation: -14}}, {{opacity: 1, scale: 1, rotation: -8, duration: 0.3, ease: "power4.in"}}, 2.6);'
       f'tl.to(["#s9-net", "#s9-dam", "#s9-st"], {{opacity: 0, duration: 0.8, ease: "power2.inOut"}}, {en});'
       f'tl.to("#s9-sun", {{opacity: 1, duration: 1.2, ease: "power2.inOut"}}, {en});'
       f'tl.to("#s9-a", {{x: 760, y: 820, scale: 0.55, rotation: -14, transformOrigin: "400px 160px", duration: {rel(b, a) - en}, ease: "sine.inOut"}}, {en});'
       + word_in("#s9-t", en + 0.4) + swim("s9-d", rel(b, a), 0.5))
scene("s9", a, b, "", svg9, over9, js9)

# ---- write the scene files
comp = HERE / "compositions"
comp.mkdir(exist_ok=True)
import re
DOL = re.compile(r"<g id='([\w-]+)'(?: opacity='(\d)')?>§DOL§(.*?)§/DOL§</g>", re.S)


def layers(svg):
    """Each dolphin wrapper becomes an HTML-level SVG with the wrapper's id, moved with CSS transforms; the
    scene SVG splits around it, so what was drawn after a dolphin still paints over it."""
    parts, dols, last = [], [], 0
    for m in DOL.finditer(svg):
        parts.append(svg[last:m.start()])
        op = "" if m.group(2) is None else f"opacity:{m.group(2)};"
        dols.append(f"<svg id='{m.group(1)}' class='dol' viewBox='-400 -160 720 320' width='720' height='320' style='{op}'>{m.group(3)}</svg>")
        last = m.end()
    parts.append(svg[last:])
    wrap = lambda x: f"<svg class='layer' viewBox='0 0 1080 1920' xmlns='http://www.w3.org/2000/svg'>{x}</svg>" if x.strip() else ""
    out = wrap(parts[0])
    for dol, rest in zip(dols, parts[1:]):
        out += dol + wrap(rest)
    return out


for sid, a, b, css, svg, over, js in scenes:
    d = round(b - a, 3)
    (comp / f"{sid}.html").write_text(f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; overflow: hidden; }}
    #{sid}-stage {{ position: absolute; inset: 0; }}
    #{sid}-stage .layer {{ position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }}
    #{sid}-stage .dol {{ position: absolute; left: -400px; top: -160px; overflow: visible; }}
    {css}
  </style>
  <div id="root" data-composition-id="{sid}" data-width="1080" data-height="1920">
    <div id="{sid}-stage" class="clip" data-start="0" data-duration="{d}" data-layout-allow-overlap data-layout-allow-overflow>
      {layers(svg)}
      {over}
    </div>
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    {js}
    window.__timelines["{sid}"] = tl;
  </script>
</template>
""", encoding="utf-8")

# ---- captions: 3 to 4 words a group, broken at a sentence end or a pause
groups, cur = [], []
for i, w in enumerate(words):
    if cur and (len(cur) >= 4 or cur[-1]["w"].endswith((".", "?", "!", ",")) or w["start"] - cur[-1]["end"] > 0.25):
        groups.append(cur)
        cur = []
    cur.append(w)
if cur:
    groups.append(cur)
cap_html, cap_js = [], []
for g, ws in enumerate(groups):
    st = max(0.1, ws[0]["start"] - 0.05)
    en_ = min(END, ws[-1]["end"] + 0.15)
    if g + 1 < len(groups):
        en_ = min(en_, groups[g + 1][0]["start"] - 0.06)
    spans = " ".join(f"<span id='c{g}w{k}'>{w['w']}</span>" for k, w in enumerate(ws))
    cap_html.append(f"<div id='c{g}' class='clip cap' data-start='{st:.3f}' data-duration='{max(0.2, en_ - st):.3f}'><div id='c{g}i' class='capi'>{spans}</div></div>")
    cap_js.append(f'tl.fromTo("#c{g}i", {{opacity: 0, y: 14}}, {{opacity: 1, y: 0, duration: 0.14, ease: "expo.out"}}, {st:.3f});')
    for k, w in enumerate(ws):
        cap_js.append(f'tl.to("#c{g}w{k}", {{color: "{ACCENT}", duration: 0.06}}, {w["start"]:.3f});')
        cap_js.append(f'tl.to("#c{g}w{k}", {{color: "{INK}", duration: 0.08}}, {max(w["start"] + 0.07, w["end"]):.3f});')
(comp / "captions.html").write_text(f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; }}
    .cap {{ position: absolute; left: 0; width: 1080px; top: 1150px; text-align: center; }}
    .capi {{ font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 74px; color: {INK};
            text-shadow: 0 4px 24px rgba(5,15,20,0.85), 0 2px 4px rgba(0,0,0,0.9); padding: 0 90px; }}
  </style>
  <div id="root" data-composition-id="captions" data-width="1080" data-height="1920" data-layout-allow-caption-zone>
    {"".join(cap_html)}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    {"".join(cap_js)}
    window.__timelines["captions"] = tl;
  </script>
</template>
""", encoding="utf-8")

hosts = "".join(
    f'\n      <div id="{sid}" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" data-start="{a:.3f}" '
    f'data-duration="{b - a:.3f}" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920"></div>'
    for sid, a, b, *_ in scenes)
(HERE / "index.html").write_text(f"""<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #000; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{END}" data-width="1080" data-height="1920">{hosts}
      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0"
        data-duration="{END}" data-track-index="2" data-track-kind="captions" data-width="1080" data-height="1920" style="z-index: 5"></div>
      <audio id="voice" src="assets/voice.mp3" data-start="0" data-duration="67.03" data-track-index="3" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
""", encoding="utf-8")
print(f"{len(scenes)} scenes, {len(groups)} caption groups")
