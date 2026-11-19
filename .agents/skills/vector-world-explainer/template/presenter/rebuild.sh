#!/bin/bash
# Everything downstream of spine/build_spine.py, in order (re-run whenever the spine changes):
# words -> caption check -> RVM mattes (GPU) -> geometry -> VP9-alpha webm -> face-windows.json ->
# typecheck -> events -> face-bounds check -> mix.  From the quantum film v6 (v6/rebuild.sh).
#   ./presenter/rebuild.sh                (from film/)   SKIP_ALIGN=1 keeps out/words-raw.json
#   NAMES="Google, qubit, ..."            proper nouns for Whisper's prompt
set -e; cd "$(dirname "$0")/.."
. ./config.sh
MATTE=$("$PY" -c "import pipeline_config as c; print(c.MATTE)")
SPINE_WAV=$("$PY" -c "import pipeline_config as c; print(c.SPINE_WAV)")
mkdir -p out public/face "$MATTE"
cp "$SPINE_WAV" public/vo.wav
if [ -z "$SKIP_ALIGN" ]; then
  PYTHONUTF8=1 "$PY" align.py public/vo.wav "${NAMES:-}" medium.en > out/align.log 2>&1
  cp src/words.json out/words-raw.json
fi
"$PY" fix_words.py | head -1
npx esbuild checks/cap-check.mts --bundle --platform=node --format=esm --log-level=error | node --input-type=module
rm -f "$MATTE"/w*.mov "$MATTE"/w*.json
"$CUDA_PY" presenter/matte.py window $("$PY" -c "import json,pipeline_config as c; print(' '.join(str(k) for k in sorted({p['win'] for p in json.load(open(c.SPLICE_MAP))['pieces'] if p['kind']=='face'})))") > "$MATTE/run.log" 2>&1
grep -E "^window" "$MATTE/run.log"
"$PY" presenter/measure.py | cut -c1-120
# VP9 + alpha for Remotion (libvpx-vp9 keeps alpha; yuva420p; limited range BT.709 like the masters)
for mov in "$MATTE"/w*.mov; do
  k=$(basename "$mov" .mov)
  ffmpeg -v error -y -i "$mov" -vf "scale=in_color_matrix=bt709:in_range=tv:out_color_matrix=bt709:out_range=tv,format=yuva420p" \
    -c:v libvpx-vp9 -pix_fmt yuva420p -crf 12 -b:v 0 -deadline good -cpu-used 2 -row-mt 1 -threads 8 -auto-alt-ref 0 -g 30 \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 -r 30 public/face/$k.webm &
done; wait
"$PY" presenter/face_windows.py
npx tsc -p .
npx esbuild dump-events.mts --bundle --platform=node --format=esm --log-level=error | node --input-type=module > out/events.json
npx esbuild checks/face-check.mts --bundle --platform=node --format=esm --log-level=error | node --input-type=module
PYTHONUTF8=1 "$PY" audio/mix.py > out/mix.log 2>&1; tail -2 out/mix.log
echo REBUILD OK
