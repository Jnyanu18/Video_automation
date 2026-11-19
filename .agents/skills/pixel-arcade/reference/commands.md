# Commands (Windows, Git Bash; run inside `<project>/film/`)

Use real Python (`py -3.13` or set `PY=...`; never the `python3` Store alias). The shell skill
`news-qa-reel` produces the spine (`src/edl.json`, `src/words.json`, `src/vo_env.json`,
`public/vo.wav`), the 1440 proxy and the cut-out mattes; this world only needs them in place.

```bash
# 0. install (or junction-link node_modules from a film with the same package.json)
npm install

# 1. typecheck + resolve every cue (cue() throws at import time on a missing phrase)
npx tsc -p .
mkdir -p out
npx esbuild dump-beats.mts  --bundle --platform=node --format=esm --outfile=out/dump-beats.mjs  --log-level=error
npx esbuild dump-events.mts --bundle --platform=node --format=esm --outfile=out/dump-events.mjs --log-level=error
cp run-dump.mjs out/
node out/dump-beats.mjs > out/beats.json      # beats + caption chunks (mixer and qa.sh read it)
node out/run-dump.mjs   > out/events.json     # sound events (DOM stub for Node)

# 2. stills across the timeline + labelled sheet (MAXF = frames - 1 from edl.json)
COMP=Film PAR=1 MAXF=1190 BUNDLE=out/bundle-dev ./snap.sh out/dev 0 3.3 6 10 14 17 19 22 25 28 31 34 37.4 39.6
rm -rf out/bundle-*                            # bundles are large

# 3. audio bed (approved arcade levels are the defaults: music -11 dB, FX -19 dB)
SFX_LIB=<folder of CC0 sfx> py -3.13 audio/mix.py arcade
#   -> public/bed-arcade.wav, out/mix-arcade-preview.wav, out/cue-sheet-arcade.json, out/music-arcade.wav
#   set World.bed = "bed-arcade.wav" only if you want it in Remotion previews; render_ig.sh mixes it itself.

# 4. Instagram-max delivery (1440x2560, crf 14, maxrate <= 24M and <= 300 MB, -14 LUFS, faststart)
./render_ig.sh Film <name> public/bed-arcade.wav

# 5. QA receipts: streams, decode errors, blackdetect, loudness, frame 0, last second, contact + cuts sheets
./qa.sh out/<name>.mp4 ../qa/<name>
ffprobe -v trace out/<name>.mp4 2>&1 | grep -m2 -E "type:'(moov|mdat)'"   # moov before mdat
```

Then transcribe the final file's audio with faster-whisper (medium.en, CPU int8) and compare to
the script; view the contact sheet, frame 0 (the cover) and the last second yourself.

If the system disk is short, set `TEMP`/`TMP` to a roomier disk for Remotion and delete
`out/bundle-*` after stills.
