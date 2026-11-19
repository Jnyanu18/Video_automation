# Commands (Git Bash; run from `film/`)

Use a real Python 3.10+ with numpy, scipy and Pillow (`PY=...`; on Windows not the `python3` Store alias).

```bash
npm install                              # or reuse node_modules from a film with the same package.json
npx tsc -p .                             # must be clean

# stills + contact sheet (COMP defaults to Film; MAXF = frames - 1 from src/edl.json)
COMP=Film PAR=2 MAXF=1072 ./snap.sh out/dev 0 1.6 3.4 5.2 10.4 13.2 16.6 20.4 22.6 24.6 26.4 29.6 31.6 34.4 35.7
rm -rf out/bundle-*                      # bundles are large

# beats + events JSON for the mixer and QA
npx esbuild dump-beats.mts --bundle --platform=node --format=esm --outfile=out/dump-beats.mjs
node out/dump-beats.mjs > out/beats.json
npx esbuild dump-events.mts --bundle --platform=node --format=esm --outfile=out/dump-events.mjs
cp run-dump.mjs out/ && node out/run-dump.mjs > out/events.json

# music + SFX bed (style retro), news-batch level
SFX_LIB=/path/to/cc0-sfx MUSIC_DB=-11 py audio/mix.py retro
#   -> public/bed-retro.wav, out/mix-retro-preview.wav, out/cue-sheet-retro.json; prints the VO-to-bed ratio

# Instagram-max delivery (1440x2560, crf 14, maxrate <= 24M, AAC 128k, faststart, ~-14 LUFS)
./render_ig.sh Film <name> public/bed-retro.wav

# technical QA receipts: streams, decode errors, blackdetect, loudness, frame 0, last second,
# contact sheet (2 fps) and cuts sheet around every beat start
./qa.sh out/<name>.mp4 ../qa/<name>
```

Then: Whisper the final file's audio and compare with `words.json`; open the contact sheet, frame 0,
the cuts sheet and the last second yourself; check faststart (`moov` before `mdat`).

If disk is short, set `TEMP`/`TMP` to a roomier drive for the render and delete `out/bundle-*`.
