# Diagrams: arrows, hand-drawn, labels, shapes and morphs

Purpose: `gm.connect` arrows, `data-sketch` whiteboard drawings, `data-anchor` labels, `gm.sketch`, `gm.shape` and path morphs. For a whiteboard video's structure, also read `references/genres/hand-drawn.md`.

Contents
- Arrows between elements
- Hand-drawn (whiteboard, Excalidraw-style)
- Labels that stay with their shapes: data-anchor
- Marks on text, sketched HTML boxes, gm.sketch
- Whiteboard look and camera craft
- Shapes and path morphs

## Arrows between elements

`gm.connect('#browser', '#server', { curve: 0.2, draw: [2, 0.8] })` draws a line or arrow from the edge of one element to the edge of the other and keeps it attached every frame, while they move or the camera zooms.

Options:
- `head` (`'end'` default, `'start'`, `'both'`, `'none'`), `curve` (bend, a share of the length: positive bends clockwise, so a left-to-right arrow sags down; negative bends up), `sketch: true` (hand-drawn), `draw: [start, duration]` (draws it on; seconds in the clip of the element that holds both), `color`, `width` (px), `gap` (px between arrow and element, default 10), `dash: '8 10'`, `behind: true` (under the elements), `in: '#world'` (which element holds the arrow).
- `from` / `to` (where each end attaches): by default where the line between the two centers crosses the edge; `'top'` `'right'` `'bottom'` `'left'` = the middle of that side, `'top 0.25'` = a quarter of the way along that side (0 = its left or top end, 1 = its right or bottom end), `'top-left'` etc. = a corner, `'center'`; `fromAt: 0.25` / `toAt` slide along the side the end is on without naming it: give two arrows into the same side different spots so they do not bunch up.
- `label: 'GET /'` or `{ text, at, side, offset, size, color, font, weight, class, check }`: `at` = where along the line, 0 = start, 0.5 = middle (default), 1 = end, measured on the line itself (not the head); `side` = `'auto'` (default: outside the bend, above a straight line), `'inside'`, or `'above'` `'below'` `'left'` `'right'` on screen; `offset` = gap in px at 1080p between the label's box and the line (default 12); `size` = font size in px at 1080p in the arrow's own space, so inside a camera world it zooms like your HTML labels there (default 36, 44 for hand-drawn arrows, which use Caveat); `check: 'crop-ok'` sets `data-check`. The label shows once the arrow is drawn past it. Move a label that runs into a box with `at` and `side` instead of moving the boxes.

Notes:
- Any element with an id works as an end, sketched SVG shapes too (they also work as camera targets). The arrow attaches to the element's whole box: aim at the part (the screen, not the whole laptop group) if the group is wide.
- `gm.rect('#el', '#world')` gives an element's box `{x, y, w, h, cx, cy}` in the world's own coordinates (camera zoom and pan do not change it), for placing your own SVG next to it.
- `gm.connect` returns the arrow: `gm.path.travel('#pkg', arrow, { stops: [[2, 0], [3, 1]] })` rides along it, even while its ends move (with the arrow's `draw` times as stops it rides just behind the tip as the arrow draws on). The rider is **centered on the line**, so half of it sticks out on each side: leave that much room to the next arrow, or ride beside the line with `side: 'above'` (`'below'` `'left'` `'right'`: clear of the line by half the rider's size plus `offset`, default 10 px) or `offset: -40` (px at 1080p, left of the direction of travel = above a left-to-right arrow). Works with `rotate: true` too (it then stays on that side as the line bends). The rider can be any element, a sketched `<svg data-sketch>` too.
- Keep arrows off text: `text-over-line` warns when a stroke runs through letters.

## Hand-drawn (whiteboard, Excalidraw-style)

Add `data-sketch` to an SVG shape (`rect` `circle` `ellipse` `line` `polyline` `polygon` `path`), or to an `<svg>` / `<g>` to sketch every shape inside: each becomes rough, slightly wobbly strokes drawn twice by a quick hand, the same in every frame. A `fill` becomes hatching in that color (`data-sketch-fill="cross"` cross-hatch, `"solid"` a flat fill, `"none"`). A `<rect rx="24">` (or `rx`/`ry`) keeps its rounded corners, drawn by hand.

Options: `data-sketch="1.5"` (roughness, default 1), `data-sketch-seed`, `data-sketch-gap` (hatch spacing), `data-sketch-angle`, `data-sketch-passes="1"`, `data-sketch-arrow="end"` (`start`, `both`: an arrowhead on a `path`, `line` or `polyline`). `data-sketch-ink="0.8"` draws ink instead of marker: each stroke tapers at both ends and swells and thins with the pen's pressure (0..1, how strong; on the shape or any container); it still draws on with `data-enter="draw"` or a `draw` tween. `data-sketch-boil="3"` makes the lines boil like hand-drawn animation: redrawn with a new wobble every 3 frames, cycling three drawings (on the shape, or on any container such as the whole `<svg>` or a world, to boil everything in it; `2` is livelier, `4` calmer). The shape keeps its id, classes and `data-enter` (and references your script took before, e.g. for a timeline, still work), so `data-enter="draw 1.2 3"` draws it on (both strokes, the hatching and a solid fill together, ending with the arrowhead), and `gm.path.travel('#pkg', '#route')` follows a sketched `#route` exactly.

```html
<svg viewBox="0 0 1920 1080" data-sketch style="position:absolute;inset:0">
  <rect id="server" x="160" y="300" width="420" height="260" fill="#ffd43b" stroke="#1e1e1e" stroke-width="6" data-enter="draw 1.2 0.5"/>
  <circle cx="900" cy="430" r="140" fill="#74c0fc" stroke="#1e1e1e" stroke-width="6" data-enter="draw 1 1.5"/>
</svg>
<h2 data-anchor="#server bottom 16" style="font-family: Caveat; font-size: 72px" data-enter="write 1 2.5">the server</h2>
```
- **`Caveat`** (a handwriting font, weights 400-700) is built in: `font-family: Caveat`. No file or download needed.
- Plain SVG line drawing without sketching: `<path pathLength="1" style="stroke-dasharray:1; animation: draw 1.2s var(--ease-in-out-cubic) both">`, or `data-enter="draw"`.

## Labels that stay with their shapes: data-anchor

`<h2 data-anchor="#server bottom 16">` puts the label 16 px (at 1080p) under `#server`'s visible edge, centered, and keeps it there every frame while the shape moves (timeline, travel, camera).
- Sides: `top` `bottom` `left` `right` `center` (on it), `top-left` `top-right` `bottom-left` `bottom-right` (above/below, lined up with that edge); add `inside` for inside that edge (`"#card top-left inside 20"`).
- `fit` makes the element take the target's box instead (`data-anchor="#price fit 8"`: 8 px past it, default 6), every frame: a highlight, ring or underline that follows what it marks. Put it inside the container it marks (that clips it) and before what should cover it (the wash then sits under the text); `blocks/highlight.html` has four looks. It sizes itself, so give it only a look (background, `box-shadow`, `border-radius`).
- Works on HTML elements and SVG `<text>`; the target can be any element: a sketched shape, a moving package, another label. The nearest match wins, so a repeated block finds its own shape.
- The label is placed absolutely in its own parent (its `left`/`top`/`margin` and a centering `translate(-50%,-50%)` are ignored); set a `width` or `max-width` to wrap it.
- Place shapes by hand, labels by anchor: then moving a part is one edit. `anchor-no-target` warns when the target matches nothing.

## Marks on text, sketched HTML boxes, gm.sketch

- **Marks on text** (any HTML text, also inside a camera world): `<span data-sketch-mark="highlight">93.184.216.34</span>` (also `underline`, `circle`, `box`, `strike`) draws a hand-made mark on it, right after the element's own `data-enter` has finished (also one timed to a word, a delay or a stagger), or at `data-sketch-mark-at` (`"2.5"`, `"500ms"`, `"45f"`: in its clip; a word `"@pricing"`, `"@pricing#2.end"`, `"@pricing+0.3"`: when it is said); `data-sketch-mark-duration` (`"0.6"`, `"600ms"`), `data-sketch-mark-color`, `data-sketch-mark-padding="4"` or `"8 2"`: px between text and circle/box, so it does not touch the next word). The mark moves and fades with the text. `circle` on something that is not a run of text (a card `<div>`, an image, an SVG `<g>` or shape) draws a loop that hugs its box instead of an ellipse that would cut its corners (`data-sketch-mark-padding`, default 20).
- **A loop around a group**: `gm.sketch.loop(['#laptop', '#dns', '#server', '#lbl1', '#lbl2'], { draw: [28, 1.2] })` circles several elements with one hand-drawn closed curve that hugs the group (it goes round the outside of all their boxes, `padding` px clear of each, default 24, so it never cuts through a label inside), then runs a little past its start like a quick pen. Options: `draw: [start, duration]` (seconds in the clip of the element that holds them, like `gm.connect`), `padding`, `passes` (default 2: the pen goes round twice), `roughness`, `seed`, `color` (default `#e03131`), `width` (px, default 5), `in: '#world'`, `behind: true`, `id`, `class`. It is measured once, at the moment it starts drawing, and a camera shot at `fit: 'content'` includes it. Name every label that must stay inside; `text-over-line` warns if it crosses other text.
- **Hand-drawn boxes in HTML**: `data-sketch` on a `<div>` (a card, a pill, a button) replaces its CSS border with a sketched one in the same color and width (rounded with its `border-radius`).
- **Path data for your own SVG** (dynamic shapes, `onFrame`; passes are one continuous stroke, so `draw` goes around twice): `gm.sketch.rect(x, y, w, h)` (`{ r: 20 }` rounds it) `.line(x1, y1, x2, y2)` `.circle(cx, cy, r)` `.ellipse(cx, cy, rx, ry)` `.polygon(points)` `.polyline(points)` `.path(d)` (any path, redrawn by hand) `.arrow(x1, y1, x2, y2, { curve: 0.2, head: 22, heads: 'both' })` `.hachure(shape, { gap, angle, cross })` (shape = path data, points or `{x, y, w, h}`) `.underline(x1, y, x2, { loops: 2 })`. Options for all: `roughness`, `seed` (same seed = same drawing), `passes` (1-3). Put the result in a `<path d>` with `fill: none` and a stroke; `draw` draws it on.

## Whiteboard look and camera craft

- Use a light paper background (`#fbfaf6`), dark ink (`#1e1e1e`) and one or two accent colors (saturated, not pastel: `#1971c2`, `#e8590c`). Keep everything on one big world and move a `gm.camera` over it; earlier drawings stay, and a last shot that fits everything shows the whole diagram.
- **Camera craft (what judges rewarded):** stay close. Frame one step at a time so the handwriting reads big (labels 40 px or more on screen), keep the parts of the drawing close together so moves between them are short and never cross empty paper, and show the whole diagram only at the end (and briefly). A shot's time is when the move starts; put shots for things that appear later at least as late as they appear.
- **Size for the zoomed-out shots.** The final pull-back shows the world at maybe half size, so strokes and labels shrink with it: use 5-7 px strokes and labels of 48 px or more in world units (they then read as ~3 px and ~24 px in the overview). Judges called 3 px ink "thin and faint" and overview labels "tiny". Bold, simple drawings beat detailed thin ones; for the overview, fade out small notes and keep the big labels.

## Shapes and path morphs

Pixel-exact shapes: half pixels do not render as half pixels. An HTML box of 72.5 px is snapped to a solid 73 px, and an
SVG shape of 72.5 px gets a half-lit edge pixel (it reads as 73 px, a little soft). When a shape must match a reference
exactly, use whole-pixel sizes and positions (at the size you render: with `--scale 2`, half pixels of the layout are whole),
and keep an SVG's viewBox at the same scale as its box (`width="72" viewBox="0 0 72 …"`).

- `gm.shape.circle(r)` `.rect(w, h, {r})` `.polygon(sides, r)` `.star(points, outer, inner)` `.heart(size)` `.wave(width, {amp, freq, phase})` `.blob(r, {t, wobble, points, seed})` return SVG path data centered on 0,0 (`{cx, cy}` to move). Animate a living blob: `gm.onFrame(t => path.setAttribute('d', gm.shape.blob(200, { t })))`.
- Morph any path into any other: timeline `{ morph: '#other' or 'M…' }`, or `const f = gm.path.morph(a, b); f(0.5)`.
- Point on a path: `gm.path.point(d, 0.3)` → `{x, y, angle}`; `gm.path.length(d)`. Or plain CSS: `offset-path: path('M…'); offset-rotate: auto;` and animate `offset-distance` from `0%` to `100%`.
