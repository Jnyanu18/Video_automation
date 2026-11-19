---
name: retro-space-poster
description: >-
  Madhav's "Retro Space Poster" world: a 1960s/70s screen-printed travel poster brought to life
  in Remotion (flat SVG shapes, halftone dot shading, paper grain, orange/teal ink mis-registration,
  a striped sun over parallax hills, Anton condensed type, era badges and rubber stamps), with a
  hero rocket stack and a launch tower whose chopstick arms snap shut, a halftone globe with
  dotted rocket routes, boarding passes, tear-off calendars and fact chips, around the presenter's
  real cut-out. Use when asked for a "retro poster", "space-age / vintage travel poster", "mid-century
  screen print", "make it like the SpaceX one", or a space, rocket, aviation, travel or
  transport news/answer Reel. A world that plugs into the news-qa-reel shell and runs inside the
  animated-video skill's stages and approval stops. Not for paper collage (paper-lab-reel), glowing
  3D (luminous-cosmos-3d) or pixel art (pixel-arcade).
---

# Retro Space Poster (screen-printed poster world around a real presenter)

A real person answers a question to camera; around him, a vintage space-age travel poster comes
alive: the sun sits striped over teal hills, a rocket stack waits at its tower, launches, comes back
and is caught by mustard chopstick arms with a "SNAP!", a halftone globe draws dotted city-to-city
rocket routes, and boarding passes, calendars, starbursts and chips land on his exact words. It was
built for the SpaceX news Reel ("Seattle to Delhi in 1 hour. On a rocket?"). This skill is the
method and the kit, not that film's content: design new pictures for every new topic.

It is a **world**, not a whole pipeline:
- Run it **inside** the cstack `animated-video` skill (Remotion; read it first). Its stages,
  approval stops, four separate QA states and "no publishing without approval" always apply.
- It **plugs into the `news-qa-reel` shell skill**, which owns the spine (EDL, `words.json`, `vo.wav`),
  the presenter cut-out and matting, captions chunking, the IG-question format and delivery. This
  skill supplies `src/world/**` (Back / Front / Caption), `src/beats.ts`, the events and the `retro`
  audio style. Where the shell and this template differ, the shell's newer files win for
  `lib.ts`, `presenter.tsx`, `Film.tsx`, `captions.ts`.

Reference files (read when you reach that stage):
- [reference/art-direction.md](reference/art-direction.md): palette, type, halftone, mis-registration, paper finish, motion rules, layout zones.
- [reference/scene-catalogue.md](reference/scene-catalogue.md): every scene, prop and helper with its file and how to reuse it.
- [reference/commands.md](reference/commands.md): stills, dumps, mix, Instagram-max render, QA.
- [reference/pitfalls.md](reference/pitfalls.md): known failures and their fixes.
- [template/README.md](template/README.md): the code, what is reusable kit vs worked example, the spine schema.
- `examples/`: the source film's beat table, script and hook choices, fact-check notes. Frames are in
  `../../docs/retro-space-poster/` (style.jpg, storyboard.jpg): the quality bar; never reuse the content.

## When to use

- Space, rockets, aviation, travel, cities, "the future of getting around", or any optimistic
  "imagine if..." topic that suits a mid-century travel-poster tone.
- A news-answer Reel in the news-qa-reel format (he reads an anonymous IG question, then answers).
- Not when the topic is dark or investigative (case-file-explainer), needs real 3D depth
  (luminous-cosmos-3d) or is gaming (pixel-arcade).

## Non-negotiables

1. **His real self is the anchor.** Real face, lips and voice; the cut-out is a local matte of the same
   pixels. Never regenerate, retouch, relight or lip-sync him.
2. **Every time comes from his words** via `cue("phrase")` (all of them in `src/world/times.ts`).
   No hard-coded seconds except small offsets from a cue.
3. **Facts only what is said**, plus a few short, sourced fact chips approved in the fact-check. His
   opinions are labelled as his ("MADHAV'S PREDICTION", "MY TAKE"). Never an unverified number.
   **No disclaimer lines** ("not endorsed", "views are my own"); honesty lives in short art-styled
   chips ("REALITY CHECK: EARTH-TO-EARTH ROCKET TRAVEL IS STILL A CONCEPT").
4. **Calm motion.** Never zoom, push or move toward his face; his footage never scales or flies.
   One primary motion at a time, no perpetual drift/wobble/rotating rays.
5. **Approval stops are real stops.** Full-quality delivery only; no upload, scheduling, sharing or
   paid generation without his explicit approval for that action.

## Stages and approval stops (inside animated-video)

Keep `CHECKPOINT.md` (project) and `WORLD-NOTES.md` (film) current: concept, palette, beat table,
build log, known issues. A new agent must be able to continue from them.

0. **Spine (news-qa-reel shell).** The shell builds `src/edl.json`, `src/words.json` (output time,
   `q: true` on question words), `public/vo.wav`, `public/proxy-1440.mp4`, `public/matte/m0-1440.webm`.
   Copy `template/` into the film folder, then replace the sample spine with the shell's.
1. **Fact-check** every claim he makes (`NOTES.md`): status, source, treatment. Decide the 1-3 chips.
2. **Concept + beat table -> APPROVAL STOP 1.** One beat per idea (`hook`, `q`, then his answer's
   ideas, `end`). For each: the line, the poster picture, what changes on which word. Pick the
   hero object (the rocket + tower for space; a liner, a train, a plane for other travel topics).
3. **Style frame -> APPROVAL STOP 2.** One information-heavy beat at full finish (presenter cut-out,
   series tag, a top-band panel, a right-column card, a caption). Check the empty top third, the IG UI
   zones and that nothing touches his head box.
4. **Key-frame board -> APPROVAL STOP 3.** Stills at 0, every item start, key moments, the end card and
   the last frame (`snap.sh`), tiled into a board with each line. Fix collisions before any render.
5. **Build** scene by scene (see the scene catalogue); `events.ts` from the same times.
6. **Audio:** `py audio/mix.py retro` with `MUSIC_DB=-11` (see Audio).
7. **Render + QA** (`render_ig.sh`, `qa.sh`), Whisper the final file's audio, look at the contact
   sheet, frame 0 and the last second yourself.
8. **Final review -> APPROVAL STOP 4.** Report the four QA states separately (technical, factual,
   creative, user acceptance = none until he says so). Music/SFX are synthetic/CC0 and unauditioned.

## The look (short version; details in art-direction.md)

- **Palette:** cream `#f2e6cf` paper, burnt orange `#e0632b`, teal `#1f6f78`, navy `#1b2a49` ink,
  mustard `#e8b13a`; shades `#e3d1b0` / `#efe0c4`. Nothing else, no gradients except the IG chips.
- **Type:** Anton (condensed, headlines, labels, numbers) and Archivo Black (captions, handle), both via
  `@remotion/google-fonts`. Headlines in navy/teal/orange with an offset ghost (`<Ink>`).
- **Print feel:** halftone dot fills (`fill={ht("navy-s")}`), the `misreg` / `misreg-t` SVG filters
  (an orange or teal ghost offset 5-6 px under navy ink), hard flat drop-shadows (offset navy or orange
  rects, never blur), `PaperFinish` grain + warm vignette over the whole frame.
- **Backgrounds:** the landscape poster (striped sun, teal halftone hills, navy ground with runway
  dashes), then a cream/navy "night board" with a sunburst for the second half (a calm change of set).
- **Presenter:** the cut-out gets a screen-print outline: `drop-shadow(8px 8px 0 orange) drop-shadow(-4px 0 0 navy)`.

## Layout: v6 staging (default for every new film)

On the 1080x1920 composition (rendered at 1440x2560):
- **Presenter:** scale **0.88**, `SIDE_X -80`, `SIDE_Y 234`, **mirrored**, soft right-edge feather
  (82% -> 100%), body to the bottom edge, figure about x 0-760. Head box `SIDE_FACE` measured from stills
  (source film: `{x 200, y 830, w 540, h 600}`); re-measure for every new take. He is on screen the
  whole film, end card included.
- **Series tag** "MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS" at x 40, y 230-276, frame 0 to the end.
- **Main graphics:** top band x 40-940, y 290-760. **Secondary:** right column x 744-940, y 776-1294.
- **Captions:** right column x 692-950 from y 1300, up to 3 lines, 42 -> 32 px auto-fit, a cream label
  with navy ink, a 3 px navy border and a hard orange block shadow; emphasis words orange.
- **Questions he reads** (`q` words): the anonymous IG DM card (`IGQuestion`: "Anonymous", "?" avatar,
  paper-plane "IG question", the exact text) in the top band. No usernames, photos, timestamps or counts.
- Instagram UI: keep text out of the top ~220 px, the bottom ~380 px and the right ~140 px.
- Nothing may cover his face or head. His hand may pass in front of right-column cards (he is drawn
  under the graphics, so the cards stay on top).

## Motion rules

- A new picture every ~1.5-2.5 s; one primary motion at a time; hold readable states >= 1.2 s and
  comparisons >= 2.5 s.
- Entrances: `popS` springs (scale 0.7-0.85 -> 1, quick fade), stamps that drop from 1.6x to 1x with a
  slight rotation, chips that rise 24 px. Exits: 0.2 s fades (`vis(t, a, b)`).
- The hero action is physical and on the word: launch on "ride", booster back and the low arms
  **SNAP** with a radial ink burst, ship belly-flop, flip and the high arms SNAP.
- The globe does not spin; arcs draw on (`Arc p 0..1`) with a mini rocket at the head.
- No camera moves, no rotating sun rays, no twinkling, no landscape drift (all removed at his request).
  The "parallax" is compositional: sun, hills and ground are separate printed layers; if you add a
  move, make it one slow settle on a beat change (<= 0.6 s), never continuous.
- Frame 0 is the cover: the hook headline (exactly his spoken hook) is already printed.
- End card: question bubble ("YOUR TURN / WOULD YOU RIDE ONE?"), "COMMENT BELOW" pill, "FOLLOW FOR
  MORE" + "AI NEWS" starburst, the handle; static for the last ~0.5 s.

## Audio (style `retro`)

`audio/mix.py retro`: A minor space-age score (warm analog pad, sine lead plucks with slight vibrato,
long echo; 3.0 s per chord), paper SFX family (stamps, whooshes, card pops, snips), ducked -15 dB under
every phrase, effects kept >= 20 dB under the voice band. Levels for the news batch: **`MUSIC_DB=-11`**
(FX at the paper-family default `-14`; drop to `FX_DB=-19` or lower if the snaps feel loud). About 13
sound events for 36 s (<= 25/min): launch whoosh, card pops, clamp snaps, stamps, page turns. His
voice comes first; he said "the background sounds are too loud" on an earlier pass.

## What Madhav liked / disliked (protect these)

- Liked: rich, colourful, poster-like frames with constant change; the tower catch with SNAP!; his face
  big and always on screen ("my face could be bigger, it can cross the 50% mark"); the anonymous IG
  question card; graphics top and right; every visual landing on his word; his take labelled as his.
- Disliked: zooming in and out on his face ("it goes in the middle, I hate that"), too much motion,
  loud background audio, empty screen areas, ums and repeated lines, disclaimer lines.

## Delivery spec

1440x2560 (render at `--scale=1.3333333333333333`), H.264 High, CFR 30, yuv420p limited range, bt709,
<= 24 Mbps and <= 300 MB, AAC 128k 48 kHz, faststart, about -14 LUFS, true peak <= -1.5 dBTP, 0 decode
errors, no black frames, designed frame 0, static last ~0.5 s. Upload only the verified master, and
only when he approves that action.

## Done when

Four approval stops recorded; `npx tsc -p .` clean; the stills board shows no collisions with his head,
captions or IG UI; the master passes every technical receipt; the four QA states are reported
separately; nothing was uploaded, scheduled or shared without his explicit approval.
