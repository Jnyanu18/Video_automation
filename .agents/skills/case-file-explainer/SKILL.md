---
name: case-file-explainer
description: >-
  Madhav's "Case File" investigative explainer: a documentary "evidence room" look adapted for
  Reels / Shorts / YouTube (charcoal ground, white-glow photo cards with torn name tags, dark
  street-map "system maps" with a glowing red route, white clay 3D dioramas, testimony quote
  cards with real sources, red date stamps, footnote markers, serif chapter titles), driven by a
  calm narrator over a continuous dark-ambient score. Use when asked for a "case file",
  "evidence room", "investigation", "true-crime / documentary style" or "how X was discovered /
  hacked / leaked" video, for a tech incident, breach, outage, scandal or history story.
  Runs inside the animated-video skill's stages and approval stops. Not for upbeat concept
  explainers (vector-world-explainer), paper collage over presenter footage (paper-lab-reel) or
  plain footage edits (video-use).
---

# Case File explainer

An investigation told as evidence: who, where, when, and what the record says, with one red
accent that always means "this is the evidence". The tension comes from calm restraint: no
hype words, no fast cuts. Instead, a camera that never stops drifting, a score that never goes
silent, and facts that land on the narrator's exact words.

Run it **inside** the cstack `animated-video` skill (Remotion; read it first) and keep its
approval stops, full-quality delivery and four separate QA states (technical, factual, creative,
owner acceptance). This skill adds the art direction, the shot vocabulary, the audio recipe and a working kit.

- Working example to copy from: `template/` (the 30 s xz-backdoor demo: `src/kit/casefile.tsx` = the kit,
  `src/scenes/*` = one scene per shot type, `audio/score.py` = the score). Screenshots: `../../docs/case-file-explainer/`.

Design fresh for every story. Copy the method and the kit, not the xz film's shots.

**Clarity comes first.** Our second Case File (a PHP remote-code-execution story) looked polished but was
hard to follow. For any video that explains *how something works*, plan it with the `decode-explainer` skill
(concept ladder, toy model first, legend on screen, one idea per screen, jargon only after it's
defined, type scale ≥ 44 px) and use this skill only for the evidence-room look and the investigation beats.

## 1. Story: the investigation spine

Investigation stories only work when the stakes are real and every claim is sourced.

- **Hook (0-3 s):** the anomaly, stated as a fact with a number ("his logins were half a second
  slow"). Frame 0 is the cover: a serif headline plus the evidence object, never black.
- **Trace (middle):** follow the evidence through places and people. One beat per 2-4 s:
  date stamp, then person card, then the route on the map, then the object that was found.
- **Reveal:** the drop-out moment. The music falls away and one red thing ignites.
- **Record:** a testimony card quoting the real primary source (email, testimony, report),
  with the author and date under it, plus a footnote number. Never invent a quote; mark
  reconstructions as "reconstruction".
- **Ending:** a serif title that restates the hook as a verdict ("Half a second."), a red rule
  and the case number. Hold it, then fade out on purpose. Add a spoken comment CTA only when
  the creator wants one; if there is a CTA, it is spoken in full.
- Short form: 30-45 s, 4-6 shots. Long form (YouTube): chapters with "Chapter I" serif title
  cards.
- Put every fact in `NOTES.md` with its source and verification state before it reaches the
  screen. The facts gate the film.

### Educational variant (security incidents): the default for this format

Make these educational: help people understand what it is, why it happened and what they can
do to be protected. Spine (~55-60 s, 6 shots):
1. **Cover/hook:** date stamp, serif incident name, severity stamp and CVE tags, all visible at frame 0.
2. **Scale:** why it matters (how much of the web or how many users), with a sourced stat and footnote.
3. **What it is:** a pipeline diagram of where the bug lives (internet, web server, engine, app).
   The request travels down the red route, the broken stage turns red, and the consequence appears
   (e.g. a stranger's shell prompt). Define the jargon on screen ("shell = a command line on your server").
4. **Why it happened:** the root cause as a white clay 3D metaphor (memory as blocks: half-built
   stacks, freed ghost blocks with surviving pointers), plus a 3-line benign code card (`malloc`/`free`).
5. **Timeline + reality check:** dated pins (oldest affected code, first attack, leak, patch),
   then a testimony card from a primary source that keeps the risk in proportion.
6. **Protect:** a "how to check" terminal (`php -v` and the fixed version), a numbered checklist
   timed to the VO, and a footer for edge cases (EOL versions, WAF as a stopgap only).
7. **Verdict + CTA:** a two-line serif verdict and a save/follow CTA.

Educational safety: explain the attack class conceptually. Never show payloads, request bodies,
offsets or step-by-step exploitation. Name the fix and how to verify it.

## 2. Look (art bible)

| Element | Rule |
|---|---|
| Ground | Charcoal `#0d0d0e` with a soft radial lift; vignette and fine grain always on |
| Accent | One red `#ff2d2a`, always glowing (triple text-shadow + bloom). Red = evidence: the route, the anomaly, the suspect, the key word. Nothing else is coloured |
| Content | Monochrome: off-white `#f2f0ea`, dim `#8d8b86`; archival photos in B/W |
| Type | Serif titles (Source Serif 4 700); typewriter body/labels (Courier Prime 700); data/date stamps (IBM Plex Mono 700, letter-spaced caps) |
| Photo card | B/W photo, white border with slightly torn edges, white glow; role line in caps mono; black name tag with a torn white edge. Unknown person = blurred card with "NO KNOWN PHOTOGRAPHS" |
| System map | Dark street-map of thin grey lines, a few thick arterials and curved highways, huge letter-spaced serif district watermark ("D E B I A N"); the path draws in glowing red with a white head; pins are name tags with a pointer |
| Diorama | White clay 3D models (three.js): matte white blocks on a light-grey ground, soft shadows, fog. The one red object lights its surroundings when it ignites |
| Quote card | Large serif quote marks, white rules, mono text typed on, key word red, source line and date below |
| Date stamp | Red glowing clock + "FRIDAY, MARCH 29, 2024" + one context line |
| Footnotes | `[n]` in dim mono at top right whenever a sourced claim is on screen |

Safe zones for 9:16: keep content in x 60-960 and y 240-1440. Captions sit at y ~1470, in mono
on a dark tag with key words in red. Never place them over a face.

## 3. Motion

- **Few hard cuts.** Long documentaries in this register cut only a handful of times in ten minutes. Shots link through
  content: dive into the red stamp, which becomes the map's start node; dive into the map's red
  node, which becomes the red 3D block.
- **The camera never stops:** slow push-ins (5-8 % per shot), pulls out to reveal context, and
  route-following pans. Ease every move in and out; zoom in log space.
- Cards pop with a damped spring (scale 0.82 to 1); tags drop 18 px into place; text types on.
- The red route draws at the narrator's pace: the head reaches each node on its word.
- Change something every 1.5-3 s and land each hit within 2 frames of its word.

## 4. Audio recipe

- **The score never stops.** No silence below -45 dB in the first 5 minutes. A dark ambient
  drone/pad in a minor key; music-only cold open (~12 s in long form, ~0 s in Reels).
- **Narration on top, music about 10 dB under it.** Duck from the VO envelope (sidechain-style).
  Swell the music in VO gaps of 0.6 s or more, and drop it out just before the reveal word.
- Long-form target: about -16 LUFS integrated, LRA about 6 LU. Calm and dense, not dynamic. Deliver Reels at
  -14 LUFS / -1.5 dBTP.
- **SFX are sparse and physical:** typing ticks for typed text, soft thuds when cards and tags
  land, data chatter while a route draws, a sub-drop on the reveal, a glass ping or chime on
  the verdict.
- **Voice:** a calm, low, measured narrator: short declaratives, pauses after facts. Use the
  creator's own recording first; a voice clone needs spend approval. A TTS stand-in is for drafts
  only and must be labelled.
- `audio/score.py` in the example builds the whole score and mix from the word timings.

## 5. Pipeline

1. Facts and sources go into `NOTES.md`; get the script and beat sheet approved (animated-video
   stop 1).
2. VO, then `words.json` (Whisper or the TTS word boundaries); fix token splits in
   `audio/fix_words.py`.
3. Define the acts in `src/lib.ts` from `cue()`; build the score with `audio/score.py` using the
   same cues.
4. Copy `src/kit/casefile.tsx` and the scene patterns; render a key-frame board with `snap.sh`
   (stop 2: style frames / key frames).
5. Render at `--scale=1.3333333333333333` (1440x2560), then do a two-pass loudnorm to -14 LUFS,
   H.264 High, CRF 14, maxrate 24M, yuv420p limited range, BT.709 tags, faststart.
6. QA: full decode, blackdetect, loudness, a contact sheet, dense frames around every
   transition, and Whisper on the VO. Report the 4 QA states separately.

## Gotchas found building the first one

- A whole-script edge-tts run paces slowly (88 s for 180 words). Use
  `scripts/tts_lines.py` (one TTS call per line, controlled gaps,
  "|" starts a section), then `scripts/squeeze.py` (shortens pauses over 0.45 s and remaps word
  timings): 68.6 s became 58.5 s.
- `cue("Before")`, `cue("PHP")` and other repeated words throw. Use 2-word phrases, or pass `nth`.
- In the 3D wide shot, a single row of blocks leaves the frame empty. Add back rows (z = -1.6, -3.2, -4.8) for depth.
- Hold the camera on a bug's slot until about 6 frames before the next beat. Moving earlier pushes the subject off frame mid-sentence.
- An overlay card must be on screen for at least 1.5 s. Start it on the earlier word, not the last one.
- Through a shared browser, navigation can land in whichever tab is current, including the
  user's own tabs. Select your own tab first.

- edge-tts returns "March 2024" as one word boundary. Split it before `chunk()`, or the captions throw.
- `cue("It")` and other repeated words need `nth`, or a longer phrase (`cue("It had")`).
- An emissive red cube plus the bloom finish blows out to orange/yellow. Keep the emissive at
  0.5 or below, the base colour dark (`#b8120c`) and the scene bloom at 0.5.
- In portrait 3D, the tower has to sit between the card band (y 300-750) and the captions
  (y 1470). Pull the camera back about 23 units for a 6-unit-tall model.
- HTML zoom on the terminal crops its edges past about 1.12x. Zoom to the readout, not to a corner.
- A map-node label wider than about 300 px runs off frame. Centre it under the node.
