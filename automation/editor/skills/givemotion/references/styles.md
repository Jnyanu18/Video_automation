# Styles: eight named looks

Purpose: ready-made looks (palette tokens, fonts, background, motion personality) so a video is consistent from the first scene to the last. Pick one, adapt it to the brand if the brief gives colors or a logo, and stay with it.

Contents
- How to use a look
- Fonts that work everywhere
- 1 Midnight Tech · 2 Paper Whiteboard · 3 Editorial · 4 Bold Pop · 5 Swiss Grid · 6 Neon Night · 7 Soft SaaS · 8 Terminal
- Choosing a look

## How to use a look

1. Pick the look that fits the brief (table at the end). If the brief names brand colors, keep the look's structure (background, ink, muted, one or two accents) and swap the hex values.
2. Put the tokens on `:root` and use only them:
   ```css
   :root { --bg: #0b0d12; --surface: #151a23; --ink: #f2f4f8; --muted: #9aa3b2; --accent: #5b8cff; --accent-2: #38e1c7; }
   body { background: var(--bg); color: var(--ink); }
   ```
3. Use the look's motion personality for every scene: the same easing family, the same transition family, the same camera behaviour. Change layouts and camera framing between scenes, not the style.
4. Contrast: the ink and muted colors below pass 4.5:1 on their background; accents pass 3:1 or better, so use accents for big type, shapes and strokes, and ink for small text.

## Fonts that work everywhere

Built into the engine (no file, no network, the same on every machine, and they win over fonts installed on the machine):
`Inter` (sans, 100-900, italic), `JetBrains Mono` (mono, 100-800, italic; ligatures are off inside `code`/`pre`), `Playfair Display`
(display serif, 400-900, italic), `Space Grotesk` (grotesk display, 300-700), `Bebas Neue` (condensed caps, 400), `Nunito`
(rounded, friendly, 200-1000), `Caveat` (handwriting, 400-700). Use these names first in every stack. For a brand font, put the file next to the HTML and load it with
`@font-face`. A Google Fonts `<link>` also works (the render waits for it) but needs the network on every render.

- Sans: `Inter, system-ui, sans-serif`
- Display serif: `"Playfair Display", Georgia, serif`
- Mono: `"JetBrains Mono", Menlo, monospace`
- Grotesk display: `"Space Grotesk", Inter, sans-serif`
- Condensed/impact: `"Bebas Neue", Impact, sans-serif`

Your own `@font-face` with a built-in name (say a local `Inter`): **yours wins for every weight and style it declares**
(it comes after the engine's faces). Weights or styles it does not declare still come from the built-in face of that name:
a file declared only for 400 gives you your 400, and `font-weight: 700` or italic text uses the built-in Inter 700 / italic.
That is fine when your file is the same font. If it is a different font, give it its own name (`font-family: 'Brand'`)
so nothing mixes, and declare every weight you use (or one variable file with `font-weight: 100 900`).

Text weight: the preset draws text with grayscale antialiasing and `text-rendering: geometricPrecision` (exact glyph
sizes, so text that scales or zooms does not jump between sizes). It looks a little lighter than a browser or app on
a desktop. To match a brand's own screenshots or renders, set `body { -webkit-font-smoothing: auto; text-rendering: auto; }`
(or use the next weight up); keep the default for text the camera zooms.

Numbers that change (`data-count`, clocks, scores): in natural motion a `data-count` element gets
`font-variant-numeric: tabular-nums` (all digits as wide) unless your CSS sets `font-variant-numeric`. That matters: Inter and
Space Grotesk digits are proportional by default (a 1 is a third narrower than an 8) and have tabular forms; JetBrains Mono,
Bebas Neue and Caveat digits are already all as wide; Playfair Display has none (use `data-count-fixed`; classic motion keeps
the font's default digits). The number still grows wider as digits are added
(9 → 10 → 1,000), which moves centred text. Add `data-count-fixed` to stop all sideways movement: each digit sits in a cell as
wide as the font's widest digit (works with any font, also ones without tabular digits like Playfair's old-style figures), and
the box keeps the width of the longest number from the first frame, with the digits right-aligned in it (the units digit
never moves; prefix and suffix stay put). For your own counters in `gm.onFrame`, set `font-variant-numeric: tabular-nums`.

## 1 Midnight Tech

For: product launches, AI/dev tools, SaaS promos, tech explainers.
- Palette: `--bg #0b0d12` `--surface #151a23` `--ink #f2f4f8` `--muted #9aa3b2` `--accent #5b8cff` `--accent-2 #38e1c7` `--alert #ff5c7a`.
- Type: sans, titles weight 800, `letter-spacing: -0.03em`, 120–200 px; mono for code and numbers.
- Background: 2–3 large blurred glow blobs in the accents at 20–35% opacity (still blobs are almost free to render), fine grain, or `grid-bg` with `glow` in the accent. Screenshots tilted in 3D with a soft shadow and a 1 px light border.
- Motion: crisp. Entrances `out-expo` 0.5–0.7 s, `mask-up` word reveals, `push-*`/`whip-*`/`zoom-through` transitions, camera push 1.06 on every scene, one burst + shake hit on the reveal.

## 2 Paper Whiteboard

For: whiteboard explainers, "how it works", teaching, sketch-note stories.
- Palette: `--bg #fbfaf6` `--ink #1e1e1e` `--muted #5c5f66` `--accent #1971c2` `--accent-2 #e8590c` `--good #2f9e44` `--highlight #ffd43b` (hatch fills: `#ffd43b`, `#74c0fc`, `#ffc9c9`).
- Type: `Caveat` 600–700 for titles and labels (≥ 48 px in world units, ≥ 40 px on screen), sans only for tiny UI text inside drawn screens.
- Background: plain paper; optional very faint dot grid. Everything on one big world.
- Motion: drawn, not animated: `data-sketch` shapes with `data-enter="draw"`, `write` for text, `data-sketch-mark` highlights; strokes 5–7 px; one `gm.camera` moving close from step to step, a short pull-back at the end. Easing `in-out-sine`/`in-out-cubic` for the camera, no bouncing.

## 3 Editorial

For: data stories, documentaries, reports, premium brands, quotes.
- Palette: `--bg #f3eee4` (warm paper) `--ink #1b1a17` `--muted #5f5a50` `--accent #c2410c` (burnt orange) `--accent-2 #1e40af` (ink blue).
- Type: display serif for headlines (96–180 px, weight 600–700, tight leading 0.95), sans for labels and numbers; big numbers in the serif.
- Background: flat paper with a subtle vignette; thin rules (2–3 px) and a strict margin grid; photos in duotone or with a thin frame.
- Motion: calm and confident. `out-quart` 0.8–1.0 s, line-by-line `mask-up` (`data-split="lines"`), `wipe-*` and `push-*` transitions, slow camera push 1.03–1.05, charts that draw with holds on the key points. No elastic or bouncy eases.

## 4 Bold Pop

For: vertical social clips, year recaps, celebrations, youth brands, music-driven edits.
- Palette: `--bg #fff7e8` `--ink #1a1a2e` `--pink #e11d74` `--blue #2a6df4` `--teal #0f8a7e` `--yellow #ffd23f`. Color-blocked scenes: whole backgrounds in pink, blue or yellow (ink on yellow, white on pink and blue).
- Type: heavy condensed or sans weight 900, UPPERCASE for short words, 140–260 px, one word per beat.
- Background: flat color blocks, big geometric shapes (circles, stars, blobs) drifting and rotating behind the type.
- Motion: punchy. `pop`, `drop`, `elastic`, `back.out(1.8)`, fast `cover-*`/`push-*` transitions (0.35–0.5 s) on the beat, `data-pulse="beat 0.06"` on the hero, confetti on the payoff. A change every 0.4–0.8 s.

## 5 Swiss Grid

For: corporate explainers, finance, architecture, B2B, clean information design.
- Palette: `--bg #f5f5f2` `--ink #111111` `--muted #5a5a5a` `--accent #d62828` (one red) `--navy #1d3557`.
- Type: sans (Helvetica/Inter), flush left, strong size contrast (a 200 px number next to 36 px labels), lots of alignment to a 12-column grid.
- Background: flat; thin black rules that `grow-x`; solid red blocks as the only decoration.
- Motion: precise and mechanical. `in-out-cubic`/`out-quart`, `wipe-*`, `grow-x`/`grow-y`, `mask-left`; transitions `wipe-left` or `push-left`; camera moves in straight lines; no overshoot.

## 6 Neon Night

For: gaming, music, events, hype trailers, energetic promos.
- Palette: `--bg #07060d` `--ink #f5f3ff` `--muted #a9a3c7` `--magenta #ff2bd6` `--cyan #00e5ff` `--lime #b6ff3b`.
- Type: wide or condensed sans weight 800–900; glow with `text-shadow: 0 0 calc(var(--px)*24) var(--magenta)`; mono for HUD details.
- Background: dark with neon lines, a perspective grid, light streaks; grain and a vignette.
- Motion: aggressive. Beat-cut `whip-*` and `zoom-through`, `scramble` and `steps(4)` glitches, shake on hits, `sparks` bursts, `--motion-blur 8` for the final render.

## 7 Soft SaaS

For: friendly app and UI demos, onboarding, consumer products, feature tours.
- Palette: `--bg #f5f3ff` `--surface #ffffff` `--ink #1e1b4b` `--muted #5b5891` `--accent #4f46e5` `--pink #db2777` `--success #15803d`.
- Type: sans weight 700 for titles (96–140 px), 500 for UI; rounded corners 20–28 px everywhere.
- Background: a soft gradient (`gradient-bg` with light `c1/c2/c3` and dark ink on top) or white with large pastel blobs; cards with soft long shadows.
- Motion: friendly. `spring`/`gentle`, `pop` for chips and toasts, `gm.fly` and `morph` to move UI between states, `cursor` with `show="auto"`, the camera gliding over the UI and pushing in on the part that changes.

## 8 Terminal

For: code explainers, developer tools, CLI demos, security and infra topics.
- Palette: `--bg #0d1117` `--surface #161b22` `--ink #e6edf3` `--muted #8b949e` `--green #3fb950` `--purple #d2a8ff` `--orange #ffa657` `--blue #58a6ff`.
- Type: mono for code and labels (code ≥ 32 px on screen), sans or mono weight 800 for titles.
- Background: near-black with a faint grid or scanline texture; the `code-window` block restyled to these tokens.
- Motion: `data-type` typing, `scramble` reveals, `steps()` blinking carets; the camera pushes into the line that matters while the other lines dim (`focus` on `code-window`); hand-drawn arrows (`gm.connect` with `sketch: true`) or numbered callouts for annotations.

## Choosing a look

| Brief | Look |
|---|---|
| Launch, AI tool, SaaS promo | Midnight Tech (or Soft SaaS for a consumer app) |
| Whiteboard, "how X works" | Paper Whiteboard |
| Data story, report, documentary | Editorial (or Midnight Tech for a startup's metrics) |
| Vertical short, year recap, celebration | Bold Pop |
| Corporate, finance, B2B explainer | Swiss Grid |
| Music, gaming, event hype | Neon Night |
| App or UI walkthrough | Soft SaaS |
| Code explainer, CLI, devtools | Terminal |
| Logo sting | The brand's own colors on Midnight Tech or Swiss Grid structure |
