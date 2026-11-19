# Procedural textures for the Declassified Dossier world. Run once: python make_textures.py
import os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tex")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(11); random.seed(11)

def noise(h, w, scale, amp):
    n = rng.normal(0, 1, (max(2, h // scale), max(2, w // scale))).astype(np.float32)
    im = Image.fromarray(((n * 40) + 128).clip(0, 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return (np.asarray(im, np.float32) - 128) / 40 * amp

# dark charcoal desk: wood grain running horizontally, very dark
W, H = 1240, 2200
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
warp = noise(H, W, 60, 30)
grain = np.sin((yy + warp) * 0.09 + noise(H, W, 8, 1.2)) * 0.5 + 0.5
grain2 = np.sin((yy + warp * 1.7) * 0.021) * 0.5 + 0.5
base = np.array([34, 30, 27], np.float32)
a = base[None, None, :] * (0.78 + 0.22 * grain[..., None] + 0.12 * grain2[..., None])
a += noise(H, W, 3, 2.2)[..., None] + rng.normal(0, 2.0, (H, W, 1))
a[..., 0] += 3  # warm
Image.fromarray(a.clip(0, 255).astype(np.uint8)).save(os.path.join(OUT, "desk.jpg"), quality=90)

def paper(col, w, h, fib, name, amp=5):
    a = np.zeros((h, w, 3), np.float32) + np.array(col, np.float32)
    a += (noise(h, w, 40, amp) + noise(h, w, 6, amp * 0.5) + rng.normal(0, amp * 0.35, (h, w)))[..., None]
    img = Image.fromarray(a.clip(0, 255).astype(np.uint8)).convert("RGBA")
    ov = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for _ in range(fib):
        x, y = random.uniform(0, w), random.uniform(0, h); L = random.uniform(6, 30); ang = random.uniform(0, math.pi)
        pts = [(x, y)]
        for _k in range(3):
            ang += random.uniform(-0.6, 0.6); x += math.cos(ang) * L / 3; y += math.sin(ang) * L / 3; pts.append((x, y))
        c = random.choice([(150, 120, 70), (250, 235, 200), (120, 95, 60)])
        d.line(pts, fill=c + (random.randint(25, 70),), width=1)
    # a few coffee/age stains
    for _ in range(4):
        cx, cy, r = random.uniform(0, w), random.uniform(0, h), random.uniform(60, 180)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(120, 85, 40, 22), width=random.randint(3, 8))
    img = Image.alpha_composite(img, ov.filter(ImageFilter.GaussianBlur(0.5)))
    img.convert("RGB").save(os.path.join(OUT, name), quality=90)

paper((216, 192, 138), 1024, 1024, 5000, "manila.jpg", 6)
paper((243, 234, 214), 1024, 1024, 2500, "memo.jpg", 4)
print("ok", OUT)
