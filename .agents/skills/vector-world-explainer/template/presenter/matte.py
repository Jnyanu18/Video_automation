# Cut-out of Madhav's on-camera takes (quantum film v6): RobustVideoMatting (resnet50, torch.hub
# PeterL1n) on the GPU at native source resolution, time-mapped onto the film's 30 fps timeline per
# face window.
#
#   $CUDA_PY presenter/matte.py window <k> [k...]   -> MATTE/w<k>.mov (ProRes 4444 + alpha, the master) + w<k>.json
#   $CUDA_PY presenter/matte.py test <take> <s> <e>  -> MATTE/test-<take>.mov (do 3-5 s first; inspect with mattesheet.py)
# CUDA_PY = the torch cu128 venv (config.sh; RTX 5070). MATTE / source geometry: pipeline_config.py.
# Speed (v6): 4 windows, ~1,480 output frames at 1512x2688, in about 80 s on the GPU (u2net on CPU
# managed ~0.7 fps at 720 px in paper-lab-reel).
#
# Output frame f of window k (film time t = start + f/30) shows the source frame nearest
#   src_t = piece.src_in + (t - piece.out_in)        (spine/splice-map.json; same take as the voice)
# so picture and voice stay in sync. Before the first / after the last piece the clip just continues
# the same take (his lead-in / exit frames).
# RVM runs once per piece over its source range with a 1 s warm-up (recurrent state), reset per piece.
# Edges: alpha < 0.02 -> 0, > 0.985 -> 1; colour = the source pixel where alpha >= 0.985 (face/skin
# untouched), RVM's decontaminated foreground in the soft edge band (no beige-wall fringe).
import glob, json, math, os, subprocess, sys
import numpy as np, torch
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline_config import MATTE, SPLICE_MAP, SRC_W, SRC_H, SRC_FPS, take_mp4

OUT = MATTE; os.makedirs(OUT, exist_ok=True)
W, H = SRC_W, SRC_H; SFPS = SRC_FPS; FPS = 30; DSR = 0.2  # downsample_ratio 0.2 suits a ~1500x2700 half-body
SM = json.load(open(SPLICE_MAP))
PIECES = [p for p in SM["pieces"] if p["kind"] == "face"]
LEAD, TAIL = 0.15, 0.12  # window starts LEAD before its first piece, ends TAIL after its last

dev = "cuda"
model = torch.hub.load("PeterL1n/RobustVideoMatting", "resnet50", trust_repo=True).to(dev).eval()


def mp4(n): return take_mp4(n)


def frames(n, i0, i1):
    """yield (index, HxWx3 uint8 RGB) for source frames i0..i1 inclusive (BT.709 limited -> full RGB)."""
    ss = max(0.0, (i0 - 0.5) / SFPS)
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{ss:.6f}", "-i", mp4(n), "-frames:v", str(i1 - i0 + 1),
           "-vf", "scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24", "-f", "rawvideo", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, bufsize=W * H * 3 * 2)
    i = i0
    while True:
        b = p.stdout.read(W * H * 3)
        if len(b) < W * H * 3: break
        yield i, np.frombuffer(b, np.uint8).reshape(H, W, 3); i += 1
    p.wait()


def encoder(path):
    return subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                             "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuva444p10le", "-c:v", "prores_ks", "-profile:v", "4444", "-qscale:v", "4",
                             "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv", path], stdin=subprocess.PIPE)


@torch.no_grad()
def matte_range(n, need):
    """need: sorted list of source frame indices -> dict idx -> RGBA uint8 (only the needed ones)."""
    i0, i1 = need[0], need[-1]; w0 = max(0, i0 - 30)
    rec = [None] * 4; out = {}; want = set(need)
    for i, rgb in frames(n, w0, i1):
        src = torch.from_numpy(rgb).to(dev).permute(2, 0, 1).unsqueeze(0).float() / 255
        fgr, pha, *rec = model(src, *rec, downsample_ratio=DSR)
        if i not in want: continue
        a = pha[0, 0]
        a = torch.where(a < 0.02, torch.zeros_like(a), a); a = torch.where(a > 0.985, torch.ones_like(a), a)
        col = torch.where((a >= 0.985).unsqueeze(0), src[0], fgr[0])
        rgba = torch.cat([col, a.unsqueeze(0)], 0).permute(1, 2, 0)
        out[i] = (rgba.clamp(0, 1) * 255 + 0.5).byte().cpu().numpy()
    return out


def run_window(k):
    ps = [p for p in PIECES if p["win"] == k]
    t0 = 0.0 if k == 1 else ps[0]["out_in"] - LEAD
    t1 = ps[-1]["out_out"] + TAIL
    f0, f1 = math.ceil(round(t0 * FPS, 6)), math.floor(round(t1 * FPS, 6))
    plan = []  # (out frame, piece index, src frame)
    for f in range(f0, f1 + 1):
        t = f / FPS
        j = next((q for q, p in enumerate(ps) if p["out_in"] <= t < p["out_out"]), 0 if t < ps[0]["out_in"] else len(ps) - 1)
        p = ps[j]; st = p["src_in"] + (t - p["out_in"])
        plan.append((f, j, int(round(st * SFPS))))
    meta = {"win": k, "start_frame": f0, "frames": len(plan), "start": f0 / FPS, "end": (f1 + 1) / FPS,
            "pieces": [{"take": p["take"], "out_in": p["out_in"], "out_out": p["out_out"], "src_in": p["src_in"]} for p in ps],
            "map": [[f, ps[j]["take"], s] for f, j, s in plan]}
    enc = encoder(os.path.join(OUT, f"w{k}.mov"))
    for j, p in enumerate(ps):
        idx = sorted({s for f, jj, s in plan if jj == j})
        res = matte_range(p["take"], idx)
        for f, jj, s in plan:
            if jj == j: enc.stdin.write(res[s].tobytes())
        print(f"w{k} piece {j} take {p['take']} src frames {idx[0]}-{idx[-1]} done", flush=True)
        del res
    enc.stdin.close(); enc.wait()
    json.dump(meta, open(os.path.join(OUT, f"w{k}.json"), "w"))
    print("window", k, f0 / FPS, (f1 + 1) / FPS, len(plan), "frames", flush=True)


if sys.argv[1] == "window":
    for k in map(int, sys.argv[2:]): run_window(k)
else:
    n, s, e = int(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
    idx = list(range(int(round(s * SFPS)), int(round(e * SFPS)) + 1))
    res = matte_range(n, idx); enc = encoder(os.path.join(OUT, f"test-{n}.mov"))
    for i in idx: enc.stdin.write(res[i].tobytes())
    enc.stdin.close(); enc.wait(); print("test done", len(idx))
