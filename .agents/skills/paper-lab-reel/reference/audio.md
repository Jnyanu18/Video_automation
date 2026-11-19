# Audio: events, score, SFX, ducking, mastering

The voice is the original take, only cut by the EDL. It lives in `public/vo.wav` and is never
processed beyond the 12 ms edge fades and the final master gain/limiter. Everything else is the **bed**
(`public/bed-paper.wav`), built by `audio/mix.py` from the beat table and the world's events.

## 1. Sound events (from the picture)

`src/paper/events.ts` exports `EVENTS: {id, t, dur?, what, x?}[]` in output seconds, built from the
**same constants that draw** (`T.*`, `B.*`, `HAND.*`). `x` = stereo hint from screen position
(`(x-540)/540`). `what` is a plain description containing keywords the mixer maps to a sound.
- List appearances, landings, slices, folds, stamps, page turns, marker strokes, whooshes of
  travelling objects and camera moves, transitions, place changes.
- Density: **about 45 per minute** (first film ~120 for 2.6 min). Repeats (pins dropping, cards
  piling) are one event with a `dur`, not 20 events.
- Keep hits off key spoken words where you can; when a hit must land on a word, keep it short.

Dump: `npx esbuild dump-events.mts --bundle --platform=node --format=esm --log-level=error --loader:.json=json | node --input-type=module > out/events-paper.json`
and the beats: same with `dump-beats.mts > out/beats.json`.

## 2. Score (SYNTHETIC, `mix.py`)

- Warm, curious: **D major, felt pad + wooden-mallet plucks, one chord per 2.4 s**
  (D maj7 / Bm7 / G maj7 / A sus). Pad = detuned additive partials, low-passed, 0.7 s fades.
- **Arrangement per beat** (`ARR[beatId] = (gain, cutoff, arp density 0..2, high tone, pulse)`): thin and
  low for the hook and big questions (gain ~0.45-0.6, cutoff ~800-1100), fuller for teaching sets, a soft
  pulse under "big data" and cosmos beats, a light high tone on insights. **Rewrite `ARR` for each
  film's beat ids** (it raises KeyError otherwise).
- Resolve on the tonic at the last spoken word, with a chime, ringing into the end card; fade to 0 at the last frame.
- Room reverb (decay ~2.6 s, wet 0.22) on the music only.
- If the presenter supplies a track, use it instead and keep the same ducking and level targets.

## 3. SFX (`sound_for(event)`)

Order of sources: the presenter's own files -> a CC0 sound-effects library (`SFX_LIB`)
(`catalog.json`; used: `rubber-stamp.flac`, `card-riffle.flac`, `servo-arm.flac`, `short-whoosh.wav`)
-> synthesised paper sounds in `mix.py` / `audio/designed.py`.

| Keywords in `id`/`what` | Sound |
|---|---|
| stamp | CC0 rubber stamp |
| unfold, bloom, end card | chime + crinkle |
| fold, crumple, squash, compress | synthetic crinkle (length from `dur`) |
| flip, page | synthetic page flip |
| shuffle, pile, stack | CC0 card riffle |
| slice, cut, snip, knife | synthetic snip |
| marker, draw, ink, circle, underline, pencil, arrow, thread | synthetic marker squeak |
| smudge, lossy, error | crinkle + low thud |
| robot, servo | CC0 servo |
| whoosh, fly, polaroid, tile, camera, pull | CC0 short whoosh |
| node, light, fill, pulse | mallet pluck in the score's key |
| (anything else) | synthetic paper tap |

Rules: each effect starts **0.03 s (one frame) before** its visible hit; equal-power pan from `x`;
global FX level `FX_DB` -14 dB; **under speech, keep each effect at least 12 dB under the voice in the
1-4 kHz band** (the mixer measures and pulls it down).

## 4. Level and ducking

- Music sits about **18 LU under the voice**. Start at `MUSIC_DB = -7.5` for the synthetic score and
  measure; a first pass came out at -53 LUFS (inaudible) and had to be raised.
- **Phrase ducking:** merge words less than 0.4 s apart into phrases; duck the music **-9 dB** from
  0.2 s before to 0.15 s after each phrase, smoothed with a 0.2 s window.
- Receipts printed by `mix.py`: event count and the **VO-to-bed ratio in 1-4 kHz during speech**
  (median ~24-25 dB in the approved film; flag if p10 < 12 dB). Also measure the music stem
  (`out/music-paper.wav`) and the preview (`out/mix-paper-preview.wav`) with ebur128.
- Helper gotchas: `dsp.hz()` has no sharps (use `mix.py`'s `f0()`); sum arrays of different lengths
  with `mixl()` (pads to the longest), never `a + b`.

## 5. Mastering (`finalize.sh`)

The render's own audio (Remotion mix + loudnorm in `render.sh`) came out at -15.9 LUFS, short of target, so the
master audio is rebuilt from the stems:
1. `amix` VO + bed (`normalize=0`), then a gentle compressor (`threshold -24 dB, ratio 3, attack 12 ms,
   release 180 ms, knee 6, makeup 1`) -> 32-bit float WAV.
2. Measure integrated loudness (ebur128); gain = -13.3 - I.
3. Apply gain, upsample to 192 kHz, `alimiter limit=0.79` (oversampled true-peak control), back to 48 kHz,
   AAC 256 kbps, `-c:v copy`, `-shortest`, `+faststart`.
Result in the approved film: **-14.5 LUFS integrated, LRA 3.0, true peak -1.7 dBTP**. Target window
-14 to -15 LUFS, TP at or below -1.5 dBTP. If it misses, adjust the -13.3 offset, not the limiter.

## 6. Report honestly

Say which sounds are SYNTHETIC and which are CC0, that nobody has listened to them, and give the measured
levels. Never claim the mix "sounds good".
