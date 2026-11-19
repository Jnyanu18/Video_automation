#!/bin/bash
# usage: ./snap.sh <outdir> <sec>...  -> stills + sheet (Windows: real python, not python3 alias)
set -e; cd "$(dirname "$0")"; out=$1; shift; mkdir -p "$out"
PY=${PY:-python}
b=$(mktemp -d)/bundle; npx remotion bundle src/index.ts --out-dir "$b" --log=error >/dev/null
printf '%s\n' "$@" | xargs -P 3 -I{} sh -c 'npx remotion still "$0" Film "$1/t{}.png" --frame=$(awk "BEGIN{print int({}*30+0.5)}") --log=error >/dev/null' "$b" "$out"
$PY sheet.py "$out/sheet.png" $(for s in "$@"; do echo "$out/t$s.png"; done)
rm -rf "$(dirname "$b")"; echo "$out/sheet.png"
