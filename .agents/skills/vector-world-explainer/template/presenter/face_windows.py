# Writes src/face-windows.json from spine/splice-map.json and the matte run
# (MATTE/w<k>.json + geom.json from presenter/measure.py): per window the clip, its film frames, the
# cuts inside it (jump = picture jumps: another take or a skipped pause) and the per-frame face box
# (source px, forward-filled).
# usage: py -3.13 presenter/face_windows.py
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline_config import FILM, MATTE, SPLICE_MAP, SRC_W, SRC_H

M = MATTE
sm = json.load(open(SPLICE_MAP))["pieces"]
G = json.load(open(os.path.join(M, "geom.json")))
wins = []
for k in sorted({p["win"] for p in sm if p["kind"] == "face"}):
    m = json.load(open(os.path.join(M, f"w{k}.json"))); g = G[str(k)]
    ps = [p for p in sm if p.get("win") == k]
    cuts = []
    for a, b in zip(ps, ps[1:]):
        cont = a["take"] == b["take"] and abs(a["src_out"] - b["src_in"]) < 1e-3
        cuts.append({"t": round(b["out_in"], 3), "jump": not cont, "from": a["take"], "to": b["take"], "skipped": round(b["src_in"] - a["src_out"], 3) if a["take"] == b["take"] else None})
    last = None; faces = []
    for q in g["per"]:
        if q["face"]: last = q["face"]
        faces.append(last)
    wins.append({"win": k, "src": f"face/w{k}.webm", "startFrame": m["start_frame"], "frames": m["frames"], "start": round(m["start"], 4), "end": round(m["end"], 4),
                 "takes": [p["take"] for p in ps], "cuts": cuts, "face": g["face"], "cx": g["cx"], "hairTop": g["hairTop"], "faces": faces})
    print(k, round(m["start"], 2), round(m["end"], 2), [p["take"] for p in ps], [(c["t"], c["jump"]) for c in cuts])
json.dump({"w": SRC_W, "h": SRC_H, "fps": 30, "wins": wins}, open(os.path.join(FILM, "src", "face-windows.json"), "w"))
