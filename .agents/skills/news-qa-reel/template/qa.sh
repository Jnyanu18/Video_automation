#!/bin/bash
# Technical QA of a rendered film: streams, full decode, black frames, loudness/true peak, delivery gates (gates.txt),
# contact sheet (fps=2), cuts sheet (fps=10 around every act boundary), frame 0 and last frames.
# usage: ./qa.sh out/<name>.mp4 <qa-dir>
set -e; cd "$(dirname "$0")"; f=$1; q=${2:-../qa}; mkdir -p "$q"
PY=${PY:-python}  # real Python 3 with numpy + Pillow (on Windows not the Store "python3" alias)
ffprobe -v error -show_entries stream=codec_name,profile,width,height,pix_fmt,color_range,r_frame_rate,avg_frame_rate,sample_rate,channels,nb_frames:format=duration -of default=nw=1 "$f" | tee "$q/streams.txt"
ffmpeg -v error -i "$f" -f null - 2> "$q/decode-errors.txt"; echo "decode errors: $(wc -l < "$q/decode-errors.txt")"
ffmpeg -hide_banner -nostats -i "$f" -vf blackdetect=d=0.1:pix_th=0.06 -an -f null - 2>&1 | grep blackdetect | tee "$q/black.txt" || true
ffmpeg -hide_banner -nostats -i "$f" -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary/,$p' | tee "$q/loudness.txt"
ffmpeg -v error -y -i "$f" -vf "select=eq(n\,0)" -frames:v 1 "$q/frame0.png"
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
ffmpeg -v error -y -sseof -1 -i "$f" -vf fps=5,scale=270:-1,tile=5x1 -frames:v 1 "$q/last-second.png"
rm -rf "$q/cs"; mkdir -p "$q/cs"; ffmpeg -v error -i "$f" -vf fps=2,scale=180:-1 "$q/cs/%04d.png"
"$PY" - "$q" <<'PY'
import sys, glob
from PIL import Image, ImageDraw
q = sys.argv[1]; fs = sorted(glob.glob(q + "/cs/*.png")); cols = 14
w, h = Image.open(fs[0]).size; rows = (len(fs) + cols - 1) // cols
S = Image.new("RGB", (cols * w, rows * (h + 16)), (12, 12, 14)); D = ImageDraw.Draw(S)
for i, p in enumerate(fs):
    x, y = (i % cols) * w, (i // cols) * (h + 16); S.paste(Image.open(p).convert("RGB"), (x, y + 16)); D.text((x + 4, y + 2), f"{i/2:.1f}s", fill=(220, 220, 220))
S.save(q + "/contact-sheet.jpg", quality=85)
PY
"$PY" -c "import json;print(' '.join(str(b['s']) for b in json.load(open('out/beats.json'))['beats'][1:]))" > "$q/cuts.txt"
rm -rf "$q/cuts"; mkdir -p "$q/cuts"
i=0; for c in $(cat "$q/cuts.txt"); do s=$("$PY" -c "print(max(0,$c-0.4))"); ffmpeg -v error -ss $s -t 0.8 -i "$f" -vf fps=10,scale=150:-1 "$q/cuts/c${i}_%02d.png"; i=$((i+1)); done
"$PY" - "$q" <<'PY'
import sys, glob, os
from PIL import Image, ImageDraw
q = sys.argv[1]; cuts = open(q + "/cuts.txt").read().split()
rows = [sorted(glob.glob(f"{q}/cuts/c{i}_*.png")) for i in range(len(cuts))]
w, h = Image.open(rows[0][0]).size; cols = max(len(r) for r in rows)
S = Image.new("RGB", (cols * w + 70, len(rows) * h), (12, 12, 14)); D = ImageDraw.Draw(S)
for r, fs in enumerate(rows):
    D.text((4, r * h + 4), f"{float(cuts[r]):.2f}", fill=(230, 230, 230))
    for i, p in enumerate(fs): S.paste(Image.open(p).convert("RGB"), (70 + i * w, r * h))
S.save(q + "/cuts-sheet.png")
PY

# ---- delivery gates (each prints PASS/FAIL; any FAIL blocks delivery) ----
"$PY" - "$f" "$q" <<'PY'
import json, os, re, subprocess, sys
f, q = sys.argv[1], sys.argv[2]
pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", f], capture_output=True, text=True).stdout)
v = next(s for s in pr["streams"] if s["codec_type"] == "video"); a = next((s for s in pr["streams"] if s["codec_type"] == "audio"), None)
size = int(pr["format"]["size"]); dur = float(pr["format"]["duration"]); br = int(pr["format"]["bit_rate"])
head = open(f, "rb").read(4_000_000); fast = 0 <= head.find(b"moov") < (head.find(b"mdat") if b"mdat" in head else 1 << 60)
loud = open(q + "/loudness.txt").read()
I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", loud).group(1)); TP = float(re.search(r"Peak:\s+(-?[\d.inf]+) dBFS", loud).group(1))
dec = os.path.getsize(q + "/decode-errors.txt") == 0
black = os.path.getsize(q + "/black.txt") == 0 if os.path.exists(q + "/black.txt") else True
G = [
    ("1440x2560", v["width"] == 1440 and v["height"] == 2560, f'{v["width"]}x{v["height"]}'),
    ("H.264 yuv420p tv", v["codec_name"] == "h264" and v["pix_fmt"] == "yuv420p" and v.get("color_range", "tv") == "tv", f'{v["codec_name"]} {v["pix_fmt"]} {v.get("color_range")}'),
    ("CFR 30/1", v["r_frame_rate"] == "30/1" and v["avg_frame_rate"] == "30/1", f'{v["r_frame_rate"]} / {v["avg_frame_rate"]}'),
    ("AAC 48 kHz", a is not None and a["codec_name"] == "aac" and a["sample_rate"] == "48000", a and f'{a["codec_name"]} {a["sample_rate"]}'),
    ("full decode, 0 errors", dec, ""),
    ("no black frames", black, ""),
    ("loudness -15..-13 LUFS", -15.0 <= I <= -13.0, f"{I} LUFS"),
    ("true peak <= -1 dBTP", TP <= -1.0, f"{TP} dBTP (fix: ./fix_tp.sh)"),
    ("faststart (moov before mdat)", fast, ""),
    ("<= 300 MB", size <= 300 * 1024 * 1024, f"{size / 1e6:.1f} MB"),
    ("<= 25 Mbps", br <= 25_000_000, f"{br / 1e6:.1f} Mbps"),
]
lines = [f'{"PASS" if ok else "FAIL"}  {name}  {info}' for name, ok, info in G] + [f"duration {dur:.2f} s"]
open(q + "/gates.txt", "w").write("\n".join(lines) + "\n"); print("\n".join(lines))
sys.exit(0 if all(ok for _, ok, _ in G) else 1)
PY
echo "qa -> $q (look at contact-sheet.jpg, cuts-sheet.png, frame0.png and last-second.png yourself)"
