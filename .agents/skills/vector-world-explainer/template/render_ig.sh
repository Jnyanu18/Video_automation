#!/bin/bash
# Instagram-max delivery render (house rule: render straight to IG max quality; that file
# IS the master). From the quantum film (render5.sh, v5/v6).
#  1. Remotion renders the 1080x1920 comp at --scale=1.3333333333333333 = 1440x2560 (graphics drawn
#     natively at 1440; fewer digits give 2559.99 px and Remotion refuses) to a ProRes 422 HQ
#     intermediate in $HEAVY (a roomy disk) (Remotion temp too; the system disk once filled up and killed renders).
#  2. Audio: the rendered mix (vo.wav + bed.wav as Remotion sums them) -> two-pass linear loudnorm to
#     -14 LUFS, then an oversampled limiter (true peak about -1.5 to -2 dBTP).
#  3. Final: H.264 High, CFR 30, yuv420p LIMITED range, BT.709 tags, crf 14, GOP 60, AAC 128k 48 kHz
#     stereo, +faststart. VBV maxrate = min(24M, 0.95 x 300 MB x 8 / duration), bufsize = 2 x maxrate,
#     so the file stays <= 300 MB (Instagram API cap): 24M up to ~95 s; 115 s -> ~19.8M (v5 used 20M
#     after a 24M encode came out at 349.7 MB); 100.5 s -> ~22.7M. crf 14 is kept; only peaks are capped.
# usage: [ENCODE_ONLY=1] [MAXRATE=22M] [CONCURRENCY=8] ./render_ig.sh <name> [frames e.g. 0-3455]
set -e; cd "$(dirname "$0")"; n=${1:-film}
. ./config.sh
R="$HEAVY"
npx tsc -p .
df -h          | tail -2   # need ~10+ GB free on the temp drive; never let C: run low
fr=${2:+--frames=$2}
[ -n "$ENCODE_ONLY" ] || npx remotion render src/index.ts Film "$R/$n.raw.mov" --codec prores --prores-profile hq --scale=1.3333333333333333 --color-space=bt709 --concurrency=${CONCURRENCY:-8} --timeout=240000 $fr --log=error 2> out/$n.render.log
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$R/$n.raw.mov")
if [ -z "$MAXRATE" ]; then
  MAXRATE=$("$PY" -c "d=float('$dur'); print(f'{min(24.0, 0.95*300*8/d):.1f}M')")
fi
BUFSIZE=${BUFSIZE:-$("$PY" -c "print('%.1fM' % (2*float('${MAXRATE%M}')))")}
echo "duration $dur s -> maxrate $MAXRATE bufsize $BUFSIZE"
m=$(ffmpeg -hide_banner -nostats -i "$R/$n.raw.mov" -vn -af loudnorm=I=-14:TP=-2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
v() { printf '%s' "$m" | "$PY" -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
ffmpeg -y -v error -i "$R/$n.raw.mov" \
  -c:v libx264 -profile:v high -preset slow -crf 14 -maxrate $MAXRATE -bufsize $BUFSIZE -g 60 -keyint_min 30 -sc_threshold 0 \
  -r 30 -fps_mode cfr -pix_fmt yuv420p -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -vf "scale=out_range=tv:out_color_matrix=bt709,format=yuv420p" \
  -af "loudnorm=I=-14:TP=-2:LRA=11:measured_I=$(v input_i):measured_TP=$(v input_tp):measured_LRA=$(v input_lra):measured_thresh=$(v input_thresh):offset=$(v target_offset):linear=true,aresample=192000,alimiter=limit=0.8:attack=1:release=50:level=false,aresample=48000" \
  -c:a aac -b:a 128k -ar 48000 -ac 2 -movflags +faststart out/$n.mp4
sz=$(stat -c %s out/$n.mp4); echo "out/$n.mp4  $((sz/1000000)) MB"
[ "$sz" -le 300000000 ] || echo "OVER 300 MB: re-run with ENCODE_ONLY=1 and a lower MAXRATE (never lower the resolution)"
