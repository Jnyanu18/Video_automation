# Shorten internal VO pauses: any silence > MAXP becomes KEEP seconds; word timings are remapped.
import json, subprocess, sys, wave, numpy as np
src, dst, wj = sys.argv[1:4]; MAXP, KEEP, SR = 0.45, 0.30, 48000
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, "<i2").astype(np.float32) / 32768
hop = 480; rms = np.sqrt(np.convolve(x ** 2, np.ones(hop) / hop, "same"))[::hop]
silent = rms < 10 ** (-42 / 20)
cuts = []; i = 0; n = len(silent)
while i < n:
    if silent[i]:
        j = i
        while j < n and silent[j]: j += 1
        a, b = i * hop / SR, j * hop / SR
        if b - a > MAXP and i > 0 and j < n: cuts.append((a + KEEP / 2, b - KEEP / 2))
        i = j
    else: i += 1
keep, t = [], 0.0
for a, b in cuts: keep.append((t, a)); t = b
keep.append((t, len(x) / SR))
y = np.concatenate([x[int(a * SR):int(b * SR)] for a, b in keep])
def remap(s):
    removed = sum(b - a for a, b in cuts if b <= s)
    return round(s - removed, 3)
W = json.load(open(wj)); json.dump([{**w, "s": remap(w["s"]), "e": remap(w["e"])} for w in W], open(wj, "w"), indent=0)
with wave.open(dst, "wb") as o:
    o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes((np.clip(y, -1, 1) * 32767).astype("<i2").tobytes())
print(f"{len(x)/SR:.2f}s -> {len(y)/SR:.2f}s, {len(cuts)} pauses shortened")
