#!/usr/bin/env bash
# HDR (HLG/BT.2020) iPhone clips -> graded SDR BT.709 H.264 proxies for Remotion, plus stereo WAVs for the mix.
set -u
SRC="j:/ai editor/testing"
DST="j:/ai editor/projects/naati-farms/public/clips"
AUD="j:/ai editor/projects/naati-farms/work/audio"
mkdir -p "$DST" "$AUD"
VF="zscale=t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=mobius:param=0.4:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,eq=contrast=1.08:saturation=1.2:gamma=0.95,colorbalance=rs=.03:bs=-.04:rm=.03:bm=-.04:rh=.02:bh=-.03"
one() {
  id=$1
  ffmpeg -v error -y -i "$SRC/IMG_$id.MOV" -vf "$VF" -r 30 -an -c:v libx264 -preset fast -crf 17 -g 10 -bf 0 \
    -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -movflags +faststart "$DST/c$id.mp4" \
    && echo "video $id ok" || echo "video $id FAILED"
  ffmpeg -v error -y -i "$SRC/IMG_$id.MOV" -vn -ac 2 -ar 48000 -c:a pcm_s16le "$AUD/a$id.wav" \
    && echo "audio $id ok" || echo "audio $id FAILED"
}
export -f one; export SRC DST AUD VF
printf "%s\n" 1151 1152 1336 1337 1363 1376 1381 1441 1508 1561 1562 1564 1570 1573 1593 | xargs -P 4 -I{} bash -c 'one {}'
echo DONE
