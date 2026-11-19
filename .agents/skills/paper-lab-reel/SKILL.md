---
name: paper-lab-reel
description: >-
  Madhav's "Paper Lab" hybrid Reel: his real talking-head footage (real face, lips and voice,
  never regenerated) intercut and composited with a hand-made paper-collage animated world
  (cream paper board, torn typewriter scraps, tape, pins, rubber stamps, polaroids, red marker,
  a gold origami hero object, stop-motion on twos), every animation timed to his exact words.
  Use when asked for a "Paper Lab" style video, a paper / collage / cut-paper animated
  explainer over his own footage, a hybrid presenter + animation reel, or "make it like the
  intelligence-compression one". Runs inside the animated-video skill's stages and approval stops.
  Not for fully faceless explainers (animated-video alone) or plain footage edits (video-use).
---

# Paper Lab reel (hybrid real presenter + paper-collage world)

A real person talks to camera; a hand-made paper world explains each idea around him, beside him,
or full frame while he steps out. The first one became our favourite film. This skill is the method, not that film's content: design a fresh concept,
hero object and scenes for every new topic.

Run it **inside** the cstack `animated-video` skill (Remotion; read it first). This
skill adds the presenter, footage, matting, Paper Lab art direction and the proven audio/QA
chain. Its approval stops, full-quality delivery, four separate QA states and "no publishing
without approval" always apply.

Reference files (read when you reach that stage):
- [reference/art-direction.md](reference/art-direction.md): palette, type, materials, motion, kit primitives, hero object, scene vocabulary.
- [reference/presenter-and-captions.md](reference/presenter-and-captions.md): modes, state machine, matting, safe zones, captions, hook.
- [reference/audio.md](reference/audio.md): events, score, SFX mapping, ducking, mastering.
- [reference/pipeline-commands.md](reference/pipeline-commands.md): every command in order, with QA receipts and delivery checks.
- [reference/pitfalls.md](reference/pitfalls.md): known failures and their fixes.
- [reference/revisions-and-delivery.md](reference/revisions-and-delivery.md): typical revision passes (pause trims, word cuts, a voice-clone outro), Instagram-max render, cover, caption, scheduling and readback.
- [template/README.md](template/README.md): starting code, and what is video-specific vs reusable kit.
- `examples/`: the first film's cover prompt and caption; its contact sheet and storyboard are in `../../docs/paper-lab-reel/` (the quality bar; never reuse the content).
- [template-train/README.md](template-train/README.md) + [examples/cs-degree-train.md](examples/cs-degree-train.md): the second film, the **train set** in the v6 news Q&A staging (see "Variant: Paper Lab train set" below).

The template's `src/paper/` is the full world of that first film ("What if intelligence is just good compression?").

Sibling skill: [vector-world-explainer](../vector-world-explainer/SKILL.md) is the rich flat-vector
explainer with a floating real-face cut-out from several DJI takes ("make it
like the quantum one"). Its GPU matting (`template/presenter/matte.py`, RVM on the RTX 5070) is a
faster, native-resolution alternative to stage 5's u2net CPU route.

## When to use

- The presenter supplies a talking-head take (phone/DJI, usually 9:16, often 10-bit HEVC) and wants
  it animated, explained or "made like Paper Lab".
- The topic is an idea or explainer (tech, AI, science, career) where each sentence can become a
  tangible paper object or action.
- Not when he wants no face on screen (use animated-video alone), only captions
  (embedded-captions), or a plain cut (video-use).

## Non-negotiables

1. **His real self is the anchor.** Real face, lips and voice from the original take. Never
   regenerate, retouch, relight or lip-sync him. Cut-outs are local mattes of the same pixels.
2. **Raw is read-only.** Hash it, work from derived copies, leave earlier projects untouched.
3. **Never rewrite his voice.** Fact problems get on-screen qualifiers or an approved EDL trim.
4. **Every time comes from his words** via `cue("phrase")` in output time. No hard-coded
   seconds except small offsets from a cue.
5. **Approval stops are real stops** (below). A full brief is not blanket approval.
6. **Delivery quality:** the approved full-quality master only, never a
   proxy or a shrunken copy; no upload, scheduling, sharing or paid generation without his
   explicit approval for that action.
7. **Identity references:** use frames from the current take only, or photos the presenter has
   explicitly approved. Respect any photos they have asked you never to use, including derivatives.

## Stages and approval stops

Keep `CHECKPOINT.md` in the project root current at every stage: deliverable, protected items,
approval status per stop, stage log, QA states.

### Stage 0 - Intake and source (no approval needed)
1. Create `reel-YYYY-MM-DD-<slug>-animated/` with `analysis/ source-derived/ concept/ scripts/ film/ qa/`.
2. Record the raw path and `sha256sum` into `analysis/raw-source.sha256`. Never write to the raw.
3. `ffprobe` it: codec, bit depth, size, fps (often 30000/1001), duration, audio. Measure source
   loudness and true peak (`ebur128=peak=true`); a peak above 0 dBTP means check for clipping.
4. Extract `audio-16k.wav` (mono, for whisper) and `audio-48k-stereo.wav` (PCM, for the spine).
5. Make the working intermediate from the raw: H.264 `crf 12-14`, `-g 30`, lanczos, yuv420p,
   bt709 tags. 10-bit HEVC does not decode reliably in the Remotion render, so this intermediate is
   mandatory. **Default delivery is Instagram-max 1440x2560**,
   so build `proxy-1440.mp4` from the raw (`template/scripts/hires_1440.sh`); a 1080 proxy is fine
   for fast previews. Never upscale a source smaller than 1440 wide; use its native size and say so.
6. Transcribe: faster-whisper `medium.en`, `device="cpu"`, `compute_type="int8"`,
   `word_timestamps=True`, run with `py -3.13` (never the `python3` Store alias). Save to
   `analysis/transcript-medium.json`. Fix known mishearings in a kept script, not by hand-editing.
7. Pull a frame strip (`fps=1/4, tile`) to find where he leans in, gestures, or moves.

### Stage 1 - Fact-check pass (feeds the concept)
Write `NOTES.md`: a table of every checkable claim with source time, status
(accurate / inaccurate / speculative / interpretation), evidence with a real source, and the
proposed truthful treatment. Treatments, in order of preference:
- an **on-screen qualifier drawn as part of the art** (a stamp, sticky note, typed tag:
  "a hypothesis", "Open question - not proven", "illustrative", "Lossy: models can misremember");
- an honest comparison drawn at true relative scale with a sourced figure;
- an **EDL trim** of a repeat or a wrong aside, only with his approval.
Never put an unverified number on screen; mark estimates as estimates. Captions stay verbatim.

### Stage 2 - Concept + timed beat sheet -> APPROVAL STOP 1
Follow animated-video step 1 (three concepts, recommend one) with these additions:
- **One recurring hero object** that carries the throughline (the first film used a gold origami
  cube for "the compressed thing"). It appears early, sits beside him in FULL beats, receives the
  tile hand-offs, and becomes the end card.
- A beat table in **source seconds**: line, presenter mode, picture and what changes in it.
- **EDL options** with resulting length (for example A: trim pre-roll + a wrong repeat; B: pre-roll only).
  Offer **pause trimming** and **filler/false-start cuts** up front; tighter pacing is usually wanted.
- The fact-check treatments, the music source (synthetic vs his file), and caption plan.
Stop and wait. Record the approval verbatim in CHECKPOINT.md.

### Stage 3 - Style frame -> APPROVAL STOP 2
If he already asked for Paper Lab, confirm in one line and render a single style frame of one
information-heavy beat (with the presenter cut-out and a caption) for sign-off. Otherwise show 2-3
styles on the **same beat geometry** (Paper Lab, plus for example Luminous Cosmos 3D, its own
skill `luminous-cosmos-3d`, or Night Canvas). Both worlds can share one spine, presenter and captions.
Before that frame, **test the matte on 3-5 s of his footage** (stage 5 command) and inspect a
face crop: hair, glasses, hands, and that face pixels are untouched.
Check the frame for an empty top third and for anything under the Instagram UI.

### Stage 4 - Spine, skeleton, key-frame board -> APPROVAL STOP 3
1. **Audio spine** (`scripts/build_spine.py`, see template README):
   - EDL = a list of source segments, built by `scripts/plan_cuts.py`: the approved spans minus
     `WORD_CUTS` (filler, false starts, repeats, lines he wants gone) minus every silence
     below -42 dB longer than 0.42 s, shortened to ~0.33 s (only cuts >= 0.2 s; none within 1.2 s of
     a word cut, so there is no double jump). Every cut snaps to the 1/30 s grid at a measured quiet
     point (10 ms RMS), never inside a word; 12 ms fades at both ends of every segment.
   - **Pick word cuts from energy, verify by re-transcribing:** print 10-20 ms RMS around the words,
     choose quiet points, concatenate the candidate audio and run Whisper on it before committing.
     Whisper medium.en merges repeats ("it can, it can" becomes one pair) and puts word starts inside
     silences: re-align on a short clip and patch the source times in `build_spine.py`; words whose
     start falls in a trimmed silence are clamped, not dropped (otherwise captions lose words).
   - Optional **spoken outro** in the presenter's own ElevenLabs voice clone (one take,
     report characters used): clarity chain, level-matched to his own last sentences, placed while
     the end card grows (`OUTRO_AT`), then a ~1.2 s still hold. Verify the take with Whisper.
   - Writes `film/public/vo.wav` (original voice, only cut), `film/src/words.json` (words in
     **output** time, with `src` kept), `film/src/vo_env.json` (per-frame RMS, normalised) and
     `analysis/edl.json` (segments, hold, total seconds, frames).
   - `lib.ts` reads `src/edl.json` (`EDL`, `srcAt`, `outOf`, `segIdx`, `OUTRO`, `TOTAL`, `cue`, `cueEnd`).
     One source of truth: if the EDL changes, re-run plan_cuts + spine + dump-beats + dump-events +
     mix.py and everything retimes. `cue()` throws on a missing phrase, so a cut that removes a cue
     word fails loudly: re-point that beat (and the caption `LINES`) to the next phrase.
2. **Beat table** `src/beats.ts`: each beat `{id, s: cue("phrase") - small lead, mode, tile?}`.
   Modes **FULL / FWD / SIDE / OUT / END** (meanings in presenter-and-captions.md). `tile` marks a
   hand-off point where the footage tile flies into, or emerges from, a world object. Aim for him
   on screen (any mode) ~55-60% of the runtime.
3. **Captions** `src/captions.ts`: hand-chunked sense units in `LINES`, checked word-for-word against
   `words.json` at load (it throws on mismatch), plus an `EMPH` set chosen per word for meaning.
4. **Presenter** `src/presenter.tsx` and the matte ranges (stage 5) for SIDE beats. Footage and
   matte layers are one `<Sequence>` per EDL segment, so cuts inside a SIDE stretch stay aligned.
   **Zoom cut:** every EDL cut flips a subtle 7% punch-in (`punch`, anchored on his face) in FULL/FWD,
   so pause trims in full frame read as deliberate cuts instead of jump glitches.
5. Wire `Film.tsx` (Back / Presenter / Front / Caption / audio), render stills across the whole
   timeline with `snap.sh`, then a **key-frame board**: one still per beat with its line
   (`board.py` from the animated-video template). Show it and wait for notes.
   If he asked directly for "the full video", the board becomes an internal review sheet, but
   **final review stays a hard stop**.

### Stage 5 - Matting (SIDE ranges only)
- Mattes only where the presenter must be separable from his background: SIDE beats plus
  ~0.6 s margins for the transition windows. Never matte the whole take.
- `npx --no-install hyperframes remove-background <clip.mp4> -o <mN.webm> --device cpu --quality best`
  (u2net_human_seg, local CPU, about 0.7 fps; weights ~168 MB download once). Output is VP9-alpha WebM.
- For each range, cut an **aligned pair** from the same frames of the intermediate: `cN.mp4`
  (person + real background, 720x1280, crf 12) and `mN.webm` (matte). Matte at 720 (fast). For the
  1440 delivery, `hires_1440.sh` makes `cN-1440.mp4` + `mN-1440.webm`: colour from the 1440 proxy
  with the 720 alpha upscaled (`alphaextract`/`alphamerge`, VP9 yuva420p, ~2 min for six ranges), so
  there is no re-matting and the face stays sharp. Snap starts to source frame
  boundaries (`round(s*30000/1001)*1001/30000`) and record `{file, srcStart, frames}` in
  `src/mattes.json`. The pair is what lets the background fade while he stays solid.
- Verify frame alignment against the intermediate (difference frames at a few points).
- Anchor the cut-out where the source frame edge cuts his body (usually bottom-left) so the
  cropped edge sits off-frame.

### Stage 6 - Build the paper world
Follow animated-video steps 5-6 plus [art-direction.md](reference/art-direction.md):
- Write `ART-BIBLE.md` (safe zones, palette, materials, motion, type, hero object) and
  `STORYBOARD.md` (per beat: mode, line, paper picture, exact qualifier texts) before building.
- `src/paper/T.ts` holds every cue the scenes use (`T.<name> = cue("...")`) and the tile hand-off
  times (`HAND`), derived from the beat table and the presenter transition constants.
- Back scenes each own a time window in `world.tsx`; windows overlap only during transitions
  through content (a page turns over, a board drops away, paper is torn off). Later = on top.
- Front draws over the footage only in the top band or the right column in FULL/FWD beats, plus the hook and the end card.
- Every shot changes meaningfully every 1.5-3 s; actions land on their word within a few frames.
- **Comparisons hold at least 3 s** (true relative scale, both items visible, labels readable).
- Draw everything from `t` and seeded `random()`; stop-motion pose holds on twos (`twos(t)`).
- Export `EVENTS` from `src/paper/events.ts` from the same constants that draw: about
  **45 sound events per minute** (the first film: ~120 over 2.6 min).
- If using parallel animator agents, each owns its own scene files; lib, beats, presenter,
  captions and Film stay read-only for them. Long background agents can die mid-build
  (API 409); checkpoint their files and be ready to finish yourself.

### Stage 7 - Audio bed
See [audio.md](reference/audio.md). Short version: synthetic score (felt pad + wooden mallet
plucks in a warm major key, arrangement per beat) plus SFX mapped from event keywords
(CC0 library first, synthesised paper sounds second), effects landing one frame before the hit and
kept at least 12 dB under the voice band; music about **18 LU under the voice**, ducked
**-9 dB per phrase**. Label everything SYNTHETIC or CC0 and say it was not auditioned by a human.

### Stage 8 - Render, master, QA
See [pipeline-commands.md](reference/pipeline-commands.md).
1. `npx tsc -p .` clean. Stills of every cut and flagged moment first; a full render is the
   most expensive way to find a layout bug.
2. **Delivery render:** `./render_ig.sh FilmPaper <name> public/bed-paper.wav` = Remotion at
   `--scale=1.3333333333333333` (graphics drawn natively at 1440x2560; fewer digits give 2559.99 px
   and Remotion refuses), then one x264 encode inside Instagram's API limits: crf 14,
   maxrate = min(24M, 0.95*300MB*8/duration) (2.5 min gives ~14.9M, ~272 MB), AAC 128k, faststart,
   with the finalize audio chain (VO + bed, gentle 3:1, measured gain, oversampled limiter:
   about **-14.4 LUFS, true peak <= -1.5 dBTP**). About 10 min for a 2.5 min film.
   For quick review copies `./render.sh` + `./finalize.sh` at 1080 is fine.
   If the system disk is short of ~10 GB, set `TEMP/TMP` to a folder on a roomier disk and delete `out/bundle-*` after stills.
3. Run Whisper on the **final file's audio** and check every cut line and the outro.
4. `./qa.sh out/<name>-final.mp4 ../qa/<name>` and a faststart check. Look at the contact
   sheet, the cuts sheet, frame 0 (the cover) and the last second yourself.
5. Spot-check every flagged moment; fixers introduce regressions.

### Stage 9 - Final review -> APPROVAL STOP 4
Deliver the local master path(s) (and a phone-review link only if that route is approved).
Report the **four QA states separately**:
- **Technical:** the receipts (streams, decode errors, black frames, loudness, faststart, frames, duration).
- **Factual:** which qualifiers are on screen; which spoken claims were left in his voice.
- **Creative:** what you reviewed (contact sheets, stills) and what you could not (you cannot watch
  or hear it); open issues by time range.
- **User acceptance:** none until he says so.
Also state that the music and SFX are synthetic/CC0 and unauditioned. Do not upload, schedule
or share until he says so. When he does ("schedule it for X with a thumbnail and caption"), follow
[revisions-and-delivery.md](reference/revisions-and-delivery.md): cover by image gen from a real
frame of this take, caption in the presenter's voice, a scheduled Reel with the full master in the
right timezone, then a reload readback (byte size, cover, caption, time) and a written receipt.

## Delivery spec

**1440x2560** (Instagram-max default; 1080x1920 only for previews or a source below 1440 wide),
H.264 High, **CFR 30/1** (r_frame_rate = avg_frame_rate = 30/1), **yuv420p limited/tv range**,
bt709, at most 25 Mbps and 300 MB, AAC-LC 48 kHz stereo 128 kbps (Instagram API cap),
**faststart** (moov before mdat), integrated about -14.5 LUFS (target -14 to -15), true peak at or below -1.5 dBTP,
0 decode errors, no blackdetect hits, frame 0 is a designed cover (hook word already up), the
last ~0.3 s is a stable static end card. A 29.97 source conforms to 30 by frame resampling, with the audio untouched.

## What worked (protect these)

- **The real presenter as the anchor.** Open full frame on a big hook, step aside (cut-out with a
  white sticker edge) or out of frame for teaching, and come back for the big thoughts.
- **Every idea becomes a concrete, tactile thing in sync with the exact words**: scraps, books,
  cards, a corkboard of the internet, a notebook equation, objects that fold and stamp on the word.
- **A rich, handmade, colourful world with depth and constant motion**: torn paper, tape, pins,
  stamps, polaroids, an origami hero object, stop-motion on twos, camera drift. No static cards.
- **Honest qualifiers as part of the art**, not disclaimers: stamps and sticky notes. The spoken
  claims stay untouched.
- **Transitions through content**: the footage becomes a polaroid that flies into the world, and
  emerges from the hero object.
- **A deliberate ending**: the hero object swallows the footage and unfolds into the end card.
- **Polish by tightening.** Even a great first cut gets better with: trimmed dead pauses; doubled
  words cut; a line that repeats a later one cut; a mid-video "keep following me" ask cut. But keep
  the presenter's characteristic phrasing unless they ask: cut repeats, false starts and fillers
  only. A short spoken outro in the presenter's voice ("Follow for more AI news.") works well.
  Offer pause trims, repeat/filler cuts and an outro line up front.
- **The end card:** the question in serif on a gold-edged paper card, "Follow for more AI news"
  at 42 px with a red marker underline drawn on "Follow" as the outro says it, and the creator's
  handle in red on torn tape that pulses at the end of the line.

## Done when

The four approval stops are recorded; the master passes every technical receipt; the 4 QA
states are reported separately with evidence paths; open issues are listed by time range; and
nothing has been uploaded, scheduled or shared without his explicit approval.

## Variant: Paper Lab train set (v6 news Q&A staging)

This is the second Paper Lab film: the CS-degree Reel "If AI writes all the code, do you still need to learn CS?"
(October 2026, final pass v8, 43 s). Code: [template-train/](template-train/README.md). Example, beat table and
lessons: [examples/cs-degree-train.md](examples/cs-degree-train.md). Storyboard:
`../../docs/paper-lab-reel/storyboard-train.jpg`. Use it for a news or Q&A take in the "Microsoft engineer answers your
IG questions" series, or when he asks for "the train one".

- **Staging (v6):** he is always the still, mirrored cut-out bottom-left (scale 0.88, x -80, y 234, head about
  x 10-620, y 840+), with a white sticker edge. The paper world fills the top band (y 316-693) and the right column
  (x 689-948, y 790-1172). Captions are paper strips in the right column from y 1300. A series tag sits at the top from
  frame 0, and each question he reads is an anonymous IG DM card with the exact words. There are no FULL/OUT modes and
  no zoom toward his face.
- **Props** (`props.tsx`): a paper train-and-track set (hero train, bullet / normal / hill / coal trains, a track laid
  piece by piece, smoke), the "AI" robot arm, a departures board (DEPARTURES -> DESTINATION: ? -> YOUR CHOICE), an
  ADMIT ONE ticket, a diploma that unrolls, a blueprint (app -> API -> DB), books, a student and a customer.
- **The gag:** "a bullet train on a Himalayan plateau". AI can build what you ask for, but only you know what the
  customer needs. The arm sets a bullet train on a snowy plateau, then WON'T WORK and NO SALE stamps land.
- **Dadaji** (`dadaji.tsx`): an original paper-cut grandfather who asked the questions in the archived v4. His lips
  flap on twos from the voice level, only on his own words. It's kept for a "family asks" format and isn't used by the
  v8 world.
- **Lesson (Madhav, v8): don't repeat one analogy too often.** "We have said 'train' so many times": say the analogy
  word once or twice and let the pictures carry the rest. Count it at the concept stop and offer cuts of the repeats.
  One hero object plus one gag beats a catalogue of variants.

