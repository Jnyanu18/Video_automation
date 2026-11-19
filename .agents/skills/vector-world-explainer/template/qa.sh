#!/bin/bash
# QA receipts of the delivered master (from the quantum film's qa6.sh): streams, full decode, black
# frames, loudness/true peak, faststart, frame 0 (the cover), last second, last frame, contact sheet
# (fps 2), cuts sheet (fps 10 around every act cut), presenter-windows sheet (frame before / first 3 /
# mid / last 3 / frame after each window), Whisper on the CTA.
# usage: ./qa.sh <master.mp4> <qa-dir> [prefix]      e.g. ./qa.sh out/v1.mp4 ../qa v1
#   then: py -3.13 presenter/faceqa.py <master.mp4> <qa-dir>   (zoom-cut + lip-sync strips)
set -e; cd "$(dirname "$0")"; f=$1; q=${2:-../qa}; p=${3:-final}; mkdir -p "$q/$p"
. ./config.sh
o=$q/$p
ffprobe -v error -show_entries stream=codec_name,profile,width,height,pix_fmt,color_range,color_space,color_transfer,color_primaries,r_frame_rate,avg_frame_rate,sample_rate,channels,bit_rate,nb_frames:format=duration,size,bit_rate -of default=nw=1 "$f" | tee "$o/streams.txt"
ffmpeg -v error -i "$f" -f null - 2> "$o/decode-errors.txt"; echo "decode errors: $(wc -l < "$o/decode-errors.txt")"
ffmpeg -hide_banner -nostats -i "$f" -vf blackdetect=d=0.1:pix_th=0.06 -an -f null - 2>&1 | grep blackdetect | tee "$o/black.txt" || true
ffmpeg -hide_banner -nostats -i "$f" -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary/,$p' | tee "$o/loudness.txt"
"$PY" - "$f" <<'PY' | tee "$o/faststart.txt"
import sys
f = sys.argv[1]
head = open(f, "rb").read(1 << 16)
mo, md = head.find(b"moov"), head.find(b"mdat")
print("faststart (moov before mdat):", mo != -1 and (md == -1 or mo < md))
PY
ffmpeg -v error -y -i "$f" -vf "select=eq(n\,0)" -frames:v 1 "$q/$p-frame0.png"
ffmpeg -v error -y -sseof -1 -i "$f" -vf fps=5,scale=288:-1,tile=5x1 -frames:v 1 "$q/$p-last-second.png"
ffmpeg -v error -y -sseof -0.04 -i "$f" -frames:v 1 "$q/$p-last-frame.png"
rm -rf "$o/cs"; mkdir -p "$o/cs"; ffmpeg -v error -i "$f" -vf fps=2,scale=180:-1 "$o/cs/%04d.png"
node -e "const e=require('./out/events.json');console.log(Object.values(e.acts).slice(1).map(a=>a[0]).join(' '));console.error(JSON.stringify(e.avatar.map(w=>w.film)))" > "$o/cuts.txt" 2> "$o/wins.json"
rm -rf "$o/cuts"; mkdir -p "$o/cuts"
i=0; for c in $(cat "$o/cuts.txt"); do s=$("$PY" -c "print(max(0,$c-0.4))"); ffmpeg -v error -ss $s -t 0.8 -i "$f" -vf fps=10,scale=150:-1 "$o/cuts/c${i}_%02d.png"; i=$((i+1)); done
rm -rf "$o/av"; mkdir -p "$o/av"
"$PY" - "$f" "$q" "$o" "$p" <<'PY'
import sys, glob, json, subprocess, os
from PIL import Image, ImageDraw
f, q, o, p = sys.argv[1:5]
fs = sorted(glob.glob(o + "/cs/*.png")); cols = 16
w, h = Image.open(fs[0]).size; rows = (len(fs) + cols - 1) // cols
S = Image.new("RGB", (cols * w, rows * (h + 16)), (12, 12, 14)); D = ImageDraw.Draw(S)
for i, x in enumerate(fs):
    X, Y = (i % cols) * w, (i // cols) * (h + 16); S.paste(Image.open(x).convert("RGB"), (X, Y + 16)); D.text((X + 4, Y + 2), f"{i/2:.1f}s", fill=(220, 220, 220))
S.save(f"{q}/{p}-contact-sheet.jpg", quality=85)
cuts = open(o + "/cuts.txt").read().split()
rws = [sorted(glob.glob(f"{o}/cuts/c{i}_*.png")) for i in range(len(cuts))]
w, h = Image.open(rws[0][0]).size; cols = max(len(r) for r in rws)
S = Image.new("RGB", (cols * w + 70, len(rws) * h), (12, 12, 14)); D = ImageDraw.Draw(S)
for r, fl in enumerate(rws):
    D.text((4, r * h + 4), f"{float(cuts[r]):.2f}", fill=(230, 230, 230))
    for i, x in enumerate(fl): S.paste(Image.open(x).convert("RGB"), (70 + i * w, r * h))
S.save(f"{q}/{p}-cuts-sheet.png")
# presenter windows: master frames are 1440x2560 (scale 4/3); crop the lower-right region where he sits
wins = json.load(open(o + "/wins.json"))
def grab(n):
    x = f"{o}/av/f{n:05d}.png"
    if not os.path.exists(x):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f, "-vf", f"select=eq(n\\,{n})", "-frames:v", "1", x], check=True)
    return Image.open(x).convert("RGB")
cw, ch = 300, 560
cols = 9
S = Image.new("RGB", (cols * cw, max(1, len(wins)) * (ch + 24)), (14, 12, 20)); D = ImageDraw.Draw(S)
for r, (s, e) in enumerate(wins):
    a, z = round(s * 30), round(e * 30)
    fr = [max(0, a - 1), a, a + 1, a + 2, (a + z) // 2, z - 3, z - 2, z - 1, z]
    for c, n in enumerate(fr):
        im = grab(n); W, H = im.size
        S.paste(im.crop((int(W * 0.42), int(H * 0.42), W, H)).resize((cw, ch)), (c * cw, r * (ch + 24) + 24))
        D.text((c * cw + 6, r * (ch + 24) + 4), f"w{r+1} f{n} {n/30:.2f}s", fill=(235, 235, 235))
S.save(f"{q}/{p}-presenter-windows.png")
print("sheets ->", q)
PY
# Whisper on the CTA (last 6.5 s of the master's audio). Small/medium may hear a short "hit" as
# "head" (quantum v5/v6): compare with the raw take before calling it a defect.
ffmpeg -v error -y -sseof -6.5 -i "$f" -vn -ac 1 -ar 16000 "$o/cta.wav"
"$PY" -c "
from faster_whisper import WhisperModel
m=WhisperModel('small.en',device='cpu',compute_type='int8')
s,_=m.transcribe(r'$o/cta.wav',word_timestamps=True)
print('CTA whisper:', ' '.join(w.word.strip() for x in s for w in x.words))" 2>/dev/null | tee "$o/cta-whisper.txt"
echo "qa -> $q"
