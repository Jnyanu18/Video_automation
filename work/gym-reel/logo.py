"""AILO wordmark motion graphic: letter slams, fly-through-the-O reveal, pull-back, contact end card.

All layers are built once at scale 1 on the 1080x1920 canvas; each frame only warps them.
Colours are AILO's brand palette (BGR here, since the frame pipeline is OpenCV).
"""
import math
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
GEIST = __file__.replace('logo.py', 'fonts/Geist.ttf')

def bgr(hexs):
    h = hexs.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)); return np.array([b, g, r], np.float32)

INK, ORANGE, CREAM, MUTED = bgr('#0A0A1A'), bgr('#FF8A4C'), bgr('#F4F5FF'), bgr('#8A94B0')

def font(size, style):
    f = ImageFont.truetype(GEIST, size); f.set_variation_by_name(style); return f

def text_mask(txt, f, cx, y, tracking=0.0):
    """Alpha mask (H,W float) of txt centred on cx with its top at y; tracking in em."""
    img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img)
    widths = [f.getlength(c) for c in txt]
    total = sum(widths) + tracking * f.size * (len(txt) - 1)
    x = cx - total / 2
    for c, w in zip(txt, widths):
        d.text((x, y), c, font=f, fill=255); x += w + tracking * f.size
    return np.asarray(img, np.float32) / 255.0

def bbox_center(m):
    ys, xs = np.nonzero(m > 0.5); return (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2

# ---------------------------------------------------------------- layers
WORD_Y = 590                       # top of the AILO glyph box (Geist Black puts cap tops ~0.28em below y)
big = font(340, b'Black')
letters, x = [], None
widths = [big.getlength(c) for c in 'AILO']
x0 = W / 2 - sum(widths) / 2
LETTERS = []
for c, w in zip('AILO', widths):
    img = Image.new('L', (W, H), 0); ImageDraw.Draw(img).text((x0, WORD_Y), c, font=big, fill=255)
    m = np.asarray(img, np.float32) / 255.0
    LETTERS.append((m, bbox_center(m))); x0 += w

# the O's counter (the hole the camera flies through)
o_mask = LETTERS[3][0]
inv = (o_mask < 0.5).astype(np.uint8)
n, lab, st, cen = cv2.connectedComponentsWithStats(inv, connectivity=4)
cands = [i for i in range(1, n) if st[i, 0] > 0 and st[i, 1] > 0 and st[i, 0] + st[i, 2] < W and st[i, 1] + st[i, 3] < H]
hole_i = max(cands, key=lambda i: st[i, 4])
counter = (lab == hole_i).astype(np.uint8)
counter = cv2.dilate(counter, np.ones((5, 5), np.uint8)).astype(np.float32)
HOLE = counter * (1 - o_mask)                       # anti-aliased window
OCX, OCY = cen[hole_i]
SPANS = [(np.nonzero(m.max(0) > 0.5)[0].min(), np.nonzero(m.max(0) > 0.5)[0].max()) for m, _ in LETTERS]
WORD_BOTTOM = max(np.nonzero(m > 0.5)[0].max() for m, _ in LETTERS)

GYM = text_mask('GYM', font(64, b'SemiBold'), W / 2, WORD_BOTTOM + 40, tracking=0.62)
RULE = np.zeros((H, W), np.float32); RULE[WORD_BOTTOM + 190: WORD_BOTTOM + 194, W // 2 - 60: W // 2 + 60] = 1
CONTACT = text_mask('CONTACT US', font(34, b'Medium'), W / 2, WORD_BOTTOM + 240, tracking=0.32)
PHONE = text_mask('77795728047', font(92, b'Bold'), W / 2, WORD_BOTTOM + 290)
SITE = text_mask('ailo.com', font(64, b'SemiBold'), W / 2, WORD_BOTTOM + 420)

def warp(m, s, anchor, to=None, dy=0.0):
    ax, ay = anchor; tx, ty = to if to else anchor
    M = np.float32([[s, 0, tx - s * ax], [0, s, ty - s * ay + dy]])
    return cv2.warpAffine(m, M, (W, H), flags=cv2.INTER_LINEAR, borderValue=0)

def ease_out(x): x = min(max(x, 0), 1); return 1 - (1 - x) ** 3
def ease_in(x):  x = min(max(x, 0), 1); return x ** 3

# ---------------------------------------------------------------- card at scale 1
def card(t, letter_hits, window, extras):
    """Returns (rgb HxWx3, alpha HxW) of the card before the global camera move.
    letter_hits: beat time each letter lands (None = already there). extras: [(mask, colour, start)]"""
    # Neo-Swiss flip: two frames of full orange with ink type on every hit
    flash = any(b is not None and 0 <= t - b < 0.067 for b in letter_hits)
    bgc, fg = (ORANGE, INK) if flash else (INK, CREAM)
    rgb = np.empty((H, W, 3), np.float32); rgb[:] = bgc
    a = 1.0 - HOLE * window
    # keep the letters that have landed centred: slide the group on each hit
    landed = [i for i, b in enumerate(letter_hits) if b is None or t >= b]
    def shift_for(k):  # x shift that centres letters 0..k
        return W / 2 - (SPANS[0][0] + SPANS[k][1]) / 2
    dx = 0.0
    if landed and letter_hits[0] is not None:
        k = max(landed); b = letter_hits[k]
        prev = shift_for(k - 1) if k > 0 else shift_for(0)
        dx = prev + (shift_for(k) - prev) * ease_out((t - b) / 0.16)
    for (m, ctr), b in zip(LETTERS, letter_hits):
        if b is None:
            la = m if dx == 0 else warp(m, 1.0, ctr, (ctr[0] + dx, ctr[1]))
        else:
            u = t - b
            if u < 0: continue
            s = 1 + 0.9 * (1 - ease_out(u / 0.16))
            la = warp(m, s, ctr, (ctr[0] + dx, ctr[1])) * min(1.0, (u + 1 / 30) / 0.06)
        rgb = rgb * (1 - la[..., None]) + fg * la[..., None]
    for m, colour, start in extras:
        u = t - start
        if u < 0: continue
        k = ease_out(u / 0.18)
        la = warp(m, 1.0, (W / 2, H / 2), dy=(1 - k) * 36) * k
        rgb = rgb * (1 - la[..., None]) + colour * la[..., None]
    return rgb, a

def camera(rgb, a, S, to, blur=0.0, n=5):
    """Global zoom by S around the O's counter, which lands on screen point `to`."""
    if S == 1.0 and to == (OCX, OCY) and blur == 0:
        return rgb, a
    if blur < 0.01:
        n = 1
    acc_rgb = np.zeros_like(rgb); acc_a = np.zeros_like(a)
    for i in range(n):
        s = S * (1 + blur * i / max(1, n - 1))
        acc_rgb += warp(rgb, s, (OCX, OCY), to); acc_a += warp(a, s, (OCX, OCY), to)
    return acc_rgb / n, acc_a / n

def composite(footage01, rgb, a):
    return footage01 * (1 - a[..., None]) + rgb * a[..., None]
