# Audio, render, QA and housekeeping

## Mix (`template/audio/mix.py <style>`)
- **Voice first.** `public/vo.wav` (his real, denoised voice) plays untouched in Remotion; the bed is separate.
- **Synthetic score** per style (`STYLES`: key, chords, seconds per chord, pad brightness, pluck voice, reverb).
  Add a style by adding a row. Labelled SYNTHETIC; never auditioned by a human: say so in the creative QA.
- **Ducking:** phrases (words < 0.4 s apart merged) duck the music by **-15 dB** with 0.2 s ramps, also under the
  spoken outro. v1 was "background sounds are too loud": -9 dB was not enough.
- **Effects** from `out/events.json` (the world's `events.ts`), mapped by keywords (`sound_for`), landing one
  frame before the hit, and pushed down until they sit **>= 20 dB under his voice band (1-4 kHz)**. Optional CC0
  one-shots from `$SFX_DIR`; missing files fall back to synthetic stand-ins.
- Levels: `MUSIC_DB` (default -7.5 paper family / -9 others), `FX_DB` (-14 / -17). The batch used e.g. iso
  `MUSIC_DB=-11 FX_DB=-26`, arcade `-11/-19`, dossier `MUSIC_DB=-3` (quiet score).
- The script prints the VO-to-bed median in 1-4 kHz during speech; the delivered batch was 28.9-41.3 dB.

## Render (`template/render_ig.sh Film <name> <bed.wav>`)
1. `npx tsc -p .`
2. `remotion render ... --scale=1.3333333333333333 --codec h264 --crf 8 --pixel-format yuv420p --color-space=bt709
   --gl=angle --concurrency=6 --muted`. The full-precision scale is required: fewer digits gives 2559.99 px and
   Remotion refuses. `--gl=angle` is what made three.js worlds render on Windows.
3. Audio: VO + bed, `acompressor` 3:1 gentle, measured gain to about -13.3 LUFS before the 4x-oversampled
   `alimiter` (limit 0.79).
4. One x264 encode inside Instagram's API limits: crf 14, `maxrate = min(24M, 0.95*300MB*8/duration)`,
   bufsize 2x, GOP 60, yuv420p tv range, bt709 tags, CFR 30, AAC 128k 48 kHz, `+faststart`.
5. `fix_tp.sh`: if true peak > -1 dBTP (one clip came out at +0.2 after AAC), an **audio-only** remux with an
   oversampled limiter at -3 dBFS; the video stream is copied, not re-encoded.

## QA (`template/qa.sh out/<name>.mp4 <qa-dir>`)
Writes streams, decode errors (full decode), blackdetect, ebur128 loudness + true peak, frame 0, last second,
a 2 fps contact sheet and a cuts sheet around every beat, then **gates.txt** (PASS/FAIL, nonzero exit on FAIL):
1440x2560; H.264 yuv420p tv; CFR 30/1; AAC 48 kHz; 0 decode errors; no black frames; -15..-13 LUFS;
true peak <= -1 dBTP; faststart; <= 300 MB; <= 25 Mbps. The batch's v7 masters: 35.8-93.6 s, 0 errors, no black,
-13.4..-13.6 LUFS, TP <= -1.3, 86-280 MB.

Then look yourself: contact sheet (layout, empty areas, collisions with his head), cuts sheet (no flash frames at
beat changes), frame 0 (a real cover: series tag + hook headline + his face), last second (static end card).
Re-transcribe the final file's audio for a last word check.

## Housekeeping
- **Remotion temp caches:** every render/still/bundle leaves `remotion-v4*-assets*` and
  `remotion-webpack-bundle-*` in %TEMP%. During the batch they filled C: to 0 bytes (~89 GB). Run
  `scripts/prune_remotion_cache.sh` after every render (finish_clip.sh does), and delete `out/bundle-*` after stills.
  If the system disk is small, set TEMP/TMP to a roomier disk for the render.
- Delete `source/_matte`, `source/spanparts` and old proxies once a version is accepted; never delete the raw.
