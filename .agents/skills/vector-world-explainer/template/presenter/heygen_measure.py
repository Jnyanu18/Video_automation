# Measure the avatar clip's alpha: person bbox, hair top, and per-window lip-sync check.
# usage: py avatar_measure.py <windows.webm> <out-dir>
# Decodes with libvpx-vp9 (keeps alpha) at 2 fps, prints the union bbox of alpha>128 and per-frame
# hair top / lowest opaque row, and writes a contact sheet of the RGBA frames over grey.
import os, subprocess, sys, glob
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
for f in glob.glob(out + "/m*.png"): os.remove(f)
subprocess.run(["ffmpeg", "-v", "error", "-c:v", "libvpx-vp9", "-i", src, "-vf", "fps=2,format=rgba", out + "/m%04d.png"], check=True)
fs = sorted(glob.glob(out + "/m*.png"))
X0 = Y0 = 10**9; X1 = Y1 = 0; tops = []
for p in fs:
    a = Image.open(p).getchannel("A").point(lambda v: 255 if v > 128 else 0)
    bb = a.getbbox()
    if not bb: continue
    X0, Y0, X1, Y1 = min(X0, bb[0]), min(Y0, bb[1]), max(X1, bb[2]), max(Y1, bb[3])
    tops.append((os.path.basename(p), bb))
print("union bbox", X0, Y0, X1, Y1, "frames", len(fs))
print("hair top min/max", min(b[1] for _, b in tops), max(b[1] for _, b in tops))
print("left min", min(b[0] for _, b in tops))
cols = 16; w, h = 135, 240
S = Image.new("RGB", (cols * w, ((len(fs) + cols - 1) // cols) * h), (90, 90, 90))
for i, p in enumerate(fs):
    im = Image.open(p).convert("RGBA").resize((w, h)); bg = Image.new("RGBA", (w, h), (90, 90, 90, 255))
    S.paste(Image.alpha_composite(bg, im).convert("RGB"), ((i % cols) * w, (i // cols) * h))
S.save(out + "/sheet.jpg", quality=85)
print(out + "/sheet.jpg")
