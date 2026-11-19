#!/bin/bash
# True-peak gate for a finished delivery MP4. If TP > -1.0 dBTP: re-encode ONLY the audio with a 4x-oversampled
# limiter at -3 dBFS (AAC adds up to ~1 dB of overshoot) and a gain back to the measured loudness (video stream copied bit for bit), keep faststart.
# usage: ./fix_tp.sh out/<name>.mp4
set -e; f=$1; PY=${PY:-python}
read I TP < <(ffmpeg -hide_banner -nostats -i "$f" -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary/,$p' | awk '/ I:/{i=$2} /Peak:/{p=$2} END{print i, p}')
echo "loudness I=$I LUFS, true peak $TP dBTP"
if "$PY" -c "import sys; sys.exit(0 if float('$TP') <= -1.0 else 1)"; then echo "true peak OK"; exit 0; fi
echo "true peak above -1 dBTP: audio-only limiter remux"
tmp="${f%.mp4}.tpfix.mp4"
ffmpeg -v error -y -i "$f" -map 0:v:0 -map 0:a:0 -c:v copy \
  -af "aresample=192000,alimiter=limit=0.708:attack=1:release=80:level=false,aresample=48000" \
  -c:a aac -b:a 128k -ar 48000 -movflags +faststart "$tmp"
read I2 TP2 < <(ffmpeg -hide_banner -nostats -i "$tmp" -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary/,$p' | awk '/ I:/{i=$2} /Peak:/{p=$2} END{print i, p}')
echo "after: I=$I2 LUFS, true peak $TP2 dBTP"
"$PY" -c "import sys; sys.exit(0 if float('$TP2') <= -1.0 else 1)" || { echo "STILL ABOVE -1 dBTP: lower the mix gain in render_ig.sh and re-run"; rm -f "$tmp"; exit 1; }
mv "$tmp" "$f"; echo "fixed: $f"
