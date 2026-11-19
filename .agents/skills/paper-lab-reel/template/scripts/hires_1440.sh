#!/bin/bash
# Instagram-max footage (deliver 1440x2560): a 1440x2560 working copy from the RAW
# (1512x2688 HEVC 10-bit BT.709 SDR, downscale only) + SIDE cut-outs at 1440: colour from the 1440 copy,
# alpha = the existing 720 u2net matte upscaled (same frames: same -ss start and frame count as matte_ranges.sh).
set -e; cd "$(dirname "$0")/.."
RAW="../reel-2026-08-17-heavy-vfx-explainer/source/DJI_20260817160133_0589_D.MP4"
P=film/public/proxy-1440.mp4
[ -f $P ] || ffmpeg -v error -y -i "$RAW" -map 0:v:0 -an -vf "scale=1440:2560:flags=lanczos,format=yuv420p" -c:v libx264 -crf 12 -preset medium -g 30 -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv $P
py -3.13 - <<'EOF' > /tmp/mattes.txt
import json, sys
for i, m in enumerate(json.load(open("analysis/mattes.json"))): sys.stdout.buffer.write(f"{i} {m['srcStart']} {m['frames']}\n".encode())  # no CR: bash read would keep it
EOF
while read i s0 n; do
  (
    ffmpeg -v error -y -ss $s0 -i $P -frames:v $n -an -c:v libx264 -crf 12 -preset fast -g 30 film/public/matte/c$i-1440.mp4
    ffmpeg -v error -y -i film/public/matte/c$i-1440.mp4 -c:v libvpx-vp9 -i film/public/matte/m$i.webm -filter_complex \
      "[1:v]alphaextract,scale=1440:2560:flags=bicubic[a];[0:v][a]alphamerge,format=yuva420p" -frames:v $n -an \
      -c:v libvpx-vp9 -pix_fmt yuva420p -crf 20 -b:v 0 -deadline good -cpu-used 5 -row-mt 1 -auto-alt-ref 0 film/public/matte/m$i-1440.webm
    echo "m$i done $(date +%T)"
  ) &
done < /tmp/mattes.txt
wait
