"""The sound for agency-we-got-you v3 (2026-11-07): the reference's two hits a swing, panned with the badge.

    python videos/agency-we-got-you/sound.py

A tick where each swing turns (panned to that side), and a swish as the string slices the text, sweeping from the side the
badge leaves to the side it swings to. Sounds from videos/_sfx/cc0 (CC0), each placed so its loudest moment lands on its
time. Reads out/picture.mp4, writes out/we-got-you-9x16.mp4 at about -14 LUFS, true peak under -1.5 dBTP. No music
(Vishnu picked effects only). The 12 s loop is kept: no fade at either end.
"""
import json
import math
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SFX = ROOT / "videos" / "_sfx" / "cc0"
OUT = Path(__file__).resolve().parent / "out"
HALF, SWINGS, REACH = 1.2, 10, 0.75     # pan reach: the badge travels to about 0.11 and 0.88 of the width

peaks = json.loads((SFX / "peaks.json").read_text(encoding="utf-8"))


def dur(p: Path) -> float:
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                                capture_output=True, text=True, check=True).stdout)


hits = []
for k in range(SWINGS):
    side = REACH if k % 2 == 0 else -REACH          # even k: the swing starts at the right
    hits.append({"t": HALF * k, "sound": "tick", "gain": 0.55, "from": side, "to": side})
    hits.append({"t": HALF * k, "sound": "thud", "gain": 0.3, "from": side * 0.5, "to": side * 0.5})  # body under the turn
    hits.append({"t": HALF * k + HALF / 2, "sound": "whoosh", "gain": 0.45, "from": side, "to": -side})

inputs, chains = ["-i", str(OUT / "picture.mp4")], []
for n, h in enumerate(hits, 1):
    f = SFX / f"{h['sound']}.wav"
    inputs += ["-i", str(f)]
    d = max(0.05, dur(f))
    start = max(0.0, h["t"] - peaks[h["sound"]])
    ms = int(round(start * 1000))
    a, b = h["from"], h["to"]
    p = f"({a}+({b}-({a}))*min(t/{d:.3f},1))"       # pan from -1 (left) to 1 (right) over the sound
    gl, gr = f"cos(({p}+1)*PI/4)", f"sin(({p}+1)*PI/4)"
    chains.append(
        f"[{n}:a]aresample=44100,aformat=channel_layouts=mono,volume={h['gain']},asplit=2[l{n}][r{n}];"
        f"[l{n}]volume='{gl}':eval=frame[L{n}];[r{n}]volume='{gr}':eval=frame[R{n}];"
        f"[L{n}][R{n}]join=inputs=2:channel_layout=stereo,adelay={ms}|{ms}[s{n}]")
mix = "".join(f"[s{n}]" for n in range(1, len(hits) + 1))
graph = ";".join(chains) + (
    f";{mix}amix=inputs={len(hits)}:duration=longest:normalize=0,highpass=f=35,"
    "equalizer=f=3000:t=q:w=1:g=4,loudnorm=I=-15:TP=-1.5:LRA=11,aresample=44100,volume=3dB,"
    "alimiter=limit=0.89:level=disabled,apad=whole_dur=12,atrim=0:12[a]")
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *inputs, "-filter_complex", graph, "-map", "0:v", "-map", "[a]",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", "12", str(OUT / "we-got-you-9x16.mp4")], check=True)
print(f"{OUT / 'we-got-you-9x16.mp4'}: {len(hits)} sounds, panned with the swing")
