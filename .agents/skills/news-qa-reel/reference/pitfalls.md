# Pitfalls and lessons (from v1-v8 of the news batch)

## What he said, and the fix
| Version | His note | Fix (now the default) |
|---|---|---|
| v1 | "background sounds are too loud" | duck -15 dB per phrase; effects >= 20 dB under the voice band |
| v1 | "too much motion... zoom in and zoom out on my face, it goes in the middle. I hate that" | presenter never moves; no punch-ins/push-ins; one primary motion at a time |
| v1 | "cut my ears and my sound" | ears were fine (checked at 1440); "sound" = clipped word tails -> padded span edges at quiet points |
| v1 | "fact-check me, keep me honest" | the fact-check gate + cut log |
| v2 | wanted faster pacing, no ums or duplicate sentences, face on the left the whole video, mirrored | gap cutting, always-on mirrored cut-out bottom-left |
| v3 | "that's not my face talking" (idle listening footage under ElevenLabs lines) | never play idle footage under a cloned voice; restore his real lines |
| v3 | "I don't even talk in the start, why? I thought I recorded that." | always search every take for his real line before using any fill |
| v4 | loved "someone asks a question, then I answer it" | the format; then he read the questions himself (better than twin/character) |
| v5 | "my face is small... a lot of blank screen" | v6 staging: scale 0.88, graphics top band + right column, captions right column |
| v5 | "make it like someone is asking anonymously in my Instagram DM" | IG DM cards + series tag |
| v5b | "keep cutting the words and spaces... 1.1x, 1.2x" | gap 0.18 / keep 0.05 / speed |
| v6 | "static that keeps going on" in his voice | DeepFilterNet3 at a 20 dB limit |
| v7 | "flawless", but 5% too fast at 1.15x; the CS reel said "train" too many times | speed 1.10 (1.12 for the densest); cut repeated analogy lines |

## Content lessons
- **One analogy, said once.** The CS reel used "train" over and over (bullet / hill / steam / track / "it knows
  how to build trains"); it dragged. Keep the strongest instance, cut the repeats in the spine.
- **Hold rules:** a new picture every ~2 s, but each readable state holds >= 1.2 s and comparisons >= 3 s.
- **Restore real lines.** If he said it in any take, use it; synthetic lines are the last resort.
- **No disclaimers**, no fake usernames/counts on IG-style cards.
- Personal hooks ("I barely write code anymore") beat generic questions.

## Technical failures
- **Remotion "No frame found at position ..."** on long single-segment VP9-alpha mattes: re-encode the matte with
  `-g 15 -keyint_min 15` (`scripts/matte.sh` does).
- **Disk full** (C: at 0 bytes, ~89 GB of `%TEMP%\remotion-v4*-assets*` / `remotion-webpack-bundle-*`): prune after
  every render (`scripts/prune_remotion_cache.sh`), delete `out/bundle-*`.
- **True peak above 0** after AAC on one render: `fix_tp.sh` audio-only remux (TP -2.3, -14.4 LUFS, video copied).
- **10-bit HEVC** from DJI does not decode reliably in Remotion: the proxy is always H.264 yuv420p.
- **DJI audio offset:** the MP4's own audio is ~2 frames late vs lips; the DJI-mic WAV is ~50 ms ahead of the MP4
  audio, i.e. in sync with lips. Use the WAV for the spine; check p/b/m lip closures on a strip if unsure.
- **Whisper:** medium.en on CPU int8; merges repeated words and mishears names. Fix captions with `fix`, never the
  audio. Run a real Python on Windows (the Store `python3` alias fails), and keep faster-whisper on CPU.
- **Framing changes between sessions** (closer camera = ~15% bigger head, 170 px lower): re-measure `SIDE_FACE`
  from a still before laying out graphics.
- **`cue()` throws** when a re-cut removes a word: that is intended; re-point the beat to the nearest phrase.
- **three.js worlds** need `--gl=angle` on Windows and the `kit/three-canvas.tsx` wrapper (no empty first frames).
- Parallel animator agents: give each its own clip folder; lib, beats contract, presenter, captions and Film are
  read-only for them.
