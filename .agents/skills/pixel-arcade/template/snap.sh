#!/bin/bash
# Stills of composition $COMP (default Film) at the given seconds + a labelled contact sheet.
# usage: [COMP=FilmPaper] [MAXF=<TOTAL-1>] ./snap.sh <outdir> <sec> [sec...]
set -e; cd "$(dirname "$0")"; out=$1; shift; mkdir -p "$out"; comp=${COMP:-Film}
PY=${PY:-python}
b=${BUNDLE:-out/bundle-$comp}; if [ -z "$KEEP" ]; then rm -rf "$b"; npx remotion bundle src/index.ts --out-dir "$b" --log=error >/dev/null; fi
for s in "$@"; do echo "$s"; done | xargs -P ${PAR:-3} -I{} sh -c 'npx remotion still "$0" '"$comp"' "$1/t{}.png" --frame=$('"$PY"' -c "print(min(${MAXF:-99999},round({}*30)))") --gl=angle --log=error >/dev/null' "$b" "$out"
"$PY" sheet.py "$out/sheet.png" $(for s in "$@"; do echo "$out/t$s.png"; done)
echo "$out/sheet.png"
