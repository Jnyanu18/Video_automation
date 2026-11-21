# NAATI FARMS — launch film, v2 (script v3)

**Format:** 9:16, 1080×1920, 60 fps, 30 s. Built with `packages/motion-kit` (Remotion). v1 (yolk/green, synthesized
score, invented morning-ride story) is kept in `work/v1/` for reference.

## Why v2
Owner feedback on v1 (2026-11-21): "the sound is very bad, like very; the colour combination is also bad; the script
is very off too." Diagnosis:
- **Sound:** v1's music and effects were synthesized in Python (sine plucks, "boing" springs, noise bursts). It sounded
  like a toy. v2 uses a real produced track, real recorded effects, and the farm's own rooster and flock.
- **Colour:** big flat green, yellow and cream screens covered the footage for about half the film.
- **Script:** much of it was invented (a dawn ride "every morning", opening a gate, a Kannada lesson on "naati",
  greens and tomatoes), and it never said what the farm sells.

Owner's answers: selling **naati chicken (meat)**; on-screen text **English only**; palette **black & white + one
accent**; music **an upbeat produced track** (my pick).

## Script (on screen), beat by beat
The owner picked **"punchy, product first"** from four directions (the first v2 script opened with "Where does your
chicken come from? Let us show you." and was rejected: "change the script").

| Film bar | Time (s) | Shot | On screen | Motion | Sound |
|---|---|---|---|---|---|
| 0 | 0.00 | 1561 flock, **black & white**, dimmed | NAATI / CHICKEN. | per-letter rise, slam, red underline draws | the farm's own rooster crow over the track's build |
| 1 | 2.03 | 1562 white rooster, B&W | *The real one.* ("real" underlined red) | rise; push-in with blur on the last beat | build |
| 2 | 4.07 | 1381 gate opens, flock runs out — **colour** | Raised / OUTSIDE. | hard cut to colour, white flash, recoil, slam with stretch | **the drop**; woosh, low thump, the real flock |
| 3 | 6.10 | 1151, 1336, 1337, 1561 (one per beat) | — | punch-in cuts with a lateral nudge | music |
| 4 | 8.14 | 1564 rooster, then 1593 flock on greens, in a 16:9 window | Lively. / Healthy. | bouncy pop vs steady rise; red rule draws | music, then a low-pass dip with real clucks |
| 5 | 10.17 | black card | **NO** (red) / ANTIBIOTICS. | slam with glitch slices, 3 inverted impact frames, letter rise | hit + low slam; **the track stops for half a beat: picture goes black** |
| 6 | 12.21 | 1152 the farm entrance | From our farm / in *Bangalore.* (red highlight) | line rises | the music returns |
| 7–8 | 14.24 | all 12 clips in a grid | — | grid bursts out ring by ring on the eighth notes, then collapses | swoosh, three soft shutters |
| 9 | 18.31 | 1564 rooster through the letters | NAATI | per-letter rise, then the camera flies through the I (parallax) | vacuum swoosh |
| 10–13 | 20.35 | 1564 shrinks into a round badge | NAATI FARMS · NOW LAUNCHING · CALL TO ORDER +91 78495 34944 | badge settles, ring text turns, wordmark rises, launch pill pops, phone pulses on the beats; the lockup pulses on the last stab (27.97 s) | the song's final phrase and its own ending; the flock under the tail |

Owner's facts used: NAATI FARMS, naati chicken, Bangalore, raised outside, lively, healthy, no antibiotics, launching,
+91 78495 34944. My connective copy: "The real one.", "From our farm in Bangalore.", "Call to order".

## Identity
- Palette: ink `#0B0B0B`, white `#FFFFFF`, grey `#9B9B9B` (labels), **comb red `#E4312B`** (the only accent: the
  underlines, NO, the "Bangalore" highlight, the launch pill, the phone dot).
- Footage: black & white for the question, colour for the answer. Re-graded calmer than v1 (saturation 0.84, warm
  tint removed) in `work/extract_frames.py`.
- Type, one job each: **Anton** shouts (NAATI CHICKEN., OUTSIDE., NO ANTIBIOTICS., NAATI), **Geist** is the voice
  (From our farm, FARMS, the phone number), **Fraunces Italic** carries the warm words (The real one, Raised, Lively,
  Healthy, in Bangalore), **Geist Mono** labels (NOW LAUNCHING, CALL TO ORDER, ring text).

## Music and sound (`soundtrack.py`)
- Track: **"Midnight Funk" by Michael Ramir C.**, Mixkit #1147, Mixkit Stock Music Free License (free for commercial
  use, no attribution). Chosen from 12 candidates by measurement: steady beat, an 8-bar intro then a +7 dB drop at bar 8,
  a clean ending; speech recognition found no lyrics in it.
- Beat grid fitted to the track: 117.9675 BPM, first beat 0.012 s; kick attacks sit within 1 ms of the grid (median).
- Edit on bar lines only: song bars 6–15 (2 build bars + the 8-bar drop phrase), then bars 48–51 and the song's ending.
  The song is one F# vamp throughout, so the splice at 20.345 s is harmonically seamless (4 ms crossfade).
- `soundtrack.py` writes `timeline.json`, so the picture and the sound read the same cue times.
- Farm sound: rooster crow (IMG_1593, high-passed to remove a machine hum), flock (IMG_1381), clucks (IMG_1151).
  Effects: 9 Mixkit recordings (see `audio/LICENSES.md`), each levelled against the music around it.
- Master: −14 LUFS integrated, true peak ≈ −3 dBTP before AAC (oversampled limiter).

## How it renders
- Frames: `python work/extract_frames.py` (JPEG sequences in `public/frames/`, graded). Change an in-point → change its
  range there.
- Audio + timeline: `python soundtrack.py`.
- Stills: from `packages/motion-kit`, `node render.mjs --project ../../projects/naati-farms --stills 4.2 11.6 --format jpeg`.
- Final: from `packages/motion-kit`, `node render.mjs --project ../../projects/naati-farms --final --chunks 16 --name NaatiFarms_Launch_v3_30s.mp4`
  (~20 min; `RESUME=1` keeps finished chunks, e.g. to re-mux after a sound-only change).
- Always run render.mjs from `packages/motion-kit` (otherwise Remotion downloads a 300 MB Chrome into the cwd).
