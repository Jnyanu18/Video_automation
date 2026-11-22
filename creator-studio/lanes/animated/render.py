"""Stage 5, the render: python lanes/animated/render.py <slug> [--only 16x9|9x16] [--force]

Renders the 16:9 and 9:16 videos with the voice, writes captions.srt, three thumbnail candidates and
description.md (chapters from the storyboard, plus the cloned-voice line). Title and thumbnail are
picked by Vishnu.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "kit"))  # common.py, captions.py
from common import thumbs_review, ROOT, read_json, require, video_dir
from captions import write_srt

FPS = 30


def ts(sec: float) -> str:
    m, s = divmod(int(sec), 60)
    return f"{m}:{s:02d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--only", choices=["16x9", "9x16"])
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    require(a.slug, "4 Scene", a.force)
    d = video_dir(a.slug)
    out = d / "out"
    out.mkdir(exist_ok=True)
    draft = (d / "voice" / "DRAFT-VOICE.txt").exists()
    tag = "-DRAFT" if draft else ""

    for fmt in (["16x9", "9x16"] if not a.only else [a.only]):
        target = out / f"{a.slug}-{fmt}{tag}.mp4"
        subprocess.run(["node", str(ROOT / "kit" / "remotion.mjs"), "render", f"{a.slug}-{fmt}", str(target)],
                       check=True, cwd=ROOT)
        print(f"Wrote {target.relative_to(ROOT)}")

    words = read_json(d / "words.json")
    write_srt(words, out / "captions.srt")

    cues = read_json(d / "cues.json")
    # Thumbnail candidates: the first frame worth showing from three different beats.
    picks = [c for c in cues[:1] + cues[len(cues) // 2:len(cues) // 2 + 1] + cues[-2:-1]]
    frames = [int((c["start"] + 0.8) * FPS) for c in picks]
    if len(set(frames)) < 3:  # a single-take video has one cue: spread the three across it instead
        end = cues[-1]["end"]
        frames = [int(0.8 * FPS), int(end * 0.5 * FPS), int(end * 0.8 * FPS)]
    subprocess.run(["node", str(ROOT / "kit" / "remotion.mjs"), "stills", a.slug, str(out), ",".join(map(str, frames)), a.only or "16x9"],
                   check=True, cwd=ROOT)
    for k, f in enumerate(frames, 1):
        src = out / f"frame-{f:05d}.png"
        if src.exists():
            src.replace(out / f"thumb-{k}.png")
    thumbs_review(out)  # all thumbnails on one image, shown to Vishnu with the final

    chapters = [c for c in cues if c.get("chapter")] or cues
    lines = ["# Description draft", "", "<!-- Title and thumbnail: Vishnu picks. -->", "", "Chapters", ""]
    lines += [f"{ts(c['start'])} {c.get('chapter') or c['id']}" for c in chapters]
    # A voice picked per video (voice/settings.json) is a library voice, not Vishnu's clone.
    vs = d / "voice" / "settings.json"
    clone = not vs.exists() or json.loads(vs.read_text(encoding="utf-8")).get("clone", False)
    voiced = ("DRAFT: stand-in voice. Do not publish." if draft else
              "Narrated by my cloned voice, reading a script I wrote and approved." if clone else "Narrated by an AI voice.")
    lines += ["", voiced]
    (out / "description.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Wrote captions.srt, thumb-1..3.png and description.md. Watch the final, pick the title and thumbnail, "
          "then tick '5 Render'.")


if __name__ == "__main__":
    main()
