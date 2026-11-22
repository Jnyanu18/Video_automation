"""Faceless lane: python lanes/animated/scenes.py <slug>

Reads videos/<slug>/scenes.json and words.json and writes cues.json: one cue per scene with the time it starts,
found the same way faceless.tsx finds it (the scene's `at` phrase, 0.15 s early), so stills.py draws one still
from the middle of every scene for the storyboard.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "kit"))
from common import video_dir, write_json


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def main():
    d = video_dir(sys.argv[1])
    specs = json.loads((d / "scenes.json").read_text(encoding="utf-8"))
    words = json.loads((d / "words.json").read_text(encoding="utf-8"))

    def find(phrase, frm):
        want = [w for w in map(norm, phrase.split()) if w]
        for i, x in enumerate(words):
            if x["start"] < frm - 0.01:
                continue
            if all(i + k < len(words) and norm(words[i + k]["w"]) == w for k, w in enumerate(want)):
                return x["start"]
        return frm

    starts = []
    for i, s in enumerate(specs):
        starts.append(0.0 if i == 0 else max(starts[-1] + 0.3, find(s["at"], starts[-1]) - 0.15))
    end = words[-1]["end"] + 1.8
    cues = [{"id": f"{i + 1:02d}-{s['scene']}", "start": round(t, 3), "end": round(starts[i + 1] if i + 1 < len(starts) else end, 3),
             "words": s["at"], "desc": s.get("section", "")} for i, (s, t) in enumerate(zip(specs, starts))]
    write_json(d / "cues.json", cues)
    for c in cues:
        print(f"{c['id']:<14} {c['start']:6.2f} to {c['end']:6.2f}")


if __name__ == "__main__":
    main()
