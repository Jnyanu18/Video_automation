#!/bin/bash
# Render stills of the film at the given seconds and a contact sheet (Windows: uses py launcher path).
# usage: ./snap.sh <outdir> <sec> [sec...]   -> <outdir>/t<sec>.png + <outdir>/sheet.png
set -e; cd "$(dirname "$0")"; out=$1; shift; mkdir -p "$out"
. ./config.sh
npx tsc -p .
b=${BUNDLE:-out/bundle}; rm -rf "$b"; npx remotion bundle src/index.ts --out-dir "$b" --log=error >/dev/null
for s in "$@"; do echo "$s"; done | xargs -P 2 -I{} sh -c 'npx remotion still "$0" Film "$1/t{}.png" --frame=$('"$PY"' -c "print(round({}*30))") --log=error >/dev/null' "$b" "$out"
$PY sheet.py "$out/sheet.png" $(for s in "$@"; do echo "$out/t$s.png"; done)
echo "$out/sheet.png"
