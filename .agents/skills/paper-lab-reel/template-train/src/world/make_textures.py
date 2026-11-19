# Generates the static paper textures used by the Paper Lab world (run once with: py -3.13 make_textures.py)
import random, math, os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "paper")
W, H = 1240, 2200
rng = np.random.default_rng(7); random.seed(7)

def base(col, amp, light=True):
    a = np.zeros((H, W, 3), np.float32) + np.array(col, np.float32)
    n = rng.normal(0, 1, (H // 4, W // 4)).astype(np.float32)
    n = np.array(Image.fromarray(((n * 40) + 128).clip(0, 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) - 128
    fine = rng.normal(0, 1, (H, W)).astype(np.float32)
    a += (n * amp * 0.05 + fine * amp * 0.6)[..., None]
    if light:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.sqrt((xx / W - 0.15) ** 2 + (yy / H - 0.05) ** 2)
        a *= (1.06 - 0.16 * np.clip(d, 0, 1.2))[..., None]
    return a

def fibres(img, n, cols, alpha):
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for _ in range(n):
        x, y = random.uniform(0, W), random.uniform(0, H)
        L = random.uniform(8, 40); a = random.uniform(0, math.pi)
        pts = [(x, y)]
        for k in range(4):
            a += random.uniform(-0.5, 0.5); x += math.cos(a) * L / 4; y += math.sin(a) * L / 4; pts.append((x, y))
        c = random.choice(cols)
        d.line(pts, fill=c + (random.randint(alpha // 3, alpha),), width=1)
    return Image.alpha_composite(img.convert("RGBA"), ov.filter(ImageFilter.GaussianBlur(0.4)))

# cream board
a = base((239, 228, 207), 5)
img = Image.fromarray(a.clip(0, 255).astype(np.uint8))
img = fibres(img, 9000, [(200, 182, 150), (255, 250, 238), (190, 170, 140)], 90)
img.convert("RGB").save(os.path.join(OUT, "board.jpg"), quality=92)

# cork
a = base((184, 137, 88), 14)
img = Image.fromarray(a.clip(0, 255).astype(np.uint8)).convert("RGBA")
ov = Image.new("RGBA", img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
for _ in range(60000):
    x, y = random.uniform(0, W), random.uniform(0, H); r = random.uniform(0.8, 3.2)
    c = random.choice([(120, 82, 45), (214, 170, 118), (150, 104, 60), (95, 62, 32)])
    d.ellipse([x - r, y - r * random.uniform(0.6, 1.0), x + r, y + r], fill=c + (random.randint(60, 170),))
img = Image.alpha_composite(img, ov.filter(ImageFilter.GaussianBlur(0.5)))
img.convert("RGB").save(os.path.join(OUT, "cork.jpg"), quality=90)

# navy construction paper
a = base((27, 37, 80), 6, light=False)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
d2 = np.sqrt((xx / W - 0.5) ** 2 + (yy / H - 0.42) ** 2)
a *= (1.12 - 0.35 * np.clip(d2, 0, 1))[..., None]
img = Image.fromarray(a.clip(0, 255).astype(np.uint8))
img = fibres(img, 7000, [(60, 72, 130), (18, 24, 56), (80, 90, 150)], 110)
img.convert("RGB").save(os.path.join(OUT, "navy.jpg"), quality=92)
print("ok")
