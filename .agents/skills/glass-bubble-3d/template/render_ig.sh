#!/bin/bash
# Instagram-max delivery (Madhav 2026-10-15 default): render the 1080x1920 composition at --scale 1.3333 so
# graphics draw natively at 1440x2560, then ONE final x264 encode inside Instagram's API limits
# (<=25 Mbps VBR, <=300 MB, AAC <=128k 48 kHz, faststart): crf 14, maxrate = min(24M, 0.95*300MB*8/dur).
# Audio = finalize.sh chain (VO + bed, gentle 3:1, -14 LUFS, oversampled limiter).
# usage: ./render_ig.sh <comp> <name> <bed.wav>
set -e; cd "$(dirname "$0")"; comp=$1; n=$2; bed=$3
PY=${PY:-python}  # a real Python 3.13 with numpy/scipy/pillow (on Windows never the Microsoft Store "python3" alias)
npx tsc -p .
npx remotion render src/index.ts $comp out/$n.hq.mp4 --scale=1.3333333333333333 --codec h264 --crf 8 --pixel-format yuv420p --color-space=bt709 --gl=angle --concurrency=${CONCURRENCY:-6} --muted --log=error
ffmpeg -v error -y -i public/vo.wav -i "$bed" -filter_complex "[0][1]amix=inputs=2:normalize=0:duration=longest,acompressor=threshold=-24dB:ratio=3:attack=12:release=180:knee=6:makeup=1" -ar 48000 -c:a pcm_f32le out/_mix.wav
I=$(ffmpeg -hide_banner -nostats -i out/_mix.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
g=$("$PY" -c "print(round(-13.3 - ($I), 2))")
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 out/$n.hq.mp4)
mr=$("$PY" -c "print(min(24.0, round(0.95*300*8/$d - 0.3, 1)))")
echo "mix I=$I gain=$g dur=$d maxrate=${mr}M"
ffmpeg -v error -y -i out/$n.hq.mp4 -i out/_mix.wav -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset slow -profile:v high -crf 14 -maxrate ${mr}M -bufsize $("$PY" -c "print(2*$mr)")M -g 60 -keyint_min 60 -sc_threshold 0 -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv -r 30 \
  -af "volume=${g}dB,aresample=192000,alimiter=limit=0.79:attack=1:release=60:level=false,aresample=48000" -c:a aac -b:a 128k -ar 48000 \
  -shortest -movflags +faststart out/$n.mp4
rm -f out/_mix.wav out/$n.hq.mp4
ffmpeg -hide_banner -nostats -i out/$n.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):"
ffprobe -v error -show_entries format=size,bit_rate -of default=nw=1 out/$n.mp4
