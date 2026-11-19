# Pipeline commands (in order)

Run from the film folder (`<project>/film/`) in Git Bash. `PY` = a real Python 3.13 (numpy, scipy, pillow).

```bash
# 0. once per film
npm install                          # or junction node_modules from a recent film with the same package.json
"$PY" src/world/make_textures.py     # -> src/world/tex/{desk,manila,memo}.jpg (deterministic)
# spine + media from news-qa-reel: src/edl.json, src/words.json, src/vo_env.json, src/mattes.json,
# public/proxy-1440.mp4, public/matte/m0-1440.webm (-g 15), public/vo.wav

# 1. after every edit to T.ts / beats / scenes
npx tsc -p .

# 2. stills sheet: 0, every beat start, every key landing, end card, last frame. MAXF = TOTAL - 1
COMP=Film MAXF=<TOTAL-1> PAR=2 ./snap.sh out/v1 0 2.6 4.6 8.1 11.2 13.5 17 20.6 21.4 25.3 27.2 32.3 38.5 40.6 49.5 51.8 62.7 70.4 73 74.2 79.1 81.3 87.2 88.9 91.2 93.5
rm -rf out/bundle-*                  # bundles are large; delete after stills

# 3. beats + events for the mixer and QA
npx esbuild dump-beats.mts --bundle --platform=node --format=esm --outfile=out/dump-beats.mjs --log-level=error
node out/dump-beats.mjs > out/beats.json
npx esbuild dump-events.mts --bundle --platform=node --format=esm --outfile=out/dump-events.mjs --log-level=error
cp run-dump.mjs out/run-dump.mjs && node out/run-dump.mjs > out/events.json

# 4. bed
PYTHONIOENCODING=utf-8 "$PY" audio/mix.py dossier    # -> public/bed-dossier.wav (+ preview, cue sheet, VO-bed ratio)

# 5. Instagram-max master (1440x2560, crf 14, maxrate from duration, AAC 128k, faststart, ~-14 LUFS)
CONCURRENCY=6 ./render_ig.sh Film <name> public/bed-dossier.wav

# 6. QA receipts
./qa.sh out/<name>.mp4 ../qa/<name>
"$PY" -c "d=open('out/<name>.mp4','rb').read(3000000); print('faststart', d.find(b'moov')<d.find(b'mdat'))"
# + faster-whisper (medium.en, device=cpu, int8) on the final file's audio; compare with words.json
```

(The stills times above are the source film's; take yours from `out/beats.json` and `T.ts`.)

Look at `../qa/<name>/contact-sheet.jpg`, `cuts-sheet.png`, `frame0.png` (the cover) and `last-second.png`
yourself. Report the four QA states separately; nothing is uploaded, scheduled or shared without Madhav's
explicit approval.
