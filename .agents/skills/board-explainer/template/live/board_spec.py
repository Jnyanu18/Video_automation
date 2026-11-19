# Board spec for the Caleb-style PHP2Shell video. Every stroke, label and doodle is defined here in board
# coordinates (each board is 1920x1080) and timed to a word in the master timeline (film-board/src/timeline.json).
# Output: film-board/src/items.json  (read by Remotion for drawing, and by the score for pencil sounds).
# Kinds: stroke (polyline drawn on), text (hand-lettered, revealed left to right), fill (polygon fades in),
#        stamp (flat red block arrow pops in), php (PHP logo ellipse), face is handled from the timeline.
import json, math, re, random, os
HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, '..', 'film-board', 'src', 'timeline.json'), encoding='utf8'))
SEG = {s['id']: s for s in T['segments']}
WHITE, BLUE, GREEN, YELLOW, RED, ORANGE, PURPLE, GREY, TEAL = '#f2f0ea', '#7d97ff', '#62e08f', '#ffd84a', '#ff5a5a', '#ffa24a', '#b98cff', '#8f8f99', '#3fd6c0'
norm = lambda s: re.sub(r"[^a-z0-9.']", '', s.lower()).strip("'")
def S(i): return SEG[i]['t0']
def E(i): return SEG[i]['t1']
def W(i, kw, nth=0, off=0.0):
    ws = SEG[i]['words']; k = norm(kw); hits = [w for w in ws if norm(w['w']).startswith(k)]
    if len(hits) <= nth: raise SystemExit(f'cue {i}:{kw!r} not found in: ' + ' '.join(w['w'] for w in ws))
    return round(hits[nth]['s'] + off, 3)
rng = random.Random(7)
def jit(pts, a=1.6):
    return [[x + rng.uniform(-a, a), y + rng.uniform(-a, a)] for x, y in pts]
def line(p0, p1, n=None, a=1.2):
    n = n or max(2, int(math.dist(p0, p1) / 18))
    return jit([[p0[0] + (p1[0] - p0[0]) * k / n, p0[1] + (p1[1] - p0[1]) * k / n] for k in range(n + 1)], a)
def quad(p0, c, p1, n=28, a=1.0):
    return jit([[(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]] for t in [k / n for k in range(n + 1)]], a)
def rect(x0, y0, x1, y1, a=1.4):
    pts = line([x0, y0], [x1, y0], a=a) + line([x1, y0], [x1, y1], a=a)[1:] + line([x1, y1], [x0, y1], a=a)[1:] + line([x0, y1], [x0 + 8, y0 - 4], a=a)[1:]
    return pts
def ellipse(cx, cy, rx, ry, n=40, start=-1.9, over=0.25, a=1.2):
    return jit([[cx + rx * math.cos(start + (2 * math.pi + over) * k / n), cy + ry * math.sin(start + (2 * math.pi + over) * k / n)] for k in range(n + 1)], a)
def arrowhead(p, ang, s=22):
    return [[p[0] - s * math.cos(ang - 0.5), p[1] - s * math.sin(ang - 0.5)], p, [p[0] - s * math.cos(ang + 0.5), p[1] - s * math.sin(ang + 0.5)]]
def cloud(cx, cy, s=1.0):
    pts = []
    for k, (dx, dy, r) in enumerate([(-110, 20, 45), (-60, -25, 55), (10, -45, 60), (80, -20, 50), (120, 25, 40)]):
        a0, a1 = (math.pi * 0.95, math.pi * 1.95) if k else (math.pi * 0.5, math.pi * 1.6)
        pts += [[cx + s * (dx + r * math.cos(a0 + (a1 - a0) * t / 12)), cy + s * (dy + r * math.sin(a0 + (a1 - a0) * t / 12))] for t in range(13)]
    pts += line([cx + s * 158, cy + s * 30], [cx - s * 112, cy + s * 64])[1:] + [[cx - s * 150, cy + s * 40]]
    return jit(pts, 1.0)

items = []
def add(kind, board, t0, dur=0.8, **kw):
    it = {'kind': kind, 'board': board, 't0': round(t0, 3), 'dur': dur}; it.update(kw); items.append(it); return it
def stroke(board, t0, pts, color=WHITE, w=4.5, dur=None, **kw):
    L = sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
    return add('stroke', board, t0, dur or min(1.4, max(0.35, L / 900)), pts=[[round(x, 1), round(y, 1)] for x, y in pts], color=color, w=w, **kw)
def text(board, t0, x, y, s, size=44, color=WHITE, rot=0.0, dur=None, **kw):
    return add('text', board, t0, dur or min(1.6, max(0.3, 0.045 * len(s))), x=x, y=y, text=s, size=size, color=color, rot=rot, **kw)
def arrow(board, t0, p0, c, p1, color=WHITE, w=4.5, **kw):
    pts = quad(p0, c, p1); stroke(board, t0, pts, color, w, **kw)
    ang = math.atan2(p1[1] - pts[-3][1], p1[0] - pts[-3][0])
    stroke(board, t0 + 0.05 + kw.get('dur', min(1.4, max(0.35, 0.5))), arrowhead(p1, ang), color, w, dur=0.18, **{k: v for k, v in kw.items() if k != 'dur'})
def stick(board, t0, cx, cy, s=1.0, color=WHITE):
    stroke(board, t0, ellipse(cx, cy, 26 * s, 28 * s), color, 4.5, dur=0.35)
    stroke(board, t0 + 0.3, quad([cx - 42 * s, cy + 110 * s], [cx, cy + 20 * s], [cx + 42 * s, cy + 110 * s]), color, 4.5, dur=0.35)

# ===================== B0: hook + why it matters =====================
text(0, W('f01', 'bug'), 1060, 330, 'PHP2Shell', 132, YELLOW, -2, t1=S('f02'))
stroke(0, W('f01', 'stranger'), line([1060, 360], [1640, 352]), RED, 6, t1=S('f02'))
text(0, W('f01', 'run'), 1065, 450, '2 critical bugs inside PHP', 46, WHITE, t1=S('f02'))
text(0, W('f01', 'server'), 1065, 520, '→ a stranger runs code on your server', 42, RED, t1=S('f02'))
text(0, W('f02', '7'), 110, 250, '7 / 10', 120, YELLOW, -3)
text(0, W('f02', 'websites'), 420, 240, 'websites run on PHP', 48, WHITE)
for k in range(10):
    x, y = 120 + (k % 5) * 125, 300 + (k // 5) * 95
    stroke(0, W('f02', 'about') + k * 0.06, rect(x, y, x + 100, y + 70), WHITE if k < 7 else GREY, 3.2, dur=0.25)
    if k < 7: stroke(0, W('f02', 'websites') + 0.1 + k * 0.08, [[x + 28, y + 38], [x + 46, y + 54], [x + 76, y + 18]], GREEN, 5, dur=0.18)
text(0, W('f02', 'October'), 110, 600, 'Oct 21', 64, WHITE)
stroke(0, W('f02', '21st'), ellipse(200, 580, 118, 52), RED, 4.5, dur=0.5)
text(0, W('f02', 'emergency'), 340, 600, '→ emergency fix', 54, WHITE)
text(0, W('f02', 'two'), 110, 700, '2 bugs  →  "PHP2Shell"', 54, RED)
stroke(0, W('f02', '24'), ellipse(170, 830, 52, 52), WHITE, 4.5, dur=0.4)
stroke(0, W('f02', '24', off=0.3), [[170, 830], [170, 798], [170, 830], [196, 842]], WHITE, 4.5, dur=0.3)
text(0, W('f02', 'hours'), 250, 850, '24 hrs of patching servers', 48, YELLOW, -1.5)
add('php', 0, W('v03', 'PHP'), 0.6, cx=1250, cy=210, w=230)
for k, (name, x, y, cue) in enumerate([('WordPress', 960, 400, 'WordPress'), ('Drupal', 1430, 400, 'Drupal'), ('Magento', 960, 500, 'Magento'), ('Laravel', 1430, 500, 'Laravel')]):
    text(0, W('v03', cue), x, y, name, 48, WHITE)
    stroke(0, W('v03', cue, off=0.25), line([x + (90 if x < 1250 else 70), y - 45], [1250 + (-40 if x < 1250 else 40), 262]), GREY, 3, dur=0.3)
text(0, W('v03', '9.2'), 960, 640, '9.2 / 10  CRITICAL', 66, RED, -2)
stroke(0, W('v03', 'Amazon'), line([980, 800], [1700, 800]), WHITE, 4)
for x in (1000, 1660): stroke(0, W('v03', 'Amazon', off=0.3), line([x, 782], [x, 818]), WHITE, 4, dur=0.15)
text(0, W('v03', 'honeypots'), 940, 870, 'Oct 17: attack attempt', 40, RED)
text(0, W('v03', 'fix'), 1500, 870, 'Oct 21: fix', 40, GREEN)
text(0, W('v03', 'four'), 1180, 770, '4 days early', 38, YELLOW)

# ===================== B1: the request, memory, bug 1 =====================
stick(1, W('f04', 'open'), 150, 470)
arrow(1, W('f04', 'browser'), [215, 470], [420, 330], [690, 390], WHITE)
text(1, W('f04', 'request'), 300, 360, 'HTTP POST', 46, WHITE, -12)
stroke(1, W('f04', 'sends'), cloud(800, 400, 0.9), WHITE, 4.5)
stroke(1, W('f04', 'form'), rect(170, 600, 560, 820), WHITE, 4)
text(1, W('f04', 'form', off=0.3), 190, 650, 'form', 40, GREY)
text(1, W('f04', 'name'), 190, 705, 'name = Madhav', 38, WHITE)
text(1, W('f04', 'email'), 190, 755, 'email = ...', 38, WHITE)
text(1, W('f04', 'file'), 190, 805, 'file = album.zip', 38, GREEN)
arrow(1, W('f05', 'Before'), [920, 400], [980, 330], [1030, 300], WHITE)
stroke(1, W('f05', 'website'), rect(1040, 170, 1180, 430), WHITE, 4.5)
for k in range(6): stroke(1, W('f05', 'code') + k * 0.05, line([1062, 205 + k * 34], [1158, 205 + k * 34]), GREY, 3, dur=0.15)
add('php', 1, W('f05', 'wakes'), 0.5, cx=1110, cy=150, w=150)
add('fill', 1, W('f05', 'unpack'), 0.5, pts=[[960, 495], [1260, 495], [1260, 555], [960, 555]], color=GREEN, op=0.9)
for k in range(5): add('fill', 1, W('f05', 'unpack', off=0.3) + k * 0.04, 0.2, pts=[[985 + k * 56, 507], [1025 + k * 56, 507], [1025 + k * 56, 543], [985 + k * 56, 543]], color='#163a23', op=1)
text(1, W('f05', 'unpack', off=0.2), 1060, 480, 'RAM', 44, YELLOW)
arrow(1, W('f05', 'memory'), [1030, 160], [900, 330], [985, 490], BLUE, 4)
text(1, W('f05', 'memory', off=0.3), 820, 330, 'allocate', 36, BLUE, -60)
text(1, W('v06', 'bookkeeping'), 1320, 210, 'bookkeeping:', 46, YELLOW)
text(1, W('v06', 'reserved'), 1330, 270, 'reserved = 12 slots', 42, WHITE)
text(1, W('v06', 'filled'), 1330, 325, 'filled = 0 ... 10', 42, WHITE)
LX = [580 + k * 78 for k in range(12)]
for k, x in enumerate(LX):
    dashed = k >= 10
    stroke(1, W('f07', 'row') + k * 0.07, rect(x, 730, x + 64, 900), RED if dashed else GREY, 3.4, dur=0.22, dash=dashed)
    text(1, W('f07', 'row') + k * 0.07, x + 20, 718, str(k + 1), 28, GREY)
text(1, W('f07', 'Gray'), 580, 975, 'grey = free', 40, GREY)
text(1, W('f07', 'teal'), 830, 975, 'teal = in use', 40, TEAL)
stroke(1, W('f08', 'album'), rect(60, 870, 250, 1040), WHITE, 4)
for k in range(4): stroke(1, W('f08', 'album', off=0.3) + k * 0.08, rect(78 + (k % 2) * 88, 888 + (k // 2) * 76, 150 + (k % 2) * 88, 950 + (k // 2) * 76), YELLOW, 3, dur=0.18)
text(1, W('f08', '400'), 270, 1010, '400 photos · 4K', 40, YELLOW)
text(1, W('f08', 'Mama'), 270, 1060, 'har mama-mami 😂', 36, WHITE)
text(1, W('f09', '12'), 580, 670, 'needs 12', 44, YELLOW)
for k in range(10): add('fill', 1, W('f09', 'needs') + k * (W('f09', 'half') - W('f09', 'needs')) / 10, 0.3, pts=[[LX[k] + 5, 735], [LX[k] + 59, 735], [LX[k] + 59, 895], [LX[k] + 5, 895]], color=TEAL, op=0.55)
stroke(1, W('f09', 'only'), quad([580, 925], [930, 950], [1346, 925]), GREEN, 4)
text(1, W('f09', 'only', off=0.2), 1120, 975, 'only 10', 40, GREEN)
text(1, W('f09', 'runs'), 880, 665, 'OUT OF MEMORY', 50, RED, -3)
text(1, W('f09', 'sab'), 580, 1040, 'cleanup: "sab ho gaya ✓"', 42, YELLOW)
for k in (10, 11): text(1, W('f10', 'never'), LX[k] + 16, 840, '?', 70, RED)
add('stamp', 1, W('f10', 'Lockers'), 0.35, x=1432, y=722, ang=90, len=140, t1=W('f10', 'Lockers') + 3.0)
text(1, W('f10', 'real'), 1080, 1040, '→ used as REAL data', 44, RED)
text(1, W('v11', 'memory'), 1330, 420, 'OOM mid-build', 44, RED)
text(1, W('v11', 'assumes'), 1330, 480, 'cleanup assumes "done"', 40, YELLOW)
stroke(1, W('v11', 'never'), line([1325, 300], [1620, 352]), RED, 4, dur=0.3)
stick(1, W('v11', 'attacker'), 1720, 760, 0.9, RED)
arrow(1, W('v11', 'shape'), [1680, 790], [1600, 700], [1520, 800], RED, 4)

# ===================== B2: bug 2 + the shell =====================
text(2, W('v12', 'Bug'), 90, 140, 'BUG 2 · use-after-free', 66, YELLOW, -1.5)
stroke(2, W('v12', 'request'), rect(520, 210, 1300, 300), WHITE, 4)
text(2, W('v12', 'request', off=0.2), 560, 270, 'PHP worker (reused for the next request)', 36, GREY)
L2 = [520 + k * 160 for k in range(5)]
for k, x in enumerate(L2):
    stroke(2, W('v12', 'finishes') + k * 0.08, rect(x, 380, x + 120, 620), GREY, 4, dur=0.25)
    text(2, W('v12', 'finishes') + k * 0.08, x + 48, 365, str(5 + k), 34, GREY)
add('fill', 2, W('v12', 'request'), 0.3, pts=[[845, 386], [954, 386], [954, 614], [845, 614]], color=TEAL, op=0.55, t1=W('v12', 'frees'))
text(2, W('v12', 'request', off=0.1), 880, 520, 'A', 70, WHITE, t1=W('v12', 'frees'))
text(2, W('v12', 'frees', off=0.3), 965, 600, 'freed', 40, GREY)
add('fill', 2, W('v12', 'sticky'), 0.35, pts=[[120, 420], [330, 405], [345, 610], [132, 622]], color=YELLOW, op=0.95)
text(2, W('v12', 'note'), 165, 520, 'locker', 40, '#3a2a00')
text(2, W('v12', 'number'), 190, 590, '→ 7', 64, '#3a2a00')
text(2, W('v12', 'leftover'), 120, 680, "PHP's old note", 40, YELLOW)
add('fill', 2, W('v12', 'moves'), 0.3, pts=[[845, 386], [954, 386], [954, 614], [845, 614]], color=RED, op=0.6)
text(2, W('v12', 'moves', off=0.15), 880, 520, 'B', 70, WHITE)
text(2, W('v12', 'next'), 1350, 500, 'attacker →', 44, RED)
arrow(2, W('v12', 'follows'), [340, 470], [600, 330], [850, 420], BLUE, 5)
add('stamp', 2, W('v12', "attacker's"), 0.35, x=900, y=300, ang=90, len=120, t1=W('v12', "attacker's") + 2.5)
text(2, W('v12', "attacker's", off=0.4), 520, 700, "→ PHP reads the attacker's data", 46, RED)
stroke(2, W('v13', 'command'), rect(520, 760, 1300, 930), RED, 4.5)
text(2, W('v13', 'command', off=0.3), 550, 860, 'stranger@your-server:~$ _', 52, RED)
text(2, W('v13', 'login'), 520, 990, 'no login needed', 40, WHITE)
text(2, W('v13', 'shell'), 900, 995, '= the "Shell"', 48, RED)
stroke(2, W('f14', 'Pandora'), rect(120, 860, 330, 1000), RED, 4.5)
stroke(2, W('f14', 'Pandora', off=0.3), line([120, 860], [300, 790]), RED, 4.5, dur=0.25)
for k in range(4): stroke(2, W('f14', 'box') + k * 0.08, line([225, 840], [180 + k * 40, 760 - (k % 2) * 30]), YELLOW, 3.5, dur=0.15)
text(2, W('f14', 'serious'), 120, 1050, 'very serious', 44, RED)
stroke(2, W('f15', 'night'), quad([1520, 60], [1440, 120], [1520, 180]), YELLOW, 4.5, dur=0.35)
text(2, W('f15', 'fix'), 1400, 220, '3 AM patching', 38, YELLOW)

# ===================== B3: good news + the fix =====================
text(3, W('f16', 'good'), 90, 140, 'the GOOD news', 66, GREEN, -1.5)
stroke(3, W('f16', 'default'), [[100, 205], [120, 228], [155, 180]], GREEN, 6, dur=0.25)
text(3, W('f16', 'default', off=0.1), 175, 225, 'public exploits fail on a default setup', 42, WHITE)
text(3, W('f16', 'second'), 175, 285, '(they need a 2nd bug in your app)', 38, GREY)
stroke(3, W('v17', 'flaw'), line([110, 420], [1250, 420]), WHITE, 4)
text(3, W('v17', '5.4'), 100, 400, 'PHP 5.4 · 2012', 38, WHITE)
text(3, W('v17', 'unpatched'), 1080, 400, '2026', 38, WHITE)
add('fill', 3, W('v17', 'unpatched', off=0.2), 0.6, pts=[[110, 432], [1250, 432], [1250, 446], [110, 446]], color=RED, op=0.85)
text(3, W('v17', 'every'), 520, 480, 'bug lives in every unpatched PHP', 38, RED)
text(3, W('v17', 'wait'), 100, 545, '→ update anyway', 46, YELLOW)
text(3, W('f18', 'here'), 90, 650, 'WHAT TO DO', 56, YELLOW)
text(3, W('f18', 'Update'), 100, 715, '① update PHP', 46, WHITE)
text(3, W('f19', 'restart'), 100, 780, '② restart Apache / PHP', 46, WHITE)
text(3, W('f19', '22nd'), 100, 845, 'fix moved up: Oct 22 → 21', 36, GREY)
stroke(3, W('f19', '21st'), line([340, 832], [430, 826]), RED, 4, dur=0.2)
stroke(3, W('v20', 'php'), rect(720, 600, 1500, 750), WHITE, 4)
text(3, W('v20', 'php', off=0.1), 750, 660, '$ php -v', 46, WHITE)
text(3, W('v20', 'fixed'), 750, 725, 'PHP 8.4.27  ✓ patched', 42, GREEN)
for k, v in enumerate(['8.5.12', '8.4.27', '8.3.36', '8.2.35']):
    text(3, W('v20', v), 720 + k * 195, 820, v, 42, GREEN)
text(3, W('v20', '8.1'), 720, 885, '8.1 or older → upgrade / distro patch', 38, ORANGE)
text(3, W('f21', 'memory'), 100, 940, 'stopgap: memory_limit = -1', 40, YELLOW)
text(3, W('v22', 'session'), 100, 1000, 'stopgap: session.upload_progress = 0', 40, YELLOW)
text(3, W('v22', 'partial'), 900, 960, 'partial!', 52, RED, -4)
text(3, W('v22', 'real'), 900, 1035, 'UPDATE = the real fix', 52, GREEN, -2)

# ===================== B4: analysis + outro =====================
text(4, W('v23', 'thing'), 90, 140, 'one more thing...', 60, PURPLE, -1.5)
stroke(4, W('v23', 'researchers'), rect(240, 280, 440, 450), WHITE, 4.5)
stroke(4, W('v23', 'researchers', off=0.4), line([340, 280], [340, 230]), WHITE, 4, dur=0.15)
stroke(4, W('v23', 'researchers', off=0.5), ellipse(340, 220, 12, 12), RED, 4, dur=0.2)
for x in (295, 385): stroke(4, W('v23', 'AI') + 0.05, ellipse(x, 345, 16, 16), BLUE, 4, dur=0.2)
stroke(4, W('v23', 'AI', off=0.2), line([290, 405], [390, 405]), WHITE, 4, dur=0.2)
text(4, W('v23', 'AI'), 250, 510, 'AI bug hunters', 44, BLUE)
for k, (x, y) in enumerate([(560, 300), (640, 380), (560, 450), (700, 290)]):
    stroke(4, W('v23', 'hunt') + k * 0.12, ellipse(x, y, 20, 14), RED, 4, dur=0.2)
    stroke(4, W('v23', 'hunt') + k * 0.12 + 0.1, line([x - 22, y - 12], [x + 22, y + 12]), RED, 3, dur=0.12)
text(4, W('v23', 'faster'), 800, 380, 'bugs found faster', 46, RED)
text(4, W('v23', 'shorter'), 800, 450, 'patch windows: weeks → days', 46, YELLOW)
stroke(4, W('f24', 'nothing'), [[180, 720], [230, 760], [180, 800]], WHITE, 5, dur=0.25)
stroke(4, W('f24', 'nothing', off=0.15), [[330, 720], [280, 760], [330, 800]], WHITE, 5, dur=0.25)
text(4, W('f24', 'eyes'), 140, 880, '24h, zero sleep', 44, YELLOW)
text(4, W('v25', 'Patch'), 800, 650, 'Patch first.', 92, WHITE, -2)
text(4, W('v25', 'Panic'), 800, 770, 'Panic never.', 92, GREEN, -2)
text(4, W('v25', 'Save'), 805, 860, 'save this for your next deploy 🔖', 44, YELLOW)
text(4, W('v25', 'deploy'), 805, 925, 'CVE-2026-109618 · CVE-2026-109619 · sources: Tenable, Sansec', 30, GREY)

BOARDS = [{'b': 0, 't0': 0.0}, {'b': 1, 't0': S('f04') - 0.5}, {'b': 2, 't0': S('v12') - 0.5}, {'b': 3, 't0': S('f16') - 0.5}, {'b': 4, 't0': S('v23') - 0.5}]
out = {'total': T['total'], 'boards': BOARDS, 'items': sorted(items, key=lambda i: i['t0'])}
json.dump(out, open(os.path.join(HERE, '..', 'film-board', 'src', 'items.json'), 'w', encoding='utf8'), ensure_ascii=False)
print(len(items), 'items;', 'boards at', [round(b['t0'], 1) for b in BOARDS])
