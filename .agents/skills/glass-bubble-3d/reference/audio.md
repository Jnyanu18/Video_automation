# Audio: the "bubble" style

`py audio/mix.py bubble` (real Python 3.13 with numpy + scipy; set `SFX_DIR` to a CC0 SFX folder, default
`~/.claude/skills/video-edit/assets/sfx`). Inputs: `out/beats.json` (`dump-beats.mts`), `out/events.json`
(`dump-events.mts` via `run-dump.mjs`), `src/edl.json`, `src/words.json`, `public/vo.wav`.
Outputs: `public/bed-bubble.wav` (music + SFX, no voice), `out/music-bubble.wav`, `out/mix-bubble-preview.wav`,
`out/cue-sheet-bubble.json`, and a printed VO-to-bed ratio in the 1-4 kHz band.

## Score (SYNTHETIC)
- `STYLES["bubble"]`: Eb major shimmer, chords Ebmaj7 / Cm(add9) / Ab / Bb, 2.8 s per chord, bright pad (1.4), bell
  plucks with long decay (0.7), reverb 4.2 s / 0.34 wet.
- `ARR` (per-beat arrangement) holds the source paper film's ids; unknown ids fall back to `(0.85 gain, 1900 Hz, arp 1)`.
  Add the new film's beat ids there if a section should be quieter (questions) or fuller (the conclusion).
- Resolves on the last word with a tonic pad + chime ringing to the end.

## SFX (cosmos family, `sound_for`)
Keywords in each event's `id + what` choose the sound: glitch/crack -> `D.glitch`; bloom/end card/unfold ->
power-up + chime; whoosh/fly/camera -> `whoosh-deep.flac` (CC0); pulse/node -> blip; check/correct -> `glass-ting.flac`;
otherwise a soft glass ping. Write `what` with those words ("glitch crack soft", "bloom glass soft", "node soft").

## Levels (his v2 note: "background sounds are too loud, I can't even hear my own voice")
- Music `MUSIC_DB` -9 (cosmos family), phrase duck -15 dB under every word and the outro, 0.2 s ramps.
- Effects `FX_DB` -17, and each effect under speech is pushed to >= 20 dB below the voice band.
- Event budget: <= 25 per minute, only real visual hits (the source film: 21 in 59 s).
- Final chain in `render_ig.sh`: VO + bed, 3:1 compressor, gain to about -14 LUFS, oversampled limiter (TP <= -1.5 dBTP).
- Everything here is synthetic or CC0 and has not been auditioned by a human: say so in the final report.
