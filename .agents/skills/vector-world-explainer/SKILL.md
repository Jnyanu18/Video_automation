---
name: vector-world-explainer
description: >-
  Madhav's "Vector World" explainer Reel: a rich, saturated flat-vector science-explainer world
  (indigo night study, one glowing gold hero object, camera that never stops, transitions
  through objects) that teaches a CS / tech / science concept, with Madhav himself floating over the
  animation as a real-face cut-out (his own on-camera takes, matted on the GPU) and his own recorded
  voice as the spine. Use when asked to "make it like the quantum one", for a rich flat-vector
  science-explainer style, a CS concept explainer with his floating face, "teach X with
  animation", or an animated explainer of a tech concept from a script he will record. Runs inside the
  animated-video skill's stages and approval stops. Not for paper-collage looks over a single talking
  take (paper-lab-reel), real-3D glowing worlds (luminous-cosmos-3d), black marker canvases
  (canvas-explainer), or plain footage edits (video-use).
---

# Vector World explainer (flat-vector world + floating real-face presenter)

One recurring gold hero object carries an idea through a cosy, glowing flat-vector world; every
beat lands on Madhav's own words; he floats over the live animation as a real cut-out at the hook
and the important moments. The first film is the quantum-computer explainer (October 2026, v2 -> v7;
screenshots in `../../docs/vector-world-explainer/`). This skill is the method,
not that film's content: design a fresh hero object, world and scenes per topic.

Run it **inside** the cstack `animated-video` skill (Remotion; read it first; never edit
it, it is a cstack checkout). This skill adds the recording script, the presenter's voice spine, take choice,
GPU matting, the floating presenter, the Vector World art direction and the proven audio/QA chain.

Reference files (read when you reach that stage):
- [reference/art-direction.md](reference/art-direction.md): palette, materials, light, the coin hero object, the full scene vocabulary.
- [reference/presenter-and-captions.md](reference/presenter-and-captions.md): real-face presenter (takes, sync, matting, staging, zoom cuts), HeyGen fallback, captions off the face.
- [reference/audio.md](reference/audio.md): voice spine (gap cut, splicing, tone/level match, seams), events, score, SFX, ducking, mastering.
- [reference/pipeline-commands.md](reference/pipeline-commands.md): every command in order with QA receipts.
- [reference/pitfalls.md](reference/pitfalls.md): every failure we hit and its fix.
- [template/README.md](template/README.md): starting code; reusable kit vs quantum-specific example scenes; the marked config.
- `examples/`: TAKES.md and the fact-check NOTES of the first film; its contact sheet, key-frame board and style frame are in `../../docs/vector-world-explainer/` (the quality bar; never reuse the content).

Sibling skills: [paper-lab-reel](../paper-lab-reel/SKILL.md) (paper collage over one talking take),
[luminous-cosmos-3d](../luminous-cosmos-3d/SKILL.md) (real 3D). They share the spine, captions and
QA ideas; the GPU matte route here is faster and sharper than paper-lab's u2net CPU route.

## Non-negotiables

1. **His real face, lips and voice are never regenerated.** Picture and voice of a face window come
   from the same take at the same source times. Cut-outs are mattes of his own pixels (alpha >= 0.985
   keeps the untouched source pixel). No lip-sync, relighting, face retouch, voice clone or TTS of
   his lines unless he explicitly asks for that specific thing.
2. **Raw sources are read-only** (`<RAW_TAKES_DIR>` camera card, voice recordings folder). Work from
   derived copies; never write next to the raw. Leave earlier projects and versions untouched (build
   v(n+1) in a new `film-vN/` with `node_modules` junctioned).
3. **Never rewrite his voice for facts.** Corrections are on screen (caption `show`, a tag, an exact
   number); spoken words stay. Silence is cut only in word gaps, verified by Whisper.
4. **Archive every take** in the presenter's own voice library (untouched copy + transcript) if they
   keep one. Check byte sizes first; do not duplicate.
5. **Every time comes from his words** via `cue("phrase")`; re-align and the film re-times.
6. **Approval stops are real stops** (below). No upload, scheduling, posting, sharing or paid
   generation (HeyGen credits, ElevenLabs, image gen) without his explicit approval for that action.
7. **Delivery quality:** the full-quality 1440x2560 master only; never shrink resolution
   to fit a limit; cap bitrate with VBV instead.
8. **Identity:** only frames of his current takes, or photos he has explicitly approved. Respect any
   photo he has asked never to be used, including derivatives.
9. **Disk:** check free space before heavy steps. A nearly full system disk once killed two renders;
   put ProRes masters, Remotion temp and renders in `<HEAVY_TEMP_DIR>/<slug>` (`config.sh`).
10. **Checkpoint after every step** (`PROGRESS.md` checklist at the top, `ISSUES.md` table). A
    sub-agent crashed with API 409 mid-build; state must survive a lost session or agent.

## Stages and approval stops

### Stage 0 - Concept with 3 options -> APPROVAL STOP 1 (animated-video step 1)
Three concepts, each with logline, hero object, world, shape (myth-and-mechanism worked: "everyone
thinks X; the real trick is Y"), and why it teaches. Recommend one. Include the fact-check plan.
Wait and record his choice verbatim.

### Stage 1 - Script for him to record
Write `SCRIPT-record.md`: short spoken lines in his register (plain words, a 3 s hook, a spoken CTA
"hit follow" or comment keyword), grouped into **clips**: the voice-over parts (recorded on his PC,
a voice recorder app, or the DJI mic) and the **face windows** (4 clips of 7-20 s: hook, the myth
or turn, his own analogy, why-it-matters + CTA) shot on camera. Shooting notes that matter (from
quantum v6): DJI vertical 4K 30, chest-up, plain wall, same outfit; **look into the lens, not the
script screen** (every v6 take looked off-lens toward a screen on his left); keep hands below the chin
(several best sentences were lost to a hand over the mouth); say each line 2-3 times; 2 s of silence
before and after. Never write lines that state numbers you have not checked.

### Stage 2 - Ingest his takes (no approval needed)
1. Copy every take to the voice library (rule 4). Hash or record the raw paths.
2. Voice-over recording: `spine/gapcut.py` (cut only gaps > 0.30 s down to 0.24 s, 60 ms pad around
   words, re-transcribe and diff; it fails on any word change). The lesson: an energy-threshold cut
   clipped "won't" into "would" and inverted his claim ("it would make Instagram faster").
3. Takes: `transcribe_takes.py` (medium.en, CPU), `sync_wav.py` (WAV <-> MP4 lag), `gaze.py`
   (YuNet yaw; |yaw| < 0.35 = to lens), `takesheet.py` + `facestrip.py` (hands over the face, blinks).

### Stage 3 - Fact-check (feeds the board)
`NOTES.md`: every checkable claim with time, status, real source, treatment. Treatments: exact
numbers on screen (exact 10^25, exact 2^50 = 1,125,899,906,842,624), caption `show` replacements for
garbled lines ("300 more than would be like an atom" -> "300 qubits -> more combinations than atoms in
the universe."), small honest tags ("Willow, Dec 2024 · benchmark task", "AI-decoded error
correction"), grammar-only caption fixes. Never re-record or alter his audio for a fact. Example:
`examples/fact-check-NOTES-example.md`.

### Stage 4 - Style frames -> APPROVAL STOP 2
Three styles on the **same beat geometry** (quantum: flat vector vs luminous 3D vs line-art canvas;
he picked flat vector). If he already asked for "like the quantum one", one style frame of an
information-heavy beat with the presenter cut-out placed and a caption, for sign-off. Before it, run
a **3-5 s matte test** (`presenter/matte.py test`) and inspect `mattesheet.py` (hair, glasses, hands,
no wall halo). Example: `examples/style-frame-flat-vector.jpg`.

### Stage 5 - Take choice, spine, skeleton, key-frame board -> APPROVAL STOP 3
1. **Choose takes per sentence** across all takes, judged by: exact words (Whisper, large-v3 on
   doubtful numbers), lens time (gaze), no hand over face/mouth, energy, his stated favourite (give it
   the largest share it earns, and say where it lost on merit). Join on sentence boundaries. Write
   `TAKES.md` (example in `examples/`) and `qa/takes-sheet.jpg`.
2. **Spine** `spine/build_spine.py`: voice-over stretches + face pieces, word-boundary cuts refined on
   a 5 ms envelope, gaps <= 0.24 s, 30 ms fades, DJI takes EQ- and loudness-matched to the voice-over,
   per-piece seam levelling, `IN_AT` measured in-points where a take runs straight into the wanted
   word. Then `seams.py` and **large-v3 Whisper over the whole spine** (it caught "waving your hands,
   your hands").
3. `presenter/rebuild.sh`: align + `fix_words.py`, caption check, GPU mattes, VP9-alpha webm,
   `face-windows.json`, tsc, events, face-bounds check, mix.
4. Beats/acts via `cue()`, captions `LINES`, presenter `WINS` placements, stub scenes; stills with
   `snap.sh`; key-frame board (`board.py`, one still per beat + line). Show it and wait.
   Example: `examples/keyframe-board.jpg`.

### Stage 6 - Build the world
Follow animated-video steps 5-6 and [art-direction.md](reference/art-direction.md). Write
`ART-BIBLE.md` (safe zones incl. the presenter's area per window, palette meanings, finish bar) and
`STORYBOARD.md` before building. Parallel animators own disjoint act files (`scenes/<act>.tsx`,
`<act>-events.ts`, `kit/<act>-kit.tsx`); lib/beats/Film/CaptionView/avatar stay read-only for them;
checkpoint their files; be ready to finish an act yourself.

### Stage 7 - Sound, review loop, render, QA
- Events -> `audio/mix.py` bed (synthetic score + CC0/synthetic SFX, phrase duck, 1-4 kHz FX duck).
- Review loop: 3 judges (motion, story, design+sound) on a 1080 draft; route issues to act owners in
  `ISSUES.md` (time, owner, severity, status); fix; spot-check every fix on stills (fixers regress).
  Judges have stalled and returned nothing: then spot-check that lens yourself and say so. Stop when
  only low polish or things needing his eyes/ears remain.
- **Delivery:** `./render_ig.sh <name>` = 1440x2560 via `--scale=1.3333333333333333`, crf 14, VBV
  maxrate = min(24M, 0.95 x 300 MB x 8 / duration): 24M up to ~95 s; v5 (115.2 s) needed 20M (a 24M
  encode came out at 349.7 MB, over Instagram's 300 MB cap); v6 (101.7 s) used 22M -> 283.0 MB.
  Resolution is never reduced.
- `./qa.sh`, `presenter/faceqa.py` (zoom cuts + lip sync), Whisper on the final CTA.

### Stage 8 - Final review -> APPROVAL STOP 4
Local master path (and a phone-review link only if he approved that route). Report the four QA
states separately: **Technical** (receipts), **Factual** (on-screen corrections; claims left in his
voice), **Creative** (what you saw on sheets; what nobody has watched/heard: music/SFX are SYNTHETIC
+ CC0 and unauditioned; off-lens gaze; voice-over <-> camera mic switches), **User acceptance**
(none until he says so). No upload or scheduling until he says so (then follow paper-lab-reel's
`reference/revisions-and-delivery.md` for cover, caption, scheduling and readback).

## HeyGen presenter (fallback only)

Use only when there are no on-camera takes and he approves the spend. Avatar rules: **3-4 s bursts**
(one sentence, 3-4 per 2-min film) by default; a longer floating avatar only when he asks (quantum v5:
4 windows, 61.8 s). Use the look the presenter approved; ask before trying a new one. Generate **all windows in one job** from concatenated audio of his real
voice, then time-map. Quote HeyGen's current per-second cost before generating. **Download the clip as soon as the job completes** and
verify it: in v5 nobody downloaded it and a 3-hour wait followed. Code:
`template/src/presenter-heygen/`; details in presenter-and-captions.md.

## Delivery spec

1440x2560, H.264 High, CFR 30/1, yuv420p **limited (tv)**, BT.709 tags, crf 14 + VBV cap, file
<= 300 MB, AAC-LC 48 kHz stereo 128k, faststart, about -14 LUFS, true peak <= -1.5 dBTP, 0 decode
errors, no blackdetect hits, frame 0 = a designed cover (headline + hook visual + him), the last
~0.5 s a still end card. Quantum v6 receipts: 101.7 s, 3050 frames, 283.0 MB, 22.26 Mb/s, -14.1 LUFS,
LRA 3.6, TP -1.8 dBTP, lip sync within 1 frame on 10 plosives, seam steps <= 0.4 LU except ~+-1.4 LU
into/out of window 2 (the voice-over itself rises 3.5 LU there).

## What worked (protect these)

- The cover: "WHAT IS A QUANTUM COMPUTER?" headline, the real-world hook object (Willow-style chip in a
  stopwatch), the race "5 MIN vs 10 SEPTILLION YEARS", and him big beside it at frame 0.
- One gold hero object (the coin) through the whole film: bit -> spinning qubit -> maze -> waves ->
  linked chain -> FOLLOW coin. Transitions push through objects (chip die -> laptop screen; coin glow
  -> pool ripples; dive into the die), never crossfades.
- His own analogy (the pool) staged literally, with the comparison held >= 3 s.
- Exact numbers rolling up on screen; honest tags as part of the art.
- Him floating over live animation (never a static full-frame talking head), reframing between
  sentences, captions in a column clear of his face.
- Lessons from the final version:
  - Whenever real on-camera takes exist, use them for his face: never an AI avatar.
  - Keep his face on screen as much as the takes allow. v6's 49 of 102 s is the floor, not a ceiling.
  - Offer the **mirrored-left** staging too: him on the left, flipped horizontally so he
    faces into the animation. Captions and labels then move to the right column. Check that nothing
    readable on his clothing gets reversed.

## Done when

All four approval stops recorded; the master passes every receipt; four QA states reported with
evidence paths; open issues listed by time range; takes archived; nothing uploaded,
scheduled, shared or paid for without his explicit approval.
