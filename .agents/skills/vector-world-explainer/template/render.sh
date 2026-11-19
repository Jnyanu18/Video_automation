#!/bin/bash
# Full render + two-pass loudness-normalize to -14 LUFS / <= -1 dBTP (Instagram), faststart MP4.
# QUICK 1080x1920 REVIEW COPY only (the delivery master is render_ig.sh at 1440x2560).
# usage: [CONCURRENCY=n] ./render.sh <name>      (Windows: Python via $PY from config.sh, never python3)
# Keeps --color-space=bt709 (without it Remotion wrote full-range yuvj420p BT.601) and +faststart.
set -e; cd "$(dirname "$0")"; n=${1:-reel}
. ./config.sh
R=${RENDER_TMP:-$HEAVY} # the pre-loudnorm render goes to the temp drive (C: once filled up mid-render)
npx tsc -p .
npx remotion render src/index.ts Film $R/$n.raw.mp4 --codec h264 --crf 16 --pixel-format yuv420p --color-space=bt709 --concurrency=${CONCURRENCY:-6} --timeout=180000 --log=error 2> out/$n.render.log
# Pass 1 measures; pass 2 applies one linear gain (no pumping); an oversampled limiter catches peaks.
m=$(ffmpeg -hide_banner -nostats -i $R/$n.raw.mp4 -af loudnorm=I=-14:TP=-2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
v() { printf '%s' "$m" | "$PY" -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
ffmpeg -y -v error -i $R/$n.raw.mp4 -c:v copy -af "loudnorm=I=-14:TP=-2:LRA=11:measured_I=$(v input_i):measured_TP=$(v input_tp):measured_LRA=$(v input_lra):measured_thresh=$(v input_thresh):offset=$(v target_offset):linear=true,aresample=192000,alimiter=limit=0.75:attack=1:release=50:level=false,aresample=48000" -ar 48000 -c:a aac -b:a 192k -movflags +faststart out/$n.mp4 && rm $R/$n.raw.mp4
echo out/$n.mp4
