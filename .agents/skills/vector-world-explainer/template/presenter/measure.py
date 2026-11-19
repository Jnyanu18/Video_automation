# Geometry of each window's cut-out (source px of the take frame), for src/face-windows.json:
#  face box (YuNet, from spine/takes/gaze.json mapped through the window's frame map), hair top and the
#  person's horizontal extent (alpha), and stray alpha (the matte keeping chair/keyboard) below rows.
# usage: py -3.13 presenter/measure.py  -> prints + writes MATTE/geom.json
import glob, json, os, re, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline_config import MATTE, TAKES_DIR, SRC_W, SRC_H, SRC_FPS

M = MATTE
G = json.load(open(os.path.join(TAKES_DIR, "gaze.json")))
SF = 1 / SRC_FPS
WINS = sorted(int(re.findall(r"w(\d+)\.json$", p)[0]) for p in glob.glob(os.path.join(M, "w*.json")))
out = {}
for k in WINS:
    meta = json.load(open(os.path.join(M, f"w{k}.json")))
    w, h = SRC_W // 4, SRC_H // 4
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(M, f"w{k}.mov"), "-vf", f"scale={w}:{h},format=rgba,alphaextract,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
    A = np.frombuffer(raw, np.uint8).reshape(-1, h, w)
    faces, tops, lefts, rights = [], [], [], []
    per = []
    for i, (f, take, s) in enumerate(meta["map"]):
        r = min(G[str(take)], key=lambda q: abs(q[0] - s * SF))
        if r[1] is not None: faces.append(r[2])
        a = A[i] > 128
        rows = np.where(a.any(1))[0]; cols = np.where(a[: int(h * 0.75)].any(0))[0]
        if len(rows): tops.append(rows[0] * 4)
        if len(cols): lefts.append(cols[0] * 4); rights.append(cols[-1] * 4)
        per.append({"f": f, "face": r[2] if r[1] is not None else None, "top": int(rows[0] * 4) if len(rows) else None})
    F = np.array(faces)
    x0 = np.percentile(F[:, 0], 3); y0 = np.percentile(F[:, 1], 3)
    x1 = np.percentile(F[:, 0] + F[:, 2], 97); y1 = np.percentile(F[:, 1] + F[:, 3], 97)
    g = {"face": [int(x0), int(y0), int(x1 - x0), int(y1 - y0)], "cx": int((x0 + x1) / 2), "hairTop": int(np.percentile(tops, 3)),
         "left": int(np.percentile(lefts, 3)), "right": int(np.percentile(rights, 97)), "start": meta["start"], "end": meta["end"], "frames": meta["frames"], "per": per}
    out[k] = g
    print(k, {kk: v for kk, v in g.items() if kk != "per"})
json.dump(out, open(os.path.join(M, "geom.json"), "w"))
