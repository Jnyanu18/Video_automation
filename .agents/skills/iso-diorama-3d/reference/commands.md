# Commands (Windows, Git Bash; run from `film/`)

Use a real Python 3.10+ (`PY=...`; on Windows `py -3.13`, never the `python3` Store alias).

```bash
# 0. install (or junction-link node_modules from a film with the same package.json)
npm install
npx tsc -p .                      # must be clean

# 1. spine comes from the news-qa-reel shell: src/words.json, src/edl.json, src/vo_env.json,
#    src/mattes.json, public/vo.wav, public/proxy-1440.mp4, public/matte/m0-1440.webm

# 2. stills while building (frames = edl.json "frames"; keep PAR low on a shared machine)
COMP=Film PAR=1 MAXF=$((FRAMES-1)) BUNDLE=out/bundle-dev ./snap.sh out/dev 0 3.8 5.3 7.4 11 14 16.6 ...
#    -> out/dev/sheet.png ; delete out/bundle-* afterwards

# 3. beats + events for the mixer and QA
npx esbuild dump-beats.mts --bundle --platform=node --format=esm --outfile=out/dump-beats.mjs --log-level=error
node out/dump-beats.mjs > out/beats.json
npx esbuild dump-events.mts --bundle --platform=node --format=esm --outfile=out/dump-events.mjs --log-level=error
cp run-dump.mjs out/ && node out/run-dump.mjs > out/events.json

# 4. score + SFX bed (style "iso": G-major marimba; music -11 dB, FX -26 dB by default)
SFX_LIB=/path/to/cc0-sfx PYTHONIOENCODING=utf-8 $PY audio/mix.py iso
#    -> public/bed-iso.wav, out/mix-iso-preview.wav, out/cue-sheet-iso.json; prints the VO-bed ratio

# 5. Instagram-max master (1440x2560, crf 14, maxrate from the 300 MB cap, -14 LUFS, faststart)
CONCURRENCY=6 ./render_ig.sh Film <name> public/bed-iso.wav

# 6. technical QA receipts + contact sheet + cuts sheet + frame 0 + last second
./qa.sh out/<name>.mp4 ../qa/<name>
$PY -c "d=open('out/<name>.mp4','rb').read(3000000); print('faststart', d.find(b'moov')<d.find(b'mdat'))"
rm -rf out/bundle-*
```

The news-qa-reel shell wraps steps 3-6 in one script (`finish_clip.sh <clip> iso <name>`).
Then: Whisper the final file's audio, look at the contact sheet, frame 0 and the last second, and
report the four QA states separately.
