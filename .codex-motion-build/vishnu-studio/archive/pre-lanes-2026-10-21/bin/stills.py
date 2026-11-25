"""Stage 4, the pencil test: python bin/stills.py <slug> [--force]

Renders one frame from the middle of every beat and lays them out on stills/contact-sheet.png with the
beat names, so Claude (and Vishnu) can spot anything overlapping, cut off or off-brand before the full
preview.
"""
import argparse
import shutil
import subprocess
from common import ROOT, read_json, require, video_dir

FPS = 30


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    require(a.slug, "3 Cues", a.force)
    d = video_dir(a.slug)
    cues = read_json(d / "cues.json")
    sdir = d / "stills"
    shutil.rmtree(sdir, ignore_errors=True)
    sdir.mkdir()
    frames = [int(((c["start"] + c["end"]) / 2) * FPS) for c in cues]
    subprocess.run(["node", str(ROOT / "bin" / "remotion.mjs"), "stills", a.slug, str(sdir), ",".join(map(str, frames))],
                   check=True, cwd=ROOT)

    from PIL import Image, ImageDraw, ImageFont

    tiles = []
    for c, f in zip(cues, frames):
        img = Image.open(sdir / f"frame-{f:05d}.png").convert("RGB")
        img.thumbnail((640, 360))
        tile = Image.new("RGB", (640, 400), "white")
        tile.paste(img, (0, 0))
        draw = ImageDraw.Draw(tile)
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except OSError:
            font = ImageFont.load_default()
        draw.text((10, 368), f"{c['id']}  {c['start']:.1f}s", fill="#14151a", font=font)
        tiles.append(tile)
    cols = 3
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 650 + 10, rows * 410 + 10), "#e6e8ec")
    for k, t in enumerate(tiles):
        sheet.paste(t, (10 + (k % cols) * 650, 10 + (k // cols) * 410))
    sheet.save(sdir / "contact-sheet.png")
    print(f"Wrote videos/{a.slug}/stills/contact-sheet.png ({len(tiles)} beats). Read it, then watch the full "
          f"preview with sound (pnpm studio) before ticking '4 Scene'.")


if __name__ == "__main__":
    main()
