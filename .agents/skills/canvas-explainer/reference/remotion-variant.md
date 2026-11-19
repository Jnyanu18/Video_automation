# Remotion variant: notes for a fresh agent

The HyperFrames formula in `SKILL.md` was the first canvas Reel (resume advice, avatar in sketched frames). The Remotion
variant is the same idea rebuilt as a Remotion world for the October 2026 news batch (drug-discovery Reel, v1-v3), with
Madhav's **real** footage as a matted cut-out instead of a HeyGen avatar. Code: `../template-remotion/`. Example:
`../examples/drug-discovery/`. Images: `../../../docs/canvas-explainer/style-remotion.jpg`.

## Why it works
- **A drawing that happens on the word.** Every stroke, label and arrow starts at a `cue("phrase")` time, so the board
  reads as if someone is explaining live. Nothing is a static slide.
- **One huge canvas, many pages.** Pages are 1080x1920 regions of one world, joined by red connector arrows. The
  ending zooms out to show the whole map: the payoff is seeing everything you just learned in one picture.
- **Black + six marker colours = one meaning each.** Yellow = the key word, green = the good outcome/answer,
  red = arrows, crosses, the problem, cyan = the technical object (protein, data), pink = the human/opinion
  ("MADHAV'S TAKE" tag, hearts), white = everything else. A grey #9A9CA6 for secondary labels.
- **Real artefacts annotated in marker** (a faithful news card with the date, an IG comment sheet, a DM card) keep it
  grounded for a software audience.

## The look, exactly
- Background `#07070A`, dot grid 60 px pitch, dots r 2.2 `#24252c` (lets camera moves read).
- Rough ink: `feTurbulence fractalNoise baseFrequency 0.03 octaves 2` -> `feDisplacementMap scale 4.5` (3.5 for the
  front layer) over every page. **Boil**: v1 stepped the noise seed every 4 frames (living, hand-animated ink).
  Madhav's v2 note ("we are adding too much motion") turned it off; the default is now a static seed (`boil = 0`).
- Strokes: `pathLength=1`, `strokeDasharray="1 2"`, `strokeDashoffset = 1 - p`, round caps, width 6-10;
  draw ease `bezier(0.45, 0.05, 0.55, 0.95)`; a fill fades in at 80% of the stroke.
- Handwriting: **Ink Free** (Windows system font), letters appear one by one in ~0.045 s per char (0.22-1.1 s),
  weight 700 for headings. A black stroke halo (`glow`) on anything over footage or the dimmed map.
- Mono notes: Consolas / IBM Plex Mono. Realistic cards (news, comments, DM): Segoe UI.
- Finish: bloom 0.55 on bright ink, vignette, 7.5% overlay grain.

## Staging (where things go)
**v6 (default for new films; Madhav 2026-10-24: "my face could be bigger... a lot of blank screen... the animation on
the right side and on the top side"):**
- Presenter: always on screen as a still, mirrored cut-out bottom-left, scale 0.88, x -80, y 234 (head top about
  y 780-950, body to the bottom edge, about x 0-760), soft right-edge feather (mask 78% -> 98%), white rim + faint cyan
  glow (`cutoutFilter`). Mirrored because "flip it so my hands focus on the middle of the screen".
- Graphics: main in the **top band** y 220-760 (x 50-940); secondary in the **right column** x 720-940, y 760-1300.
  Nothing covers his head (`SIDE_FACE` = x 10-620, y 840-1390; re-measure per take).
- Captions: right column under the graphics, x 692, from y 1300, width 258, up to 3 lines, Ink Free 42-54 px, yellow
  emphasis words, dark halo (no box); not-yet-spoken words at 55% opacity.
- Series tag "MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS" at the top from frame 0 to the end; every question he
  reads becomes an **anonymous IG DM card** ("Anonymous", "?" avatar, paper-plane "IG question", the exact words; no
  usernames, photos, timestamps or counts).
- Instagram UI: keep the top 120 px, the bottom ~380 px and the right 140 px free of key content.

**v3 (the drug film as shipped):** scale 0.66 flush bottom-left (face about x 270-530, y 940-1240 after the mirror),
top band y 220-640, right column x 580-940 / y 660-1180, captions x 555 y 1215 w 375. `STAGING = "v3"` in `lib.ts`.

**v1 (retired):** FULL/FWD/SIDE/OUT modes; his footage sat in sketched 238x422 frames on the canvas and the camera
locked to the tile and zoomed into the frame (zoom = s/0.22) on OUT->FULL hand-offs. Madhav: "When we zoom in and
zoom out on my face, it goes in the middle. I hate that." The code is still in `presenter.tsx`, switched off.
Don't bring it back unless he asks.

## Camera rules
- One page per beat. Holds **still** inside a beat. Same-row page change: a 0.35 s pan (keys at `s - 0.15` and
  `s + 0.2`). Row change: a cut (a long diagonal pan has half-empty mid frames; a blackdetect hit in v2).
- Never zoom toward his face. The only zoom is the ending: 0.9 s ease-in-out out to `MAP` (zoom ~0.24-0.45 to fit
  all pages), the map dimmed to 32% behind the end card.
- Each page's first heading/drawing is complete 1.5 s **before** its beat (`pre(id)`), so the camera never arrives
  on an empty page.

## Pacing and calm (Madhav's notes, v2-v3)
- A new picture about every 2 s, but each is a **single motion**; nothing loops (no pulsing dots, spinning clocks,
  perpetual heartbeats or confetti spin), no punch-zoom on hits, the dot grid appears as one group.
- Readable states hold >= 1.2-1.5 s; comparisons (e.g. `$$$` crossed -> `$`) stay up until the page changes.
- Rich and colourful is wanted. Busy is not.

## Honesty
- Draw only what is said. When he simplifies, add a short **fact chip** in the art ("Simplified: new drugs still take
  10-15 years to approval"); tag opinions **MADHAV'S TAKE**; mark illustrative numbers as illustrative (the "tries"
  counter). No drug names or prices invented (`$` symbols only). No logos on news cards.
- No disclaimers or "not endorsed" lines. Facts that were wrong get cut from the spine with his approval (v2 removed
  his US->India markup line and the "copy the protein structure" visuals).

## Audio
- Bed = `audio/mix.py canvas`: D minor (Dm7 - Bbmaj7 - F - C), 2.6 s per chord, piano-ish plucks, reverb 3.0 s / 0.26,
  music at -7.5 dB then ducked -15 dB under every phrase; resolves on the last word.
- SFX from `events.ts` keywords: marker squeak on draws/underlines, rubber stamp on YES/years, pop on chips, click on
  the fit/unlock, whoosh on the zoom-out. Sparse: <= ~25 per minute, each >= 20 dB under the voice's 1-4 kHz band.
  All synthetic or CC0; say they were not auditioned.
- His voice first: the master is about -14 LUFS, true peak <= -1.5 dBTP.

## Pitfalls seen
- `cue()` throws when a phrase is cut from the spine or said twice: re-point the beat (or pass `nth`).
- Captions: Whisper glues numbers ("10 -15"); fix words in the spine, not in the captions.
- The hook pill's right tip at x~1000 sits in the IG right-UI strip; keep frame-0 doodles inside x 940.
- Dense pages at zoom < 1 put labels near the IG top UI; prefer zoom 1 pages.
- Without a matte, a SIDE presenter renders as a framed rectangle and hides the lower-left graphics; check stills once
  the matte is in.
- `--scale=1.3333333333333333` exactly; fewer digits give 2559.99 px and Remotion refuses.
