#!/bin/bash
# Final audio for a rendered film: original voice (public/vo.wav) + the film's bed, gained to
# gentle 3:1 mastering compression, then -14 LUFS integrated with an oversampled limiter at -1.5 dBTP; video stream copied untouched.
# usage: ./finalize.sh <in.mp4> <bed.wav> <out.mp4>
set -e; cd "$(dirname "$0")"; in=$1; bed=$2; out=$3
PY=${PY:-python}
ffmpeg -v error -y -i public/vo.wav -i "$bed" -filter_complex "[0][1]amix=inputs=2:normalize=0:duration=longest,acompressor=threshold=-24dB:ratio=3:attack=12:release=180:knee=6:makeup=1" -ar 48000 -c:a pcm_f32le out/_mix.wav
I=$(ffmpeg -hide_banner -nostats -i out/_mix.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
g=$("$PY" -c "print(round(-13.3 - ($I), 2))")
echo "mix I=$I gain=$g dB"
ffmpeg -v error -y -i "$in" -i out/_mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -af "volume=${g}dB,aresample=192000,alimiter=limit=0.79:attack=1:release=60:level=false,aresample=48000" -ar 48000 -c:a aac -b:a 256k -shortest -movflags +faststart "$out"
rm -f out/_mix.wav
ffmpeg -hide_banner -nostats -i "$out" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):"
