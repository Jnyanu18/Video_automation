# Pixel Arcade art direction

## Why it works
- **One coherent fiction:** the Reel *is* a game. Every claim becomes a game mechanic (patch notes,
  a menu choice, a fight, a power-up, a territory race, a high-score table), so the viewer reads
  the meaning instantly without labels explaining it.
- **High contrast on black** reads on a phone at a glance and keeps his real, warm-lit footage the
  most natural thing on screen.
- **Hand-made bitmap type** (no web font) makes every word part of the art and renders crisply at
  any scale.
- **Equal sides:** rivalry stories stay neutral by using the same sprite for both teams with
  swapped palettes, and equal hits in the fight.

## Grid and rendering
- Comp 1080x1920; `CELL = 9` (120 x 213 cells). Snap every position: `snap(v, 9)`
  (`scenes.tsx`). Floor lines may snap to 3.
- Draw inside `<PxLayer>`: one full-frame SVG, `shapeRendering="crispEdges"`, with the `#bloom`
  filter (Gaussian 7 + merge) defined once. Two layers (Back, Caption) each define their own.
- Text and sprites are merged run-length SVG paths (cached), so hundreds of glyphs are cheap.

## Palette (`C` in px.tsx)
| Key | Hex | Use |
|---|---|---|
| bg / panel / panel2 | #05060a / #0b0d1a / #141834 | ground, window fills, P1 frame |
| green / xbox / xboxDark | #39ff6a / #107c10 / #0a4a0a | team A, positive, P1 frame border |
| blue / ps / psDark | #2fa8ff / #0070d1 / #003a75 | team B, rival |
| mag | #ff2bd6 | MADHAV'S TAKE, floor tint, hearts |
| yellow | #ffe14a | titles, emphasis words, crowns, coins |
| red | #ff3b3b | FIGHT!, RETIRED stamp, GAME NEWS header, rising costs |
| white / grey | #f4f4ff / #6b7090 | body text / inactive, "previous" |
Swap the team colours per story (keep one warm accent for "his take" and red for alarm).

## Bitmap font (`px.tsx`)
- Glyph 5x7, advance 6 font pixels. `textW(s, scale)` measures; `PxText` draws with `align`,
  `shadow` (default black offset), `outline` (8-way), `glow` (bloom), `chars` (typewriter prefix).
- Glyphs: A-Z (lowercase maps to upper), 0-9, `? ! ' . , : - > < / + @ _ % "`, `↑ ↓ ▶ ◀ ♥ ★ ·`, `x`.
  Unknown characters render as `?`: add a glyph row string to `G` rather than avoiding the word.
  Curly quotes and dashes are normalised.
- Sizes: labels >= 5 (35 px), body 6-7, headlines 8-13, VS/FIGHT! 15-16. Long headlines: break
  into 2-3 centred lines across the top band, max ~22 characters at scale 7.

## Sprites
Rows of palette characters, `.` transparent; `Sprite` renders with a `pal` map and optional
`mirror`. Keep sprites under ~22 rows; scale 7-14. Library: fighter idle/punch (+ `fighterPal`),
crowd player, coin, cartridge, heart, ? block, crown, open lock, flag, studio building (scenes.tsx).

## Panels and HUD
- `PxPanel`: black fill + double neon border, notched corners, inner highlight line. Colour = meaning
  (green news/positive, yellow headline person, magenta question, red breaking, grey past).
- `PxBar`: segmented bar, `dir` -1 drains from the left (mirrored HUD), `seg` sets segment width.
- Header strips: a full-width coloured rect inside the panel top with scale-5 black-shadowless text.

## Backgrounds
- `Backdrop(tint)`: static starfield (80 seeded stars), horizon glow at y 1260, 21 perspective
  verticals + 10 horizontals in the tint, bloomed horizon line. Tint per beat (magenta default, blue
  for rival/comment beats, green for the end).
- `SplitBg`: stepped diagonal team split with a few static speed streaks for the VS beat.
- `CRT`: scanlines (3 px on / 3 px off), faint RGB aperture mask, radial vignette. k 0.8 over Back,
  0.25 over everything (Front) so his footage gets only a hint.

## Presenter treatment
- He is "P1 MADHAV": a green label tab above his head and (v3) a dark scanline frame behind him.
- `cutoutFilter: drop-shadow(0 0 14px rgba(0,0,0,0.55))`. Do **not** use a coloured rim: the green
  rim lit matte holes (hands) and caused a green flash (v2 fix).
- Never pixelate or posterise his footage.

## Motion vocabulary
| Verb | How | Where |
|---|---|---|
| appear | `appear(t, at)` = fast spring to 1 | most items |
| slide-in | 40 px from the right, snapped | column list items |
| stamp | scale 1.6 -> 1 + red frame | RETIRED |
| big word | scale 1.3-1.6 -> 1 with glow | FIGHT!, GOING ANYWHERE, STUDIOS, CHEAPER ↓ |
| menu cursor | ▶ jumps to the option on its word, option lights | CHOOSE YOUR PATH |
| hit | 0.3 s punch pose + 8-square spark + health bar -12% | fight |
| waves | sprites pop in two waves on two words | crowd |
| arc | items fly from a source on a sine arc into a grid | cartridges |
| spread | tiles flip colour by distance from a seed + white flash | territory map |
| strike | yellow bar grows over a word, then the answer pops | GAME OVER? -> NO - CONTINUE |

Calm rules: one primary motion at a time; nothing loops forever; no blinking; the screen fades in
its last 0.12 s.
