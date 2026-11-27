# Camera, paths, riding and parallax

Purpose: `gm.camera` over a big world (maps, diagrams, product tours), `data-parallax`, `gm.path.travel`, and one object riding another.

Contents
- Camera over a world
- Shot options
- Camera craft (what judges rewarded)
- Moving along a path
- One thing riding another

## Camera over a world

Put everything in one big layer and point a camera at it. Shots frame elements, follow moving ones, and blend smoothly; the camera measures elements every frame, so it always lands on them.

```html
<section class="scene" data-duration="12">
  <div class="sky" data-parallax="0.3"></div>            <!-- moves 30% as much: depth -->
  <div id="world" style="position:absolute;left:0;top:0;width:3000px;height:1600px">…route, stops, #pkg…</div>
</section>
<script>
gm.camera('#world')                                        // times are seconds in the world's clip
  .shot(0,   { fit: '#route', padding: 80 })               // frame one or more elements: fit: ['#a', '.stop']
  .shot(1,   { follow: '#pkg', zoom: 1.6, duration: 1 })   // keep a moving element centered
  .shot(6.5, { fit: '.stop', padding: 120, duration: 1.5, ease: 'in-out-quart' })
  .shake(3.2, { duration: 0.35, amount: 14 });             // impact
</script>
```
`data-parallax` layers are siblings of the world (or inside its parent): `0.3` moves 30% as much as the world, so they read as far away; use 0.2–0.5 for backgrounds (outside the world only values below 1 make sense).

**Depth inside the world:** `data-parallax` on an element inside the world sets its depth relative to the world plane: `1.15` moves 15% faster than the world (near things: trees, posts, foreground props), `0.85` slower (far hills). The element sits exactly where you laid it out when the camera looks straight at it, and drifts as the camera pans away. On a layer as big as a good part of the world (`<div id="trees" data-parallax="1.15" style="position:absolute;inset:0">` with the trees inside), each child gets its own shift. It uses the CSS `translate` property, so do not put `data-enter` on that same element (animate a child or a parent instead).

## Shot options

- `fit` | `follow` | `center`: a selector, element, list, `{x,y,w,h}`, `'all'` for the whole world, or `'content'` for everything drawn in it without the empty margins.
- A `fit` on something small zooms far in: past 4x `check` warns `camera-zoom-high`; cap it with `maxZoom: 2.5`, or fit the card rather than the tag.
- `zoom` (with `fit` it multiplies: `1.05` = a bit closer; with `follow` or `center`, `zoom` is the world scale itself: 1 = world px are screen px, so `{ center: '#btn', zoom: 1.8 }` is "1.8x on the button"), `padding` (screen px around the framed elements, default 60: one number for every side, or `[top, right, bottom, left]` like CSS; too big a value is clamped with a warning), `offset: [x, y]` (moves where the camera looks, in world px: `+x` looks further right, so the subject slides left), `rotate`, `duration` (blend time from the previous shot), `ease`, `minZoom`, `maxZoom`.
- `fit: { x, y, w, h }, padding: 0` frames exactly that world rect (its aspect is kept: the rect is fitted inside the frame and centred).
- `safe: { bottom: 170 }` (or `[top, right, bottom, left]`, screen px) keeps a band of the frame free for something that sits on top of the video, a caption bar or a step card: fits are made inside the rest of the frame and follow/center targets are centred in it. Put it on the camera for every shot (`gm.camera('#world', { safe: { bottom: 170, left: 0 } })`) or on one shot. For a card bottom-left: `safe: { bottom: 260 }` or `padding: [60, 60, 60, 700]`.
- `bounds`: the view never shows beyond the world: `bounds: 'world'`, a selector (`'#panel'`: following a chart tip never shows the stage around the panel), or a world rect `{ x, y, w, h }`, on the camera or on one shot. Near the edge the camera eases to a stop instead of showing empty space; when the view is bigger than the bounds in one direction it is centred on them (raise `minZoom` to stay inside). A world with its own opaque `background` gets `bounds: 'world'` automatically; `bounds: false` turns it off.
- `fit` frames where its elements **rest** during the shot (measured while loading, from the arrival to the next shot): a window that scales in, a panel that slides in or a label that writes on later are framed at their final size and place, so the camera does not cancel their entrance. Elements not shown yet (a label that writes on later, a later clip) count with their full box. A target that is still moving at the end of its hold (a truck that keeps driving) is measured live every frame instead; use `follow` for moving things. `rest: false` measures live always.
- `cam.state()` (keep `const cam = gm.camera(...)`) gives where the camera looks in this frame: `{ x, y, zoom, rotate, view: { x, y, w, h } }` in world px; exact inside `gm.onLayout`, for your own effects (a HUD that counts the distance, a custom parallax).
- `overview: true`: a wide shot of the whole UI or map on purpose: `check` does not report small text while it holds; viewers still see tiny labels, so keep such shots short or scale the key labels up for them.
- A shot's time is when the camera **starts** moving to it; it arrives `duration` later (so a last shot at 28 s with `duration: 2` is framed at 30 s; to land a move on a beat, start it at `beat - duration`). A fast zoom goes a touch past its framing at the arrival and settles back within 0.3 s, so `inspect` lists its `arrive` up to 0.3 s later. Put shots for things that appear later at least as late as they appear.
- `follow` keeps up with anything that moves (timeline, path travel, `onFrame`, a chart head). It trails its target like an operator and settles when the target stops: `lag: 0.3` trails more, `lag: 0` locks on (default 0.15 s).
- **Back-to-back shots are one move.** When a shot starts within 0.25 s of the previous one arriving, the camera flows through the framings without stopping (it eases out of the first and into the last, and still frames each target exactly). Leave ≥ 0.3 s between shots, or put `blend: false` on a shot, when the camera should rest on it (`check` warns `camera-stop` when a camera brakes to a halt and sets off again). A shot of 1 s or more on the same subject as the shot before (a hold, a slow push) always rests: it does not take speed from the moves around it (`blend: true` keeps it flowing).
- A fast zoom goes a touch past and settles (`overshoot: false` to turn off). Held shots breathe by a pixel or two: `gm.camera('#world', { breathe: false })` turns it off, a number scales it.
- **Depth:** background layers next to the world (grid-bg, gradient-bg, full-frame text-free layers behind it) drift slightly with the camera. Keep the background outside `#world` to get this. `data-parallax="0.3"` sets a layer's depth yourself (it wins), `data-parallax="0"` pins one, `gm.camera('#world', { depth: false })` turns it off.
- Shot times count from the start of the world's clip; `gm.camera('#world', { global: true })` uses video time instead. `gm.timing('#scene2').start` gives any clip's start time.
- `npx givemotion inspect video.html` lists every shot with what it shows (`shows`: the world area x, y, w, h and the zoom), so you can see a framing before rendering.
- Keep every label fully in or fully out of a held shot (a neighbour's label half in frame reads as a mistake; `check` reports it). `check` also warns (`camera-late`) when a shot would arrive after its scene starts to leave, and `camera-no-target` when a shot's target matches nothing.

## Camera craft (what judges rewarded)

- **One world, one route.** The best explainers put every step in one world and moved one camera through it (warehouse → highway → hub → door), with a short wide recap at the end.
- **Stay close.** Frame one step at a time so text reads big (labels ≥ 32 px on screen, handwriting ≥ 40 px). A `fit` on a small element zooms in far and can cut the labels next to it: fit the element and its label together (`fit: ['#server', '#server-label']`) or add `padding`.
- **Short moves.** Keep the parts of the world close together so moves between them are short and never cross empty space (`empty-frame` warns).
- **Lead room.** When following something that moves right, look ahead of it: `offset: [260, 0]` puts the subject left of center with room ahead.
- **Wide shots only briefly, at the end.** The final pull-back shows the world small; scale key labels up for it or fade small notes out. A fit of the layout box includes its empty space: use `fit: 'content'` or list the elements.
- **Impacts:** `.shake(t, { amount: 10–16, duration: 0.3–0.4 })` on a hit, with a burst (`references/javascript.md`) at the same time.
- **Plant the next set early.** Lay the whole route out in the world and let the next place show while the current one plays (the grid behind the line, the city below the title): the camera then reveals it. Something that pops into an empty frame as the camera arrives reads as a cut.
- **A 3D world:** put `transform-style: preserve-3d` on the world and `perspective` on its parent; tilt or turn things inside it. The camera then zooms it like a real camera moving closer or back (depth keeps its proportions at any zoom), so design angles at zoom 1 and they read the same in the overview. Cards that flip need a back: `backface-visibility: hidden` on the front face and the back's content on its own face turned 180° (`check` warns `mirrored-text`).
- Make the world bigger than the frame (2–3 frames wide) and design it as one picture; the edge of the world must not show in the final pull-back.
- **World size vs. text size (rule of thumb):** the final pull-back shows the world at about `1 / (frames wide)`: a world 2.5 frames wide shows 44 px labels at about 18–20 px. For labels that must read in the overview (≥ 28 px on screen), keep the content about 1.6–1.8 frames wide (overview zoom ≈ 0.6), or scale the key labels up for the overview, or keep it short with `overview: true`. Check widths with `inspect --at t --el '#label'` (screen px; divide by the zoom from `inspect`'s `shows`).

## Moving along a path

`gm.path.travel('#pkg', '#route', { stops: [[1, 0], [3.2, 0.5], [4.2, 0.5], [6.5, 1]], rotate: true, ease: 'in-out-cubic' })` moves an element along an SVG path: each stop is `[seconds in the clip that contains the moving element, progress 0..1]` or `[seconds, '#dock']` (where the route passes closest to that element: no progress math), a repeated progress is a hold (a stop on the way). `rotate: true` turns it to face the direction of travel. The element can be HTML (a `<div>`, an `<img>`, an `<svg>`, also one with `data-sketch`) or an SVG shape or `<g>`. It is centered on the path; to ride beside it, `side: 'above'` (`'below'` `'left'` `'right'`, on screen) lifts it off the line by half its size plus a gap (`offset`, default 10 px), and `offset: -40` alone moves it 40 px (at 1080p) to the left of the direction of travel (above a left-to-right path; positive = right, below). Both follow the path's bends, with or without `rotate`.

`.progress(t)` gives the same answer at load time as during the video, so you can plan other moments from it, and other things can follow it, e.g. draw the route behind it: `gm.onFrame('#world', t => route.style.strokeDasharray = trip.progress(t) + ' 2')` (with `pathLength="1"` on the path). A travel also works along a `gm.connect` arrow and along a sketched path (`references/diagrams.md`).

**Many things flowing along a path** (money, data packets, traffic, cells, a supply chain): `gm.path.stream('#pipe', { at: 1, until: 6, rate: 6, trip: 1.5, size: 12, color: 'var(--accent)' })` emits items along the SVG path at `rate` per second, each taking about `trip` seconds end to end with its own speed (`jitter: 0.3`) and an optional sideways `spread` in px, fading in and out at the ends; after `until` (seconds in the path's clip) no new ones start and the rest finish their trip. `shape: 'ring'` (with `stroke`) draws rings instead of dots; `make: (i) => svgElement` brings your own item (a coin, an arrow; it is moved with `transform: translate`). `limit: (t) => drawn` keeps them behind a line that is still drawing on (the progress 0..1 it has reached, e.g. from the same easing as its `draw` tween). It follows a path whose shape changes over time and works on sketched and `gm.connect` paths.

## One thing riding another

A package on a robot, then on a truck: do not give the package its own travel with matching stops. Give each vehicle its own path (one leg each: `#leg1` shelf to dock, `#leg2` dock to hub) and its own `gm.path.travel`, and put one copy of the package on each vehicle: `<div class="pkg" id="pkgA" data-anchor="#robot center">` and `<div class="pkg" id="pkgB" data-anchor="#truck center">` (it follows the vehicle every frame; use `top 0` to sit on its roof). Hand over while both vehicles stand at the dock, where both copies are in the same spot: `gm.timeline().set('#pkgB', { autoAlpha: 0 }, 0).set('#pkgA', { autoAlpha: 0 }, 2.45).set('#pkgB', { autoAlpha: 1 }, 2.45)`. A vehicle with `rotate: true`: put the copy inside the vehicle element instead (a child turns with it). A leg ends where the next begins when the next path starts at the same point.
