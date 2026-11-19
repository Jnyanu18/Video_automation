# Paper Lab art direction

The look of a hand-made explainer shot on a warm desk: paper cut-outs, real stationery, a
red marker, a stop-motion camera. Everything is SVG drawn in code from `t` and seeded randomness
(`template/src/paper/kit.tsx`). Choose fresh scenes and a fresh hero object per topic; keep the
vocabulary, finish and motion rules below.

## Finish bar (from animated-video step 6, in paper terms)

- **Full frame.** No shot leaves more than about a quarter of the frame as flat paper. Dress the
  edges with desk objects (`Dressing`: pencil, paper clip, coffee ring, sticky note, loose scraps),
  partly off-frame.
- **Depth.** Every cut-out casts a warm shadow; foreground scraps move faster than the board
  (parallax); a board camera that drifts, pans or pushes, and rarely stops.
- **One brightest thing.** Usually the gold hero object, with a warm radial light on the paper under it.
- **Real things.** Web pages with browser chrome, newspaper clippings with halftone photos, code
  printouts, cloth-covered books, a photocopier, polaroids, real equations and real logos where
  named. Never a coloured rectangle standing in for a thing.
- **Transitions through content.** A page turns over the frame, a corkboard falls away, construction
  paper is torn off upward, equation symbols peel off and become network nodes, the footage
  polaroid flies into an object. No crossfades, no flat-colour flashes.
- **No decorative scaffolding.** No HUD kickers, corner brackets or fake readouts.

## Palette (one meaning per accent)

| Role | Colour |
|---|---|
| Board: warm cream paper with fibre grain (`board.jpg`) | `#efe4cf` |
| Ink (text, pencil lines) | `#1d1a2e` |
| Red marker: attention (circles, arrows, X, underlines, stamps, emphasis words) | `#e2372b` |
| Blue ink: data or the thing being learned | `#2f5fb3` |
| Masking tape | `#f7d774` |
| Gold: the hero object, insight, the answer | `#d9a520` (with highlights up to `#ffe9a0`) |
| Papers for scraps and cards | `#fffaf0 #f3e7c9 #dfeefb #fde2e4` |
| Navy construction paper, for a "big/cosmic" set | `#1b2550` (`navy.jpg`) |
| Cork, for an "everything out there" set | `cork.jpg` |
| Shadow | `rgba(74,52,32,.35)`, offset (+6, +9), blur 5 |

One warm desk light from top-left (textures are lit that way; keep highlights consistent).
Pick a different accent set if the topic needs it, but keep the meaning-per-colour rule.

## Type

- **Special Elite** (typewriter): labels, scraps, tags, stamps. Minimum ~28-30 px on a 1080 frame.
- **Caveat 700** (handwriting): notes, card titles, handwritten equations.
- **Fraunces 800**: captions on white paper strips, sticker text, the end-card title.
- **Anton** (condensed): the hook words only.
- Maths: use one face for every equation card. System fallbacks (Cambria Math) look different from
  the handwritten cards; prefer writing equations in Caveat or render them as drawn paths.

## Materials and primitives (`kit.tsx`, `cube.tsx`, `dressing.tsx`, `front.tsx`)

| Primitive | Use |
|---|---|
| `Defs` | shared filters: `psh`/`psh2` paper shadows, `pshN` shadow on navy, `prough` rough edge, `psmudge`, `pglow`, `pgoldlight` warm light, patterns `pgraph` (graph paper), `plined` (notebook), `phalftone`, `pcurl` page curl. Include `<Defs/>` in every `<svg>` |
| `torn(w,h,seed,edges,amp)` | torn-edge path for any paper piece |
| `Scrap` | torn scrap with typewriter text (snippets: page titles, code, facts) |
| `Card` | index card with red header rule and blue lines |
| `Tape`, `Pin` | masking tape strips, push pins with shadow |
| `Draw` | marker/pencil stroke revealed along its length (`p` 0..1) |
| `Dotted` | dotted pencil path revealed with a mask so dots stay put |
| `circlePath` | hand-drawn marker ellipse that overshoots its start |
| `Stamp` | rubber stamp that slams in (scale 1.9 -> 0.94 -> settle), double border, worn-ink specks; for qualifiers and verdicts |
| `Polaroid` + `Photo` | polaroid frames with illustrated photos (needs a unique `clipId`) |
| `Clipping`, `WebPage`, `CodeSheet` | newspaper clipping with halftone photo, printed browser page, code printout |
| `BgImage` | full-frame texture with gentle drift, overscanned |
| `GoldCube` | the hero object: orthographic real-3D origami cube; `yaw/pitch/roll`, `squash`, `glow`, `unfold` 0..1 into a cross net, `faces` filled count (pencil outlines for the rest) |
| `Sparkle` | cut-gold four-point star burst |
| `Note`, `Sticker`, `QMark` (front.tsx) | sticky note, pill sticker with white edge, cut-paper red "?" |
| `Dressing` | desk dressing at the board edges |

Motion helpers: `twos(t)` (pose holds on twos), `boil(seed,t,amp)` (line boil every 2 frames),
`back()/pB()` (overshoot and settle), `pS()` (eased 0..1 from a cue), `rnd/rr` (seeded random).

## Motion language

- **Stop-motion on twos:** paper poses hold for 2 frames (`twos(t)` for anything "placed by hand").
  Smooth motion is reserved for the camera and travelling objects.
- **Snap, overshoot, settle:** arrivals use `back()` with s 1.9-2.6; stamps slam; tape tears and sticks.
- **Marker strokes draw on** (circles, arrows, underlines, X's) on the spoken word.
- **Camera:** slow drift (`sin(t*0.1)` scale) always on, pull-backs to reveal scale, push-ins on
  "something so small" moments, parallax for foreground scraps.
- **Secondary life:** scraps flutter, the hero object bobs and turns slowly, threads sway.
- **Line boil** on drawn elements (1-2 px) so nothing is dead-still.

## The hero object

One object carries the film's idea from beginning to end (first film: a gold origami cube for "the
compressed thing"). Rules that made it work:
- It is born from a visible action on a key word (a tall stack folds down into it in 4 stop-motion steps).
- It recurs: beside the presenter in FULL beats (right column, x ~800-1000, y ~600-900), at the centre
  of teaching sets, receiving the footage tile, and emitting the footage tile.
- It has states: squash on "small", sparkle on "came out", rattle while "thinking", glow on insight,
  pencil-outline faces filling in as it is "built".
- It becomes the ending: the footage polaroid flies into it, it gulps, unfolds into a flat net, and
  the net grows into the end card.
Choose a new object per topic (a seed, a key, a lens, a folded map...) built as a parametric
component like `GoldCube`.

## Recurring scene vocabulary (pick what fits the topic)

- **Corkboard of everything** (cork texture, three nested scales of clippings, pins drop on a word, red
  string links pins on "spread", camera pulls back to reveal scale).
- **Cut and lift:** steel ruler + craft knife slice a strip off a board; the rest dims.
- **Lab board:** graph paper with a pencil-drawn neural network whose layers fill red on spoken
  words; scraps stream through it and collapse onto one inked curve on an index card.
- **True-scale comparison:** a tall tied paper stack vs the small hero object, a dashed ghost of the
  big one kept for the comparison, a typed tag naming the real source, held at least 3 s.
- **Books and copier:** cloth books fan out, pages flip on twos, a "copy every page" photocopier gets a
  red X; red threads lift off the pages and knot into a pattern.
- **Notebook algebra:** a lined page turns over the frame; symbols inked word by word, givens circled red,
  the unknown ringed blue; practice cards pile up; symbols physically hop across "=" to rearrange;
  a WORKS stamp. Then the symbols peel off into network nodes.
- **Question cards to the hero object:** questions pinned left with red thread, answers pop out right
  and stack; one comes back ink-smudged and gets a qualifier stamp.
- **Cut-paper cosmos:** navy construction paper, paper stars, ringed planet, a galaxy spiral of
  scraps, real law cards spiralling into the hero object; torn away upward to reveal the next board.
- **Path:** a dotted pencil path from the presenter to the object; a cardboard robot arm folds scraps
  into it (make a real hand if the line says "hand").
- **CTA board:** masking-tape lower third "Random thoughts with Madhav" (or the series name), a follow
  sticker on "follow", paper-doll chain on "more people", icons pinned on their words, stickers in
  the top band.
- **End card:** gold-bordered cream card with a folded gold corner; the question in Fraunces with the key word
  red and marker-underlined; a follow line in typewriter type (make it at least 36 px; 31 px was small).

## Footage dressing

- Cut-out (SIDE): white sticker edge + warm drop shadow, as a CSS filter chain on the cut-out
  layer (`drop-shadow(±8px 0 0 #fff)` four ways + `drop-shadow(20px 28px 22px rgba(74,52,32,.45))`).
- Tile (footage flying into the world): a polaroid, via a `boxShadow` white border with a deeper
  chin and a warm shadow.
