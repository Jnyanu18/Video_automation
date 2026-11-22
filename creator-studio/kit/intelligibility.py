"""Can every word be heard in the FINAL mix? (2026-11-10, after "midnight" was lost under a whisper and two effects.)

    python kit/intelligibility.py <slug> <final.mp4> [--model small]

Transcribes the finished mix (voice, music and effects together) with Whisper and lines it up against script.md. Any
script word the recogniser could not pick out of the mix is listed with its time from words.json: a listener on a phone
speaker is likely to miss it too. Digits are matched loosely ("nine" and "9", "two hundred" and "200"). A clean run
prints "every word heard". This checks the mix, not the voice alone: transcribe.py already checks the voice.
"""
import argparse
import difflib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import norm, script_paragraphs, video_dir, whisper_model

NUM = {"nine": "9", "one": "1", "two": "2", "three": "3", "hundred": "100", "percent": "%"}


def key(w: str) -> str:
    w = norm(w)
    return NUM.get(w, w)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("final")
    ap.add_argument("--model", default="small")
    a = ap.parse_args()
    d = video_dir(a.slug)
    script = [w for p in script_paragraphs(a.slug) for w in p.split()]
    timed = json.loads((d / "words.json").read_text(encoding="utf-8"))
    res = whisper_model(a.model).transcribe(str(a.final), language="en", word_timestamps=True, fp16=False)
    heard = [w["word"] for s in res["segments"] for w in s.get("words", [])]
    sk = [key(w) for w in script]
    hk = [key(w) for w in heard]
    # split tokens like "11:58" / "3%" so both sides compare word for word
    sm = difflib.SequenceMatcher(a=sk, b=hk, autojunk=False)
    missed = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op in ("delete", "replace"):
            missed.append((i1, " ".join(script[i1:i2]), " ".join(heard[j1:j2]) or "(nothing)"))
    # the time of a script word: the nearest timed word at the same position
    def when(i: int) -> float:
        i = min(i, len(timed) - 1)
        return timed[i]["start"] if timed else 0.0
    print(f"{len(script)} script words, {len(heard)} heard in the mix, {100 * sm.ratio():.1f}% aligned.")
    if not missed:
        print("Every word heard.")
        return
    for i, said, got in missed:
        print(f"  ~{when(i):6.2f}s  script: {said!r:40} heard: {got!r}")


if __name__ == "__main__":
    main()
