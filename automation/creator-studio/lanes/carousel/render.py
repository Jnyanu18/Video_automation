"""Carousel: python lanes/carousel/render.py <slug>

Reads videos/<slug>/slides.md, writes work/slides.json, and renders one PNG per slide (1080x1350, Instagram's
4:5) into out/slide-01.png and on, plus out/contact-sheet.png to check them all at once.

slides.md is one block per slide:

    ## cover            (or: ## step)
    kicker: GOOGLE PLAY
    title: How to get your app on [[Google Play]]     ([[...]] sits on gold)
    sub: A line under the title.
    - a bullet
    tip: A box at the bottom, for a lesson from real work.
    cta: The last slide's ask.
    source: Small print, for where the facts came from.
"""
import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "kit"))  # common.py, captions.py
from common import ROOT, video_dir, write_json

FIELDS = ("kicker", "title", "sub", "tip", "cta", "source")


def parse(text: str) -> list[dict]:
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    slides = []
    for block in re.split(r"^## ", text, flags=re.M)[1:]:
        head, _, body = block.partition("\n")
        s = {"kind": head.strip().lower() or "step", "bullets": []}
        for line in body.splitlines():
            line = line.strip()
            if line.startswith("- "):
                s["bullets"].append(line[2:].strip())
                continue
            k, sep, v = line.partition(":")
            if sep and k.strip().lower() in FIELDS:
                s[k.strip().lower()] = v.strip()
        slides.append(s)
    return slides


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    a = ap.parse_args()
    d = video_dir(a.slug)
    slides = parse((d / "slides.md").read_text(encoding="utf-8"))
    if not slides:
        raise SystemExit("slides.md has no slides (each starts with '## cover' or '## step').")
    (d / "work").mkdir(exist_ok=True)
    write_json(d / "work" / "slides.json", {"slides": slides})

    out = d / "out"
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir()
    subprocess.run(["node", str(ROOT / "kit" / "remotion.mjs"), "carousel", a.slug, str(out), str(len(slides))],
                   check=True, cwd=ROOT)
    for i in range(len(slides)):
        (out / f"frame-{i:05d}.png").replace(out / f"slide-{i + 1:02d}.png")

    from PIL import Image
    tiles = [Image.open(out / f"slide-{i + 1:02d}.png").convert("RGB").resize((360, 450)) for i in range(len(slides))]
    sheet = Image.new("RGB", (len(tiles) * 370 + 10, 470), "#e6e8ec")
    for k, t in enumerate(tiles):
        sheet.paste(t, (10 + k * 370, 10))
    sheet.save(out / "contact-sheet.png")
    print(f"Wrote {len(slides)} slides to videos/{a.slug}/out/ (slide-01.png ...) and contact-sheet.png.")


if __name__ == "__main__":
    main()
