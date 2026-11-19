# Splice-seam check of spine/vo-spine.wav: at every piece boundary (spine/splice-map.json)
#  - click test: largest sample-to-sample jump within +-20 ms of the seam vs the 99.9th percentile of
#    jumps over the whole file (a click would stand far above it);
#  - level step: K-weighted gated loudness (BS.1770) of the 3 s of speech before vs the 3 s after.
# usage: py -3.13 spine/seams.py  -> table + <project>/qa/seams.json
# Targets (quantum v6): every |step| <= ~1 LU after levelling, jump ratio ~1 (no clicks).
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import lfilter
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.dirname(HERE))
from pipeline_config import PROJECT, SPINE_WAV, SPLICE_MAP
x, SR = sf.read(SPINE_WAV, dtype="float32")
sm = json.load(open(SPLICE_MAP))["pieces"]


def lufs(y):
    y = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585], y)
    y = lfilter([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621], y)
    n = int(0.4 * SR); h = n // 4
    z = np.array([np.mean(y[i:i + n] ** 2) for i in range(0, len(y) - n + 1, h)])
    z = z[-0.691 + 10 * np.log10(z + 1e-12) > -70]
    z = z[-0.691 + 10 * np.log10(z) > -0.691 + 10 * np.log10(z.mean()) - 10]
    return float(-0.691 + 10 * np.log10(z.mean()))


d = np.abs(np.diff(x)); ref = float(np.percentile(d, 99.9))
rows = []
for a, b in zip(sm, sm[1:]):
    t = b["out_in"]; i = int(t * SR); w = int(0.02 * SR)
    jump = float(d[max(0, i - w):i + w].max())
    pre = lufs(x[max(0, i - 3 * SR):i]); post = lufs(x[i:i + 3 * SR])
    kind = f"{a.get('take', 'rec55')}->{b.get('take', 'rec55')}"
    rows.append({"t": round(t, 3), "seam": kind, "jump_vs_p999": round(jump / ref, 2), "lufs_before": round(pre, 2), "lufs_after": round(post, 2), "step_LU": round(post - pre, 2)})
    print(f"{t:8.3f}  {kind:14s} jump/p99.9 {jump / ref:5.2f}   {pre:6.2f} -> {post:6.2f} LUFS  step {post - pre:+5.2f} LU")
os.makedirs(os.path.join(PROJECT, "qa"), exist_ok=True)
json.dump(rows, open(os.path.join(PROJECT, "qa", "seams.json"), "w"), indent=1)
print("max |step|", max(abs(r["step_LU"]) for r in rows), "max jump ratio", max(r["jump_vs_p999"] for r in rows))
