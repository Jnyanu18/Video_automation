#!/bin/bash
# Cut-out of any 1440x2560 clip (his proxy, or a HeyGen twin render scaled/padded to 1440x2560):
# 720 copy -> u2net human matte on CPU (hyperframes remove-background) -> colour from the 1440 source + the 720 alpha
# upscaled, re-encoded as VP9 alpha with a keyframe every 15 frames.
# WHY -g 15: Remotion's OffthreadVideo throws "No frame found at position ..." when it seeks deep into a long
# single-segment VP9-alpha WebM with sparse keyframes (it hit every 35-94 s clip). -g 15 -keyint_min 15 fixes it.
# usage: scripts/matte.sh <in-1440.mp4> <out-1440.webm> [workdir]
set -e; IN=$1; OUT=$2; WK=${3:-$(dirname "$OUT")/_matte}; mkdir -p "$WK" "$(dirname "$OUT")"
n=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$IN" | tr -d '\r')
[ -f "$WK/c720.mp4" ] || ffmpeg -v error -y -i "$IN" -vf scale=720:1280:flags=lanczos -c:v libx264 -crf 12 -preset fast -an "$WK/c720.mp4"
# u2net_human_seg, local CPU (~0.7 fps at 720; weights ~168 MB download once).
[ -f "$WK/m720.webm" ] || npx --yes hyperframes remove-background "$WK/c720.mp4" -o "$WK/m720.webm" --device cpu --quality best > "$WK/matte.log" 2>&1
ffmpeg -v error -y -i "$IN" -c:v libvpx-vp9 -i "$WK/m720.webm" -filter_complex \
  "[1:v]alphaextract,scale=1440:2560:flags=bicubic[a];[0:v][a]alphamerge,format=yuva420p" -frames:v $n -an \
  -c:v libvpx-vp9 -pix_fmt yuva420p -crf 20 -b:v 0 -g 15 -keyint_min 15 -deadline good -cpu-used 5 -row-mt 1 -auto-alt-ref 0 "$OUT"
m=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$OUT" | tr -d '\r')
[ "$m" = "$n" ] || { echo "FRAME COUNT MISMATCH: source $n, matte $m"; exit 1; }
echo "matte done: $OUT ($n frames)"
