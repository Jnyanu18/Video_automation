# Pipeline commands (Windows, Git Bash)

Real Python only: `py -3.13` (or `$PY` from `config.sh`); `py -3.11` where noted (OpenCV YuNet);
the GPU matte uses `$CUDA_PY` (torch cu128 venv). Never the `python3` Store alias. Whisper always on
CPU (`device="cpu", compute_type="int8"`). Paths: `P` = project root, `film/` = copy of the template.

## 0. Project

```bash
P="<PROJECT_DIR>/animated-<slug>-YYYY-MM-DD"
mkdir -p "$P"/{audio,qa,keyframes,style-frames}
cp -r <SKILLS_DIR>/vector-world-explainer/template "$P/film"
cd "$P/film" && $EDITOR pipeline_config.py config.sh      # RAW_DIR, TAKES, SRC_*, HEAVY, CUDA_PY, YUNET
npm install          # or junction node_modules from a recent film with the same package.json
df -h                   # heavy files go to HEAVY (a roomy disk)
```
For a new version of an existing film: copy `film-vN` to `film-vN+1`, junction `node_modules`, never
touch the earlier folder or its finals.

## 1. Archive + voice-over gap cut

```bash
cp "<Recording (N).wav>" "<VOICE_ARCHIVE_DIR>/YYYY-MM-DD_<slug>_<take>.wav"   # untouched archive copy (optional)
py -3.13 spine/gapcut.py "<Recording (N).wav>"   # -> $P/audio/vo-real.wav + vo-real.words.json; exits on any word change
```

## 2. Takes

```bash
py -3.13 spine/transcribe_takes.py               # spine/takes/t<n>.words.json
py -3.13 spine/sync_wav.py                       # spine/takes/sync.json (lag, corr, track level, durations)
py -3.11 presenter/gaze.py                       # spine/takes/gaze.json (YuNet yaw every 3rd frame)
py -3.11 presenter/takesheet.py ../qa/takes-sheet.jpg 0.5 "131:8.2:16.8:hook" "137:18.8:23.6:pool" ...
T=110 py -3.11 presenter/facestrip.py ../qa/facestrip.jpg 0.2 "137:24:30:hand?" ...
```
Write `TAKES.md` (per window: line, take + source seconds, why; seconds per take; cuts created).

## 3. Spine

```bash
$EDITOR spine/build_spine.py        # FACE / VO / IN_AT / ORDER plan block
py -3.13 spine/build_spine.py       # spine/vo-spine.wav + splice-map.json; prints per-take gains and seam steps
py -3.13 spine/seams.py             # ../qa/seams.json
py -3.13 -c "from faster_whisper import WhisperModel as M; import json; m=M('large-v3',device='cpu',compute_type='int8'); s,_=m.transcribe('spine/vo-spine.wav',word_timestamps=True); json.dump([[w.word,w.start,w.end] for x in s for w in x.words],open('../qa/spine-whisper-large-v3.json','w'))"
```
Read the large-v3 text line by line against the script: doubled words at joins, clipped word ends.

## 4. Matte test, then everything downstream

```bash
. ./config.sh
"$CUDA_PY" presenter/matte.py test 135 25.5 29.5                 # 3-5 s
py -3.13 presenter/mattesheet.py "$HEAVY/matte/test-135.mov" ../qa/matte-test.png 0 60 119 --zoom 300,400,700,700 --label "135 test"
NAMES="Google, qubit, superposition" ./presenter/rebuild.sh     # align, fix_words, caption check, mattes, webm, geometry, tsc, events, face check, mix
SKIP_ALIGN=1 ./presenter/rebuild.sh                              # after edits that keep the spine
```

## 5. Skeleton, stills, board

```bash
npx tsc -p .
BUNDLE=out/bundle-check ./snap.sh out/check 0 3.5 8.7 12.0 ...      # stills at seconds + sheet.png
py -3.13 board.py out/check ../keyframes/board.png "0|Google built a chip..." "3.5|..."
```
Each still is a few seconds; delete `out/bundle-*` afterwards (1-2 GB each). One bundle dir per
parallel animator, at most 2 stills at a time each.

## 6. Events and bed

```bash
npx esbuild dump-events.mts --bundle --platform=node --format=esm --log-level=error | node --input-type=module > out/events.json
PYTHONUTF8=1 py -3.13 audio/mix.py      # public/bed.wav, out/mix-preview.wav, out/cue-sheet.json
```

## 7. Review draft (1080) and judges

```bash
CONCURRENCY=8 ./render.sh draft1          # quick review copy, bt709, faststart
./qa.sh out/draft1.mp4 ../qa draft1
```
Judges (motion / story / design+sound) read the contact and cuts sheets and dense strips
(`py -3.13 dense.py <mp4> <out.png> 36.5:38:10 ...`, fps-10 strips around flagged moments); log in `ISSUES.md`.

## 8. Delivery master

```bash
CONCURRENCY=8 ./render_ig.sh v1                     # 1440x2560, maxrate from duration, <= 300 MB
cp out/v1.mp4 ../final-v1.mp4
./qa.sh ../final-v1.mp4 ../qa v1
py -3.13 presenter/faceqa.py ../final-v1.mp4 ../qa  # zoom-cut + lip-sync strips
```
Over 300 MB: `ENCODE_ONLY=1 MAXRATE=<lower>M ./render_ig.sh v1` (re-encodes the ProRes intermediate;
never a smaller resolution). Quantum v6 render: ~35 min + encode at concurrency 8. Patch a small
range instead of a full re-render: render the range (`./render_ig.sh patch 180-245`, the second arg is a frame range) and `py -3.13 finalize.py <base.mp4> <patch.mp4> <first_frame> <out.mp4>`, then check the splice
frames and the size.

## 9. Receipts (acceptance, quantum v6)

| Check | Pass |
|---|---|
| streams | h264 High 1440x2560 yuv420p, color_range tv, bt709 x3, r = avg = 30/1, nb_frames = TOTAL; aac LC 48000 2ch |
| size | <= 300,000,000 bytes (v6 283.0 MB at 22.26 Mb/s, maxrate 22M) |
| decode-errors.txt | empty |
| black.txt | empty |
| loudness | about -14 LUFS, TP <= -1.5 dBTP (v6 -14.1 / -1.8, LRA 3.6) |
| faststart.txt | True |
| frame0 / last-second / last-frame | designed cover; still end card |
| contact / cuts / presenter-windows sheets | looked at by you, issues logged |
| faceqa | zoom cuts clean; lips close on/just before b/p/m onsets (v6: within 1 frame on 10) |
| CTA Whisper | his CTA words ("hit" may be heard as "head": compare with the raw) |

Then report the four QA states separately (technical / factual / creative / user acceptance).
