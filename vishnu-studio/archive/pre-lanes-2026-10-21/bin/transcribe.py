"""Stage 2, the words: python bin/transcribe.py <slug> [--force]

Runs Whisper locally on voice/voice.mp3, writes words.json (every word, start and end in seconds), then
lines it up against script.md and lists every disagreement in words-check.md, so a slurred name shows.
"""
import argparse
import difflib
from common import norm, require, script_paragraphs, video_dir, write_json


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--model", default="small", help="Whisper model (small is cached here; base is faster)")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    require(a.slug, "1 Voice", a.force)
    d = video_dir(a.slug)

    import whisper

    model = whisper.load_model(a.model)
    script = " ".join(script_paragraphs(a.slug))
    res = model.transcribe(str(d / "voice" / "voice.mp3"), language="en", word_timestamps=True,
                           initial_prompt=script[:800], fp16=False)
    words = []
    for seg in res["segments"]:
        for w in seg.get("words", []):
            text = w["word"].strip()
            if text:
                words.append({"w": text, "start": round(w["start"], 3), "end": round(w["end"], 3)})
    write_json(d / "words.json", words)

    heard = [norm(w["w"]) for w in words]
    wrote = [norm(t) for t in script.split()]
    sm = difflib.SequenceMatcher(a=wrote, b=heard, autojunk=False)
    rows = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            continue
        at = words[j1]["start"] if j1 < len(words) else (words[-1]["end"] if words else 0)
        rows.append(f"| {at:6.2f}s | {op} | {' '.join(script.split()[i1:i2]) or '-'} | "
                    f"{' '.join(w['w'] for w in words[j1:j2]) or '-'} |")
    match = round(sm.ratio() * 100, 1)
    lines = [f"# Words check: {a.slug}", "",
             f"{len(words)} words heard, {match}% of the script matched word for word.", ""]
    if rows:
        lines += ["Numbers written as words often come back as digits; that is fine. A wrong name is not.", "",
                  "| At | Kind | Script says | Heard |", "| --- | --- | --- | --- |", *rows]
    else:
        lines.append("No disagreements.")
    (d / "words-check.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote words.json ({len(words)} words) and words-check.md ({len(rows)} differences, {match}% match).")


if __name__ == "__main__":
    main()
