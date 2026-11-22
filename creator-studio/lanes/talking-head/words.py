"""Talking head, step 3, the words: python lanes/talking-head/words.py <slug> [--model small] [--force]

Runs Whisper locally on work/source.wav and writes work/words.json (every word with its start and end),
plus transcript.md: what was said, line by line with times, and where it differs from script.md.
"""
import argparse
import difflib
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "kit"))  # common.py, captions.py
from common import whisper_model, norm, require, script_paragraphs, video_dir, write_json
from lines import lines_of


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--model", default="small")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    require(a.slug, "2 Raw", a.force)
    d = video_dir(a.slug)

    import whisper

    model = whisper_model(a.model)
    script = " ".join(script_paragraphs(a.slug))
    # A prompt full of fillers makes Whisper write what was said, ums and false starts included, so the
    # cut can remove them. The script itself makes it tidy the speech up, which hides retakes. Names from
    # the script are added so they are spelled right.
    names = sorted({re.sub(r"[^\w']", "", t) for t in script.split() if t[:1].isupper() or any(c.isdigit() for c in t)})
    prompt = "Umm, so, uh, I, I mean, I have, I've built it, like, hmm. " + ", ".join(n for n in names if n)
    res = model.transcribe(str(d / "work" / "source.wav"), language="en", word_timestamps=True,
                           initial_prompt=prompt[:800], condition_on_previous_text=False, fp16=False)
    words = []
    for seg in res["segments"]:
        for w in seg.get("words", []):
            text = w["word"].strip()
            if not text:
                continue
            # Whisper splits "2,500" into "2" and ",500"; put it back together.
            if words and re.match(r"^[,.%]\d", text):
                words[-1]["w"] += text
                words[-1]["end"] = round(w["end"], 3)
                continue
            words.append({"w": text, "start": round(w["start"], 3), "end": round(w["end"], 3)})
    # Corrections Vishnu confirmed, one per line in fixes.txt: "heard => right" (single words, case ignored,
    # punctuation kept; add " @1-2" to limit it to those seconds). Used when Whisper mishears a name or a word he said clearly.
    fixes_file = d / "fixes.txt"
    if fixes_file.exists():
        fixes = []  # (heard, right, start, end); a window "@1-2" limits it to those seconds
        for line in fixes_file.read_text(encoding="utf-8").splitlines():
            if "=>" in line and not line.lstrip().startswith("#"):
                left, right = line.split("=>", 1)
                lo, hi = 0.0, 1e9
                m = re.search(r"@\s*([\d.]+)\s*-\s*([\d.]+)\s*$", right)
                if m:
                    lo, hi, right = float(m.group(1)), float(m.group(2)), right[:m.start()]
                fixes.append((norm(left) if " " not in left.strip() else tuple(norm(x) for x in left.split()), right.strip(), lo, hi))
        for heard, right, lo, hi in [f for f in fixes if isinstance(f[0], tuple)]:
            i = 0
            while i <= len(words) - len(heard):
                ws = words[i:i + len(heard)]
                if all(norm(x["w"]) == h for x, h in zip(ws, heard)) and lo <= ws[0]["start"] <= hi:
                    tail = re.match(r"^.*?(\W*)$", ws[-1]["w"]).group(1)
                    words[i:i + len(heard)] = [{"w": right + tail, "start": ws[0]["start"], "end": ws[-1]["end"]}]
                i += 1
        fixes = [f for f in fixes if not isinstance(f[0], tuple)]
        for w in words:
            m = re.match(r"^(\W*)(.*?)(\W*)$", w["w"])
            for heard, right, lo, hi in fixes:
                if m and norm(m.group(2)) == heard and lo <= w["start"] <= hi:
                    w["w"] = m.group(1) + right + m.group(3)
                    break
    write_json(d / "work" / "words.json", words)
    long_words = [w for w in words if w["end"] - w["start"] > 1.2]

    out = [f"# Transcript: {a.slug}", "", f"{len(words)} words. Every take is here, retakes included; the cut "
           "step keeps the last take of a repeated line.", ""]
    for ln in lines_of(words):
        out.append(f"- {ln['start']:6.2f}s  {ln['text']}")
    if long_words:
        out += ["", "## Listen here", "",
                "These words last over 1.2 seconds, which usually means a false start or a retake was hidden "
                "inside them. Listen to work/source.mp4 at these times; the cut step marks them too.", ""]
        out += [f"- {w['start']:6.2f}s \"{w['w']}\" lasts {w['end'] - w['start']:.1f}s" for w in long_words]
    if script:
        heard = [norm(w["w"]) for w in words]
        wrote = [norm(t) for t in script.split()]
        sm = difflib.SequenceMatcher(a=wrote, b=heard, autojunk=False)
        out += ["", f"## Against the script ({round(sm.ratio() * 100, 1)}% the same, retakes lower this)", ""]
        diffs = [f"- {op}: script \"{' '.join(script.split()[i1:i2]) or '-'}\" / heard "
                 f"\"{' '.join(w['w'] for w in words[j1:j2]) or '-'}\""
                 for op, i1, i2, j1, j2 in sm.get_opcodes() if op != "equal"]
        out += diffs[:60] or ["No differences."]
    (d / "transcript.md").write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"Wrote work/words.json ({len(words)} words) and transcript.md. Check it, tick '3 Words', then: "
          f"python lanes/talking-head/cut.py {a.slug}")


if __name__ == "__main__":
    main()
