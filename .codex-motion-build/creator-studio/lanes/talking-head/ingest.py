"""Talking head, step 2, the raw footage: python lanes/talking-head/ingest.py <slug> [--force]

Takes every video in raw/ in the order of their numbers (01-, 02-, ...), makes each one vertical 1080x1920 at a steady 30 fps, joins them
into work/source.mp4, pulls the sound out for transcription, and writes ingest.md: each take's length,
shape, frame rate, loudness and opening words, with a warning for anything that will look or sound wrong.

The hard rule (2026-10-22): takes are never joined in file-name order. Phone names say nothing about the
script, and a CTA take once landed first. Every take must start with its number in speaking order; until
they do, this stops and lists what each take opens with, so they can be numbered from what is said.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "kit"))  # common.py, captions.py
from common import whisper_model, require, video_dir

EXTS = {".mp4", ".mov", ".mkv", ".webm", ".m4v"}


def probe(p):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(p)],
                         capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), None)
    has_audio = any(s["codec_type"] == "audio" for s in j["streams"])
    if not v:
        return None
    rot = 0
    for sd in v.get("side_data_list", []):
        if "rotation" in sd:
            rot = int(sd["rotation"])
    rot = rot or int(v.get("tags", {}).get("rotate", 0) or 0)
    w, h = v["width"], v["height"]
    if abs(rot) % 180 == 90:
        w, h = h, w
    num, _, den = v.get("r_frame_rate", "30/1").partition("/")
    fps = float(num) / float(den or 1)
    return {"w": w, "h": h, "fps": fps, "dur": float(j["format"]["duration"]), "audio": has_audio}


def loudness(p):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(p), "-vn", "-af", "volumedetect", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    mean = re.search(r"mean_volume: (-?[\d.]+) dB", err)
    peak = re.search(r"max_volume: (-?[\d.]+) dB", err)
    return (float(mean.group(1)) if mean else None, float(peak.group(1)) if peak else None)


_model = None


def opening(p, words=14):
    """The first words said in a take (Whisper base, the first 20 seconds)."""
    global _model
    import whisper
    _model = _model or whisper_model("base")
    wav = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-t", "20", "-i", str(p), "-vn", "-ac", "1",
                          "-ar", "16000", "-f", "s16le", "-"], capture_output=True, check=True).stdout
    import numpy as np
    audio = np.frombuffer(wav, np.int16).astype(np.float32) / 32768
    text = _model.transcribe(audio, language="en", fp16=False)["text"].split()
    return " ".join(text[:words]) + (" ..." if len(text) > words else "")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    require(a.slug, "1 Script", a.force)
    d = video_dir(a.slug)
    takes = sorted(p for p in (d / "raw").iterdir() if p.suffix.lower() in EXTS)
    if not takes:
        raise SystemExit(f"No videos in videos/{a.slug}/raw/. Drop the phone takes there first.")
    unnumbered = [p for p in takes if not re.match(r"\d+[-_ .]", p.name)]
    if unnumbered:
        lines = [f"  {p.name}: \"{opening(p)}\"" for p in takes]
        raise SystemExit("Not joining: takes are joined only in numbered order (01-, 02-, ...), never by file name.\n"
                         "What each take opens with:\n" + "\n".join(lines) + "\n"
                         "Rename them with their number in the script's order, then run this again.")
    work = d / "work"
    (work / "takes").mkdir(parents=True, exist_ok=True)

    rows, warns, parts, offset = [], [], [], 0.0
    for i, p in enumerate(takes, 1):
        info = probe(p)
        if not info:
            warns.append(f"{p.name}: no video stream, skipped.")
            continue
        if not info["audio"]:
            warns.append(f"{p.name}: no sound track.")
        mean, peak = loudness(p) if info["audio"] else (None, None)
        if info["w"] > info["h"]:
            warns.append(f"{p.name}: landscape ({info['w']}x{info['h']}). The middle will be cropped to vertical.")
        if info["h"] < 1080 and info["w"] < 1080:
            warns.append(f"{p.name}: low resolution ({info['w']}x{info['h']}); it will look soft.")
        if mean is not None and mean < -32:
            warns.append(f"{p.name}: quiet ({mean} dB average). Record closer to the mic if you can.")
        if peak is not None and peak > -0.5:
            warns.append(f"{p.name}: the sound clips (peak {peak} dB). Re-record that take a little further away.")
        out = work / "takes" / f"{i:02d}.mp4"
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(p),
                        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1",
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
                        "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "192k", str(out)], check=True)
        parts.append(out)
        rows.append(f"| {p.name} | {offset:7.2f}s | {info['dur']:6.2f}s | {info['w']}x{info['h']} | "
                    f"{info['fps']:.2f} | {'-' if mean is None else f'{mean} dB'} | "
                    f"{'-' if peak is None else f'{peak} dB'} | {opening(p) if info['audio'] else '-'} |")
        offset += probe(out)["dur"]

    listing = work / "takes.txt"
    listing.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf-8")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
                    "-i", str(listing), "-c", "copy", str(work / "source.mp4")], check=True)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(work / "source.mp4"),
                    "-vn", "-ac", "1", "-ar", "16000", str(work / "source.wav")], check=True)

    lines = [f"# Ingest: {a.slug}", "", f"{len(parts)} takes joined into work/source.mp4, {offset:.1f}s in all.", "",
             "| Take | Starts at | Length | Shape | fps | Average sound | Peak | Opens with |",
             "| --- | --- | --- | --- | --- | --- | --- | --- |", *rows, "",
             "Check the order against the script: each take's opening words must follow the one above it.", ""]
    lines += ["## Warnings", "", *(f"- {w}" for w in warns)] if warns else ["No warnings."]
    (d / "ingest.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote work/source.mp4 ({offset:.1f}s from {len(parts)} takes) and ingest.md ({len(warns)} warnings). "
          "Check ingest.md, tick '2 Raw', then: python lanes/talking-head/words.py " + a.slug)


if __name__ == "__main__":
    main()
