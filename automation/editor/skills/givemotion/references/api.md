# API: built-in attributes, presets, easings, preset CSS, blocks

Lookup tables. SKILL.md has the core; `references/timeline.md` has `gm.timeline` in full.

## Built-in motion (no JavaScript)

| Attribute | What it does |
|---|---|
| `data-enter="<preset> [dur] [delay] [easing]"` | Animate in at the start of the element's clip. Default: a spring timed to the move's size. |
| `data-exit="<preset> [dur] [delay] [easing]"` | Animate out so it finishes at the clip end (delay counts back from the end). `collapse` takes a row out of a list: it slides aside, then its height closes and what is below moves up. |
| `data-stagger="0.08"` | Apply enter/exit to each child (or each split piece) with increasing delay. |
| `data-split="words\|chars\|lines"` | Wrap pieces in `.gm-word` / `.gm-char` spans with `--i` (index) and `--n` (count) for your own CSS. |
| `data-count="0 1250"` | Count up. Also `data-count-duration` (1.6), `-delay`, `-prefix`, `-suffix`, `-decimals`, `-ease`, `-group="false"`. |
| `data-count-roll` | With `data-count`: an odometer. Each digit rolls on its own wheel, clipped to one line so no neighbour shows; higher digits turn only when the one to their right passes 9, and a wheel too fast to follow ticks instead of rolling. Use it instead of hand-building digit wheels. |
| `data-roll="0: 0000 M; 3: 0200 M; 6.5: 1000 M"` | A readout whose value changes at given times (seconds from the element's start), any text. What the old and new values share at the start and end stays still; the rest rolls, each character in its own one-line slot, right to left. Also `data-roll-duration` (0.45), `-stagger` (0.04), `-ease` (`power3.out`). Use it for depth meters, scores, "1 IN 10" → "1 IN 100", prices, dates: never hand-build digit wheels. |
| `data-type="30"` | Typewriter at 30 chars/sec, keeps inner markup. The text not typed yet stays in the layout, invisible (`.gm-rest`), so every letter appears where it stays: centred text does not drift as it grows and no word jumps to the next line. Also `data-type-delay`, `data-type-caret` (a blinking caret; `data-type-caret="0.8"` removes it 0.8 s after the typing ends). |
| `data-scramble="1.2"` | Text decodes from random glyphs, left to right, over 1.2s. Also `data-scramble-delay`, `data-scramble-chars`. |
| (no attribute) | To swap a word, a time or a label at a moment: `gm.timeline('#scene').set('#label', { textContent: 'Done' }, 2)` (seekable; `references/timeline.md`, "Text"). In JS, `gm.onFrame('#scene', (local, info, el) => …)` gets the scene's time; `gm.onFrame(fn)` alone gets the video's (`references/javascript.md`). |
| `data-camera="push 1.1"` | Slow camera move over the clip (added on top of other transforms). Moves: `push [scale]` `pull [scale]` `move-left/right/up/down [px]` `rotate [deg]` `orbit [deg]` (3D) `float [px]` (gentle drift, default 14) `handheld [px]` (default 7) `shake [px] [from-to]` (an impact: rises and dies away inside its window, e.g. `shake 14 2.1-2.5`). Combine with commas: `"push 1.08, float"`. Optional window `"push 1.2 1-3"` (seconds into the clip) and easing. Put it on the scene or on a wrapper of the content. |
| `data-parallax="0.3"` | Next to a `gm.camera` world: moves 30% as much as the world (depth). |
| `data-morph="logo"` | Shared element for `data-transition="morph"`. |
| `data-expect="in-by 2.5; hold 1.5; gone-by 9; in-frame"` | Timing promises (video seconds) that `check` verifies on every run (`expect-failed`): write the brief's times on the elements they are about. |
| `data-fit` | Shrink the text until it fits its box (give the box a width/height). `data-fit="grow"` makes one line exactly fill the box width (big kinetic lines; `data-fit-max="300"` caps the size). |
| `data-pulse="beat 0.06 0.25"` | Scale up on every beat of the `<html data-bpm>` grid (`references/media-audio.md`). |
| `data-loop="2"` `data-freeze="1.5"` `data-speed="0.5"` | On a clip: its content repeats every 2s / stops at 1.5s / plays at half speed (CSS animations, timeline, counters, video, onFrame). |

**Presets** (named by direction of travel): `fade` `fade-up` `fade-down` `fade-left` `fade-right` `rise` (up + unblur) `scale` `pop` (overshoot) `zoom` (from big) `blur` `slide-up/down/left/right` (by own size) `wipe-right/left/up/down` `iris` `draw` (SVG strokes) `none`, and for text and objects: `mask-up` `mask-down` `mask-left` `mask-right` (slides out from behind an invisible edge: the classic kinetic-type reveal, best with `data-split`) `flip-up` `drop` (falls in and bounces) `swing` `stretch` `tilt` `spin-in` `elastic` `grow` `grow-x` `grow-y` (bars, lines) `typewriter` (use with `data-split="chars"`) `write` (handwriting: the text appears left to right at pen speed; with `data-split="lines"` and `data-stagger` each line is written after the other). Each has good default timing.

**Easings:** `linear` `ease` `in/out/in-out-` + `sine` `quad` `cubic` `quart` `quint` `expo` `circ` `back` `elastic` `bounce`, springs `spring` `bouncy` `snappy` `gentle`, `steps(4)`, `cubic-bezier(…)`. GSAP names also work: `power2.out`, `back.out(1.7)`, `elastic.out(1,0.3)`, `sine.inOut`, `none`.

Enter/exit use the `translate`, `scale`, `opacity`, `filter`, `clip-path` properties, so they combine with your own `transform`, but they replace your own CSS `translate:`/`scale:` properties while they run: center with `transform: translate(-50%, -50%)`, `margin: auto` or a wrapper, not `translate: -50% 0`. Do not also animate `opacity` on the same element in your CSS; wrap it instead.

Classes the engine uses: `.scene` (full-frame layer), `.gm-word` / `.gm-char` (made by `data-split`), `.gm-caret`; everything else is yours.

## Preset CSS you can use

- Keyframes: `fade-in` `fade-out` `fade-up` `fade-down` `fade-left` `fade-right` `scale-in` `pop-in` `zoom-in` `blur-in` `slide-in-up/down/left/right` `wipe-right/left/up/down` `draw` `spin` `float` `pulse` `shimmer` `blink`. Example: `animation: pop-in .5s var(--ease-out-back) .3s both;`
- Easing variables: `--ease-out-expo` `--ease-out-back` `--ease-in-out-cubic` `--ease-spring` `--ease-bouncy` `--ease-snappy` `--ease-gentle` and the usual `--ease-in/out/in-out-{quad,cubic,quart,expo,back}`.
- `var(--px)` = 1px when the **short side** of the frame is 1080px (1920×1080, 1080×1920 and 1080×1080 all have `--px` = 1px; 4K has 2px). `calc(var(--px) * 48)` scales with the video. In JS: `gm.px`. `var(--stage-w)` / `var(--stage-h)` = frame size. Block sizes ("px at 1080p") use the same unit.

## Blocks

`npx givemotion blocks` lists ready-made blocks; `npx givemotion add lower-third captions` copies them into `./blocks/`, then `<gm-include src="blocks/captions.html" file="captions.json">`. Each file's header shows its params and usage. Blocks: title-card, lower-third, captions, code-window, bar-chart, line-chart, stat, checklist, steps, browser-window, phone, cursor, callout, compare, quote, word-pop, logo-reveal, end-card, gradient-bg, grid-bg, lottie. Custom visuals score better than stock blocks; use blocks for captions, code, cursor clicks, backgrounds (`references/data-templates.md`).
