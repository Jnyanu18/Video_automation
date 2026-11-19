#!/bin/bash
# Full render of one film + two-pass loudness-normalize (-14 LUFS, <= -1.5 dBTP), faststart MP4.
# usage: [CONCURRENCY=n] ./render.sh FilmPaper <name>   (set TEMP/TMP to a roomier disk when the system disk is low)
set -e; cd "$(dirname "$0")"; comp=$1; n=$2
PY=${PY:-python}
npx tsc -p .
npx remotion render src/index.ts $comp out/$n.raw.mp4 --codec h264 --crf 16 --pixel-format yuv420p --color-space=bt709 --gl=angle --concurrency=${CONCURRENCY:-6} --log=error
m=$(ffmpeg -hide_banner -nostats -i out/$n.raw.mp4 -af loudnorm=I=-14:TP=-2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
v() { printf '%s' "$m" | "$PY" -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
ffmpeg -y -v error -i out/$n.raw.mp4 -c:v copy -af "loudnorm=I=-14:TP=-2:LRA=11:measured_I=$(v input_i):measured_TP=$(v input_tp):measured_LRA=$(v input_lra):measured_thresh=$(v input_thresh):offset=$(v target_offset):linear=true,aresample=192000,alimiter=limit=0.75:attack=1:release=50:level=false,aresample=48000" -ar 48000 -c:a aac -b:a 192k -movflags +faststart out/$n.mp4 && rm out/$n.raw.mp4
echo out/$n.mp4
