# Audio

## 1. Voice spine (his real voice only)

1. **Record**: he records the voice-over on his PC (any voice recorder app, e.g. `Recording (N).wav`)
   and the face windows on the DJI (mic WAV per take). Archive every untouched original (+ transcript).
2. **Gap cut** (`spine/gapcut.py`): Whisper words -> cut only where a gap between words exceeds
   0.30 s, keeping 60 ms after each word end and before each word start (0.24 s total kept), 15 ms
   fades, then highpass 75 / afftdn -50 / 2.5:1 compressor / loudnorm -16 LUFS. Quantum rec55: 122 ->
   114 s. **Re-transcribe the output and diff the words** (the script exits on any change). The first
   attempt clipped "won't" to "would" and reversed his claim; Whisper caught it.
3. **Takes** (`transcribe_takes.py`, `sync_wav.py`), then the take choice (presenter-and-captions.md).
4. **Splice** (`spine/build_spine.py`):
   - plan: `FACE` pieces (window, take, first word start, last word end, in take seconds), `VO`
     stretches of the voice-over, `ORDER`; internal sentence gaps > 0.30 s split a piece in two;
   - in/out points from a 5 ms energy envelope near Whisper's times (`refine`); 0.12 s of each side's
     own room tone (gap <= 0.24 s); 30 ms fades; same-take neighbours cut at the gap's middle;
   - `IN_AT`: a measured exact in-point where the take runs straight from the previous word into the
     wanted one (133 "When" after "hands": Whisper's 26.38 included the "s" of "hands" -> "your hands,
     your hands"; the envelope trough put it at 26.45);
   - **tone match**: the DJI takes get the voice-over's clean-up chain, then a 1/3-octave-smoothed
     long-term-spectrum EQ match (FIR, clamped +-8 dB, shape only), then a K-weighted loudness match
     of the used speech per take, then the same peak ceiling (oversampled `alimiter`);
   - **seam levelling**: least-squares per-piece gains (limited +-3 dB, weak pull to 0) so speech
     loudness 3 s either side of each voice-over <-> camera seam matches; same-take seams are left to
     natural prosody.
5. **Check**: `spine/seams.py` (click ratio vs the file's 99.9th-percentile jump; LU step per seam)
   and **faster-whisper large-v3 over the whole spine** (save the JSON in `qa/`). v6: no clicks (max
   0.18x), steps <= 0.4 LU except ~+1.4 LU into and out of window 2 (the voice-over itself rises
   3.5 LU across that window, so both sides cannot be met); same-take seams up to ~1.1 LU.
6. Words: `align.py` (medium.en, CPU, proper-noun prompt) + `fix_words.py` (voice-over words carried
   from the gap-cut transcript; kept fixes like "booth" -> "pool"; envelope re-timing of a squeezed
   "hit"; 0.07 s minimum word length). Never hand-edit `words.json`.

Optional outro in his own voice clone only if he asks (paper-lab-reel `revisions-and-delivery.md`).

## 2. Events

Each act exports `scenes/<act>-events.ts` (pure, no React): `ev(id, sec, what, x, dur?)` from the
same constants the scene draws with; `events.ts` adds presenter pop-in/out swishes and collects them;
`dump-events.mts` writes `out/events.json`. Quantum: 139 events (v2) -> 207 cue placements (v5).

## 3. Bed (`audio/mix.py`, `dsp.py`, `designed.py`)

- **Score (SYNTHETIC)**: slow warm pad + plucks, one chord per 2.4 s (quantum: F minor, re-arranged
  per act: a plucked figure on the cover, a pulse under the race, thinning for the myth, resolving to
  Ab major on "follow" and ringing out on the last word).
- **SFX**: CC0 files from the video-edit skill library (`SFX_LIB`: water-plunge, ocean-surface,
  keyboard-typing, servo-arm, winch, vault-clank, padlock, relay-click for the lamp, whooshes...) and
  designed SYNTHETIC sounds; id -> sounds map; unmapped ids are reported.
- **Ducking**: music phrase duck -8 dB (words < 0.4 s apart merged, 0.2 s ramps) and a partial -5 dB
  duck held through gaps < 1.3 s (no swells between phrases); the effects bus ducks **-10 dB in
  1-4 kHz under every phrase**; `place()` caps each effect 16 dB under the voice; effects start a
  frame before the hit, never on a key word. Bed fades to silence over the last 0.75 s.
- Targets (measure, then say they are unauditioned): VO vs bed in 1-4 kHz during speech median ~17.7
  dB, p10 >= ~6 dB, < 25% of 50 ms frames under 12 dB (v2a was 12.7 / -0.8 / 47%: effects masked
  him). Effects density was cut from ~115/min to a sane level by silencing 37 cues.
- Label everything SYNTHETIC or CC0 in the report and say no human has heard it.

## 4. Master

`render_ig.sh`: the rendered mix (vo.wav + bed.wav summed by Remotion) -> two-pass linear loudnorm
to -14 LUFS -> oversampled limiter (192 kHz, limit 0.8) -> AAC 128k 48 kHz stereo. v6: -14.1 LUFS,
LRA 3.6, TP -1.8 dBTP. Run Whisper on the master's CTA (`qa.sh`): small.en hears a short "hit" as
"head" ("head follow"); compare with the raw take and the envelope before calling it a defect, and
fix caption timing via `fix_words.py`, not by re-recording.
