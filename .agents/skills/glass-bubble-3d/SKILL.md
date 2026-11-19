---
name: glass-bubble-3d
description: >-
  Madhav's "Glass Bubble 3D" animation world: a real three.js iridescent soap/glass bubble
  (thin-film shader, fresnel rim, studio window highlights, a hairline crack that seals in gold)
  floating in a dark navy studio, with a tiny glowing AI city inside, gold coins pouring in, 3D
  "touches everything" icons on light threads, a desk + live code-editor monitor inside the bubble,
  orchestration nodes with conductor beams, a BEFORE/NOW pipeline grid stamped "AI", and glass HTML
  chips, rendered in Remotion (@remotion/three) behind his real cut-out. Use when asked for "the
  bubble style", "the AI bubble one", "glass bubble", "iridescent 3D bubble world", or a 3D glass
  world for an AI-economy / hype / "how my job changed" topic in the news-qa-reel format. Plugs into
  the news-qa-reel shell (this skill only supplies the world) and runs inside animated-video's stages
  and approval stops. Not for flat 2D explainers (vector-world-explainer), paper looks (paper-lab-reel,
  declassified-dossier) or a general glowing 3D cosmos (luminous-cosmos-3d).
---

# Glass Bubble 3D (a real 3D glass world behind a real presenter)

A huge iridescent bubble floats in a dark studio. Everything the presenter says becomes something
inside, around or on that bubble: money pours in and it inflates, it stretches and cracks on "pop",
threads reach out to the things AI touches, the city sinks away and a desk with a live code editor
appears inside it, and at the end the bubble hardens into a glass planet. Glass HTML chips carry the
words; the presenter stays a big still cut-out bottom-left the whole time.

First (and so far only) film: the "AI bubble / I barely write code anymore" news Reel (Oct 2026, 59 s,
1440x2560; frames in `../../docs/glass-bubble-3d/`). **Madhav's verdict: "okayish, not a super fan".**
Read "What to improve" before you design anything; this skill is a working base to push further, not a
proven favourite (compare paper-lab-reel, which he loved).

## Where this fits

- **Stages and approval stops come from cstack `animated-video`** (concept + beat sheet, style frame,
  key-frame board, final review). Never skip a stop because this playbook exists.
- **The format comes from `news-qa-reel`**: the spine (EDL, `vo.wav`, `words.json`, `cue()`), the v6
  staging (big mirrored cut-out bottom-left), the series tag, the anonymous IG-DM question cards, captions
  in the right column, the "MY ANSWER" tag, the comment card and the end-card rules. That skill owns the
  shell (`Film.tsx`, `lib.ts`, `presenter.tsx`, `captions.ts`, `beats.ts` conventions, `render_ig.sh`,
  `qa.sh`). **This skill only supplies the world** (`src/world/**`) plus the bubble audio style. The
  template ships a copy of the shell only so it compiles on its own; if news-qa-reel's shell is newer,
  use that one.
- **Spine conventions come from `paper-lab-reel`** (every time from his words via `cue("phrase")`, raw
  read-only, never rewrite his voice, faster-whisper on CPU, full-quality delivery).
- **3D technique comes from `luminous-cosmos-3d`**: `cam.ts`, `mats.ts`, `parts.tsx` are its kit
  (keyed poses, glow points, halos, env map, face mask). Read its `reference/shaders.md`,
  `camera-rig.md` and `pitfalls.md`; this skill only documents what the bubble adds.

Reference files (read at the matching stage):
- [reference/art-direction.md](reference/art-direction.md): palette, type, materials, the hero object, motion rules.
- [reference/scene-catalogue.md](reference/scene-catalogue.md): every scene, prop and overlay with its file and cue.
- [reference/camera-and-3d.md](reference/camera-and-3d.md): poses, `unproject` placement, shaders, one-canvas rules, face mask.
- [reference/layout-and-staging.md](reference/layout-and-staging.md): v6 zones in pixels, what goes where, collisions to check.
- [reference/audio.md](reference/audio.md): the "bubble" score style, SFX mapping, event budget, levels.
- [reference/pitfalls.md](reference/pitfalls.md): known failures and fixes.
- [reference/pipeline-commands.md](reference/pipeline-commands.md): every command in order.
- [template/README.md](template/README.md): starting code, reusable kit vs film-specific files, how to instantiate.
- `examples/`: the source film's beat table, script, fact-check notes and hook choices.

## Non-negotiables

1. **His real self is the anchor.** Real face, lips and voice from the take; the cut-out is a local matte
   of the same pixels. Never regenerate, retouch, relight or lip-sync him.
2. **Calm presenter.** He is a still cut-out (no scaling, sliding or zooming of his footage, ever; no
   camera move toward his face). Madhav: "zoom in and zoom out on my face ... I hate that."
3. **Facts are only what he says**, plus short sourced fact chips the brief approves. Opinions are
   labelled as his ("Madhav's take", "Madhav's experience"). No invented numbers, no illustrative
   labels that read as claims (the market labels were removed for this reason). **No disclaimers**
   or "not endorsed" lines.
4. **Every time comes from his words** (`cue()`, `cueEnd()`, `lastStart()` in `world/timing.ts`). No
   hard-coded seconds except small offsets from a cue.
5. **Deterministic**: everything is f(t); `random("key")` from remotion, never `Math.random()` or `useFrame`.
6. **Delivery**: the approved full-quality 1440x2560 master only; no upload, scheduling, sharing or paid
   generation without his explicit approval for that action.

## Stages (inside animated-video)

0. **Intake + spine** via news-qa-reel (raw hash, transcript, items with `q` flags, `edl.json`,
   `words.json`, `vo.wav`, `proxy-1440.mp4`, whole-clip matte `m0-1440.webm` re-encoded with `-g 15`).
1. **Fact pass** (`NOTES.md`): every checkable claim, status, source, treatment. See `examples/fact-check-notes.md`.
2. **Concept + beat sheet -> STOP 1.** One beat per idea, a new picture every ~2 s, holds >= 1.2 s. For
   each line decide: what happens to the bubble (inflate / crack / harden / host a desk / thread out),
   which chip carries the words, and which zone it lives in. Make it **concrete** (see What to improve).
3. **Style frame -> STOP 2.** One information-heavy beat at 1080x1920 with his cut-out, series tag, a chip
   and a caption. Check his head box against every graphic.
4. **Timing + skeleton + key-frame board -> STOP 3.** `world/timing.ts` (all cues), `beats.ts` (all SIDE,
   END last at `OUTRO.t - 0.3`), `rig.ts` (one pose per beat), stub scenes; stills of every beat start.
5. **Build the world** (scene by scene; `reference/scene-catalogue.md`). `events.ts` from the same constants.
6. **Audio**: `py audio/mix.py bubble` (synthetic score + SFX bed, <= 25 events/min, music well under the voice).
7. **Render + QA**: `npx tsc`, stills sheet, `render_ig.sh Film <name> public/bed-bubble.wav`, `qa.sh`, Whisper on the final audio.
8. **Final review -> STOP 4.** Report the four QA states separately (technical receipts, factual,
   creative = what you looked at and could not, user acceptance = none until he says so). Music/SFX are
   synthetic or CC0 and unauditioned: say so.

## Look

- Deep navy/black studio (`#02040c` -> `#0a1030`) with a soft blue halo and an iridescent floor pool.
- The bubble: thin-film interference colours (cyan `#5ee7ff`, magenta `#ff5fd2`, gold `#ffc94a`),
  bright fresnel rim, two window highlights, additive so it glows over the dark.
- Inside: data-centre blocks with lit windows, GPU racks with LEDs, a core tower, floating chips with
  gold pins, code glyphs. Coin gold `#ffb627`.
- Type: Segoe UI 700-800 (local system font; no network fonts), Consolas on canvas textures.
  Chips are dark glass (`rgba(14,22,56,.84)`) with a coloured 2 px border and glow. Captions are white
  with emphasis words in solid cyan / pink / gold (no shimmer).
- Bloom 0.75, vignette and grain from `kit/finish.tsx` (grain stops gradient banding after IG recompression).

## Motion rules (from his v2 notes: "too much motion")

- One primary motion at a time. Camera: one fixed pose per beat; changes are a cut or a single 0.6 s
  move on a beat change. No drift, sway, orbit, bob or motes.
- The bubble wobbles only in the tension window ("bubble about to pop?") and cracks on "pop"; it never pops.
- Chips pop on their word (`popS`, damping 13-15) and leave 0.2 s before the next beat. City, glyphs and
  icons are static once placed; thread pulses are slow.
- The last ~0.45 s is frozen (`tw(t)` clamps time at `FREEZE`) so the final frames are a stable end card.

## Layout (v6 staging, 1080x1920 design space)

| Zone | Pixels | What goes there |
|---|---|---|
| Series tag | x 40, y ~230-276 | "MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS" pill, frame 0 to the end (`SERIES` in overlay.tsx) |
| Top band | x 40-940, y ~280-760 | hook headline, IG DM questions, money/touch chips, desk monitor, pipeline grid, stay chip, comment card, end title; the bubble fills it in money / touch / stay |
| Right column | x ~700-950, y ~770-1290 | bubble (hook, questions, pipeline, end), answer chips, workflow nodes, "In plain words", follow card |
| Captions | x 692, y 1300, w 258 (`regionFor("SIDE")`) | up to 3 lines, 54 -> 42 px; a too-wide word shifts the block left to end at x 950 |
| Presenter | `SIDE_S 0.88`, `SIDE_X -80`, `SIDE_Y 234`, mirrored, right-edge feather 82% -> 100% | `SIDE_FACE = {x 0, y 770, w 680, h 620}` (head + hair); nothing may cover it. Re-measure for every new take |

The 3D glow is masked out of `SIDE_FACE` by the shader face mask (`FACE` uniforms in `mats.ts`).
Details and collision checks: [layout-and-staging.md](reference/layout-and-staging.md).

## Audio

`audio/mix.py bubble`: Eb-major shimmer (glass bells over a slowly swelling pad, long reverb), cosmos
SFX family (glass pings, blips, deep whooshes, power-up + chime on the harden). Phrase duck -15 dB under
his voice, effects kept >= 20 dB under the voice band, music `MUSIC_DB` -9. 21 events for 59 s (~21/min).
`render_ig.sh` mixes `vo.wav` + bed, 3:1 compression, about -14 LUFS, true peak <= -1.5 dBTP.

## QA

- `npx tsc -p .` clean; stills of every beat start, every chip landing, the crack, the harden, the end card
  and the last frame (`snap.sh`), read as a sheet before any full render.
- Look for: anything over his head box; chips touching the bubble edge; coins or the moon leaving the frame
  top (they did in the source film); chips under the IG UI; empty zones.
- `qa.sh`: streams, 0 decode errors, no black, loudness/true peak, contact sheet, cuts sheet, frame 0, last second;
  faststart check; Whisper on the final audio.

## Delivery spec

1440x2560 (render the 1080x1920 composition with `--scale=1.3333333333333333`), H.264 High, CFR 30,
yuv420p limited range, bt709, <= 25 Mbps and <= 300 MB, AAC-LC 48 kHz 128 kbps, faststart, about -14 LUFS,
TP <= -1.5 dBTP, frame 0 = designed cover (hook headline up), static last ~0.45 s.

## What worked (keep)

- **A real 3D, physically shaded hero object.** The thin-film shell with fresnel and window highlights reads as
  real glass; bloom over a dark studio makes it premium and on-brand for "AI bubble".
- **The bubble acting out the words**: inflating on "pouring billions", stretching and cracking on "pop", hardening
  into a glass planet on "it's gonna stay". The honest "never pops" choice matches his take.
- **The concrete beats were the strongest**: the desk + monitor where his typing gives way to an AI agent orb
  writing the code; the BEFORE/NOW pipeline grid where each step gets a magenta "AI" stamp on the exact word "AI";
  the "In plain words" bar comparison. These are real things from his job.
- **v6 staging**: big presenter, everything in the top band + right column, captions in the right column, series
  tag + anonymous IG DM cards. This clip is the reference implementation of that staging (copied to the other clips).
- Calm camera (one pose per beat), soft sparse SFX, and labels like "Madhav's experience" instead of disclaimers.

## What to improve (Madhav: "okayish, not a super fan")

- **More concrete, less abstract floating.** A bubble with tiny glowing buildings floating in a void says "AI"
  only vaguely. Prefer things a viewer recognises in half a second: real product-like UIs (a PR page, a CI pipeline,
  a chat with an agent), money as a real chart or real headline (sourced), real company-style objects, his actual desk.
- **Fewer, bigger props.** The touch-beat icons were small and crowded around the bubble; one large clear icon per
  word, or a grid, reads better on a phone.
- **Use the dead space.** Frames often show a small bubble plus a lot of dark navy; the right column and the space
  below the top band were empty for long stretches. Fill zones with information, not glow.
- **Keep everything inside the frame.** Coins poured in from above the top edge and the moon touched the IG band.
- **Give the bubble a story arc the viewer can follow**, not a different trick per beat (e.g. a visible "hype vs
  value" gauge on the bubble that fills as he answers).
- **Less sameness between beats**: the same navy studio and glass chips for 59 s get monotonous; vary scale, colour
  temperature or set (inside the bubble / on the desk / at the pipeline) with clear cuts.
- Before reusing it, show Madhav a style frame next to a paper-lab-reel or declassified-dossier frame and let him choose.

## Done when

The four approval stops are recorded; tsc is clean; the stills sheet shows no collisions with his head box or the IG
UI; the master passes every technical receipt; the four QA states are reported separately with evidence paths; and
nothing has been uploaded, scheduled or shared without his explicit approval.
