#!/bin/bash
# Finish one film: tsc -> beats + events dump -> style bed (audio/mix.py) -> Instagram-max render (+ true-peak gate)
# -> QA gates -> delete bundles -> prune Remotion temp caches.
# usage: scripts/finish_clip.sh <film-dir> <style> <name> [qa-dir]
#   style = a key of STYLES in audio/mix.py (paper | cosmos | dossier | bubble | iso | retro | arcade | canvas; add yours)
#   env: PY (python with numpy/scipy/Pillow), CONCURRENCY (default 6), SKIPMIX=1, MUSIC_DB / FX_DB (mix levels)
set -e; HERE=$(cd "$(dirname "$0")" && pwd); F=$(cd "$1" && pwd); style=$2; name=$3; QA=${4:-$F/../qa/$name}
export PY=${PY:-python}
cd "$F"
npx tsc -p .
mkdir -p out
npx esbuild dump-beats.mts --bundle --platform=node --format=esm --outfile=out/dump-beats.mjs --log-level=error && node out/dump-beats.mjs > out/beats.json
npx esbuild dump-events.mts --bundle --platform=node --format=esm --outfile=out/dump-events.mjs --log-level=error
cp run-dump.mjs out/run-dump.mjs && node out/run-dump.mjs > out/events.json
[ -n "$SKIPMIX" ] || PYTHONIOENCODING=utf-8 "$PY" audio/mix.py "$style"
CONCURRENCY=${CONCURRENCY:-6} ./render_ig.sh Film "$name" "public/bed-$style.wav"
./qa.sh "out/$name.mp4" "$QA"
rm -rf out/bundle-*
"$HERE/prune_remotion_cache.sh"
echo "DONE $F/out/$name.mp4"
