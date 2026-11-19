# Frame sheet of candidate take segments: one row per segment, frames every `step` s (face crop),
# each frame labelled with time and head-yaw proxy (|yaw| < 0.35 ~ facing the lens).
# usage: py -3.11 presenter/takesheet.py out.jpg step "take:s:e:label" ...
import glob, json, subprocess, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline_config import TAKES_DIR, SRC_W, take_mp4
G = json.load(open(os.path.join(TAKES_DIR, "gaze.json")))
out, step, segs = sys.argv[1], float(sys.argv[2]), sys.argv[3:]
TW, TH, MAXN = 150, 200, 16
font = ImageFont.truetype("arial.ttf", 13); big = ImageFont.truetype("arialbd.ttf", 15)
rows = []
for sg in segs:
    n, s, e, label = sg.split(":", 3); s, e = float(s), float(e)
    mp4 = take_mp4(n)
    ts = list(np.arange(s, e, step))[:MAXN]
    row = Image.new("RGB", (220 + MAXN * TW, TH + 4), (18, 18, 24)); d = ImageDraw.Draw(row)
    d.multiline_text((6, 6), "\n".join([f"take {n}", f"{s:.2f}-{e:.2f}"] + [label[i:i + 26] for i in range(0, len(label), 26)][:8]), font=font, fill=(240, 230, 200))
    for k, t in enumerate(ts):
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", mp4, "-frames:v", "1", "-vf", f"crop={SRC_W}:{SRC_W * 4 // 3}:0:0,scale={TW}:{TH}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        im = Image.frombytes("RGB", (TW, TH), raw)
        y = min(G[n], key=lambda r: abs(r[0] - t))[1]
        dd = ImageDraw.Draw(im)
        col = (90, 255, 120) if y is not None and abs(y) < 0.35 else (255, 120, 90)
        dd.rectangle([0, TH - 18, TW, TH], fill=(0, 0, 0))
        dd.text((3, TH - 17), f"{t:.1f}s yaw {y:+.2f}" if y is not None else f"{t:.1f}s noface", font=font, fill=col)
        row.paste(im, (220 + k * TW, 2))
    rows.append(row)
W = max(r.width for r in rows); o = Image.new("RGB", (W, sum(r.height for r in rows)), (0, 0, 0)); y = 0
for r in rows: o.paste(r, (0, y)); y += r.height
o.save(out, quality=88); print(out, o.size)
