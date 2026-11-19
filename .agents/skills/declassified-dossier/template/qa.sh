#!/bin/bash
# Technical QA of a rendered film: streams, full decode, black frames, loudness/true peak,
# contact sheet (fps=2), cuts sheet (fps=10 around every act boundary), frame 0 and last frames.
# usage: ./qa.sh out/<name>.mp4 <qa-dir>
set -e; cd "$(dirname "$0")"; f=$1; q=${2:-../qa}; mkdir -p "$q"
PY=${PY:-python}  # a real Python 3.13 with numpy/scipy/pillow (on Windows never the Microsoft Store "python3" alias)
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
echo "qa -> $q"
