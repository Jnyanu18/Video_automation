# Audio spine: Madhav's gap-cut voice-over recording (spine/gapcut.py -> <project>/audio/vo-real.wav)
# for the voice-over stretches, and his on-camera DJI-mic takes for the face windows (the same takes
# whose picture is cut out by presenter/matte.py). From the quantum film v6.
#
#   py -3.13 spine/build_spine.py   -> spine/vo-spine.wav, spine/splice-map.json, spine/takes/proc/*.wav
#   then: presenter/rebuild.sh (copies vo-spine.wav to public/vo.wav and re-makes everything downstream)
#
# Rules:
#  - cuts on word boundaries (refined on the 5 ms energy envelope), gaps between pieces tightened to
#    <= 0.24 s (0.12 s of each side's own room tone), 30 ms fades on every piece edge;
#  - the picture of a face piece is the same take at the same source times: output frame f shows the
#    source frame nearest src_in + (f/30 - out_in) (WAV and MP4 start together; spine/sync_wav.py);
#  - DJI takes are tone/level matched to the voice-over recording: the same clean-up chain gapcut.py
#    used (highpass 75, afftdn -50, compressor 2.5:1), then a smoothed 1/3-octave EQ match of the
#    long-term speech spectrum (clamped +-8 dB), then K-weighted loudness matched per take;
#  - seam levelling (step 4) and a large-v3 Whisper pass over the finished spine (pipeline-commands.md)
#    catch doubled or clipped words at the joins ("waving your hands, your hands": IN_AT below).
import json, os, subprocess, sys
import numpy as np, soundfile as sf
from scipy.signal import welch, firwin2, fftconvolve, lfilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from pipeline_config import VO_REC, SPINE_WAV, SPLICE_MAP, TAKES_DIR, take_wav

SR = 48000; FPS = 30
REC = VO_REC  # "rec55" below = this voice-over recording (named after the quantum film's recording 55)
PROC = os.path.join(TAKES_DIR, "proc"); os.makedirs(PROC, exist_ok=True)
GAP = 0.24; HALF = GAP / 2; FADE = 0.03

# ======================= PER-FILM PLAN (worked example: the quantum film v6) =======================
# ---- the plan: (window, take, first word start, last word end) in take-WAV seconds (words from takes/t*.words.json)
# Internal sentence gaps > 0.30 s inside a piece are split into two pieces (tightened, reframe on the cut).
FACE = [
    (1, 131, 8.22, 14.38), (1, 131, 14.88, 16.74), (1, 135, 9.62, 12.12),
    (2, 134, 12.68, 15.00), (2, 134, 15.32, 17.64),
    (3, 137, 18.86, 23.54), (3, 133, 26.38, 30.08), (3, 135, 27.00, 31.68),
    (4, 137, 36.76, 40.44), (4, 137, 40.92, 42.84), (4, 137, 43.18, 45.12), (4, 134, 41.98, 48.04), (4, 135, 54.70, 56.56), (4, 135, 57.08, 57.34),
]
# voice-over stretches between the windows (vo-real.wav seconds; first/last word of each)
VO = [(13.32, 31.92), (39.26, 51.46), (72.68, 91.84)]
# Measured in-points where a take runs straight from the previous word into the first wanted word
# (no 0.12 s of silence to take): (take, word start) -> exact source in-point, no pre-roll.
# 133 "When" (whisper says 26.38): "hands." ends with its "s" at ~26.30, trough -41 dB 26.44-26.52,
# "When" onset 26.53 (5 ms envelope, takes/proc/t133-matched.wav). v6 QA found "your hands" doubled.
IN_AT = {(133, 26.38): 26.45}
ORDER = [("F", 1), ("V", 0), ("F", 2), ("V", 1), ("F", 3), ("V", 2), ("F", 4)]  # F = face window k, V = voice-over stretch k
# ===================================================================================================
TAKE = {n: take_wav(n) for n in sorted({p[1] for p in FACE})}


def load(p, ch0=True):
    a, sr = sf.read(p, dtype="float32", always_2d=True); assert sr == SR, (p, sr)
    return a[:, 0].copy()


def kweight(x):
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
    return lfilter(b2, a2, lfilter(b1, a1, x))


def lufs(x):
    y = kweight(x); n = int(0.4 * SR); h = n // 4
    if len(y) < n: return -99.0
    z = np.array([np.mean(y[i:i + n] ** 2) for i in range(0, len(y) - n + 1, h)])
    l = -0.691 + 10 * np.log10(z + 1e-12); z = z[l > -70]
    if not len(z): return -99.0
    rel = -0.691 + 10 * np.log10(z.mean()) - 10
    z = z[(-0.691 + 10 * np.log10(z)) > rel]
    return float(-0.691 + 10 * np.log10(z.mean()))


def env(x, hop=240):  # 5 ms RMS in dB
    n = len(x) // hop
    return 20 * np.log10(np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-9)


def refine(x, s, e):
    """voice onset/offset near whisper's word start s / end e, from the energy envelope."""
    E = env(x); fl = np.percentile(E, 8); thr = fl + 14
    i0 = int(max(0, s - 0.25) * 200); i1 = int((s + 0.10) * 200)
    on = next((i for i in range(i0, i1) if E[i] > thr and E[i:i + 4].min() > thr - 6), int(s * 200)) / 200
    j0 = int((e + 0.30) * 200); j1 = int(max(0, e - 0.12) * 200)
    off = next((j for j in range(j0, j1, -1) if E[j] > thr and E[j - 4:j].min() > thr - 6), int(e * 200)) / 200
    return on, off + 0.005


def fade(a):
    n = int(FADE * SR); a = a.copy(); r = np.linspace(0, 1, n, dtype=np.float32) ** 1.0
    a[:n] *= r; a[-n:] *= r[::-1]; return a


# ---- 1. clean-up chain on each used take (same as rec55's v5 chain, minus its final loudnorm)
used = sorted({p[1] for p in FACE})
for n in used:
    out = os.path.join(PROC, f"t{n}-clean.wav")
    if not os.path.exists(out):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", TAKE[n], "-af", "pan=mono|c0=c0,highpass=f=75,afftdn=nf=-50,acompressor=ratio=2.5:threshold=-24dB:attack=10:release=150", "-ar", "48000", "-c:a", "pcm_f32le", out], check=True)

rec = load(REC)
# ---- 2. EQ match: long-term speech spectrum of rec55 vs the cleaned takes (voiced 5 ms frames only)
def ltas(x):
    E = env(x); m = np.repeat(E > np.percentile(E, 55), 240)[:len(x)]
    f, p = welch(x[:len(m)][m], SR, nperseg=4096); return f, p
f, Prec = ltas(rec)
cat = np.concatenate([load(os.path.join(PROC, f"t{n}-clean.wav")) for n in used])
_, Pdji = ltas(cat)
d = 10 * np.log10(Prec + 1e-20) - 10 * np.log10(Pdji + 1e-20)
# 1/3-octave smoothing, clamp, only 60 Hz..16 kHz shaped (outside: hold edge values)
sm = np.zeros_like(d)
for i, fc in enumerate(f):
    if fc <= 0: continue
    k = (f >= fc / 2 ** (1 / 6)) & (f <= fc * 2 ** (1 / 6)); sm[i] = d[k].mean()
band = (f >= 60) & (f <= 16000)
lo, hi = sm[band][0], sm[band][-1]; sm[f < 60] = lo; sm[f > 16000] = hi; sm[0] = lo
sm -= np.interp(1000, f, sm)  # EQ is shape only; level is set by loudness below
sm = np.clip(sm, -8, 8)
fir = firwin2(4097, f / (SR / 2), 10 ** (sm / 20)).astype(np.float32)
json.dump({"f": [float(x) for x in f[::8]], "db": [round(float(x), 2) for x in sm[::8]]}, open(os.path.join(TAKES_DIR, "eq-match.json"), "w"))

L_rec = lufs(rec)
proc = {}
for n in used:
    x = load(os.path.join(PROC, f"t{n}-clean.wav"))
    y = fftconvolve(x, fir, mode="full")[2048:2048 + len(x)].astype(np.float32)
    # level: match the loudness of this take's USED speech to rec55
    seg = np.concatenate([y[int(s * SR):int(e * SR)] for (_, t, s, e) in FACE if t == n])
    g = 10 ** ((L_rec - lufs(seg)) / 20); y *= g
    mp = os.path.join(PROC, f"t{n}-matched.wav"); sf.write(mp + ".tmp.wav", y, SR, subtype="FLOAT")
    # rec55 went through loudnorm's limiter in v5; give the raised takes the same peak ceiling
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp + ".tmp.wav", "-af", "aresample=192000,alimiter=limit=0.84:attack=3:release=60:level=false,aresample=48000", "-c:a", "pcm_f32le", mp], check=True)
    os.remove(mp + ".tmp.wav"); proc[n] = load(mp)
    print(f"take {n}: gain {20 * np.log10(g):+.1f} dB", flush=True)

# ---- 3. assemble
pieces = []
for kind, k in ORDER:
    if kind == "V":
        s, e = VO[k]; on, off = refine(rec, s, e)
        pieces.append({"kind": "rec55", "src": os.path.relpath(REC, os.path.dirname(os.path.dirname(HERE))).replace(os.sep, "/"), "on": on, "off": off, "words": [s, e]})
    else:
        for (w, n, s, e) in [p for p in FACE if p[0] == k]:
            on, off = refine(proc[n], s, e)
            if (n, s) in IN_AT: on = IN_AT[(n, s)]
            pieces.append({"kind": "face", "win": w, "take": n, "src": os.path.basename(TAKE[n]), "on": on, "off": off, "words": [s, e], "exact_in": (n, s) in IN_AT})

# in/out points: HALF of own room tone each side; consecutive pieces of the SAME take whose gap is
# already < GAP are cut at the middle of the gap (no repeated audio, no tightening needed)
A = [p["on"] - (0.0 if i == 0 or p.get("exact_in") else HALF) for i, p in enumerate(pieces)]
Bo = [p["off"] + (HALF if i < len(pieces) - 1 else 0.35) for i, p in enumerate(pieces)]
for i in range(len(pieces) - 1):
    p, q = pieces[i], pieces[i + 1]
    if p.get("take") is not None and p.get("take") == q.get("take") and Bo[i] > A[i + 1]:
        c = (p["off"] + q["on"]) / 2; Bo[i] = c; A[i + 1] = c
out = []; t = 0.0; smap = []
for i, p in enumerate(pieces):
    x = rec if p["kind"] == "rec55" else proc[p["take"]]
    a, b = max(0.0, A[i]), Bo[i]
    seg = fade(x[int(round(a * SR)):int(round(b * SR))])
    t_start = len(np.concatenate(out)) / SR if out else 0.0
    out.append(seg)
    smap.append({**{k: (round(v, 4) if isinstance(v, float) else v) for k, v in p.items()}, "src_in": round(a, 4), "src_out": round(b, 4), "out_in": round(t_start, 4), "out_out": round(t_start + len(seg) / SR, 4)})
    t = t_start + len(seg) / SR
vo = np.concatenate(out)

# ---- 4. seam levelling: per-piece gains for the face pieces (rec55 fixed) so the speech loudness in
# the 3 s either side of every seam matches (least squares, weak pull of each gain towards 0 dB,
# limited to +-4 dB). A gain change sits in the faded gap between pieces, so it is inaudible as such.
def seam_steps(v):
    st = []
    for i in range(1, len(smap)):
        c = int(smap[i]["out_in"] * SR)
        st.append((i - 1, i, lufs(v[max(0, c - 3 * SR):c]), lufs(v[c:c + 3 * SR])))
    return st
free = [i for i, p in enumerate(smap) if p["kind"] == "face"]
# pieces that continue the same take without a skip (joined in a pause) share one gain
col = {}; ng = -1
for i in free:
    q = smap[i - 1]
    if not (q["kind"] == "face" and q["take"] == smap[i]["take"] and abs(q["src_out"] - smap[i]["src_in"]) < 1e-3): ng += 1
    col[i] = ng
NG = ng + 1
gt = np.zeros(NG); lam = 0.5
for it in range(4):  # re-measure after applying (3 s windows straddle short pieces)
    st = seam_steps(vo); A = []; y = []
    for (a, b, pre, post) in st:
        if a in col and b in col and col[a] == col[b]: continue  # same continuous take: natural prosody
        wt = 2.0 if (a not in col or b not in col) else 1.0  # voice-over <-> camera switches count double
        row = np.zeros(NG)
        if b in col: row[col[b]] += wt
        if a in col: row[col[a]] -= wt
        A.append(row); y.append(wt * (pre - post))
    # regularise the TOTAL gain of each piece towards 0 dB (its per-take loudness match)
    A = np.vstack(A + [lam * np.eye(NG)]); y = np.array(y + list(-lam * gt))
    dg = np.linalg.lstsq(A, y, rcond=None)[0]
    dg = np.clip(gt + dg, -3, 3) - gt; gt += dg
    for i in free:
        a0, b0 = int(round(smap[i]["out_in"] * SR)), int(round(smap[i]["out_out"] * SR))
        vo[a0:b0] *= 10 ** (dg[col[i]] / 20)
for i in free: smap[i]["gain_db"] = round(float(gt[col[i]]), 2)
print("seam steps after levelling:", [round(post - pre, 2) for (_, _, pre, post) in seam_steps(vo)])
pk = np.abs(vo).max()
if pk > 0.98: vo *= 0.98 / pk
sf.write(SPINE_WAV, (np.clip(vo, -1, 1) * 32767).astype(np.int16), SR, subtype="PCM_16")
json.dump({"sr": SR, "fps": FPS, "rec55_lufs": round(L_rec, 2), "out_lufs": round(lufs(vo), 2), "duration": round(len(vo) / SR, 4), "pieces": smap}, open(SPLICE_MAP, "w"), indent=1)
print(os.path.basename(SPINE_WAV), round(len(vo) / SR, 3), "s, LUFS", round(lufs(vo), 2), "rec55", round(L_rec, 2))
for p in smap: print(p["kind"], p.get("take", ""), p.get("win", ""), p["src_in"], p["src_out"], "->", p["out_in"], p["out_out"])
