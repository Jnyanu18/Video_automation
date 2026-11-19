# Dense face-crop strip (every `step` s) to catch hands over the face / blinks / blur.
# usage: py -3.11 presenter/facestrip.py out.jpg step "take:s:e:label" ...
import glob, json, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline_config import TAKES_DIR, take_mp4
G = json.load(open(os.path.join(TAKES_DIR, "gaze.json")))
out, step, segs = sys.argv[1], float(sys.argv[2]), sys.argv[3:]
import os
T, PER = int(os.environ.get("T", 110)), int(os.environ.get("PER", 30))
font = ImageFont.truetype("arial.ttf", 12)
tiles_rows = []
for sg in segs:
    n, s, e, label = sg.split(":", 3); s, e = float(s), float(e)
    mp4 = take_mp4(n)
    # decode the segment once at quarter res
    W, H = 378, 672
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{s:.3f}", "-t", f"{e - s:.3f}", "-i", mp4, "-vf", f"fps={1 / step},scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    nfr = len(raw) // (W * H * 3); tiles = []
    for k in range(nfr):
        im = Image.frombytes("RGB", (W, H), raw[k * W * H * 3:(k + 1) * W * H * 3]); t = s + k * step
        r = min(G[n], key=lambda q: abs(q[0] - t))
        if r[1] is None: box = (0, 0, W, W)
        else:
            x, y, w, h = [v / 4 for v in r[2]]; cx, cy, m = x + w / 2, y + h / 2, max(w, h) * 0.9
            box = (int(cx - m), int(cy - m), int(cx + m), int(cy + m))
        c = im.crop(box).resize((T, T)); d = ImageDraw.Draw(c); d.rectangle([0, 0, 44, 13], fill=(0, 0, 0)); d.text((2, 0), f"{t:.1f}", font=font, fill=(255, 255, 0))
        tiles.append(c)
    for i in range(0, len(tiles), PER):
        row = Image.new("RGB", (160 + PER * T, T), (15, 15, 20)); dd = ImageDraw.Draw(row)
        if i == 0: dd.multiline_text((4, 4), f"{n} {s:.1f}-{e:.1f}\n" + "\n".join(label[j:j + 22] for j in range(0, len(label), 22))[:140], font=font, fill=(240, 230, 200))
        for j, c in enumerate(tiles[i:i + PER]): row.paste(c, (160 + j * T, 0))
        tiles_rows.append(row)
Wd = max(r.width for r in tiles_rows); o = Image.new("RGB", (Wd, sum(r.height + 2 for r in tiles_rows))); y = 0
for r in tiles_rows: o.paste(r, (0, y)); y += r.height + 2
o.save(out, quality=85); print(out, o.size)
