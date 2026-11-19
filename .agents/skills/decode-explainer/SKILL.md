---
name: decode-explainer
description: >-
  Madhav's "Decode" explainer: makes a technical idea (a hack, a bug, an algorithm, how a system
  works) easy for a non-expert to understand, using a step-by-step visual decoding method (toy
  model first, a legend that stays on screen, one idea per screen, one colour = one meaning, cause
  and effect side by side, worked examples), in a neon-on-purple look, with the creator's HeyGen
  avatar (transparent cut-out) coming and going, and two voice versions (English and Hinglish)
  from the creator's own ElevenLabs voice clone. Use when asked to explain or
  "decode" a tech topic, wants an explainer that is "easy to understand", asks for English + Hinglish
  versions, or an educational security/tech Reel with his avatar. Runs inside animated-video's
  stages and approval stops. For the dark evidence-room look use case-file-explainer (and apply the
  clarity rules here); for real on-camera takes use vector-world-explainer.
---

# Decode explainer

**The bar:** a viewer who has never heard of the topic can explain it back after one watch, with the
sound off for the visuals and with the sound on for the words. If a frame needs the narration to make
sense, or the narration needs a frame that isn't there yet, the shot fails.

Why this skill exists: our first security Case File looked polished but was hard to follow. The
lessons: it hurried the core mechanism, used jargon before defining it, put too many things on each
screen, used colour as decoration rather than meaning, and opened on real artefacts before the
viewer had a mental model. This skill fixes each of those.

Run it **inside** the cstack `animated-video` skill (Remotion) and keep its approval stops,
full-quality delivery, four separate QA states and no publishing without explicit approval.

## 1. The teaching spine (plan this before any visuals)

Write a **concept ladder**: the 4-7 ideas the viewer must hold, in order, each one built only from
ideas already on the ladder. For each rung write:
- the one-sentence takeaway (plain words, no jargon),
- the **toy model** that shows it (an everyday object or a tiny version of the real thing),
- the **legend** that maps the toy model to the real thing,
- the **real artefact** that proves it (real code, real terminal, real headline, real number).

Rules for the ladder:
1. **Toy model first, real thing second.** Gradient bar, then pixel grid, then the real photo.
   Lockers, then memory addresses. Never open a rung on the real artefact.
2. **Each rung gets 6-10 s** of screen time and at least one *second example* if it is the core
   mechanism. Hurrying the mechanism is the #1 cause of "not easy to understand".
3. **Define before you use.** A word appears on screen only after the narration or the legend has
   defined it. CVE numbers, CVSS, protocol and library names go on the end card, not the teaching shots.
4. **Ask the viewer's question out loud** before answering it ("so what actually broke?"). The avatar
   is the best place for these questions.
5. End with **what to do**: 2-3 actions max, each one a verb plus an object, plus how to check it.

Get the ladder approved (animated-video stop 1) before style frames.

## 2. Screen grammar (every shot)

- **One idea per screen.** One diagram, centred, big; at most one headline label and the caption.
  Delete anything that doesn't serve this rung (map textures, footnotes, tags, stamps).
- **A legend stays on screen** while the example runs: a key strip (colours, a gradient, symbols) with
  a pointer that moves to show the current value. The viewer should never have to remember a mapping.
- **Cause and effect side by side.** Left: the thing that changes; right: what it causes. Highlight
  both at the same moment, with the same colour, on the same word.
- **Colour = meaning, introduced once, never reused.** Pick 3-4 accents and say what each means the
  first time it appears (e.g. teal = in use, grey = free, red = attacker-controlled, gold = the fix).
- **Worked examples, not claims.** Show the number being computed or the step being taken.
  `0.807 s - 0.299 s = 0.508 s`, not "+508 ms".
- **Zoom in to explain, zoom out to connect.** Go into one cell or one step, then pull back to show
  where it sits in the whole system, and back again.
- **Repeat the motif.** The same toy objects come back in later rungs (the locker from rung 2 is
  the locker the attacker uses in rung 5).
- **Type scale (1080x1920 canvas):** labels ≥ 44 px, nothing under 34 px, captions 48-56 px, headline
  80-120 px. Max ~7 words per label.
- **Safe zones (9:16):** content x 60-1020, y 240-1440; captions at y ~1470-1560; avatar zone see §4.
- **Hold.** Every finished state holds ≥ 1.2 s before the next change; comparisons hold ≥ 2 s.

## 3. Look (default; choose per video)

Screenshots: `../../docs/decode-explainer/`.
- Ground: deep purple-magenta radial gradient (`#2b0624` edges → `#5a12a0` centre glow) with a faint
  checker/noise texture. Content glows; there are no flat grey boxes.
- Neon accents with soft glow: teal `#19e3b1` (signal/active), electric blue `#2f8bff` (constants),
  orange-gold `#ffb02e` (the hero object/data), green `#3ddc84` (results/the fix), red `#ff3b4e` only
  for danger/attacker. Real photos sit in white glowing frames.
- Type: a clean geometric mono for numbers and labels (JetBrains Mono / IBM Plex Mono, bold, caps
  for labels), a serif or bold sans for headlines.
- Physical close-ups for mechanisms (the key turning inside the lock): when something "happens inside",
  show the inside, large.

## 4. HeyGen avatar: coming and going

- Use the creator's own HeyGen avatar group and the look they approved (record the look ID in the
  project, not in the skill). Confirm the look with them if a new one is requested.
- **Transparent background:** `create_video_from_avatar` with `outputFormat: "webm"` (VP9 alpha;
  background removal is automatic) and `audioAssetId`/`audioUrl` of the **final ElevenLabs VO** for
  that language, so the lips match the voice we ship. Fallback if the look doesn't support matting:
  a solid `#00ff00` background plus a local matte (vector-world `presenter/matte.py`).
- **Bursts:** 3-4 s each (one sentence), 4-5 per ~75 s video: the hook question, one or two re-hooks
  ("so what actually broke?"), the summary, and the CTA. Generate **all bursts of one language in
  one job** (concatenate their audio and record the offsets), then split by time.
- Staging: a cut-out at the bottom-left or bottom-right, chest-up, about 42-48 % of the frame height,
  sliding or popping in from the side with a soft rim light in the scene's accent colour, then
  leaving the same way. When he is on screen the diagram shifts aside (it never hides behind him);
  captions go above him, never over his face.
- Costs: check HeyGen's current per-second price and quote it before generating; get approval for the spend.
  **Download the result as soon as the job finishes** and verify alpha (`alpha_mode=1`), fps (25),
  and the lip sync against the VO.
- Code: reuse `../vector-world-explainer/template/src/presenter-heygen/` and
  `presenter/heygen_measure.py`. Play through `OffthreadVideo transparent muted` and map by time.

## 5. Two voices: English and Hinglish

- **Voice:** the creator's own ElevenLabs voice clone (`ELEVENLABS_VOICE_ID`). Settings that worked
  well: `eleven_multilingual_v2`, stability 0.45, similarity 1.0, style 0, speaker boost, speed 1.1.
  An `eleven_v4` experiment used stability ≈ 0.33 and clone_strength ≈ 0.75. Language `en` for
  English and `hi` for Hinglish where the model supports `language_code` (multilingual_v2 ignores it).
- **REST route** (when a setting isn't exposed by the MCP tool, e.g. `clone_strength` on v4, or when you want
  exact timings): `POST /v1/text-to-speech/{voice_id}/with-timestamps` authenticated by the
  `ELEVENLABS_API_KEY` environment variable (never print, copy or save the key). It returns
  character-level alignment (no Whisper needed for timings; still Whisper-verify the words) and a
  `character-cost` header. Script: `scripts/el_tts.py` (edit its MODEL/SETTINGS).
- **Hinglish script:** write it the way he talks: Hindi sentence structure, English tech words kept in
  English. Write Hindi words in **Devanagari** for the TTS (correct pronunciation) and keep a
  **Roman-script** copy for captions (what his audience reads). Both versions share the same
  ladder, shots and avatar windows; only the timings differ (cue by phrase from each language's word
  timings).
- **Cost:** quote before generating; the per-response `character-cost` header is exact. Report usage before and after.

## 6. Pipeline

1. Facts and sources go into `NOTES.md` (as in case-file-explainer). Write the concept ladder, plus the
   English and Hinglish scripts, then **stop for approval** (ladder, scripts, costs).
2. Style frame of one rung (legend + toy model) in this look, then **stop for approval**.
3. Generate the VOs (settings above; REST with-timestamps for timings), clean them (highpass, gentle denoise, light compression, loudnorm), get the word
   timings, then Whisper-verify both languages.
4. Pick the avatar windows on sentence boundaries in **each** language. Build one HeyGen job per
   language from the concatenated window audio, as webm with alpha.
5. Build the scenes with the cues shared across languages (`cue()` phrases differ per language: keep a
   `cues.<lang>.ts` map from rung events to phrases). Key-frame board, then **stop for approval**.
6. Render both at 1440x2560 (`--scale=1.3333333333333333`), loudnorm -14 LUFS, H.264 CRF 14
   maxrate 24M, faststart. QA: decode, blackdetect, loudness, Whisper on the delivered file, dense
   frames around each avatar entry/exit and transition, and the **comprehension check** below.

## 7. Comprehension check (before calling it done)

For each rung, look at its key frame with the sound off and write what it says. If it doesn't match
the takeaway, fix the shot. Then read the caption track alone: does it teach the ladder? List any
term used before it was defined. Report the result honestly; this is a creative check, separate from
the technical QA and from the creator's acceptance.
