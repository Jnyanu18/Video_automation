from pathlib import Path

p = Path(__file__).parent / "build.py"
s = p.read_text(encoding="utf-8")


def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)


rep("""    return (f'<defs><linearGradient id="{i}-g\"""", """    return (f'§DOL§<defs><linearGradient id="{i}-g\"""")
rep("""fill="none"/>{sc}</g>')""", """fill="none"/>{sc}</g>§/DOL§')""")
rep('{{x: 300, y: 980, scale: 2.0, svgOrigin: "0 0"}}', '{{x: 470, y: 1000, scale: 1.7, svgOrigin: "0 0"}}')
rep('{{rotation: -90, svgOrigin: "120 0",', '{{rotation: -35, transformOrigin: "520px 160px",')
s = s.replace('svgOrigin: "0 0"', 'transformOrigin: "400px 160px"')
rep('opacity: 0, duration: 1.4, ease: "power1.out"}}, {so', 'opacity: 0, duration: 1.4, ease: "power1.out", immediateRender: false}}, {so')
rep('{{opacity: 0, attr: {{rx: 300, ry: 60}}, duration: 2.0, ease: "power1.out"}}', '{{opacity: 0, attr: {{rx: 300, ry: 60}}, duration: 2.0, ease: "power1.out", immediateRender: false}}')
rep('{{opacity: 0, y: -220, duration: 1.4, ease: "power1.out"}}', '{{opacity: 0, y: -220, duration: 1.4, ease: "power1.out", immediateRender: false}}')

rep('''for sid, a, b, css, svg, over, js in scenes:
    d = round(b - a, 3)''', r'''import re
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
    d = round(b - a, 3)''')
rep('''    #{sid}-stage svg {{ position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }}''',
    '''    #{sid}-stage .layer {{ position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }}
    #{sid}-stage .dol {{ position: absolute; left: -400px; top: -160px; overflow: visible; }}''')
rep('''      <svg viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">{svg}</svg>''', '''      {layers(svg)}''')
p.write_text(s, encoding="utf-8")
print("patched")
