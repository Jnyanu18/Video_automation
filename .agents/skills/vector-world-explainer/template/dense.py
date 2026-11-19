# Dense frame strips from a render: py dense.py <mp4> <out.png> <start:end[:fps]> ...  (rows = ranges)
import subprocess, sys, os, glob, shutil
from PIL import Image, ImageDraw
mp4, out = sys.argv[1], sys.argv[2]
tmp = out + "_tmp"; shutil.rmtree(tmp, True); os.makedirs(tmp)
rows = []
for k, r in enumerate(sys.argv[3:]):
    p = r.split(":"); a, b = float(p[0]), float(p[1]); fps = float(p[2]) if len(p) > 2 else 10
    subprocess.run(["ffmpeg", "-v", "error", "-ss", str(a), "-t", str(b - a), "-i", mp4, "-vf", f"fps={fps},scale=200:-1", f"{tmp}/r{k}_%03d.png"], check=True)
    rows.append((a, fps, sorted(glob.glob(f"{tmp}/r{k}_*.png"))))
w, h = Image.open(rows[0][2][0]).size; cols = max(len(r[2]) for r in rows)
S = Image.new("RGB", (cols * w, len(rows) * (h + 14)), (12, 12, 14)); D = ImageDraw.Draw(S)
for i, (a, fps, fs) in enumerate(rows):
    for j, f in enumerate(fs):
        S.paste(Image.open(f).convert("RGB"), (j * w, i * (h + 14) + 14)); D.text((j * w + 3, i * (h + 14) + 1), f"{a + j / fps:.2f}", fill=(230, 230, 230))
S.save(out); shutil.rmtree(tmp)
