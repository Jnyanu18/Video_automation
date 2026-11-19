# Matte inspection sheet: for chosen frames of an alpha .mov, show the cut-out over the film's dark
# purple, over magenta (reveals fringes / background bleed), the alpha itself, and an edge zoom on
# the hair. usage: py mattesheet.py in.mov out.png frame [frame ...] [--zoom x,y,w,h] [--label txt]
import subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline_config import SRC_W as W, SRC_H as H
args = sys.argv[1:]; mov, out = args[0], args[1]
zoom = None; label = ""; frs = []
i = 2
while i < len(args):
    if args[i] == "--zoom": zoom = [int(v) for v in args[i + 1].split(",")]; i += 2
    elif args[i] == "--label": label = args[i + 1]; i += 2
    else: frs.append(int(args[i])); i += 1
font = ImageFont.truetype("arial.ttf", 22)


def frame(n):
    b = subprocess.run(["ffmpeg", "-v", "error", "-i", mov, "-vf", f"select=eq(n\\,{n}),scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgba", "-frames:v", "1", "-f", "rawvideo", "-"], capture_output=True).stdout
    return np.frombuffer(b, np.uint8).reshape(H, W, 4).astype(np.float32) / 255


def over(rgba, bg):
    a = rgba[..., 3:4]; return (rgba[..., :3] * a + np.array(bg, np.float32) * (1 - a))


cols = []
for n in frs:
    f = frame(n); tiles = []
    s = 0.22
    for bg in [(0.07, 0.04, 0.2), (1.0, 0.0, 1.0)]:
        tiles.append(Image.fromarray((over(f, bg) * 255).astype(np.uint8)).resize((int(W * s), int(H * s))))
    tiles.append(Image.fromarray((f[..., 3] * 255).astype(np.uint8)).convert("RGB").resize((int(W * s), int(H * s))))
    if zoom:
        x, y, w, h = zoom
        z = Image.fromarray((over(f, (1.0, 0.0, 1.0)) * 255).astype(np.uint8)).crop((x, y, x + w, y + h)).resize((int(W * s), int(w and H * s)))
        tiles.append(z)
    col = Image.new("RGB", (sum(t.width for t in tiles) + 8 * len(tiles), tiles[0].height + 30), (20, 20, 20))
    xx = 0
    for t in tiles: col.paste(t, (xx, 30)); xx += t.width + 8
    ImageDraw.Draw(col).text((6, 3), f"{label} frame {n}", font=font, fill=(255, 255, 0))
    cols.append(col)
o = Image.new("RGB", (max(c.width for c in cols), sum(c.height for c in cols)), (0, 0, 0)); y = 0
for c in cols: o.paste(c, (0, y)); y += c.height
o.save(out); print(out, o.size)
