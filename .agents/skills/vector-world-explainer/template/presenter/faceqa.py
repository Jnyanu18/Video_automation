# v6 face QA on the delivered master:
#  1. qa/v6-face-cuts.png: frame before / on / after every zoom cut inside the face windows
#     (src/face-windows.json cuts), cropped to his region.
#  2. qa/v6-lipsync.png: 3 plosive/closure moments per window (b/p/m words from src/words.json).
#     For each: the frames 1 before, on, 1 and 2 after the word onset, mouth crop around the
#     per-frame face box (master scale 4/3). Lips should be closed at/just before the onset and open
#     right after; a 1-frame lead/lag would show as closure on the "after" frames.
# usage: py -3.13 presenter/faceqa.py <master.mp4> <qa dir>   (run from film/; needs out/events.json)
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
f, q = sys.argv[1], sys.argv[2]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FW = json.load(open(os.path.join(ROOT, "src", "face-windows.json")))
W = json.load(open(os.path.join(ROOT, "src", "words.json")))
EV = json.load(open(os.path.join(ROOT, "out", "events.json")))
S = 4 / 3
font = ImageFont.truetype("arial.ttf", 18)
cache = {}


def grab(n):
    if n not in cache:
        b = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-vf", f"select=eq(n\\,{n}),scale=1440:2560", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        cache[n] = Image.frombytes("RGB", (1440, 2560), b)
    return cache[n]


# face box on screen per frame: replicate avatar.tsx via a node dump (exact)
subprocess.run(["npx", "esbuild", "checks/facebox-dump.mts", "--bundle", "--platform=node", "--format=esm", "--log-level=error", "--outfile=out/facebox-dump.mjs"], cwd=ROOT, check=True, shell=True)
FB = json.loads(subprocess.run(["node", "out/facebox-dump.mjs"], cwd=ROOT, capture_output=True, text=True).stdout)

# 1. cuts
rows = []
for w in FW["wins"]:
    for c in [c for c in w["cuts"] if c["jump"]]:
        n = -(-int(c["t"] * 30 * 1000 - 1) // 1000)  # ceil
        tiles = []
        for k in (n - 1, n, n + 1):
            im = grab(k).crop((480, 1000, 1440, 2560)).resize((300, 488)); d = ImageDraw.Draw(im)
            d.rectangle([0, 0, 300, 24], fill=(0, 0, 0)); d.text((4, 3), f"w{w['win']} f{k} {k/30:.2f}s {c['from']}->{c['to']}", font=font, fill=(255, 230, 0))
            tiles.append(im)
        row = Image.new("RGB", (3 * 304, 492), (20, 20, 20))
        for i, t in enumerate(tiles): row.paste(t, (i * 304, 2))
        rows.append(row)
o = Image.new("RGB", (max(r.width for r in rows) * 2 + 10, ((len(rows) + 1) // 2) * 492), (0, 0, 0))
for i, r in enumerate(rows): o.paste(r, ((i % 2) * (r.width + 10), (i // 2) * 492))
o.save(os.path.join(q, "v6-face-cuts.png")); print("face cuts", len(rows))

# 2. lip-sync: words starting with b/p/m inside each window, 3 per window, spread
rows = []
for w in FW["wins"]:
    a, z = w["start"] + 0.4, w["end"] - 0.3
    cand = [x for x in W if a <= x["s"] <= z and x["w"].lower()[0] in "bpm" and x["e"] - x["s"] > 0.1]
    pick = [cand[int(i * (len(cand) - 1) / 2)] for i in range(3)] if len(cand) >= 3 else cand
    for x in pick:
        n0 = round(x["s"] * 30); tiles = []
        for k in (n0 - 2, n0 - 1, n0, n0 + 1, n0 + 2, n0 + 3):
            fb = FB.get(str(k))
            if not fb: continue
            cx, cy, fw = (fb[0] + fb[2] / 2) * S, (fb[1] + fb[3] * 0.72) * S, fb[2] * S
            box = (int(cx - fw * 0.45), int(cy - fw * 0.3), int(cx + fw * 0.45), int(cy + fw * 0.3))
            im = grab(k).crop(box).resize((220, 147)); d = ImageDraw.Draw(im)
            d.rectangle([0, 0, 220, 20], fill=(0, 0, 0)); d.text((3, 1), f"{k - n0:+d}f {k/30:.2f}", font=font, fill=(255, 230, 0))
            tiles.append(im)
        row = Image.new("RGB", (240 + 6 * 224, 151), (20, 20, 20)); d = ImageDraw.Draw(row)
        d.text((6, 6), f"w{w['win']} \"{x['w']}\"\nonset {x['s']:.2f}s", font=font, fill=(240, 240, 240))
        for i, t in enumerate(tiles): row.paste(t, (240 + i * 224, 2))
        rows.append(row)
o = Image.new("RGB", (rows[0].width, len(rows) * 151), (0, 0, 0))
for i, r in enumerate(rows): o.paste(r, (0, i * 151))
o.save(os.path.join(q, "v6-lipsync.png")); print("lipsync rows", len(rows))
