"""Writes work/hits.json: every move and hit in the cohort video, on the frame it happens, from the same cue and word
times the scene (remotion/src/lanes/animated/cohort-pitch-day.tsx) uses. A clay Pop peaks about 0.2 s after it
starts, so a pop's hit is placed there."""
import json
from pathlib import Path

V = Path(__file__).parent
cues = {c["id"]: c for c in json.loads((V / "cues.json").read_text(encoding="utf-8"))}
words = json.loads((V / "words.json").read_text(encoding="utf-8"))


def at(w, frm):
    for x in words:
        if x["start"] >= frm - 0.01 and "".join(ch for ch in x["w"].lower() if ch.isalnum()) == w:
            return x["start"]
    return frm


c = cues
POP = 0.2
fifteen, goa, four, still = at("fifteen", c["pitch"]["start"]), at("goa", c["letter"]["start"]), at("four", c["met"]["start"]), at("still", c["money"]["start"])
hits = []


def hit(t, sound, gain=None):
    h = {"t": round(t, 3), "sound": sound}
    if gain is not None:
        h["gain"] = gain
    hits.append(h)


# Every cut between shots gets a soft whoosh.
for t in (c["noslides"]["start"], c["pitch"]["start"], c["pitch"]["start"] + 3.2, c["liked"]["start"], c["letter"]["start"],
          c["money"]["start"], c["advice"]["start"], c["niche_how"]["start"], c["niche"]["start"], c["met"]["start"], four - 0.2):
    hit(t, "whoosh", 0.3)
hit(at("six", 0) - 0.1 + POP, "pop", 0.5)                     # "a 6-minute pitch" lands
hit(c["noslides"]["start"] + POP, "pop", 0.5)                 # "No slides."
hit(c["noslides"]["start"] + POP + 0.15, "boing", 0.35)       # the buddy gasps
hit(c["pitch"]["start"] + POP, "pop", 0.45)                   # "A founder who raised a Series B"
hit(c["pitch"]["start"] + 3.2 + POP, "pop", 0.45)             # "My time to pitch"
hit(c["pitch"]["start"] + 3.4 + POP, "tick", 0.6)             # the clock card
hit(fifteen, "ding", 0.55)                                    # 10 flips to 15
hit(c["liked"]["start"] + POP, "boing", 0.45)                 # the buddy, big and happy
hit(c["liked"]["start"] + 0.2 + POP, "pop", 0.5)              # "He liked it."
hit(c["letter"]["start"] + POP, "sparkle", 0.45)              # "Next round: Founders' Cohort"
hit(goa - 0.1 + POP, "swish", 0.45)                           # the route starts filling
hit(goa - 0.1 + 1.65, "chime", 0.45)                          # it reaches Bengaluru
hit(c["cantgo"]["start"], "thud", 0.8)                        # the colour drains, music cut
hit(still + POP, "pop", 0.45)                                 # "Something better than a seat"
hit(c["advice"]["start"] + POP, "pop", 0.35)                  # the thinking buddy
hit(c["niche_how"]["start"] + POP, "pop", 0.45)               # "Don't build for every SaaS yet"
for w in ("complex", "few", "written"):
    hit(at(w, c["niche_how"]["start"]) + POP, "pop", 0.5)     # each chip
hit(c["niche"]["start"] + POP, "ding", 0.45)                  # "My first niche"
hit(c["met"]["start"] + POP, "pop", 0.4)                      # "VCs and founders on stage"
hit(four - 0.2 + POP, "stamp", 0.6)                           # the 4
hit(c["end"]["start"], "riser", 0.35)                         # into the end card (its peak is at its end)
hit(c["end"]["start"] + POP, "boing", 0.4)                    # the buddy waves
hit(c["end"]["start"] + 0.2 + POP, "pop", 0.45)               # "Day 26. Still going."
hit(c["end"]["start"] + 0.4 + POP, "chime", 0.4)              # askverb.com
hits.sort(key=lambda h: h["t"])
(V / "work" / "hits.json").write_text(json.dumps(hits, indent=1) + "\n", encoding="utf-8")
print(f"{len(hits)} hits")
