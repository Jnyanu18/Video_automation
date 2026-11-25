"""Stage 3, the cues: python lanes/animated/cues.py <slug> [--force]

Reads storyboard.md (one "## beat-id | words it starts on" per picture change) and words.json, finds
where each beat's words are spoken, and writes cues.json plus cues.md: the whole video timed out before
a frame is drawn. Matching is forgiving (Whisper writes "12" for "twelve"), but in order: each beat is
looked for after the previous one.
"""
import argparse
import difflib
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "kit"))  # common.py, captions.py
from common import norm, read_json, require, video_dir, write_json


def parse(text: str):
    beats = []
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    for block in re.split(r"^## ", text, flags=re.M)[1:]:
        head, _, body = block.partition("\n")
        bid, _, phrase = head.partition("|")
        chapter = None
        desc = []
        for line in body.strip().splitlines():
            if line.lower().startswith("chapter:"):
                chapter = line.split(":", 1)[1].strip()
            elif line.strip():
                desc.append(line.strip())
        beats.append({"id": bid.strip(), "phrase": phrase.strip(), "desc": " ".join(desc), "chapter": chapter})
    return beats


def find(words, phrase, start_at):
    target = [norm(t) for t in phrase.split() if norm(t)]
    n = len(target)
    best, best_i = 0.0, None
    for i in range(start_at, len(words)):
        window = [norm(w["w"]) for w in words[i:i + n]]
        score = difflib.SequenceMatcher(a=" ".join(target), b=" ".join(window)).ratio()
        if score > best:
            best, best_i = score, i
        if score >= 0.97:
            break
    return (best_i, best) if best >= 0.75 else (None, best)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    require(a.slug, "2 Words", a.force)
    d = video_dir(a.slug)
    words = read_json(d / "words.json")
    beats = parse((d / "storyboard.md").read_text(encoding="utf-8"))
    if not beats or not words:
        raise SystemExit("storyboard.md has no beats, or words.json is empty (run transcribe.py).")

    end_all = round(words[-1]["end"] + 0.8, 3)
    cues, pos = [], 0
    for k, b in enumerate(beats):
        if k == 0:
            i, score = 0, 1.0
        else:
            i, score = find(words, b["phrase"], pos)
            if i is None:
                raise SystemExit(f"Beat '{b['id']}': could not find '{b['phrase']}' after "
                                 f"{words[pos]['start']:.2f}s (best match {score:.0%}). Fix storyboard.md.")
        start = 0.0 if k == 0 else max(0.0, round(words[i]["start"] - 0.12, 3))
        cues.append({"id": b["id"], "start": start, "end": end_all, "words": b["phrase"],
                     "desc": b["desc"], **({"chapter": b["chapter"]} if b["chapter"] else {})})
        pos = i + 1
    for k in range(len(cues) - 1):
        cues[k]["end"] = cues[k + 1]["start"]
    write_json(d / "cues.json", cues)

    rows = [f"| {c['start']:6.2f} | {c['end'] - c['start']:5.2f}s | {c['id']} | {c['words']} | {c['desc']} |" for c in cues]
    (d / "cues.md").write_text(
        f"# Cues: {a.slug}\n\nTotal {end_all:.1f}s, {len(cues)} beats.\n\n"
        "| Start | Length | Beat | Starts on | On screen |\n| --- | --- | --- | --- | --- |\n" + "\n".join(rows) + "\n",
        encoding="utf-8")
    print(f"Wrote cues.json and cues.md: {len(cues)} beats over {end_all:.1f}s.")
    for c in cues:
        print(f"  {c['start']:6.2f}s  {c['id']}")


if __name__ == "__main__":
    main()
