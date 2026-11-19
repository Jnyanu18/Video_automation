#!/bin/bash
# Instagram delivery + QA for the PHP2Shell board reel (1440x2560, 30 fps).
# maxrate = min(24M, 0.95 x 300 MB x 8 / duration) so the file stays under the 300 MB API cap; AAC 128k (API max).
set -e; cd "$(dirname "$0")/.."; PY=${PY:-python}
BOARD=${BOARD:-out/ig_board_only.mp4}; COMP=${COMP:-out/ig_composited.mp4}
OUT=${OUT:-board-ig-1440x2560.mp4}; Q=qa/final_ig; mkdir -p $Q
$PY scripts/composite_faces_ig.py $BOARD $COMP
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $COMP)
MR=$($PY -c "print(min(24.0, round(0.95*300*8/$DUR, 1)))")
m=$(ffmpeg -hide_banner -nostats -i $COMP -af loudnorm=I=-14:TP=-2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
v() { printf '%s' "$m" | $PY -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
ffmpeg -y -v error -i $COMP -c:v libx264 -profile:v high -preset slow -crf 14 -maxrate ${MR}M -bufsize $(awk "BEGIN{print $MR*2}")M -g 60 -pix_fmt yuv420p -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -r 30 \
  -af "loudnorm=I=-14:TP=-2:LRA=11:measured_I=$(v input_i):measured_TP=$(v input_tp):measured_LRA=$(v input_lra):measured_thresh=$(v input_thresh):offset=$(v target_offset):linear=true,aresample=192000,alimiter=limit=0.75:attack=1:release=50:level=false,aresample=48000" \
  -ar 48000 -c:a aac -b:a 128k -movflags +faststart $OUT
echo "== $OUT (maxrate ${MR}M)"; ffprobe -v error -show_entries stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,bit_rate:format=duration,bit_rate,size -of compact $OUT
echo "-- decode errors:"; ffmpeg -v error -i $OUT -f null - 2>&1 | head -3; echo "(end)"
echo "-- full-black runs >=0.5s:"; ffmpeg -hide_banner -nostats -i $OUT -vf blackdetect=d=0.5:pix_th=0.02:pic_th=0.999 -an -f null - 2>&1 | grep black_start || echo none
echo "-- loudness:"; ffmpeg -hide_banner -nostats -i $OUT -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|LRA:|Peak:" | tail -3
ffmpeg -hide_banner -loglevel error -i $OUT -vf "fps=1/4,scale=200:-1,tile=11x5:padding=4" -frames:v 1 -y $Q/contact.png
ffmpeg -hide_banner -loglevel error -i $OUT -frames:v 1 -y $Q/frame0-cover.png
