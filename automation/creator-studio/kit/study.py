"""Study a reel in one command (2026-10-26): python kit/study.py <instagram/youtube url> [--fast 0-6]

Downloads it (OpenCLI for Instagram, yt-dlp otherwise), then writes research/viral/<id>/:
    card.md     the transcript with times, length, hard cuts, words a second, sound hits a second
    sheet-*.png one frame a second, 40 to a sheet, for Claude to look at
    fast.png    6 frames a second over --fast (default the first 6 s), to see how things move
and deletes the download and the loose frames at once (the studio's hard rule). When the note is written from the
card and the sheets, `python kit/study.py --clean <id>` deletes the sheets too.
"""
import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, whisper_model

OUT = ROOT / "research" / "viral"


def sh(*a, **k):
    return subprocess.run([str(x) for x in a], capture_output=True, text=True, encoding="utf-8", errors="replace", **k)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url", nargs="?")
    ap.add_argument("--fast", default="0-6")
    ap.add_argument("--clean")
    a = ap.parse_args()
    if a.clean:
        for f in (OUT / a.clean).glob("*.png"):
            f.unlink()
        print(f"Deleted the sheets for {a.clean}; card.md stays.")
        return
    m = re.search(r"/(?:p|reel|reels|shorts)/([A-Za-z0-9_-]+)", a.url) or re.search(r"v=([A-Za-z0-9_-]+)", a.url)
    vid = m.group(1) if m else re.sub(r"\W", "", a.url)[-12:]
    d = OUT / vid
    tmp = d / "_tmp"
    tmp.mkdir(parents=True, exist_ok=True)
    if "instagram.com" in a.url:
        sh(shutil.which("opencli") or "opencli", "instagram", "download", a.url, "--path", tmp)  # a .cmd shim on Windows: needs its full path
    else:
        sh(r"D:\toolbox\.venv\Scripts\yt-dlp.exe", "-o", str(tmp / "%(id)s.%(ext)s"), a.url)
    vids = list(tmp.rglob("*.mp4"))
    if not vids:
        sys.exit("Download failed (Instagram rate-limits; wait a few minutes and try again).")
    f = vids[0]
    dur = float(sh("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f).stdout)
    cuts = sh("ffmpeg", "-hide_banner", "-i", f, "-vf", "select='gt(scene,0.35)',showinfo", "-f", "null", "-").stderr.count("pts_time:")
    fr = tmp / "f"
    fr.mkdir()
    sh("ffmpeg", "-loglevel", "error", "-i", f, "-vf", "fps=1,scale=200:-1", fr / "%03d.png")
    n = len(list(fr.glob("*.png")))
    for start in range(1, n + 1, 40):
        sh("ffmpeg", "-loglevel", "error", "-y", "-start_number", start, "-i", fr / "%03d.png", "-frames:v", "1", "-vf", "tile=8x5", d / f"sheet-{start:03d}.png")
    s0, s1 = (float(x) for x in a.fast.split("-"))
    ff = tmp / "ff"
    ff.mkdir()
    sh("ffmpeg", "-loglevel", "error", "-ss", s0, "-t", s1 - s0, "-i", f, "-vf", "fps=6,scale=200:-1", ff / "%03d.png")
    sh("ffmpeg", "-loglevel", "error", "-y", "-i", ff / "%03d.png", "-frames:v", "1", "-vf", "tile=8x5", d / "fast.png")
    model = whisper_model("small")
    r = model.transcribe(str(f), language="en", word_timestamps=True)
    words = sum(len(s["text"].split()) for s in r["segments"])
    import numpy as np
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(f), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    x = np.diff(np.frombuffer(raw, dtype=np.int16).astype(float))
    e = np.sqrt((x[: len(x) // 160 * 160].reshape(-1, 160) ** 2).mean(1))
    thr = np.median(e) * 4
    on = [i for i in range(1, len(e)) if e[i] > thr >= e[i - 1]]
    hits = len([o for k, o in enumerate(on) if k == 0 or o - on[k - 1] > 8])
    lines = [f"# Study: {vid}", "", f"Source: {a.url}", "",
             "| Length | Hard cuts | Words a second | Sound hits a second |", "| --- | --- | --- | --- |",
             f"| {dur:.1f} s | {cuts} | {words / dur:.1f} | {hits / dur:.1f} |", "",
             f"Frames: {', '.join(p.name for p in sorted(d.glob('sheet-*.png')))} (1 a second), fast.png ({a.fast} s at 6 a second).", "",
             "## Transcript", ""]
    lines += [f"- {s['start']:5.1f}  {s['text'].strip()}" for s in r["segments"]]
    lines += ["", "## Notes (Claude, from the sheets)", "", "- Hook:", "- Shape:", "- Motion:", "- Sound:", "- Borrow:", "- Our twist:"]
    (d / "card.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    shutil.rmtree(tmp)
    print(f"research/viral/{vid}/card.md written; download and frames deleted.")


if __name__ == "__main__":
    main()
