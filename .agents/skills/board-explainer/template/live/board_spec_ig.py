# Instagram 9:16 board spec (1080x1920 design space per page; pages stacked vertically, camera scrolls down).
# Staging (memory feedback-face-size-ig-questions): Madhav's cut-out ~50% of screen, bottom-left, mirrored, head top
# at ~40% height (y~770). Graphics only in the TOP BAND (y 170-640) and the RIGHT COLUMN (x 640-1040, y 740-1150)
# while he speaks; VO-only lines may use the full page (vo=True auto-fades at the next face segment).
# Our own first diagram (approved swap 1): phone -> request form -> PHP -> memory as lockers from the start.
# Personal ending (approved swap 2): no "AI bug hunters" closer.
import json, math, re, random, os
HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, '..', 'film-board', 'src', 'timeline_ig.json'), encoding='utf8'))
SEG = {s['id']: s for s in T['segments']}; ORDER = [s['id'] for s in T['segments']]
WHITE, BLUE, GREEN, YELLOW, RED, ORANGE, GREY, TEAL = '#f2f0ea', '#7d97ff', '#62e08f', '#ffd84a', '#ff5a5a', '#ffa24a', '#8f8f99', '#3fd6c0'
norm = lambda s: re.sub(r"[^a-z0-9.']", '', s.lower()).strip("'")
def S(i): return SEG[i]['t0']
class _Gone:
    def __add__(self, o): return self
    __radd__ = __sub__ = __rsub__ = __add__
GONE = _Gone()
SKIPPED = []
def W(i, kw, nth=0, off=0.0):
    if i not in SEG: SKIPPED.append(f'{i}:{kw}'); return GONE
    ws = SEG[i]['words']; k = norm(kw); hits = [w for w in ws if norm(w['w']).startswith(k)]
    if len(hits) <= nth: SKIPPED.append(f'{i}:{kw} (trimmed)'); return GONE
    return round(hits[nth]['s'] + off, 3)
def next_face(t):
    return next((s['t0'] for s in T['segments'] if s['who'] == 'F' and s['t0'] > t + 0.01), None)
rng = random.Random(11)
def jit(pts, a=1.5): return [[x + rng.uniform(-a, a), y + rng.uniform(-a, a)] for x, y in pts]
def line(p0, p1, a=1.2):
    n = max(2, int(math.dist(p0, p1) / 18)); return jit([[p0[0] + (p1[0] - p0[0]) * k / n, p0[1] + (p1[1] - p0[1]) * k / n] for k in range(n + 1)], a)
def quad(p0, c, p1, n=26):
    return jit([[(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]] for t in [k / n for k in range(n + 1)]], 1.0)
def rect(x0, y0, x1, y1): return line([x0, y0], [x1, y0]) + line([x1, y0], [x1, y1])[1:] + line([x1, y1], [x0, y1])[1:] + line([x0, y1], [x0 + 8, y0 - 4])[1:]
def rrect(x0, y0, x1, y1, r=26):
    pts = []
    for cx, cy, a0 in [(x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)]:
        pts += [[cx + r * math.cos(math.radians(a0 + 90 * k / 6)), cy + r * math.sin(math.radians(a0 + 90 * k / 6))] for k in range(7)]
    return jit(pts + [pts[0], [pts[0][0] + 6, pts[0][1]]], 1.0)
def ellipse(cx, cy, rx, ry, n=40, start=-1.9, over=0.25):
    return jit([[cx + rx * math.cos(start + (2 * math.pi + over) * k / n), cy + ry * math.sin(start + (2 * math.pi + over) * k / n)] for k in range(n + 1)], 1.1)
def arrowhead(p, ang, s=22): return [[p[0] - s * math.cos(ang - 0.5), p[1] - s * math.sin(ang - 0.5)], p, [p[0] - s * math.cos(ang + 0.5), p[1] - s * math.sin(ang + 0.5)]]

items = []
def add(kind, page, t0, dur=0.8, vo=False, **kw):
    if t0 is GONE or kw.get('t1', 0) is GONE: return None
    it = {'kind': kind, 'board': page, 't0': round(t0, 3), 'dur': dur}; it.update(kw)
    if vo and 't1' not in it:
        nf = next_face(t0)
        if nf: it['t1'] = round(nf - 0.3, 3)
    items.append(it); return it
def stroke(page, t0, pts, color=WHITE, w=5, dur=None, **kw):
    L = sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
    return add('stroke', page, t0, dur or min(1.3, max(0.3, L / 900)), pts=[[round(x, 1), round(y, 1)] for x, y in pts], color=color, w=w, **kw)
def text(page, t0, x, y, s, size=50, color=WHITE, rot=0.0, dur=None, **kw):
    return add('text', page, t0, dur or min(1.5, max(0.3, 0.042 * len(s))), x=x, y=y, text=s, size=size, color=color, rot=rot, **kw)
def arrow(page, t0, p0, c, p1, color=WHITE, w=5, **kw):
    if t0 is GONE: return
    pts = quad(p0, c, p1); stroke(page, t0, pts, color, w, **kw)
    ang = math.atan2(p1[1] - pts[-3][1], p1[0] - pts[-3][0])
    stroke(page, t0 + 0.45, arrowhead(p1, ang), color, w, dur=0.15, **{k: v for k, v in kw.items() if k != 'dur'})

# ---------- P0: hook (frame 0 is the cover) + why it matters ----------
text(0, -0.2, 80, 300, 'PHP2Shell', 140, YELLOW, -2, dur=0.05, t1=S('f02'))
stroke(0, W('f01', 'stranger'), line([80, 335], [700, 326]), RED, 7, t1=S('f02'))
text(0, W('f01', 'bug'), 85, 420, '2 critical bugs in PHP itself', 50, WHITE, t1=S('f02'))
text(0, W('f01', 'run'), 85, 500, '→ strangers run code on your server', 46, RED, t1=S('f02'))
text(0, W('f02', '7'), 80, 270, '7 / 10', 120, YELLOW, -3)
text(0, W('f02', 'websites'), 400, 255, 'websites run PHP', 54, WHITE)
for k in range(10):
    x, y = 90 + (k % 5) * 130, 320 + (k // 5) * 100
    stroke(0, W('f02', 'about') + k * 0.06, rect(x, y, x + 105, y + 76), WHITE if k < 7 else GREY, 3.4, dur=0.22)
    if k < 7: stroke(0, W('f02', 'websites') + 0.1 + k * 0.07, [[x + 30, y + 42], [x + 48, y + 58], [x + 80, y + 20]], GREEN, 5.5, dur=0.16)
text(0, W('f02', 'October'), 660, 820, 'Oct 21', 66, WHITE)
stroke(0, W('f02', '21st'), ellipse(755, 800, 118, 52), RED, 5, dur=0.45)
text(0, W('f02', 'emergency'), 660, 900, '→ emergency fix', 50, WHITE)
text(0, W('f02', 'two'), 660, 975, '2 bugs', 54, RED)
stroke(0, W('f02', '24'), ellipse(705, 1060, 40, 40), WHITE, 5, dur=0.35)
stroke(0, W('f02', '24', off=0.3), [[705, 1060], [705, 1034], [705, 1060], [726, 1070]], WHITE, 5, dur=0.25)
text(0, W('f02', 'hours'), 760, 1080, '24 hrs', 50, YELLOW)
text(0, W('f02', 'patching'), 660, 1140, 'patching servers', 44, YELLOW)

# ---------- P1: context (VO, full page) ----------
add('php', 1, W('v03', 'PHP'), 0.6, cx=540, cy=330, w=300)
for name, x, y, cue in [('WordPress', 90, 560, 'WordPress'), ('Drupal', 640, 560, 'Drupal'), ('Magento', 90, 660, 'Magento'), ('Laravel', 640, 660, 'Laravel')]:
    text(1, W('v03', cue), x, y, name, 60, WHITE)
    stroke(1, W('v03', cue, off=0.25), line([x + 150, y - 55], [540 + (-60 if x < 500 else 60), 400]), GREY, 3, dur=0.3)
text(1, W('v03', '9.2'), 90, 860, '9.2 / 10', 130, RED, -3)
text(1, W('v03', 'rated'), 620, 860, 'CRITICAL', 76, RED, -3)
stroke(1, W('v03', 'Amazon'), line([110, 1100], [980, 1100]), WHITE, 5)
for x in (130, 950): stroke(1, W('v03', 'Amazon', off=0.3), line([x, 1078], [x, 1122]), WHITE, 5, dur=0.15)
text(1, W('v03', 'honeypots'), 80, 1190, 'Oct 17', 60, RED)
text(1, W('v03', 'honeypots', off=0.3), 80, 1255, 'attack attempt', 44, RED)
text(1, W('v03', 'fix'), 800, 1190, 'Oct 21', 60, GREEN)
text(1, W('v03', 'fix', off=0.3), 820, 1255, 'fix', 44, GREEN)
text(1, W('v03', 'four'), 380, 1060, '4 days early', 48, YELLOW)

# ---------- P2: our own diagram: phone -> request form -> PHP (+ lockers preview) ----------
stroke(2, W('f04', 'open'), rrect(80, 240, 300, 640), WHITE, 5)
stroke(2, W('f04', 'open', off=0.35), rect(105, 285, 275, 330), GREY, 3, dur=0.25)
text(2, W('f04', 'website'), 118, 320, 'shop.com', 28, GREY)
text(2, W('f04', 'website', off=0.3), 140, 470, 'YOU', 54, WHITE)
arrow(2, W('f04', 'browser'), [305, 380], [360, 300], [400, 280], WHITE)
text(2, W('f04', 'request'), 420, 230, 'REQUEST', 46, YELLOW)
stroke(2, W('f04', 'form'), rect(410, 250, 1020, 560), WHITE, 4.5)
text(2, W('f04', 'name'), 440, 330, 'name = Madhav', 50, WHITE)
text(2, W('f04', 'email'), 440, 410, 'email = ...', 50, WHITE)
text(2, W('f04', 'file'), 440, 490, 'file = album.zip', 50, GREEN)
add('php', 2, W('f05', 'website'), 0.5, cx=860, cy=800, w=200)
arrow(2, W('f05', 'wakes'), [860, 565], [900, 650], [860, 735], BLUE, 5)
text(2, W('f05', 'unpack'), 660, 900, 'unpacks it', 50, BLUE)
text(2, W('f05', 'memory'), 660, 960, 'into memory ↓', 50, BLUE)
for k in range(12):
    x, y = 665 + (k % 4) * 92, 1000 + (k // 4) * 50
    stroke(2, W('f05', 'memory', off=0.2) + k * 0.04, rect(x, y, x + 76, y + 40), GREY, 3, dur=0.14)

# ---------- P3: memory = lockers, bug 1 ----------
LX = [70 + (k % 6) * 158 for k in range(12)]; LY = [290 if k < 6 else 480 for k in range(12)]
for k in range(12):
    dashed = k >= 10
    stroke(3, W('f07', 'Now') + k * 0.12, rect(LX[k], LY[k], LX[k] + 128, LY[k] + 165), RED if dashed else GREY, 4, dur=0.2, dash=dashed)
    text(3, W('f07', 'Now') + k * 0.12, LX[k] + 50, LY[k] - 10, str(k + 1), 30, GREY)
text(3, W('v06', 'bookkeeping'), 80, 760, "PHP's bookkeeping:", 60, YELLOW, vo=True)
text(3, W('v06', 'reserved'), 80, 850, 'reserved = 12 slots', 58, WHITE, vo=True)
text(3, W('v06', 'filled'), 80, 940, 'filled = 0 → 10', 58, WHITE, vo=True)
text(3, W('f07', 'Gray'), 660, 820, 'grey = free', 50, GREY)
text(3, W('f07', 'teal'), 660, 890, 'teal = in use', 50, TEAL)
stroke(3, W('f08', 'album'), rect(660, 940, 840, 1080), WHITE, 4.5)
for k in range(4): stroke(3, W('f08', 'album', off=0.3) + k * 0.08, rect(675 + (k % 2) * 82, 955 + (k // 2) * 62, 740 + (k % 2) * 82, 1005 + (k // 2) * 62), YELLOW, 3, dur=0.16)
text(3, W('f08', '400'), 860, 1000, '400', 54, YELLOW)
text(3, W('f08', '4k'), 860, 1060, 'pics · 4K', 38, YELLOW)
text(3, W('f08', 'Mama'), 660, 1140, 'har mama-mami 😂', 44, WHITE, t1=W('f09', 'What'))
text(3, W('f09', '12'), 80, 240, 'needs 12', 50, YELLOW)
for k in range(10):
    add('fill', 3, W('f09', 'needs') + k * (W('f09', 'half') - W('f09', 'needs')) / 10, 0.3, pts=[[LX[k] + 6, LY[k] + 6], [LX[k] + 122, LY[k] + 6], [LX[k] + 122, LY[k] + 159], [LX[k] + 6, LY[k] + 159]], color=TEAL, op=0.55)
text(3, W('f09', 'only'), 360, 240, 'only room for 10', 50, GREEN)
text(3, W('f09', 'runs'), 660, 1140, 'OUT OF', 58, RED, -4)
text(3, W('f09', 'runs', off=0.2), 660, 1205, 'MEMORY!', 58, RED, -4)
text(3, W('f09', 'sab'), 650, 1275, '"sab ho gaya" ✓', 44, YELLOW)
for k in (10, 11): text(3, W('f10', 'never'), LX[k] + 46, 600, '?', 90, RED)
add('stamp', 3, W('f10', 'Lockers'), 0.35, x=990, y=470, ang=90, len=150, t1=W('f10', 'Lockers') + 3.0)
text(3, W('f10', 'real'), 650, 1345, 'junk used as', 42, RED)
text(3, W('f10', 'real', off=0.25), 650, 1405, 'REAL data', 52, RED)
text(3, W('v11', 'memory'), 80, 830, 'OOM: limit hit', 58, RED, vo=True)
text(3, W('v11', 'building'), 80, 900, 'mid-build', 58, RED, vo=True)
text(3, W('v11', 'assumes'), 80, 1000, 'cleanup assumes', 54, YELLOW, vo=True)
text(3, W('v11', 'complete'), 80, 1065, '"all done"', 54, YELLOW, vo=True)
stroke(3, W('v11', 'attacker'), ellipse(130, 1190, 34, 36), RED, 5, dur=0.3, vo=True)
stroke(3, W('v11', 'attacker', off=0.3), quad([70, 1330], [130, 1220], [190, 1330]), RED, 5, dur=0.3, vo=True)
text(3, W('v11', 'attacker', off=0.2), 210, 1215, 'attacker shapes', 50, RED, vo=True)
text(3, W('v11', 'junk'), 210, 1280, 'the junk', 50, RED, vo=True)
arrow(3, W('v11', 'shape'), [420, 1300], [620, 1000], [880, 650], RED, 5, vo=True)

# ---------- P4: bug 2 (VO) + the shell ----------
text(4, W('v12', 'Bug'), 70, 250, 'BUG 2 · use-after-free', 70, YELLOW, -1.5)
L2 = [90 + k * 185 for k in range(5)]
for k, x in enumerate(L2):
    stroke(4, W('v12', 'finishes') + k * 0.08, rect(x, 330, x + 150, 560), GREY, 4.5, dur=0.25)
    text(4, W('v12', 'finishes') + k * 0.08, x + 58, 320, str(5 + k), 36, GREY)
add('fill', 4, W('v12', 'request'), 0.3, pts=[[466, 336], [604, 336], [604, 554], [466, 554]], color=TEAL, op=0.55, t1=W('v12', 'frees'))
text(4, W('v12', 'request', off=0.1), 510, 470, 'A', 80, WHITE, t1=W('v12', 'frees'))
text(4, W('v12', 'frees', off=0.3), 480, 610, 'freed', 46, GREY)
add('fill', 4, W('v12', 'sticky'), 0.35, pts=[[90, 700], [330, 685], [345, 905], [102, 918]], color=YELLOW, op=0.95, vo=True)
text(4, W('v12', 'note'), 140, 800, 'locker', 46, '#3a2a00', vo=True)
text(4, W('v12', 'number'), 160, 880, '→ 7', 74, '#3a2a00', vo=True)
text(4, W('v12', 'leftover'), 370, 760, "PHP's old note", 52, YELLOW, vo=True)
add('fill', 4, W('v12', 'moves'), 0.3, pts=[[466, 336], [604, 336], [604, 554], [466, 554]], color=RED, op=0.6)
text(4, W('v12', 'moves', off=0.15), 512, 470, 'B', 80, WHITE)
text(4, W('v12', 'next'), 720, 640, '← attacker', 50, RED)
arrow(4, W('v12', 'follows'), [330, 700], [420, 600], [520, 565], BLUE, 6, vo=True)
add('stamp', 4, W('v12', "attacker's"), 0.35, x=535, y=330, ang=90, len=130, t1=W('v12', "attacker's") + 2.5)
text(4, W('v12', "attacker's", off=0.4), 80, 1000, "→ PHP reads the", 58, RED, vo=True)
text(4, W('v12', "attacker's", off=0.7), 80, 1075, "attacker's data", 58, RED, vo=True)
stroke(4, W('v13', 'command'), rect(80, 1150, 1000, 1310), RED, 5, vo=True)
text(4, W('v13', 'command', off=0.3), 110, 1250, 'stranger@server:~$ _', 60, RED, vo=True)
text(4, W('v13', 'login'), 80, 1400, 'no login needed', 52, WHITE, vo=True)
text(4, W('v13', 'shell'), 560, 1400, '= the "Shell"', 58, RED, vo=True)
stroke(4, W('f14', 'Pandora'), rect(680, 850, 900, 1000), RED, 5)
stroke(4, W('f14', 'Pandora', off=0.3), line([680, 850], [870, 780]), RED, 5, dur=0.25)
for k in range(4): stroke(4, W('f14', 'box') + k * 0.08, line([790, 830], [730 + k * 45, 740 - (k % 2) * 30]), YELLOW, 4, dur=0.14)
text(4, W('f14', 'Pandora', off=0.2), 660, 1070, "Pandora's box", 46, RED)
text(4, W('f14', 'serious'), 660, 1140, 'very serious', 50, RED)

# ---------- P5: good news + the fix ----------
text(5, W('f16', 'Now'), 70, 250, 'the GOOD news', 76, GREEN, -1.5)
stroke(5, W('f16', 'default'), [[80, 305], [102, 330], [140, 280]], GREEN, 7, dur=0.25)
text(5, W('f16', 'default', off=0.1), 160, 330, 'public exploits fail', 52, WHITE)
text(5, W('f16', 'default', off=0.5), 160, 395, 'on a default setup', 52, WHITE)
text(5, W('f16', 'second'), 160, 460, '(need a 2nd bug in your app)', 42, GREY)
stroke(5, W('v17', 'flaw'), line([90, 600], [990, 600]), WHITE, 5)
text(5, W('v17', '5.4'), 80, 575, 'PHP 5.4 · 2012', 44, WHITE)
text(5, W('v17', 'unpatched'), 880, 575, '2026', 44, WHITE)
add('fill', 5, W('v17', 'unpatched', off=0.2), 0.6, pts=[[90, 612], [990, 612], [990, 628], [90, 628]], color=RED, op=0.85)
text(5, W('v17', 'every'), 80, 700, 'bug lives in every unpatched PHP', 46, RED, vo=True)
text(5, W('v17', 'wait'), 80, 780, '→ update anyway', 56, YELLOW, vo=True)
text(5, W('f18', 'here'), 660, 820, 'WHAT TO DO', 56, YELLOW)
text(5, W('f18', 'Update'), 660, 895, '① update PHP', 50, WHITE)
text(5, W('f19', 'restart'), 660, 965, '② restart', 50, WHITE)
text(5, W('f19', 'restart', 1), 700, 1025, 'Apache / PHP', 42, WHITE)
text(5, W('f19', '22nd'), 660, 1090, 'fix came early:', 38, GREY)
text(5, W('f19', '21st'), 660, 1140, 'Oct 22 → 21', 40, GREY)
stroke(5, W('v20', 'php'), rect(80, 1180, 1000, 1330), WHITE, 5, vo=True)
text(5, W('v20', 'php', off=0.1), 110, 1240, '$ php -v', 54, WHITE, vo=True)
text(5, W('v20', 'fixed'), 110, 1310, 'PHP 8.4.27  ✓ patched', 50, GREEN, vo=True)
for k, v in enumerate(['8.5.12', '8.4.27', '8.3.36', '8.2.35']):
    text(5, W('v20', v), 80 + k * 235, 1420, v, 52, GREEN, vo=True)
text(5, W('v20', '8.1'), 80, 1500, '8.1 or older → upgrade / distro patch', 42, ORANGE, vo=True)
text(5, W('f21', 'memory'), 660, 1200, 'stopgap:', 44, YELLOW)
text(5, W('f21', 'limit'), 660, 1260, 'memory_limit = -1', 42, YELLOW)
text(5, W('v22', 'session'), 80, 1190, 'stopgap 2:', 44, YELLOW, vo=True)
text(5, W('v22', 'upload'), 80, 1245, 'session.upload_progress = 0', 36, YELLOW, vo=True)
text(5, W('v22', 'partial'), 80, 1345, 'both partial!', 64, RED, -3, vo=True)
text(5, W('v22', 'real'), 80, 1450, 'UPDATE = the real fix', 60, GREEN, -2, vo=True)

# ---------- P6: personal ending + CTA ----------
stroke(6, W('f15', 'That'), quad([200, 220], [110, 300], [200, 380]), YELLOW, 6, dur=0.35)
text(6, W('f15', 'why'), 280, 290, '3 AM', 90, YELLOW, -3)
text(6, W('f15', 'fix'), 280, 380, 'patching servers', 56, WHITE)
stroke(6, W('f15', 'cost'), rect(700, 440, 780, 540), WHITE, 4, dur=0.3)
stroke(6, W('f15', 'cost', off=0.3), quad([780, 465], [830, 490], [780, 520]), WHITE, 4, dur=0.2)
text(6, W('f15', 'cost', off=0.2), 820, 520, 'chai #4', 40, ORANGE)
stroke(6, W('f24', 'nothing'), [[690, 830], [740, 870], [690, 910]], WHITE, 6, dur=0.22, t1=S('v25'))
stroke(6, W('f24', 'nothing', off=0.15), [[840, 830], [790, 870], [840, 910]], WHITE, 6, dur=0.22, t1=S('v25'))
text(6, W('f24', 'eyes'), 660, 1000, 'zero sleep', 56, YELLOW, t1=S('v25'))
text(6, W('v25', 'Patch'), 80, 900, 'Patch first.', 120, WHITE, -2)
text(6, W('v25', 'Panic'), 80, 1050, 'Panic never.', 120, GREEN, -2)
text(6, W('v25', 'Save'), 85, 1160, 'save this for your next deploy 🔖', 52, YELLOW)
text(6, W('v25', 'deploy'), 85, 1240, 'CVE-2026-109618 · CVE-2026-109619', 36, GREY)
text(6, W('v25', 'deploy', off=0.2), 85, 1290, 'sources: Tenable, Sansec (Oct 22, 2026)', 34, GREY)

PAGES = [(0, 0.0), (1, S('v03') - 0.4), (2, S('f04') - 0.4), (3, S('f07') - 0.3), (4, S('v12') - 0.4), (5, S('f16') - 0.4), (6, S('f15') - 0.4)]
out = {'total': T['total'], 'boards': [{'b': b, 't0': round(t, 3)} for b, t in PAGES], 'items': sorted(items, key=lambda i: i['t0'])}
json.dump(out, open(os.path.join(HERE, '..', 'film-board', 'src', 'items_ig.json'), 'w', encoding='utf8'), ensure_ascii=False)
print(len(items), 'items; pages at', [round(t, 1) for _, t in PAGES]); print('skipped cues (removed lines):', len(SKIPPED))
