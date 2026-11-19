---
name: news-qa-reel
description: >-
  Madhav's "news Q&A" Reel FORMAT and PIPELINE ("Microsoft engineer answers your IG questions"):
  he records one news-reaction take (a hook in the first 3 s, then reads questions as if followers
  sent them and answers from talking points); the pipeline transcribes it (faster-whisper CPU),
  fact-checks and cuts untrue claims, builds a tight sped-up spine (gaps/ums cut, ~1.10x voice +
  footage together, face-centred crop, 1.6 s tail, outro detection), denoises (DeepFilterNet3),
  cuts him out (u2net, VP9 alpha -g 15), stages him big bottom-left mirrored with graphics in the
  top band + right column, captions in the right column, a persistent series tag and every question
  as an anonymous IG DM card, then mixes, renders 1440x2560 and runs delivery QA gates. Style-agnostic:
  a visual style only supplies src/world. Use when he says "news reel", "answer IG questions",
  "someone asks, I answer", "Microsoft engineer answers", "make it like the news batch / AI bubble one",
  records a news take with questions, or when another world skill (glass-bubble-3d, iso-diorama-3d,
  retro-space-poster, pixel-arcade, ...) needs this shell. Runs inside cstack animated-video's stages
  and approval stops. Not for pure explainers without his take (animated-video) or plain footage cuts (video-use).
---

# News Q&A Reel (format + pipeline)

Madhav records a short news-reaction take; we turn it into a 35-95 s Instagram Reel where an anonymous
follower's DM asks the question and the real Madhav answers, with an animated world explaining each idea
around him. Madhav called the result (the v7/v8 news batch, five clips, five different styles)
**"absolutely flawless"**. This skill is the **format and the pipeline**, independent of the look: the same
spine, presenter staging, IG components, audio chain and QA work for any world (3D glass bubble, clay
iso diorama, paper trains, retro poster, dossier, pixel arcade...). A new style only writes `src/world/`.

Run it **inside** the cstack `animated-video` skill (Remotion; read it first). Its approval stops,
full-quality delivery, four separate QA states and "no publishing without approval" always apply.

Reference files (read at that stage):
- [reference/recording-format.md](reference/recording-format.md): the take format, hook rules and the **recording-script template** to send him.
- [reference/fact-check.md](reference/fact-check.md): the gate, the cut log, what goes on screen.
- [reference/spine-and-pacing.md](reference/spine-and-pacing.md): `build_spine.py` in detail (items, gap/keep/speed, crop, proxy, tail, outro, denoise).
- [reference/staging-and-layout.md](reference/staging-and-layout.md): v6 presenter staging, layout zones, captions, series tag, DM cards, hook, comment and end cards.
- [reference/audio-render-qa.md](reference/audio-render-qa.md): score + ducking, loudness, render, true-peak fix, QA gates, disk housekeeping.
- [reference/optional-fills.md](reference/optional-fills.md): ElevenLabs clone lines, HeyGen twin, original-character questioner.
- [reference/pitfalls.md](reference/pitfalls.md): lessons and known failures with fixes.
- [reference/pipeline-commands.md](reference/pipeline-commands.md): every command in order.
- [template/README.md](template/README.md): the Remotion shell, what a world must supply, the sample world.
- `examples/`: the real batch's recording script, fact-check cut log, hook scores, beat table and spine config.
- Look: `../../docs/news-qa-reel/style.jpg` (one frame) and `storyboard.jpg` (the five styles in story order).

## When to use

- He has recorded (or will record) a news / opinion take and wants Reels from it, in the "someone asks, I
  answer" format.
- A world skill (glass-bubble-3d, iso-diorama-3d, retro-space-poster, pixel-arcade, or a new one) needs the
  shell: presenter, captions, DM cards, audio and QA.
- Not for a faceless explainer, a plain cut of a talking head, or a voice-only canvas video.

## Non-negotiables

1. **His real self.** Real face, lips and voice from the take; never regenerated or retouched. Cut-outs are
   local mattes of the same pixels. Prefer his recorded lines over any synthetic fill (he noticed every time).
2. **Facts only what is true, and only what he says.** Fact-check every claim; cut untrue ones from the spine
   (log each cut); on-screen fact chips may add verified context. No disclaimers or safe-word lines.
3. **Calm motion.** He never zooms, slides or leaves; no zoom toward his face ("it goes in the middle, I hate
   that"). One primary motion at a time, holds >= 1.2 s, no perpetual wobble.
4. **Every time comes from his words** (`cue("phrase")`), so a re-cut or speed change retimes everything.
5. **Delivery quality:** the verified 1440x2560 master, never a proxy or shrunken copy. No upload, scheduling,
   sharing or paid generation (ElevenLabs, HeyGen) without his explicit approval for that action.
6. **Raw is read-only:** hash the camera files, copy them off the card, work from derived files.

## Stages and approval stops

Keep `CHECKPOINT.md` current: deliverable, sources + hashes, fact-check log, approvals, per-version receipts,
the four QA states.

**0. Script (before he records).** Fill the template in [recording-format.md](reference/recording-format.md)
per reel: 2-3 hook options (star one), 2-3 questions he reads, talking points (not a script), the comment ask,
"Follow for more AI news". Bold the words existing animations trigger on. Facts in the talking points must be
verified first. Send it; he records.

**1. Intake.** Copy takes off the card, `sha256sum`, ffprobe (DJI: HEVC 10-bit, 29.97; a DJI-mic WAV is ~50 ms
ahead of the MP4's own audio, which is itself ~2 frames late vs lips: use the WAV). Copy the voice WAV to his
voice library if he keeps one. Transcribe with `scripts/transcribe.py` (medium.en, CPU int8).

**2. Fact-check gate.** Every checkable claim -> true / false / unverified / opinion, with a real source.
False or unverifiable -> cut from the spine (or reword on screen as a chip); record the cut, the reason and the
source in CHECKPOINT.md ([fact-check.md](reference/fact-check.md)). Opinions get a "Madhav's take" label where
natural.

**3. Concept + hook -> APPROVAL STOP 1.** Per reel: the item list (source ranges, which are questions), the
frame-0 headline (= his spoken hook, exactly), the world/style, and the virality score card
(`examples/virality-scores.md`). If he already asked for "the full batch", this is an internal check but
record it.

**4. Spine.** `concept/clips.json` -> `scripts/build_spine.py` -> `scripts/matte_clip.sh`. Defaults are the
approved ones: gap 0.18, keep 0.05, **speed 1.10** (1.15 was "5% too fast"; 1.12 suited the dense DeepSeek
clip), DeepFilterNet3 at 20 dB, 1.6 s tail. Re-transcribe `public/vo.wav` and diff against the script.

**5. Style frame + key-frame board -> APPROVAL STOPS 2 and 3.** `scripts/install_template.sh film/`, write
`src/beats.ts` and `src/world/` for the chosen style (or use a world skill), `snap.sh` stills at 0, each item
start, each question, the end card and the last frame. Check every still for: his head clear, captions in the
right column, nothing in the IG UI zones, no big empty areas. Show the board.

**6. Finish.** `scripts/finish_clip.sh film <style> <name>`: mix, render 1440x2560, true-peak gate, QA gates,
cache prune. Look at the contact sheet, cuts sheet, frame 0 and the last second yourself.

**7. Final review -> APPROVAL STOP 4.** Deliver the master path(s); report the four QA states separately
(Technical receipts, Factual cut log + chips, Creative = what you actually reviewed and that you cannot hear
or watch it, User acceptance = none until he says so). No upload or schedule until he says so.

## The look of the format (any style)

```
 y 0-220     IG UI (keep clear)
 y 230-276   [ series tag pill: MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS ]   frame 0 -> end
 y 280-760   TOP BAND: hook headline (frame 0-~3 s), DM question cards, main diagrams, comment card, end title
 y 770-1290  his head (x 0-680)            | RIGHT COLUMN x 700-950: chips, nodes, follow card
 y 1300+     his body to the bottom edge   | CAPTIONS x 692-950, 3 lines max, 54 -> 42 px
 bottom 380 / right 140: IG UI (keep text clear)
```

Presenter: scale **0.88**, translate (-80, 234), **mirrored**, right edge feathered 82% -> 100%, always on,
end card included (`template/src/presenter.tsx`). Questions: **anonymous IG DM cards** ("Anonymous", "?" avatar,
paper-plane "IG question", purple-blue bubble with the exact question; no usernames, photos, times or counts).
Answers: a small "A / MY ANSWER" tag once or twice per video. The comment ask: an IG comment box whose
placeholder becomes his words when he says them. End card: the title question in the top band, "Follow for
more AI news" + handle in the right column, synced to his spoken outro (or silent if he didn't say it).
The series tag, handle and CTA are parameters in `template/src/series.ts`.

## What he liked / disliked (protect these)

- Liked: "someone asks, I answer" ("it feels natural, it feels fun"); his face big (crossing 50% of the
  frame) and always there; fast pacing with no ums, duplicates or dead air; DM-card questions; one rich,
  colourful world per reel; facts checked ("keep me honest").
- Disliked: zooms/punch-ins toward his face, too much motion, background sound too loud, idle "listening"
  footage under a cloned voice ("not my face talking"), his recorded lines replaced by a clone when he had said
  them, a small face with blank screen, the same analogy repeated ("train" too many times), 1.15x speed.

## Done when

All four approval stops are recorded; each master passes `qa.sh` gates (1440x2560, H.264 yuv420p tv, CFR 30,
AAC 48 kHz, 0 decode errors, no black frames, -15..-13 LUFS, true peak <= -1 dBTP, faststart, <= 300 MB,
<= 25 Mbps); the fact-check cut log is in CHECKPOINT.md; the four QA states are reported separately; and nothing
was uploaded, scheduled or paid for without his explicit approval.
