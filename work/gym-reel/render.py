"""Gym 'earth zoom x velocity edit' - replicates reel DMdrpFUNp23 beat-for-beat with gym footage.

python render.py [full|stills] [--noaudio]
"""
import math, subprocess, sys, os
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont
import logo as L

ROOT = os.path.dirname(os.path.abspath(__file__))
HI = os.path.join(ROOT, 'stock', 'hi')
W, H, FPS = 1080, 1920, 30
DUR = 12.6
N = int(round(DUR * FPS))
FONT = 'C:/Windows/Fonts/bahnschrift.ttf'

# ---------------------------------------------------------------- shot list
# (start, end, clip, src_in, cx, cy, label)   cuts = reference's own hard cuts
SHOTS = [
    (3.70, 4.17, '100530', 9.20, .32, .50, 'TREADMILLS'),
    (4.17, 4.60, '47484',  6.30, .50, .50, 'DUMBBELL RACK'),
    (4.60, 5.10, '47889',  1.10, .47, .45, 'BENCH PRESS'),
    (5.10, 5.60, '44420',  0.45, .36, .50, 'POWERLIFTING'),
    (5.60, 6.00, '100546', 10.3, .46, .50, 'CABLE CROSSOVER'),
    (6.00, 6.43, '100523', 2.70, .45, .50, 'LAT PULLDOWN'),
    (6.43, 6.93, '23944',  5.40, .60, .32, 'OLYMPIC BARBELLS'),
    (6.93, 7.40, '100534', 3.80, .50, .50, 'CHEST PRESS'),
    (7.40, 7.83, '100536', 3.00, .50, .50, 'SEATED ROW'),
    (7.83, 8.30, '44417',  2.70, .50, .50, 'KETTLEBELLS'),
    (8.30, 8.83, '40265',  2.10, .44, .50, 'BOXING BAG'),
    (8.83, 9.23, '100552', 2.00, .50, .40, 'PULL-UP BAR'),
    (9.23, 9.70, '4641',   9.00, .50, .50, 'SWIMMING POOL'),
]
ROPES = ('52088', 2.0, .50, .52, 'BATTLE ROPES')   # 1.83 - 3.70 (arrival + strobe + drop)
DROP = 3.27
LABELS = [ROPES[4]] + [s[6] for s in SHOTS]

# ---------------------------------------------------------------- footage cache
class Clip:
    def __init__(self, cid):
        self.cap = cv2.VideoCapture(os.path.join(HI, f'{cid}.mp4'))
        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        self.n = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.cache = {}

    def frame(self, t):
        i = max(0, min(self.n - 1, int(round(t * self.fps))))
        if i not in self.cache:
            if len(self.cache) > 90:
                self.cache.clear()
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ok, f = self.cap.read()
            if not ok:
                f = np.zeros((1080, 1920, 3), np.uint8)
            self.cache[i] = f
        return self.cache[i]

CLIPS = {}
def clip(cid):
    if cid not in CLIPS:
        CLIPS[cid] = Clip(cid)
    return CLIPS[cid]

# ---------------------------------------------------------------- image ops
def place(src, z, cx, cy, dx=0.0, dy=0.0):
    """Scale source so z=1 covers the 9:16 frame (by height), centred on (cx,cy) of the source."""
    sh, sw = src.shape[:2]
    s = (H / sh) * z
    # keep the crop inside the source when z >= cover
    half_w, half_h = W / (2 * s), H / (2 * s)
    px, py = cx * sw, cy * sh
    if half_w * 2 <= sw: px = min(max(px, half_w), sw - half_w)
    if half_h * 2 <= sh: py = min(max(py, half_h), sh - half_h)
    M = np.float32([[s, 0, W / 2 - s * px + dx], [0, s, H / 2 - s * py + dy]])
    return cv2.warpAffine(src, M, (W, H), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0))

def zoom_blur(src, z, cx, cy, k, n=7):
    """Radial zoom blur: average of copies scaled 1..(1+k)."""
    if k < 0.01:
        return place(src, z, cx, cy).astype(np.float32)
    acc = np.zeros((H, W, 3), np.float32)
    for i in range(n):
        acc += place(src, z * (1 + k * i / (n - 1)), cx, cy)
    return acc / n

def grade(img):
    x = img / 255.0
    x = np.clip((x - 0.5) * 1.12 + 0.5 + 0.01, 0, 1)                    # contrast
    g = x.mean(axis=2, keepdims=True)
    x = np.clip(g + (x - g) * 1.18, 0, 1)                                 # saturation
    return x * VIG

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIG = (1 - 0.32 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) / 2)[..., None]

def ease_out(x):  return 1 - (1 - x) ** 3
def ease_in(x):   return x ** 3

# ---------------------------------------------------------------- labels
def label_img(idx, text):
    img = Image.new('RGBA', (W, 260), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    big = ImageFont.truetype(FONT, 104); big.set_variation_by_name(b'Bold Condensed')
    small = ImageFont.truetype(FONT, 40); small.set_variation_by_name(b'SemiBold')
    num = f'{idx:02d} / {len(LABELS):02d}'
    for (f, t, y) in ((small, num, 40), (big, text, 88)):
        tw = d.textlength(t, font=f)
        x = (W - tw) / 2
        for ox, oy in ((0, 4), (0, 2)):
            d.text((x + ox, y + oy), t, font=f, fill=(0, 0, 0, 150))
        d.text((x, y), t, font=f, fill=(255, 255, 255, 255) if f is big else (255, 255, 255, 210))
    # accent bar
    d.rectangle([W / 2 - 46, 22, W / 2 + 46, 27], fill=(255, 138, 76, 255))
    arr = np.array(img).astype(np.float32) / 255.0
    return arr

LABEL_IMGS = [label_img(i + 1, t) for i, t in enumerate(LABELS)]
LABEL_STARTS = [DROP] + [s[0] for s in SHOTS]
LABEL_ENDS = [SHOTS[0][0]] + [s[1] for s in SHOTS]
LABEL_Y = int(H * 0.74)

def put_label(x, t):
    for i, (a, b) in enumerate(zip(LABEL_STARTS, LABEL_ENDS)):
        if a <= t < b:
            u = (t - a) / (1 / FPS)            # frames since cut
            k = min(1.0, (u + 1) / 4)          # 4-frame snap in
            alpha = ease_out(k)
            dy = int((1 - ease_out(k)) * 40)
            lab = LABEL_IMGS[i]
            y0 = LABEL_Y + dy
            region = x[y0:y0 + lab.shape[0]]
            la = lab[..., 3:4] * alpha
            region[:] = region * (1 - la) + lab[..., [2, 1, 0]] * la
    return x

# ---------------------------------------------------------------- speed ramp
def ramp_src(u, D, src_in, vmax=2.6, vmin=0.55, vend=1.8):
    """Integrated velocity curve: fast in, slow middle, speeding out."""
    steps = 24
    xs = np.linspace(0, u / D, steps)
    v = vmin + (vmax - vmin) * (1 - xs) ** 3 + (vend - vmin) * xs ** 4
    return src_in + np.trapz(v, xs) * D

def speed_at(u, D, vmax=2.6, vmin=0.55, vend=1.8):
    x = u / D
    return vmin + (vmax - vmin) * (1 - x) ** 3 + (vend - vmin) * x ** 4

def shot_frame(cid, src_t, speed, z, cx, cy, k):
    c = clip(cid)
    if speed > 1.3:   # motion blur from fast source playback
        span = speed / FPS * 0.5
        acc = sum(zoom_blur(c.frame(src_t + span * (j / 2 - 0.5)), z, cx, cy, k) for j in range(3)) / 3
        return acc
    return zoom_blur(c.frame(src_t), z, cx, cy, k)

# ---------------------------------------------------------------- the timeline
def render_frame(fi):
    t = fi / FPS
    card = None
    # --- intro: AILO slams in letter by letter, then we fly through the O into the gym (0 - 1.83)
    if t < 1.83:
        hits = [0.07, 0.51, 0.975, 1.46]
        win = 1.0 if t >= 1.46 else 0.0
        if t < 1.55:
            S, to, bl = 1 + 0.05 * t / 1.55, (L.OCX, L.OCY), 0.0
        else:
            u = (t - 1.55) / 0.28
            S = 1.05 * math.exp(math.log(45 / 1.05) * ease_in(u))
            e = ease_in(u); to = (L.OCX + (W / 2 - L.OCX) * e, L.OCY + (H / 2 - L.OCY) * e); bl = 0.22 * u
        card = L.camera(*L.card(t, hits, win, [(L.GYM, L.ORANGE, 1.46)]), S, to, bl)
        cid, src_in, cx, cy, _ = ROPES
        img = zoom_blur(clip(cid).frame(src_in + (t - 1.83)), 2.1, cx, cy, 0.3) if win else np.zeros((H, W, 3), np.float32)
    # --- arrival on the gym floor + strobe + drop (1.83 - 3.70)
    elif t < SHOTS[0][0]:
        cid, src_in, cx, cy, _ = ROPES
        if t < 2.67:
            u = (t - 1.83) / 0.84
            z = 1.0 + 1.1 * (1 - ease_out(u))
            img = zoom_blur(clip(cid).frame(src_in + (t - 1.83) * 1.0), z, cx, cy, 0.30 * (1 - ease_out(u)))
        elif t < DROP:
            # quiet riser: slow-mo + exposure strobe on the reference's onsets
            st = src_in + 0.84 + (t - 2.67) * 0.35
            img = zoom_blur(clip(cid).frame(st), 1.02 + 0.06 * (t - 2.67) / 0.6, cx, cy, 0)
            f = int((t - 2.67) * FPS)
            if f % 4 in (0, 1):
                img = img * 1.55 + 18
            else:
                img = img * 0.72
        else:
            u = t - DROP
            D = SHOTS[0][0] - DROP
            st = src_in + 0.84 + 0.6 * 0.35 + (ramp_src(u, D, 0) )
            k = 0.35 * max(0, 1 - u / 0.12)
            z = 1.0 + 0.22 * math.exp(-u / 0.07) + 0.05 * u / D
            img = shot_frame(cid, st, speed_at(u, D), z, cx, cy, k)
    # --- equipment cuts
    elif t < 9.70:
        for (a, b, cid, src_in, cx, cy, _) in SHOTS:
            if a <= t < b:
                u, D = t - a, b - a
                st = ramp_src(u, D, src_in)
                k = 0.32 * max(0, 1 - u / 0.11)                      # zoom-blur on the cut
                z = 1.0 + 0.16 * math.exp(-u / 0.06) + 0.07 * u / D  # punch-in then slow push
                if cid == '4641' and u > D * 0.55:                   # pool: start flying out
                    w = (u - D * 0.55) / (D * 0.45)
                    z *= 1 + 1.6 * ease_in(w); k = 0.4 * w
                img = shot_frame(cid, st, speed_at(u, D), z, cx, cy, k)
                break
    # --- pull back out of the O onto the AILO end card (9.70 - end)
    else:
        u = (t - 9.70) / 0.42
        if u < 1:
            S = 45 * math.exp(math.log(1 / 45) * ease_out(u))
            e = ease_out(u); to = (W / 2 + (L.OCX - W / 2) * e, H / 2 + (L.OCY - H / 2) * e); bl = 0.22 * (1 - u)
        else:
            S, to, bl = 1 + 0.025 * (t - 10.12) / 2.5, (L.OCX, L.OCY), 0.0
        extras = [(L.GYM, L.ORANGE, 10.217), (L.RULE, L.ORANGE, 10.68), (L.CONTACT, L.MUTED, 10.68),
                  (L.PHONE, L.CREAM, 10.74), (L.SITE, L.ORANGE, 11.146)]
        card = L.camera(*L.card(t, [None] * 4, 1.0, extras), S, to, bl)
        z = 1.0 + 1.4 * (1 - ease_out(u))
        img = zoom_blur(clip('4641').frame(9.75 + (t - 9.70)), z, .5, .5, 0.25 * max(0, 1 - u))
    img = np.clip(img, 0, 255)
    x = grade(img)
    if card is not None:
        x = L.composite(x, *card)
    x = put_label(x, t)
    return (np.clip(x, 0, 1) * 255).astype(np.uint8)

# ---------------------------------------------------------------- output
def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'full'
    out_dir = os.path.join(ROOT, 'out'); os.makedirs(out_dir, exist_ok=True)
    if mode == 'stills':
        times = [0.1, 0.3, 0.6, 1.1, 1.5, 1.62, 1.72, 1.80, 2.2, 3.4] + [(a + b) / 2 for a, b, *_ in SHOTS][:6] + [9.5, 9.75, 9.85, 10.0, 10.3, 10.8, 11.3, 12.5]
        tiles = []
        for t in times:
            f = render_frame(int(t * FPS))
            sm = cv2.resize(f, (270, 480)); cv2.putText(sm, f'{t:.2f}', (6, 24), 0, 0.7, (0, 255, 255), 2)
            tiles.append(sm)
        while len(tiles) % 8: tiles.append(np.zeros_like(tiles[0]))
        rows = [np.hstack(tiles[i:i + 8]) for i in range(0, len(tiles), 8)]
        cv2.imwrite(os.path.join(out_dir, 'stills.jpg'), np.vstack(rows)); print('stills ok'); return
    silent = os.path.join(out_dir, 'gym_silent.mp4')
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}',
                          '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
                          '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent], stdin=subprocess.PIPE)
    for fi in range(N):
        f = render_frame(fi)
        f = cv2.filter2D(f, -1, np.float32([[0, -.25, 0], [-.25, 2, -.25], [0, -.25, 0]]))  # light sharpen
        p.stdin.write(f.tobytes())
        if fi % 30 == 0: print('frame', fi, '/', N, flush=True)
    p.stdin.close(); p.wait()
    final = os.path.join(out_dir, 'gym_reel_v2.mp4')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', silent, '-i', os.path.join(ROOT, 'ref', 'ref.mp4'),
                    '-filter_complex', '[1:a]asplit[x][y];[y]atrim=0:2.1,asetpts=PTS-STARTPTS[b];[x]asetpts=PTS-STARTPTS[a];'
                    '[a][b]concat=n=2:v=0:a=1,afade=t=out:st=11.85:d=0.75[o]',
                    '-map', '0:v', '-map', '[o]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', final], check=True)
    print('done', final)

if __name__ == '__main__':
    main()
