"""Talking head, step 4, the cut: python lanes/talking-head/cut.py <slug> [--propose] [--keep-fillers] [--force]

First run: proposes cuts.md, one line per spoken line, ticked to keep. A line repeated later (a retake)
starts unticked, so the last take wins; lines that are only "um" are dropped. Filler words inside a kept
line are cut too (unless --keep-fillers). Long pauses shrink to a short breath.

Then renders work/cut.mp4 and work/cut-words.json (the words on the new, shorter timeline).
Edit cuts.md (tick or untick lines) and run it again to re-cut. --propose starts cuts.md over.
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "kit"))  # common.py, captions.py
from common import norm, read_json, require, video_dir, write_json
from lines import is_filler, lines_of

LINE = re.compile(r"^- \[( |x|X)\] L(\d+) ([\d.]+)-([\d.]+) \|")
PAD_IN, PAD_OUT, JOIN = 0.08, 0.10, 0.35


ENDINGS = (("n't", " not"), ("'ve", " have"), ("'m", " am"), ("'re", " are"), ("'ll", " will"), ("'d", " would"),
           ("'s", " is"))


def key(words, ln, n=3):
    """The first few words of a line, contractions spelled out, so "I have built" matches "I've built"."""
    k = []
    for i in ln["idx"]:
        if is_filler(words[i]["w"]):
            continue
        w = norm(words[i]["w"])
        for end, full in ENDINGS:
            if w.endswith(end):
                w = w[: -len(end)] + full
                break
        k += w.split()
    return tuple(k[:n])


def propose(slug, words, path):
    lines = lines_of(words)
    out = [f"# Cut list: {slug}", "",
           "Tick [x] to keep a line, untick to drop it. Retakes start unticked so the last take wins. Fillers "
           "(um, uh) inside kept lines are cut automatically. To drop part of a line add a line like \"- remove 48.16-51.0\" (seconds). Edit, then run again: "
           f"python lanes/talking-head/cut.py {slug}", ""]
    for n, ln in enumerate(lines, 1):
        real = [i for i in ln["idx"] if not is_filler(words[i]["w"])]
        k = key(words, ln)
        retake = len(k) >= 2 and any(key(words, later) == k for later in lines[n:n + 4])
        keep = bool(real) and not retake
        note = "  (retake)" if retake else ("  (only filler)" if not real else "")
        long = [words[i] for i in ln["idx"] if words[i]["end"] - words[i]["start"] > 1.2]
        if long:
            note += "  (listen: " + ", ".join(f"\"{w['w']}\" at {w['start']:.1f}s lasts {w['end'] - w['start']:.1f}s"
                                             for w in long) + ")"
        out.append(f"- [{'x' if keep else ' '}] L{n:03d} {ln['start']:.2f}-{ln['end']:.2f} | {ln['text']}{note}")
    path.write_text("\n".join(out) + "\n", encoding="utf-8")


def duration(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                                capture_output=True, text=True, check=True).stdout.strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--propose", action="store_true")
    ap.add_argument("--keep-fillers", action="store_true")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    require(a.slug, "3 Words", a.force)
    d = video_dir(a.slug)
    work = d / "work"
    words = read_json(work / "words.json")
    cuts = d / "cuts.md"
    if a.propose and cuts.exists():
        cuts.replace(d / "cuts.prev.md")
    if not cuts.exists():
        propose(a.slug, words, cuts)
        print("Proposed cuts.md.")

    removed = []
    kept = []
    for raw in cuts.read_text(encoding="utf-8").splitlines():
        rm = re.match(r"^- remove ([\d.]+)-([\d.]+)", raw.strip())
        if rm:
            removed.append((float(rm.group(1)), float(rm.group(2))))
    for raw in cuts.read_text(encoding="utf-8").splitlines():
        m = LINE.match(raw)
        if m and m.group(1).lower() == "x":
            s, e = float(m.group(3)), float(m.group(4))
            kept += [w for w in words if w["start"] >= s - 0.01 and w["end"] <= e + 0.01
                     and (a.keep_fillers or not is_filler(w["w"]))]
    kept = [w for w in kept if not any(lo <= w["start"] < hi for lo, hi in removed)]
    if not kept:
        raise SystemExit("Nothing is ticked in cuts.md.")

    total = duration(work / "source.mp4")
    segs = []
    for w in kept:
        s, e = max(0.0, w["start"] - PAD_IN), min(total, w["end"] + PAD_OUT)
        if segs and s - segs[-1][1] < JOIN:
            segs[-1][1] = max(segs[-1][1], e)
        else:
            segs.append([s, e])

    # Snap each piece to the actual sound: Whisper's word times can include silence at a take's edge, which
    # shows as dead air. Anything inside a quiet stretch is trimmed to just before the speech begins.
    quiet = []
    err = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(work / "source.wav"), "-af",
                          "silencedetect=noise=-38dB:d=0.12", "-f", "null", "-"], capture_output=True, text=True).stderr
    st = None
    for line in err.splitlines():
        m = re.search(r"silence_start: (-?[\d.]+)", line)
        if m:
            st = max(0.0, float(m.group(1)))
        m = re.search(r"silence_end: ([\d.]+)", line)
        if m and st is not None:
            quiet.append((st, float(m.group(1))))
            st = None
    merged = []
    for q0, q1 in sorted(quiet):
        if merged and q0 - merged[-1][1] < 0.06:
            merged[-1][1] = max(merged[-1][1], q1)
        else:
            merged.append([q0, q1])
    for seg in segs:
        for q0, q1 in merged:
            if q0 - 0.15 <= seg[0] < q1 - 0.1:
                seg[0] = min(seg[1] - 0.2, max(seg[0], q1 - 0.12))
            if q0 + 0.1 < seg[1] <= q1 + 0.15:
                seg[1] = max(seg[0] + 0.2, min(seg[1], q0 + 0.18))

    graph, labels = [], []
    for i, (s, e) in enumerate(segs):
        length = e - s
        graph.append(f"[0:v]trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS[v{i}];")
        graph.append(f"[0:a]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS,"
                     f"afade=t=in:d=0.01,afade=t=out:st={max(0.0, length - 0.01):.3f}:d=0.01[a{i}];")
        labels.append(f"[v{i}][a{i}]")
    graph.append("".join(labels) + f"concat=n={len(segs)}:v=1:a=1[v][a]")
    script = work / "cut-filter.txt"
    script.write_text("\n".join(graph), encoding="utf-8")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(work / "source.mp4"),
                    "-filter_complex_script", str(script), "-map", "[v]", "-map", "[a]", "-r", "30",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", str(work / "cut.mp4")], check=True)

    # The same words on the cut timeline, for captions and for anchoring the edit.
    # Each word goes to the piece it overlaps most. Not its midpoint: Whisper can stretch a take's first word
    # over the silence before it, and once the piece is snapped to the sound the midpoint falls outside, so
    # the word vanished from the captions ("Every" on 2026-10-23, then "I").
    overlap = lambda w, s, e: min(w["end"], e) - max(w["start"], s)
    home = {id(w): max(range(len(segs)), key=lambda i: overlap(w, *segs[i])) for w in kept}
    new, cum = [], 0.0
    for i, (s, e) in enumerate(segs):
        for w in kept:
            if home[id(w)] == i and overlap(w, s, e) > 0:
                new.append({"w": w["w"], "start": round(cum + max(w["start"], s) - s, 3),
                            "end": round(cum + min(w["end"], e) - s, 3)})
        cum += e - s
    write_json(work / "cut-words.json", new)
    print(f"Wrote work/cut.mp4: {total:.1f}s of footage became {cum:.1f}s in {len(segs)} pieces. Watch it with "
          f"sound. Change cuts.md and run again if needed; when it is right tick '4 Cut', then write edit.md "
          f"with Claude and run: python lanes/talking-head/plan.py {a.slug}")


if __name__ == "__main__":
    main()
