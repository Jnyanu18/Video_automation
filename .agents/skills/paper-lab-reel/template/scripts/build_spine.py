# Builds the shared audio/timing spine for both films from the raw-derived audio.
# EDL A (approved 2026-10-14): drop pre-roll and the 76.6-89.1s recap. Voice is never altered beyond the cuts.
import json, subprocess, numpy as np, scipy.io.wavfile as wf
ROOT = "."
# v2: EDL = analysis/edl-v2.json segments (scripts/plan_cuts.py: pause trims + word cuts), then the
# voice-clone outro (approved 2026-10-14) over the end card, then a short hold.
EDL = [tuple(x) for x in json.load(open(f"{ROOT}/analysis/edl-v2.json"))["segments"]]
OUTRO = f"{ROOT}/source-derived/outro/outro-v2-48k.wav"  # v3: "Follow for more AI news." (v1 line kept as outro-v1-48k.wav)  # clarity chain + level-matched (see below)
OUTRO_AT = 0.45 + 1.25  # after "best of luck" starts: the end card is growing (paper END.card0)
HOLD = 1.2  # still end card after the outro
FPS = 30
FADE = 0.012

sr, a = wf.read(f"{ROOT}/source-derived/audio-48k-stereo.wav")
a = a.astype(np.float32) / 32768
parts = []
for s, e in EDL:
    seg = a[int(s * sr):int(e * sr)].copy()
    n = int(FADE * sr); ramp = np.linspace(0, 1, n)[:, None]
    seg[:n] *= ramp; seg[-n:] *= ramp[::-1]
    parts.append(seg)
body = np.concatenate(parts)
def to_out0(t):
    off = 0.0
    for s0, e0 in EDL:
        if s0 <= t < e0: return off + t - s0
        off += e0 - s0
src_w = json.load(open(f"{ROOT}/analysis/transcript-medium.json"))["words"]
luck = next(to_out0(w["s"]) for i, w in enumerate(src_w) if w["w"].strip().lower() == "best" and src_w[i + 2]["w"].strip().lower().startswith("luck"))
o_sr, ob = wf.read(OUTRO); assert o_sr == sr
ob = ob.astype(np.float32) / (32768 if ob.dtype == np.int16 else 1)
if ob.ndim == 1: ob = np.stack([ob, ob], 1)
at = round((luck + OUTRO_AT) * FPS) / FPS
pad = int(at * sr) - len(body); assert pad >= 0, pad
vo = np.concatenate([body, np.zeros((pad, 2), np.float32), ob, np.zeros((int(HOLD * sr), 2), np.float32)])
total = round(len(vo) / sr * FPS) / FPS; vo = vo[: int(total * sr)]
if len(vo) < int(total * sr): vo = np.concatenate([vo, np.zeros((int(total * sr) - len(vo), 2), np.float32)])
wf.write(f"{ROOT}/film/public/vo.wav", sr, (np.clip(vo, -1, 1) * 32767).astype(np.int16))

def kept(a0, a1):  # seconds of [a0, a1) that survive the EDL
    return sum(max(0.0, min(a1, e) - max(a0, s)) for s, e in EDL)
def to_out(t, side):  # source -> output; inside a removed stretch, snap to the next (side=+1) or previous kept frame
    off = 0.0
    for s, e in EDL:
        if t < s: return off if side > 0 else (off if off == 0 else off)
        if t < e: return off + t - s
        off += e - s
    return off

src = json.load(open(f"{ROOT}/analysis/transcript-medium.json"))["words"]
# medium.en merged the doubled "it can, it can figure out" into one pair; re-aligned on a short clip (2026-10-15)
for w in src:
    if abs(w["s"] - 22.90) < 0.01: w["s"], w["e"] = 23.40, 23.46
    if abs(w["s"] - 22.94) < 0.01: w["s"], w["e"] = 23.46, 23.62
words = []
for w in src:
    if w["s"] < EDL[0][0] or w["s"] >= EDL[-1][1]: continue
    if w["e"] > w["s"] and kept(w["s"], w["e"]) < 0.25 * (w["e"] - w["s"]): continue  # word removed by a cut ("a good", "Something,")
    s_o, e_o = to_out(w["s"], 1), to_out(w["e"], -1)
    words.append({"w": w["w"], "s": round(s_o, 3), "e": round(max(e_o, s_o + 0.08), 3), "src": w["s"]})
# kept fixes: whisper gives "All" zero length
for w in words:
    if w["e"] <= w["s"]: w["e"] = round(w["s"] + 0.12, 3)
json.dump(words, open(f"{ROOT}/film/src/words.json", "w"), indent=0)

mono = vo.mean(1); spf = sr // FPS
env = [float(np.sqrt((mono[i * spf:(i + 1) * spf] ** 2).mean())) for i in range(int(total * FPS))]
mx = max(env); json.dump([round(x / mx, 3) for x in env], open(f"{ROOT}/film/src/vo_env.json", "w"))
segs, off = [], 0.0
for s0, e0 in EDL: segs.append({"out": round(off, 6), "src": s0, "len": round(e0 - s0, 6)}); off += e0 - s0
meta = {"edl": EDL, "segments": segs, "outro": {"t": at, "dur": len(ob) / sr, "text": "Follow for more AI news."}, "hold": HOLD, "total": total, "frames": int(round(total * FPS))}
json.dump(meta, open(f"{ROOT}/analysis/edl.json", "w"), indent=1)
json.dump(meta, open(f"{ROOT}/film/src/edl.json", "w"), indent=1)
print(len(words), "words", round(total, 3), "s", int(round(total * FPS)), "frames")
