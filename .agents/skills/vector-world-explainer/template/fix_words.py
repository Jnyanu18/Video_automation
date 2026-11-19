# Word timings for public/vo.wav (= spine/vo-spine.wav; see spine/splice-map.json).
#   py align.py public/vo.wav "<names>" medium.en   (writes src/words.json + src/vo_env.json)
#   cp src/words.json out/words-raw.json; py fix_words.py        (presenter/rebuild.sh does both)
# - voice-over stretches ("rec55" pieces): the recording's own words (VO_REC_WORDS, already hand-fixed
#   against the recording) shifted by each piece's offset; identical audio, so earlier fixes and
#   caption lines carry over exactly.
# - face windows (his on-camera DJI takes): faster-whisper medium.en on the spine (out/words-raw.json),
#   checked against the takes' own transcripts (spine/takes/t*.words.json) and the energy envelope.
# Keep every correction here (never hand-edit words.json). The FIXES / ENVELOPE entries below are the
# quantum film's (worked examples; rewrite them per film):
#   1. "booth" -> "pool" (take 137; the take's own transcript hears "pool").
#   2. "we'll" -> "you'll" in the hook (large-v3 and the take's own transcript agree on "you'll").
#   3. "hit follow.": Whisper squeezed "hit" to 60 ms (and the master is heard as "head follow"); set
#      from the envelope relative to the last piece, so a rebuilt spine keeps it.
#   4. Minimum word length 0.07 s, taken from the following gap or the word's own start.
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pipeline_config import VO_REC_WORDS, SPLICE_MAP

raw = json.load(open("out/words-raw.json"))
rec = json.load(open(VO_REC_WORDS))
sm = json.load(open(SPLICE_MAP))["pieces"]
w = []
for p in sm:
    a, b = p["out_in"], p["out_out"]
    if p["kind"] == "rec55":
        d = p["out_in"] - p["src_in"]
        w += [{"w": x["w"], "s": round(x["s"] + d, 3), "e": round(x["e"] + d, 3)} for x in rec if p["src_in"] <= x["s"] < p["src_out"]]
    else:
        # by word midpoint; Whisper starts a piece's first word early (into the 0.12 s lead-in), so
        # clamp it to the piece's measured voice onset (out_in + 0.12; build_spine.refine)
        ws = [{"w": x["w"].strip(), "s": x["s"], "e": x["e"]} for x in raw if a <= (x["s"] + x["e"]) / 2 < b]
        if ws and ws[0]["s"] < a + 0.12: ws[0]["s"] = round(min(a + 0.12, ws[0]["e"] - 0.07), 3)
        w += ws


def find(word, after=0.0):
    return next(i for i, x in enumerate(w) if x["w"] == word and x["s"] >= after - 1e-6)


# ---- PER FILM: word fixes (wrong word -> right word, optional time window) ----
FIXES = [("booth", "pool", None), ("we'll", "you'll", (0, 12))]
for x in w:
    for bad, good, win in FIXES:
        if x["w"] == bad and (win is None or win[0] <= x["s"] < win[1]): x["w"] = good

# ---- PER FILM: words re-timed from the envelope, relative to a piece's out_in (survives rebuilds) ----
# quantum: "hit" at last-piece out_in + 0.175..0.285, "follow." at +0.335..0.545
L = sm[-1]["out_in"]
i = find("hit", L - 0.2)
w[i]["s"] = round(L + 0.175, 3); w[i]["e"] = round(L + 0.285, 3); w[i + 1]["s"] = round(L + 0.335, 3); w[i + 1]["e"] = round(L + 0.545, 3)

for k, x in enumerate(w):
    if x["e"] - x["s"] < 0.07:
        nxt = w[k + 1]["s"] if k + 1 < len(w) else x["s"] + 1
        if x["s"] + 0.07 <= nxt: x["e"] = round(x["s"] + 0.07, 3)
        else: x["e"] = nxt; x["s"] = round(nxt - 0.07, 3)
json.dump(w, open("src/words.json", "w"), indent=0)
assert all(x["e"] - x["s"] >= 0.069 for x in w), [x for x in w if x["e"] - x["s"] < 0.069]
assert all(w[k]["s"] >= w[k - 1]["s"] for k in range(1, len(w)))
print("fixed", len(w)); print(" ".join(x["w"] for x in w))
