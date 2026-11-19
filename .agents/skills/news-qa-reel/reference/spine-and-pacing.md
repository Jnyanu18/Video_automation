# Spine and pacing (`scripts/build_spine.py`)

The spine is the single source of truth: `public/vo.wav`, `public/proxy-1440.mp4`, `src/words.json`,
`src/vo_env.json`, `src/edl.json`. Everything in the film (beats, world, captions, DM cards, events, mix) is
derived from it, so a change of span, gap or speed retimes the whole reel after one rebuild.

## Inputs (`concept/clips.json`, see `examples/clips.example.json`)
- `video`: the camera file. `audio`: optional mic WAV (in sync with the transcript). `transcript`: the
  faster-whisper JSON of that same audio.
- `items`: in order. `r: [first_word_start, last_word_start]` in transcript seconds (the words whose start is in
  the range, +-0.05 s). Pick ranges by reading `<transcript>.txt`; skip false starts, duplicates, fact-check cuts
  and asides. Reordering is allowed (e.g. a hook from a later take) but keep his meaning.
- `q: true`: a question he reads out. Its words get `q: true` in words.json, which the template turns into an
  anonymous IG DM card automatically (`src/ig/questions.ts`).
- `fix`: caption-only text fixes, first match each, `""` drops the word from captions (audio unchanged).
  Whisper mishearings seen: "dweller" for jeweller, "fall" for follow, "bauble" for bubble.
- `outro_from`: the RAW transcript word where his "follow for more AI news" starts. From there: the end card,
  no captions. Without it, the end card starts 0.15 s after his last word and is silent text.

## Pacing (the approved defaults)
| key | default | meaning |
|---|---|---|
| `gap` | 0.18 | any pause between words >= this is cut... |
| `keep` | 0.05 | ...keeping this much air on each side (removes ums/ahs, which Whisper doesn't time) |
| `speed` | 1.10 | voice + footage sped together. He asked for "1.1x, 1.2x"; 1.15x was "5% too fast"; 1.12x suited the densest clip |
| `tail` | 1.6 | seconds of his footage after the last word (room tone -18 dB) for the end card |

Item edges snap to the quietest 10 ms within +-0.1 s (start padded -0.04 s, end +0.08 s) so no word is clipped;
cuts sit on the 1/30 s grid with 12 ms fades. Earlier gentler settings (v2: pauses > 0.6 s down to 0.42 s)
were "too slow" once he saw the fast cut.

**Speed:** the cut proxy is re-timed with `setpts=PTS/speed` and the voice with `atempo=speed` (pitch kept), from
the same cut, so lips stay in sync; words, outro and the voice envelope are rescaled and the EDL becomes one
segment `{out 0, src 0, len total}`.

## Footage proxy (same spans)
- **landscape-crop** (default for a landscape take): a window `0.76*H` wide x full height, centred on his
  **median face x** (OpenCV Haar, 1 sample/s over the used spans), scaled to 1440x1894 and padded to 1440x2560
  with 666 px empty at the top. The matte removes the background, and the v6 staging places this frame so his head
  is ~y 770-950. A different camera distance changes the head size: re-measure `SIDE_FACE`.
- **portrait**: scaled/cropped to 1440x2560 directly; re-measure `SIDE_FACE` and probably `STAGE.y`.
- Never upscale a take below 1440 wide without saying so; 10-bit HEVC is decoded here once, never by Remotion.

## Denoise
DeepFilterNet3, `atten_lim_db = 20`, in its own venv (`DFN_PYTHON`), after the speed change. Madhav heard
"static that keeps going on" in v6; the noise floor went from -46.9 to -62.4 dBFS with a 97.5% transcript
match. Without the limit it sounds processed. The noisy version is kept as `source/vo-noisy.wav`.

## After every rebuild
1. `scripts/matte_clip.sh <film>` (the matte must come from the new proxy).
2. Re-transcribe `public/vo.wav` and compare to the intended items (missing words, clipped tails, a cut that
   lands mid-word).
3. `npx tsc`: a `cue()` on a word that is gone throws, which is how stale beats are found.
4. Stills at every item start.
