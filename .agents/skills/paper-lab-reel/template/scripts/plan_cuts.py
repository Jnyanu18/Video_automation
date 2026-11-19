# v2 tightening (2026-10-14): remove a little of the gaps, cut unnecessary adjectives.
# EDL = the approved option-A spans minus (a) two word cuts and (b) every silence > MIN_SIL, shortened to KEEP.
# All cut points snap to the 1/30 s grid inside silence (or the measured word gap), so picture and voice stay locked.
import json, math, numpy as np, scipy.io.wavfile as wf

BASE = [(3.0, 2299 / 30), (2671 / 30, 171.69)]
WORD_CUTS = [  # (src start, src end, why) - picked from 10 ms RMS, see NOTES.md F9
    # v3 (2026-10-15): keep "a good compression" ("I like the good"); cut the repeated "it can",
    # "network, [right? That's beautiful.]" and the "[I want to make sure you guys keep following me and]" ask.
    (681 / 30, 701 / 30, '"information. [it can] it can figure out" repeated words'),
    (1011 / 30, 1059 / 30, "'network, [right? That's beautiful.] You just compress'"),
    (3018 / 30, 3029 / 30, '"[Something,] everything would be there" false start'),
    (4560 / 30, 4639 / 30, '"computer science. [I want to make sure you guys keep following me and] keep following the beauty"'),
]
THRESH_DB, MIN_SIL, KEEP = -42.0, 0.42, 0.30
G = 1 / 30

sr, a = wf.read("source-derived/audio-48k-stereo.wav")
m = a.astype(np.float32).mean(1) / 32768
hop = sr // 100
db = 20 * np.log10(np.sqrt(np.add.reduceat(m[: len(m) // hop * hop] ** 2, np.arange(0, len(m) // hop * hop, hop)) / hop) + 1e-9)
quiet = db < THRESH_DB

def silences(s, e):
    out, i, n = [], int(math.ceil(s * 100)), int(e * 100)
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]: j += 1
            if (j - i) / 100 >= MIN_SIL: out.append((i / 100, j / 100))
            i = j
        else: i += 1
    return out

removed = [(s, e, w) for s, e, w in WORD_CUTS]
for s, e in BASE:
    for a0, a1 in silences(s + 0.05, e - 0.05):
        c0 = math.ceil((a0 + KEEP / 2) / G) * G
        c1 = math.floor((a1 - KEEP / 2) / G) * G
        near_word_cut = any(c0 < w1 + 1.2 and c1 > w0 - 1.2 for w0, w1, _ in WORD_CUTS)  # no double jump
        if c1 - c0 >= 0.2 - 1e-6 and not near_word_cut: removed.append((round(c0, 6), round(c1, 6), f"pause {a1 - a0:.2f}s -> {a1 - a0 - (c1 - c0):.2f}s"))
removed.sort()

segs = []
for s, e in BASE:
    cur = s
    for r0, r1, _ in removed:
        if s <= r0 < e:
            if r0 - cur > 1e-6: segs.append([cur, r0])
            cur = r1
    segs.append([cur, e])
# frame-exact lengths
segs = [[round(s * 30) / 30, round(e * 30) / 30] for s, e in segs]
before = sum(e - s for s, e in BASE)
after = sum(e - s for s, e in segs)
json.dump({"base": BASE, "removed": removed, "segments": segs, "before": before, "after": after}, open("analysis/edl-v2.json", "w"), indent=1)
for r in removed: print(f"{r[0]:8.3f}-{r[1]:8.3f}  {r[1]-r[0]:.3f}  {r[2]}")
print(len(segs), "segments;", round(before, 2), "->", round(after, 2), "s; saved", round(before - after, 2))
