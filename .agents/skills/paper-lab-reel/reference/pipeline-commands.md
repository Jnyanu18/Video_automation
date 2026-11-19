# Pipeline commands (Windows, Git Bash)

Use `py -3.13` (real Python; never the `python3` Store alias). The film scripts take `PY=...`
(default `<PYTHON_EXE>`). Paths are relative
to the project root `P` unless the step says `film/`.

## 0. Project and source

```bash
P="reel-YYYY-MM-DD-<slug>-animated"; S="<raw path>"
mkdir -p $P/{analysis,source-derived,concept,scripts,film,qa}
sha256sum "$S" > $P/analysis/raw-source.sha256
ffprobe -v error -show_entries stream=codec_name,profile,pix_fmt,width,height,r_frame_rate,duration:format=duration -of compact "$S"
ffmpeg -hide_banner -nostats -i "$S" -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary/,$p'
ffmpeg -v error -y -i "$S" -map 0:a:0 -ac 1 -ar 16000 $P/source-derived/audio-16k.wav
ffmpeg -v error -y -i "$S" -map 0:a:0 -c:a pcm_s16le $P/source-derived/audio-48k-stereo.wav
ffmpeg -v error -y -i "$S" -map 0:v:0 -vf "fps=1/4,scale=216:-1,tile=8x6" -frames:v 1 $P/analysis/strip.jpg
# working intermediate (H.264, high quality; at the delivery size)
ffmpeg -v error -y -i "$S" -map 0:v:0 -map 0:a:0 -vf "scale=1080:1920:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset medium -crf 14 -g 30 -c:a aac -b:a 256k -movflags +faststart $P/source-derived/proxy-1080.mp4
```

## 1. Transcript

`scripts/transcribe.py` (source project has it):
```python
from faster_whisper import WhisperModel
m = WhisperModel("medium.en", device="cpu", compute_type="int8")
segs, info = m.transcribe(wav, language="en", word_timestamps=True, vad_filter=False, beam_size=5)
# -> {"segments":[{start,end,text}], "words":[{w,s,e,p}]}
```
`py -3.13 scripts/transcribe.py source-derived/audio-16k.wav analysis/transcript-medium.json` (a few
minutes for 3 min of audio; run in the background). Check low-probability words and proper nouns.

## 2. Film project

Copy `~/.claude/skills/paper-lab-reel/template/` into `$P/film/` (see template/README.md), add the
video-specific files, then `npm install` (or copy `node_modules` from a recent film with the
same package.json to save time). Fonts load through `@remotion/google-fonts`.
```bash
cd $P/film && py -3.13 src/paper/make_textures.py   # public/paper/{board,cork,navy}.jpg
cp ../source-derived/proxy-1080.mp4 public/
ffmpeg -v error -y -ss <sec> -i public/proxy-1080.mp4 -frames:v 1 public/madhav-still.png  # still from THIS take
```

## 3. Spine

`py -3.13 scripts/build_spine.py` -> `film/public/vo.wav`, `film/src/words.json`,
`film/src/vo_env.json`, `analysis/edl.json`; prints word count, seconds, frames. Set `TOTAL` in lib.ts to
the printed frame count. Then:
```bash
cd film
npx esbuild dump-beats.mts --bundle --platform=node --format=esm --log-level=error --loader:.json=json | node --input-type=module > out/beats.json
```
`cue()` throws on a missing or ambiguous phrase, so a successful dump proves every cue resolves.

## 4. Mattes

`bash scripts/matte_ranges.sh` (ranges in source seconds with ~0.6 s margins; per range: snap the start to a source
frame, cut `film/public/matte/cN.mp4` at 720x1280 crf 12 from the intermediate, then
`npx --no-install hyperframes remove-background cN.mp4 -o mN.webm --device cpu --quality best`).
Copy `analysis/mattes.json` to `film/src/mattes.json`. Verify alignment: grab the same output frame from
`cN.mp4` and from the intermediate and difference them.

**Faster alternative (GPU, proven in the quantum film v6):** RobustVideoMatting resnet50 on the RTX 5070
with the cu128 torch venv `<CUDA_VENV>`, at native source resolution (~1,480 frames of 1512x2688 in
about 80 s, vs ~0.7 fps for u2net at 720), ProRes 4444 masters + VP9-alpha webm, no 720 -> 1440 alpha
upscale needed. Code and edge rules: `~/.claude/skills/vector-world-explainer/template/presenter/matte.py`
(adapt its frame map to this skill's matte ranges).

## 5. Stills, boards, typecheck

```bash
cd film && npx tsc -p .
MAXF=$((TOTAL-1)) PAR=3 ./snap.sh out/check 0 4.4 11.4 15.8 25.2 31 44.2   # bundles once, stills at seconds, sheet.png
KEEP=1 BUNDLE=out/bundle-FilmPaper ./snap.sh out/check2 60 61   # reuse the bundle
py -3.13 board.py out/check out/board.png "0|hook line" "4.4|next line" ...    # key-frame board (animated-video template)
```
Each still takes about 3-4 s. Delete `out/bundle-*` when done; each is ~1-2 GB.

## 6. Events and bed

```bash
npx esbuild dump-events.mts --bundle --platform=node --format=esm --log-level=error --loader:.json=json | node --input-type=module > out/events-paper.json
py -3.13 audio/mix.py paper    # -> public/bed-paper.wav, out/mix-paper-preview.wav, out/music-paper.wav, out/cue-sheet-paper.json
ffmpeg -hide_banner -nostats -i out/music-paper.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:"
```

## 7. Render and master

```bash
df -h                                            # need ~10 GB free for the render's temp files
mkdir -p <HEAVY_TEMP_DIR>-<slug>; export TEMP='<HEAVY_TEMP_DIR>-<slug>' TMP="$TEMP" TMPDIR="$TEMP"   # only if system disk is low
rm -rf out/bundle-*
CONCURRENCY=8 ./render.sh FilmPaper paper-v1          # tsc + remotion render (--gl=angle, crf 16, bt709) + loudnorm -> out/paper-v1.mp4
./finalize.sh out/paper-v1.mp4 public/bed-paper.wav out/paper-v1-final.mp4
rm -rf <HEAVY_TEMP_DIR>-<slug>                         # clean up temp
```
Render time: ~3.5 min for 157 s at concurrency 8. Master size ~300-470 MB (~16-24 Mbps).

## 8. QA receipts

```bash
./qa.sh out/paper-v1-final.mp4 ../qa/paper-v1-final
```
Writes `streams.txt` (ffprobe), `decode-errors.txt` (full decode, must be empty), `black.txt`
(blackdetect d=0.1 pix_th=0.06, must be empty), `loudness.txt` (ebur128 with true peak),
`frame0.png` (the cover), `last-second.png`, `contact-sheet.jpg` (2 fps), `cuts.txt` +
`cuts-sheet.png` (10 fps across +-0.4 s of every beat boundary, from `out/beats.json`).

Faststart (moov before mdat):
```bash
ffprobe -v trace -i out/paper-v1-final.mp4 2>&1 | grep -m2 -oE "type:'(moov|mdat)'"   # moov must print first
```
Optional luma-spike scan for single-frame flashes:
`ffmpeg -i f.mp4 -vf signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=../qa/yavg.txt -an -f null -`
then look for frame-to-frame YAVG jumps that revert within 1-2 frames.

Acceptance values (the approved film): `h264 High 1080x1920 yuv420p color_range=tv`,
`r_frame_rate=avg_frame_rate=30/1`, `nb_frames = TOTAL`, `aac LC 48000 2ch`,
duration = TOTAL/30, 0 decode errors, no black, -14.5 LUFS, LRA ~3, TP -1.7 dBTP, moov before mdat.

Then look at the sheets yourself: every beat tells its idea with the sound off; captions never
over the face; nothing in the IG UI zones; comparisons visible at least 3 s; the cover and the last second.

## 9. The four QA states (CHECKPOINT.md and the report)

```
Technical: <receipts above, with qa/ paths>
Factual:   <qualifiers on screen; claims left in his voice; NOTES.md ids>
Creative:  <what was reviewed (sheets, stills) and the open issues by time range; audio synthetic/CC0, unauditioned>
User acceptance: none / the presenter's exact words + date
```

## Revision + Instagram-max delivery loop (v3, the approved path)

```bash
py -3.13 scripts/plan_cuts.py            # edit WORD_CUTS first; prints every cut + new length
py -3.13 scripts/build_spine.py          # vo.wav, words.json, vo_env.json, src/edl.json (+ outro)
cd film && npx tsc -p .
npx esbuild dump-beats.mts --bundle --platform=node --format=esm --outfile=out/dump-beats.mjs --log-level=error && node out/dump-beats.mjs > out/beats.json
npx esbuild dump-events.mts --bundle --platform=node --format=esm --outfile=out/dump-events.mjs --log-level=error && WORLD=paper node out/run-dump.mjs > out/events-paper.json
cd .. && py -3.13 film/audio/mix.py paper
./scripts/hires_1440.sh                  # once per take
cd film && TEMP='<HEAVY_TEMP_DIR>' TMP='<HEAVY_TEMP_DIR>' CONCURRENCY=6 ./render_ig.sh FilmPaper <name> public/bed-paper.wav
./qa.sh out/<name>.mp4 ../qa/<name>      # + faststart check + Whisper on the final audio
```
