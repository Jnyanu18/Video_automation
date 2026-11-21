"""Frames for the Naati Roots speed edit (replicates instagram reel DKP4zphtItA's timing).

13 slots at the reference's exact cut times. Each slot is cropped to 9:16 with its own horizontal
offset, extracted at 30 fps, 720x1280. Middle slots play at 1.5x (more motion per beat, like the
reference's fast ground-level camera); the intro window and the closing loop shot play at 1x.
"""
import math
import subprocess
from pathlib import Path

SRC = Path(r"C:/Users/jnyan/Downloads")
OUT = Path(r"j:/ai editor/projects/ailo-15s/naati/zoom")
OUT.mkdir(parents=True, exist_ok=True)

CUTS = [0.0, 1.30, 1.97, 2.57, 3.20, 3.83, 4.43, 5.03, 5.60, 6.27, 6.83, 7.43, 8.10, 8.70]
# slot: (file, source start, crop x for a 608x1080 window, or None for the native-vertical clip, speed)
SLOTS = [
    ("IMG_1564.MOV", 9.00, 656, 1.0),   # 0  intro window: the rooster
    ("IMG_1593.MOV", 2.50, 656, 1.5),   # 1  flock on fresh greens
    ("IMG_1562.MOV", 6.00, 500, 1.5),   # 2  speckled bird, close
    ("IMG_1570.MOV", 4.00, 656, 1.5),   # 3  chicks at the feeder
    ("IMG_1151.MOV", 6.00, 400, 1.5),   # 4  free-range shed, birds out front
    ("IMG_1564.MOV", 2.30, 760, 1.5),   # 5  rooster pecking (framing tested: whole bird in frame)
    ("IMG_1330.MP4", 3.00, None, 1.5),  # 6  hands-on: worker tending
    ("IMG_1561.MOV", 2.00, 656, 1.5),   # 7  rooster striding through the run (framing tested)
    ("IMG_1573.MOV", 3.60, 656, 1.5),   # 8  inside the shed
    ("IMG_1562.MOV", 14.0, 656, 1.5),   # 9  speckled bird walking
    ("IMG_1593.MOV", 4.00, 656, 1.5),   # 10 the flock again
    ("IMG_1570.MOV", 8.00, 656, 1.5),   # 11 chicks again
    ("IMG_1564.MOV", 8.39, 656, 1.0),   # 12 back to the rooster: runs into frame 0, so the reel loops
]

for i, (f, st, cx, sp) in enumerate(SLOTS):
    dur = (CUTS[i + 1] - CUTS[i]) * sp
    n = math.ceil(dur * 30) + 1
    vf = "scale=720:1280" if cx is None else f"crop=608:1080:{cx}:0,scale=720:1280"
    for old in OUT.glob(f"z{i:02d}_*.jpg"):
        old.unlink()
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{st}", "-i", str(SRC / f),
                    "-t", f"{dur + 0.1:.3f}", "-vf", f"fps=30,{vf}", "-frames:v", str(n), "-start_number", "0",
                    "-q:v", "3", str(OUT / f"z{i:02d}_%03d.jpg")], check=True)
    got = len(list(OUT.glob(f"z{i:02d}_*.jpg")))
    print(f"z{i:02d} {f}@{st} x={cx} {sp}x: {got} frames")
