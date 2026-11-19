#!/bin/bash
# Copy the skill's template into a film folder, then install node_modules (or link an existing install with
# NODE_MODULES_FROM=<a film's node_modules>). If <film-dir>/src already exists, only the reusable shell is refreshed:
# the clip's src/world, beats.ts, spine JSON and audio/mix.py are never overwritten.
# usage: scripts/install_template.sh <film-dir>
set -e; HERE=$(cd "$(dirname "$0")" && pwd); T="$HERE/../template"; F=$1
mkdir -p "$F"
if [ -d "$F/src" ]; then
  cp "$T"/src/lib.ts "$T"/src/presenter.tsx "$T"/src/Film.tsx "$T"/src/index.ts "$T"/src/Root.tsx "$T"/src/captions.ts "$F/src/"
  [ -f "$F/src/series.ts" ] || cp "$T/src/series.ts" "$F/src/"
  mkdir -p "$F/src/ig" "$F/src/kit" "$F/audio"
  cp -r "$T"/src/ig/. "$F/src/ig/"; cp -r "$T"/src/kit/. "$F/src/kit/"
  for x in qa.sh fix_tp.sh render_ig.sh snap.sh sheet.py dump-beats.mts dump-events.mts run-dump.mjs tsconfig.json package.json; do cp "$T/$x" "$F/"; done
  cp "$T/audio/dsp.py" "$T/audio/designed.py" "$F/audio/"; [ -f "$F/audio/mix.py" ] || cp "$T/audio/mix.py" "$F/audio/"
  echo "shell refreshed in $F (world, beats, spine, mix untouched)"
else
  cp -r "$T"/. "$F/"; echo "template copied to $F (sample spine + sample world: replace both)"
fi
mkdir -p "$F/public/matte" "$F/out"
if [ ! -e "$F/node_modules" ]; then
  if [ -n "$NODE_MODULES_FROM" ]; then
    if command -v cygpath >/dev/null; then cmd //c mklink //J "$(cygpath -w "$F/node_modules")" "$(cygpath -w "$NODE_MODULES_FROM")" >/dev/null
    else ln -s "$NODE_MODULES_FROM" "$F/node_modules"; fi
    echo "linked node_modules -> $NODE_MODULES_FROM"
  else
    (cd "$F" && npm install --no-audit --no-fund)
  fi
fi
