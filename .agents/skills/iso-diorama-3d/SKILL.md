---
name: iso-diorama-3d
description: >-
  Madhav's "Iso Diorama" world: a low-poly clay toy city on a floating isometric island
  (three.js orthographic camera inside Remotion) where each idea is a job tile or a little
  scene; people swap to robots with a puff exactly on the word, a two-pan scale tips, the island
  goes to night, labels are chunky Fredoka pills projected from 3D anchors, and the camera dollies
  calmly between tiles. Composited behind the real presenter's cut-out (bottom-left, v6 staging)
  with captions in the right column. Use when asked for an "iso / isometric diorama", "clay toy
  city", "tiny 3D island", "make it like the robots one", or a playful 3D world for a jobs /
  economy / "which X will Y" news or Q&A Reel. Plugs into the news-qa-reel shell and runs inside
  the cstack animated-video stages and approval stops. Not for glowing deep-space 3D
  (luminous-cosmos-3d) or paper collage (paper-lab-reel).
---

# Iso Diorama 3D (clay toy island behind a real presenter)

A floating square island of pastel clay tiles, seen through an orthographic isometric camera. Every
spoken idea is a place or an action on the island: a tile whose worker becomes a robot on the word,
a scale that tips, a gallery the camera pushes into, a chai corner, a jeweller's counter. Chunky
rounded label pills float above 3D anchors. The presenter (his real face and voice) sits large in
the bottom-left; the island fills the top band and the upper right.

First built for "Robots will take these jobs first. Is yours on the list?" (Oct 2026 news batch,
clip c4; frames in `../../docs/iso-diorama-3d/`). That film's tiles (food delivery, car, warehouse,
coal mine, chai corner, jeweller, gallery, factory, plaza scale) are **worked examples, not the
recipe**: design new tiles for every topic.

**Where it fits.** This is a *world* for the **news-qa-reel** shell skill (the shell owns the take,
spine, presenter, captions contract, series tag, IG-DM question cards, render and QA). Run both
inside the cstack `animated-video` skill (Remotion; read it first): its approval stops, full-quality
delivery, four separate QA states and "no publishing without approval" always apply.

Reference files (read when you reach that stage):
- [reference/art-direction.md](reference/art-direction.md): palette, clay materials, type, pills, figures, lighting, sky.
- [reference/scene-catalogue.md](reference/scene-catalogue.md): every tile, prop, overlay and helper, with its file.
- [reference/camera.md](reference/camera.md): the iso camera maths, keys, screen anchors, `project()` for labels.
- [reference/pitfalls.md](reference/pitfalls.md): what went wrong across v1-v7 and the fixes.
- [reference/commands.md](reference/commands.md): stills, dumps, mix, Instagram-max render, QA.
- [template/README.md](template/README.md): the working code and what to rewrite per film.
- `examples/`: the first film's beat table, script, fact-check notes and hook choices.

## When to use

- A presenter answers a question (often an anonymous IG DM) about jobs, industries, cities,
  supply chains, "who wins / who is safe": anything that maps onto **places on a map** where
  something changes on the word.
- He wants something playful, warm and 3D but calm (toy-like, not sci-fi).
- Not when the subject is abstract maths or space (use luminous-cosmos-3d), handmade/tactile
  (paper-lab-reel), or retro (retro-space-poster, pixel-arcade).

## Non-negotiables

1. **His real self is the anchor.** Real face, lips, voice from the take, cut out with a local
   matte. Never regenerated, retouched or lip-synced. No camera move ever zooms toward his face.
2. **Every time comes from his words** (`cue("phrase")` in `src/world/timing.ts`). No absolute
   seconds; a re-cut retimes everything.
3. **Facts only what is said.** On-screen text repeats or condenses his words; opinions get a
   "MADHAV'S TAKE" pill. No invented numbers, no disclaimers or "not endorsed" lines.
4. **Calm motion** (his v2 note: "too much motion"). The camera moves only at item/sentence changes
   (0.4-0.5 s), then holds. No idle bob, drift, spin or loops; vehicles drive ~2 s then park.
5. **Approval stops are real stops.** A full brief is not blanket approval. No upload, scheduling,
   sharing or paid generation without his explicit approval for that action.
6. **Delivery quality:** the approved full-quality 1440x2560 master only, never a proxy or shrunken copy.

## Stages and approval stops

Keep `CHECKPOINT.md` (project) and `film/WORLD-NOTES.md` (this world) current at every stage.

### Stage 0 - Intake, spine (news-qa-reel)
The shell builds the take: source ranges -> `vo.wav`, `src/words.json` (output time, `q` marks
words of a question he reads), `src/edl.json`, the 1440 proxy and the whole-clip matte. Read
`words.json` and `edl.json` before designing anything.

### Stage 1 - Fact-check + concept -> APPROVAL STOP 1
- Fact table for every checkable claim (examples/fact-check.md). Treatments: cut the line from the
  spine (with his approval), or a truthful chip. Opinions stay his, labelled as his take.
- Concept: the island layout (3x3 grid of tiles around a plaza is the default), which tile each
  sentence lives on, what changes **on which word**, one recurring "swap" verb (here: human ->
  robot puff). Beat table: one beat per script item (examples/beat-table.md).
- Hook: the frame-0 headline is his exact spoken hook, designed in Fredoka over the island.

### Stage 2 - Style frame -> APPROVAL STOP 2
One information-heavy still with the presenter cut-out, a caption, the series tag, a pill and a
tile mid-swap. Check face clearance and the Instagram UI zones (top ~220 px, bottom ~380 px,
right ~140 px).

### Stage 3 - Build + key-frame board -> APPROVAL STOP 3
1. `timing.ts` (every cue), `times.ts` (swap / scale / night / glow times derived from cues),
   `cam.ts` keys (one per beat or sentence), `beats.ts`.
2. Tiles in `tiles.tsx`, primitives in `parts.tsx`, labels in `overlays.tsx`.
3. `events.ts` from the same constants (~20-25 soft events per minute; only real hits).
4. Stills with `snap.sh` at 0, every beat start, every swap, the end card and the last frame;
   build a board, look at it, fix empty areas, collisions with his head and captions, unreadable pills.

### Stage 4 - Audio, render, QA -> APPROVAL STOP 4 (final review)
`python audio/mix.py iso` (G-major marimba score, music -11 dB, FX -26 dB, ducked -15 dB under
every phrase), `render_ig.sh`, `qa.sh`; then report the four QA states separately (technical,
factual, creative, user acceptance). Music/SFX are synthetic/CC0 and unauditioned: say so.

## Layout zones (1080x1920 comp, v6 staging defaults)

| Zone | Where | What goes there |
|---|---|---|
| Series tag | x 40, y 230-276, frame 0 to end | "MICROSOFT ENGINEER ANSWERS YOUR IG QUESTIONS" IG-gradient chip |
| Top band | y ~220-780, x 60-940 | island / tile views, main pills, hook headline, IG DM question cards (top 306), end title |
| Right column | x ~700-950, y ~760-1300 | secondary pills, stamps, the "A / MY ANSWER" tag (bottom 1284), follow card + handle |
| Captions | x 692-950 from y 1300, up to 3 lines, 54 -> 42 px | `DioramaCaption` |
| Presenter | scale 0.88, x -80, y 234, mirrored, right edge feathered 82% -> 100% | head ~x 0-780, y 830-1470 (`SIDE_FACE`) |

Camera screen anchors put the target at ~(640, 650): the island lives above and right of his head.
World-anchored labels are clamped into the top band (`RC()`), and small world effects (sparkles,
hearts, chat dots) are skipped where they would touch his head (`clr()`).

## Look (summary; full detail in art-direction.md)

Pastel clay: teal ground #9fdccb, sand #f4dca8 and clay #e2a77f island sides, coral #ff8a7a,
butter #ffd86b, lavender robots #b7a4f2 with a glowing teal visor #6ff4ff. Sky = CSS gradient peach
-> sky -> lilac; sunset gradient for the end card; a multiply night tint with stars for "24/7"
moments. Matte MeshStandardMaterial (roughness 0.82), rounded boxes, soft 2048 shadows, hemisphere
+ warm sun. Type: **Fredoka 600/700** pills with a darker bottom lip (toy-button look), plum ink
#3b2f5c; captions white with a plum extruded edge, emphasis words on a butter pill.

## Motion rules

- One change per sentence, landing on its word within a few frames (swap puff at `ts`, pill pop
  `popS(t, cue)`, stamp scale 1.9 -> 1).
- Camera: keyed dolly (target + log-space zoom + screen anchor), 0.4-0.5 s moves at beat or sentence
  changes, then a hold. Push into a detail (a painting, a diamond) only on the word that names it.
- Comparisons (the scale) hold at least ~3 s with both pans and labels readable.
- Pills fade in/out over 0.25 s; during a camera move world-anchored pills cross-fade (known, acceptable).
- Nothing loops. Every motion is a pure function of `t`.

## What Madhav liked / disliked

- Liked: the toy island itself, swaps on the exact word, the scale, the chai corner (sit / sip /
  gossip), the night "24/7" moment, his face big in the bottom-left (v6), the "someone asks
  anonymously in my IG DM, I answer" framing.
- Disliked: too much motion (v1: drift, bob, spinning props, loops), zooming toward his face,
  a small face with blank screen (v5 -> v6), his idle footage under a cloned voice ("not my face
  talking"), disclaimers, facts he did not say.

## Delivery spec

1440x2560 (render at `--scale=1.3333333333333333`), H.264 High, CFR 30, yuv420p limited range,
bt709, <= 25 Mbps and 300 MB, AAC-LC 48 kHz 128 kbps, faststart, about -14 LUFS, true peak
<= -1.5 dBTP, 0 decode errors, no black frames, frame 0 = the hook cover, last ~0.3 s static end card.

## Done when

The approval stops are recorded; the master passes every technical receipt; the four QA states are
reported separately with evidence paths; open issues are listed by time range; and nothing has been
uploaded, scheduled or shared without his explicit approval.
