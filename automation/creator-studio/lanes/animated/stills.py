"""Stage 4, the pencil test: python lanes/animated/stills.py <slug> [--fmt 16x9|9x16] [--force]

Renders one frame from the middle of every beat and lays them out on stills/contact-sheet.png with the
beat names, so Claude (and Vishnu) can spot anything overlapping, cut off or off-brand before the full
preview.
"""
import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "kit"))  # common.py, captions.py
from common import ROOT, read_json, require, video_dir

FPS = 30


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--fmt", choices=["16x9", "9x16"], default="16x9", help="which composition to draw")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--at", help="comma-separated seconds to draw instead of each beat's middle (the faceless storyboard)")
    a = ap.parse_args()
    require(a.slug, "3 Cues", a.force)
    d = video_dir(a.slug)
    cues = read_json(d / "cues.json")
    sdir = d / "stills"
    shutil.rmtree(sdir, ignore_errors=True)
    sdir.mkdir()
    if a.at:
        times = [float(x) for x in a.at.split(",")]
        frames = [int(t * FPS) for t in times]
        # label each still with the scene it falls in
        cues = [next((c for c in reversed(cues) if c["start"] <= t), cues[0]) | {"start": t} for t in times]
    else:
        frames = [int(((c["start"] + c["end"]) / 2) * FPS) for c in cues]
    # Bundle only this video and the sound effects: unset, the bundle copies all of videos/ (33.5 GB on 2026-11-05),
    # which made a 12-still storyboard take 10 minutes instead of about 2.
    env = {**os.environ, "STUDIO_ONLY": os.environ.get("STUDIO_ONLY") or f"{a.slug},_sfx"}
    subprocess.run(["node", str(ROOT / "kit" / "remotion.mjs"), "stills", a.slug, str(sdir), ",".join(map(str, frames)), a.fmt],
                   check=True, cwd=ROOT, env=env)

    from PIL import Image, ImageDraw, ImageFont

    tall = a.fmt == "9x16"
    tw, th = (300, 533) if tall else (640, 360)
    tiles = []
    for c, f in zip(cues, frames):
        img = Image.open(sdir / f"frame-{f:05d}.png").convert("RGB")
        img.thumbnail((tw, th))
        tile = Image.new("RGB", (tw, th + 40), "white")
        tile.paste(img, (0, 0))
        draw = ImageDraw.Draw(tile)
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except OSError:
            font = ImageFont.load_default()
        draw.text((10, th + 8), f"{c['id']}  {c['start']:.1f}s", fill="#14151a", font=font)
        tiles.append(tile)
    cols = 6 if tall else 3
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (tw + 10) + 10, rows * (th + 50) + 10), "#e6e8ec")
    for k, t in enumerate(tiles):
        sheet.paste(t, (10 + (k % cols) * (tw + 10), 10 + (k // cols) * (th + 50)))
    sheet.save(sdir / "contact-sheet.png")
    print(f"Wrote videos/{a.slug}/stills/contact-sheet.png ({len(tiles)} beats). Read it, then watch the full "
          f"preview with sound (pnpm studio) before ticking '4 Scene'.")


if __name__ == "__main__":
    main()
