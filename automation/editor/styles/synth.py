"""Synthetic test media built with ffmpeg + the stdlib (no fixtures on disk, no network)."""
from __future__ import annotations

import math
import os
import struct
import subprocess
import wave
from typing import List, Optional, Sequence, Tuple

SR = 16000
COLORS = ["0x101030", "0xe0e0a0", "0x30c030", "0x802020"]  # high luma contrast so scene detection fires


def write_wav(path: str, pattern: Sequence[Tuple[str, float, float]]) -> None:
    """pattern items: ('tone'|'silence', seconds, amplitude 0..1). 'tone' is a 220 Hz carrier with a
    5 Hz amplitude wobble so it behaves like speech for RMS purposes."""
    frames = bytearray()
    t0 = 0
    for kind, dur, amp in pattern:
        n = int(dur * SR)
        for i in range(n):
            if kind == "tone":
                t = (t0 + i) / SR
                v = amp * (0.75 + 0.25 * math.sin(2 * math.pi * 5 * t)) * math.sin(2 * math.pi * 220 * t)
            else:
                v = 0.0
            frames += struct.pack("<h", int(v * 32767))
        t0 += n
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(frames))


def make_video(path: str, audio_pattern: Optional[Sequence[Tuple[str, float, float]]],
               scenes: Sequence[float], size=(320, 240), fps=15, text: Optional[str] = None,
               text_y: str = "h-th-20") -> str:
    """Video of flat colour scenes (hard cuts between them) + optional audio + optional burned-in text."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    w, h = size
    cmd = ["ffmpeg", "-y", "-v", "error"]
    for i, d in enumerate(scenes):
        cmd += ["-f", "lavfi", "-t", str(d), "-i", f"color=c={COLORS[i % len(COLORS)]}:s={w}x{h}:r={fps}"]
    wav = None
    if audio_pattern:
        wav = path + ".wav"
        write_wav(wav, audio_pattern)
        cmd += ["-i", wav]
    n = len(scenes)
    fc = "".join(f"[{i}:v]" for i in range(n)) + f"concat=n={n}:v=1:a=0[v0]"
    last = "v0"
    if text:
        # Windows ffmpeg has no fontconfig: drawtext crashes unless given a font file (colons escaped for the filtergraph).
        font = r"fontfile='C\:/Windows/Fonts/arial.ttf':" if os.name == "nt" else ""
        fc += (f";[v0]drawtext={font}text='{text}':fontcolor=white:fontsize={h // 10}:borderw=3:bordercolor=black:"
               f"x=(w-text_w)/2:y={text_y}[v1]")
        last = "v1"
    cmd += ["-filter_complex", fc, "-map", f"[{last}]"]
    if wav:
        cmd += ["-map", f"{n}:a", "-c:a", "aac", "-shortest"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "ultrafast", path]
    subprocess.run(cmd, check=True)
    if wav:
        os.remove(wav)
    return path


# canonical clip: speech 0-2, silence 2-3, speech 3-5, silence 5-5.5, speech 5.5-7  (7.0 s)
STD_AUDIO = [("tone", 2.0, 0.3), ("silence", 1.0, 0), ("tone", 2.0, 0.3), ("silence", 0.5, 0), ("tone", 1.5, 0.3)]
STD_SCENES = [2.5, 2.5, 2.0]


def make_std_video(path: str, **kw) -> str:
    return make_video(path, kw.pop("audio", STD_AUDIO), kw.pop("scenes", STD_SCENES), **kw)


def std_words() -> List[dict]:
    """Words of 0.4 s with 0.0 gaps inside each speech span of STD_AUDIO."""
    words = []
    for a, b in [(0.0, 2.0), (3.0, 5.0), (5.5, 7.0)]:
        t = a
        while t + 0.4 <= b + 1e-9:
            words.append({"word": f"w{len(words)}", "start": round(t, 3), "end": round(t + 0.4, 3)})
            t += 0.4
    return words


def std_plan(path: str, keep: List[Tuple[float, float]], captions=None) -> dict:
    return {
        "version": 1,
        "source": {"path": path, "duration": 7.0, "width": 320, "height": 240, "fps": 15},
        "output": {"width": 320, "height": 240, "fps": 15},
        "keep": [{"id": f"k{i + 1}", "start": a, "end": b} for i, (a, b) in enumerate(keep)],
        "captions": captions or [], "reframe": {"mode": "none", "track": []}, "overlays": [],
        "style_ref": None, "notes": "",
    }
