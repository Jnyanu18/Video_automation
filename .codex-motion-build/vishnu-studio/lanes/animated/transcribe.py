"""Stage 2, the words: python lanes/animated/transcribe.py <slug> [--force]

Runs Whisper locally on voice/voice.mp3, writes words.json (every word, start and end in seconds), then
lines it up against script.md and lists every disagreement in words-check.md, so a slurred name shows.
"""
import argparse
import difflib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "kit"))  # common.py, captions.py
from common import whisper_model, norm, require, script_paragraphs, video_dir, write_json


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--model", default="small", help="Whisper model (small is cached here; base is faster)")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    require(a.slug, "1 Voice", a.force)
    d = video_dir(a.slug)

    import whisper

    model = whisper_model(a.model)
    paras = script_paragraphs(a.slug)
    script = " ".join(paras)
    # One part at a time, then shifted to where speak.py joined it. On the whole joined file Whisper lost the thread
    # after 24 s of free-business-email (2026-10-26) and wrote words nobody said; each part alone came back right.
    import json
    import subprocess
    from speak import PAUSE
    vdir = d / "voice"
    parts = [vdir / f"part-{i:02d}.mp3" for i in range(1, len(paras) + 1)]
    cuts = [vdir / "cut" / f"part-{i:02d}.wav" for i in range(1, len(paras) + 1)]
    settings = vdir / "settings.json"
    tempo = float(json.loads(settings.read_text(encoding="utf-8")).get("tempo", 1.0)) if settings.exists() and len(parts) > 1 else 1.0
    if all(c.exists() for c in cuts):
        parts, tempo = cuts, 1.0  # speak.py's cut parts: silences trimmed and tempo applied, exactly as joined
    elif not all(p.exists() for p in parts):
        parts, paras = [vdir / "voice.mp3"], [script]
    words, offset = [], 0.0
    for p, text in zip(parts, paras):
        # No initial_prompt: given the exact words of a short part, Whisper skipped its first sentence.
        res = model.transcribe(str(p), language="en", word_timestamps=True, fp16=False)
        for seg in res["segments"]:
            for w in seg.get("words", []):
                t = w["word"].strip()
                if t:
                    words.append({"w": t, "start": round(offset + w["start"] / tempo, 3), "end": round(offset + w["end"] / tempo, 3)})
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                                   capture_output=True, text=True, check=True).stdout)
        offset += dur / tempo + PAUSE
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
