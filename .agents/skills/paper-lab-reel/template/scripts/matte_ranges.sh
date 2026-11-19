#!/bin/bash
# Cut-out mattes for the presenter-beside (SIDE) stretches, shared by both films.
# Source-time ranges include ~0.6s transition margins. Starts snapped to source frame boundaries (30000/1001).
set -e; cd "$(dirname "$0")/.."
mkdir -p film/public/matte analysis/matte-logs
RANGES="13.81:28.86 46.61:56.46 59.41:73.21 89.05:102.94 130.04:143.10 151.44:163.34"
i=0; echo "[" > analysis/mattes.json
for r in $RANGES; do
  s=${r%:*}; e=${r#*:}
  s0=$(py -3.13 -c "print(round(round($s*30000/1001)*1001/30000,6))")
  n=$(py -3.13 -c "print(round(($e-$s0)*30000/1001))")
  out=film/public/matte/m$i.webm
  if [ ! -f $out ]; then
    ffmpeg -v error -y -ss $s0 -i source-derived/proxy-1080.mp4 -frames:v $n -an -vf scale=720:1280:flags=lanczos -c:v libx264 -crf 12 -preset fast film/public/matte/c$i.mp4
    npx --no-install hyperframes remove-background film/public/matte/c$i.mp4 -o $out --device cpu --quality best > analysis/matte-logs/m$i.log 2>&1
  fi
  [ $i -gt 0 ] && echo "," >> analysis/mattes.json
  echo "{\"file\":\"matte/m$i.webm\",\"srcStart\":$s0,\"frames\":$n}" >> analysis/mattes.json
  i=$((i+1)); echo "done m$i $(date +%T)"
done
echo "]" >> analysis/mattes.json
