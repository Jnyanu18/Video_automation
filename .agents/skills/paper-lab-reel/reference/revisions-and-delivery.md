# Revisions, Instagram-max delivery, cover, caption and scheduling

How the first film went from v1 to the scheduled post, written as a reusable checklist.

## 1. Revision requests (expect these every time)

Revision notes are often dictated fast and loosely. Decode each item against the transcript,
apply the clear ones, and **name the one you interpreted** in the reply.

| Typical ask | What it usually means | How |
|---|---|---|
| "remove a little bit of the gaps" | pause trimming | `plan_cuts.py` silences (-42 dB, >0.42 s) cut to ~0.33 s |
| "there are two of those words, remove one" | a doubled word ("it can, it can") | `WORD_CUTS` on the first pair; Whisper may merge them, so re-align on a short clip |
| "remove that line" | a standalone line that repeats a later one | cut it with its lead-in; re-point the beat cue to the next phrase |
| "keep that word, I like it" | undo an adjective/filler cut | drop that `WORD_CUT` |
| "remove the follow-me ask, skip to the next part" | a mid-video "keep following me" clause | cut to the next sentence |
| "add an outro in my cloned voice" | a 2-3 s spoken outro over the end card | see section 2 |
| "change the outro text" | change outro + end-card text | regenerate (one take), update `front.tsx` text and the underline span |

Rules: never rewrite the presenter's voice beyond cuts; never add words they didn't say except an
explicitly requested outro; captions, beats and the end card must follow every text change
(`cue()` throws when a cue word is cut: re-point it).

Verification for every audio cut: concatenate the candidate around the cut, re-transcribe with
Whisper, read the line back before committing; after the render, Whisper the final file again.

## 2. Voice-clone outro

- The presenter's own ElevenLabs voice clone, model `eleven_v4` (or `eleven_multilingual_v2`),
  similarity 1.0, stability 0.45, speed 1.1, speaker boost on, `mp3_44100_192`. Quote the
  character cost first and report usage before/after.
- Whisper the take (word timestamps) to confirm the exact words and get the word times.
- Clarity chain: `highpass=75, eq 260 Hz -1.5 dB, eq 3.2 kHz +2 dB, acompressor 2.5:1`, 48 kHz
  stereo, then gain so its integrated LUFS equals the presenter's own last ~13 s of speech;
  10 ms fade in, 60 ms fade out. Save as `source-derived/outro/outro-vN-48k.wav`; keep earlier takes.
- Spine: place it while the end card is growing, then a 1.2 s hold. Add the outro span to the
  music duck list. Sync on-screen accents to its word times (underline on "Follow" at `OUTRO.t`,
  handle pulse near the last word).
- Keep AI-generated audio out of any voice-training library.

## 3. Instagram-max render (default)

1. `scripts/hires_1440.sh`: `proxy-1440.mp4` from the raw (lanczos, crf 12, -g 30, bt709) and
   1440 cut-outs (colour from the 1440 proxy, the 720 u2net alpha upscaled). Python output read by
   bash on Windows must be written with `\n` only (CR breaks `-frames:v`).
2. `presenter.tsx`: `HI = true`.
3. Check 1440 stills of a SIDE cut-out, a full frame and the end card (`npx remotion still ... --scale=1.3333333333333333`).
4. `./render_ig.sh FilmPaper <name> public/bed-paper.wav`, then `./qa.sh`, faststart check, Whisper on the final audio.
5. Receipts from the first film: 1440x2560, 4499 frames, 149.97 s, 14.5 Mbps, ~272 MB,
   -14.4 LUFS, TP -1.5, LRA 2.9, 0 decode errors, no black frames.

## 4. Cover (thumbnail)

- Reference: a flattering, expressive frame of **this take** from the raw (a smile or gesture at
  the hook). Save it with its SHA-256 under `cover/ref/`. Use only approved photos of the presenter.
- Generator: a full-design image generation (not a code-only title card), with the reference
  attached. Each generated image needs the presenter's confirmation.
- The prompt that worked is `examples/cover-prompt-intelligence-compression.md`: the exact headline,
  paper-collage style matching the film (cream board, torn typewriter letters, red paper on the key
  word, tape, pin, red marker, the gold hero object), the presenter as a sticker cut-out in the
  lower half, "keep my face exactly", text inside the 4:5 grid crop, no other text/logos.
- Keep the generated image at its native size; never upscale.
- QA note `cover/QA-v1.md`: generator, reference, size, hash, identity check (glasses, beard, hair,
  skin, lips), exact spelling, crop safety. Acceptance stays open until the presenter says so.

## 5. Caption

Plain words, hook first line (survives the "more" cut), 3 short paragraphs that restate the idea,
one question to drive comments, the follow line matching the outro, 6-8 topical hashtags. No
disclaimer or safe-word lines. Example: `examples/caption-intelligence-compression.md`.

## 6. Scheduling (only on an explicit go-ahead for that post)

With whatever scheduler you use:
1. Check the target day is empty (no duplicate).
2. Upload the **full master**, not a compressed copy. If the uploader has a size cap, find a route
   that takes the real file (for example a direct file-input upload) instead of shrinking it.
3. Read back the stored file's byte size and compare it with the local master.
4. Attach the custom cover and check it at natural size.
5. Paste the caption and read it back.
6. Set the time in the scheduler's timezone and record the exact instant. Trial reel off unless asked.
7. Skip comment automation unless the Reel promises a resource ("comment X").
8. Reload, reopen the item and read back time, caption, cover and video size. Write a receipt,
   including what cannot be verified until it goes live.
