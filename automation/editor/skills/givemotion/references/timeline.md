# Timeline, fly, sequences and morph in depth

Purpose: the full `gm.timeline` / `gm.to` / `gm.fly` API, and the details of sequences, cuts and the `morph` transition.

Contents
- Timeline API
- Positions, props, options
- Overlaps, start values, SVG
- Fly from A to B in one scene
- Sequences: cuts, cut-align and local time
- The morph transition

## Timeline API

`gm.timeline` is the GSAP API you know, but every value is computed from the time, so it renders frame-exact and in parallel. Times are seconds **relative to the clip that contains the scope** (or each target's own clip).

```js
gm.timeline('#scene2')                                     // scope: selectors are looked up inside it
  .from('.title .gm-word', { y: 120, opacity: 0, rotate: 8, stagger: 0.06, duration: 0.8, ease: 'expo.out' })
  .to('.card', { x: 400, scale: 1.2, duration: 1, ease: 'power3.inOut' }, '+=0.3')
  .fromTo('.bar', { scaleY: 0 }, { scaleY: 1, stagger: { each: 0.08, from: 'center' } }, '<')
  .to('#blob', { morph: gm.shape.star(5, 120), duration: 1.2 }, 2)   // shape morph
  .to('#line', { draw: 1, duration: 1.5 }, 2)                       // draw an SVG stroke (0..1, or "0.2 0.8")
  .to('.price', { textContent: 249, duration: 1.5 }, 2.5)           // count a number
  .to('.dot', { x: 'random(-200, 200)', y: 'random(-120, 120)' }, 3) // seeded random per target
  .addLabel('outro', 5).to('.all', { autoAlpha: 0 }, 'outro');
gm.to('#logo', { rotate: 360, duration: 2, delay: 0.5, repeat: -1, ease: 'none' });  // one-off tween
```
Also `gm.from`, `gm.fromTo`, `gm.set` for one-off tweens.

- `gm.timeline(scope, { repeat: -1, yoyo: true, delay: 1, global: true })` (global = times from the start of the video, e.g. `tl.to(..., gm.beat(8))`).
- Plain objects work too (for canvas/three.js): `const s = { r: 0 }; gm.to(s, { r: 100, duration: 2 }); gm.onFrame(() => draw(s.r));`

## Positions, props, options

- Positions: number (seconds), `'<'` (with previous), `'>'` (after previous, default), `'+=0.3'`, `'-=0.2'`, `'<0.2'`, labels.
- Props: `x` `y` `z` `xPercent` `yPercent` `rotate` `rotateX` `rotateY` `scale` `scaleX` `scaleY` `skewX` `skewY` `transformPerspective` (written to `transform`), any CSS property (`backgroundColor`, `clipPath`, `filter`, `borderRadius`, `--css-var` …; colors blend in OKLab; values may use `var(--accent)` and `color-mix()`, read from the element when the tween starts), `autoAlpha`, `attr: {cx: 50}`, `morph`, `draw`, `text` (type a new string), `textContent` (count a number, or swap in a string: see "Text" below).
- Options: `duration` (default: sized to the distance, about 0.4–0.65 s) `ease` (default: an entrance from opacity/scale 0 springs in, any other tween is a `natural-move` that gathers speed and settles; give one only for a deliberate effect) `arc` (x+y moves bend slightly upward by default; `arc: 0` straight, `arc: 0.2` more) `delay` `stagger` (number, `{each, from: 'center'|'end'|'edges'|'random'|index, amount}` where `amount` spreads the whole stagger over that many seconds, or a function `(i, el) => seconds`) `repeat` `yoyo` `repeatDelay` `keyframes` (an array of steps `[{ y: -80, duration: 0.3, ease: 'sine.out' }, { y: 0, duration: 0.3, ease: 'sine.in' }]`, or `{ x: [0, 300, 600] }` spread evenly over `duration`) `onUpdate(progress, el)`.
- `tl.set(el, {…}, time)` sets values instantly.

## Text: swap, count, type

The element's text is one track per element (`textContent`, `innerText` and `text` all write it; the latest tween at that time wins). Every frame is worked out from the time alone, so seeking back shows the earlier text and parallel workers agree.
- **Swap** (words, times, labels): `tl.set('#label', { textContent: 'Shipped' }, 2.4)` shows exactly that string from 2.4 s; before it, the earlier text (or the page's own). A `set()` with a string always writes it as is (`'12:45'`, `'50%'`, `'v2'`). Chain several to step through words: `.set('#t', { textContent: '9:41' }, 1).set('#t', { textContent: '9:42' }, 3)`.
- **Count**: a number (`textContent: 249`) counts from the number on screen and keeps its look (`000` stays 3 digits, `1,200` keeps its commas, `$0.00` keeps the sign and 2 decimals). A string that is one number with signs around it (`'$4.50'`, `'50%'`, `'1,250'`, `'+=10'`) counts too, in that string's look.
- **A string in `to()`/`fromTo()`** that is not a number is not interpolated: the old text holds and the new one swaps in when the tween ends (`fromTo('#s', { textContent: 'Draft' }, { textContent: 'Final', duration: 1 }, 2)` shows "Draft" until 3 s). Use `set()` to swap at an exact time.
- **Type**: `text: 'Hello world'` in `to()` types the string out over the tween (`set()`: all at once). For per-letter animation use `data-split` instead.

## Overlaps, start values, SVG

- The timeline uses `transform`, added on top of the element's own CSS transform (so `translate(-50%,-50%)` centering is kept and the tween is added on top). `data-enter`/`data-exit` use `translate`/`scale`, and `data-camera` adds on top, so all of them combine on one element.
- Before a tween starts, the element shows its own CSS values: a `.to()` or `.set()` at 9 s changes nothing before 9 s.
- `from()` and `fromTo()` show their start values from the beginning of the clip until the tween starts (useful to keep things hidden until they enter: `from({ opacity: 0 }, 12)` stays hidden until 12 s); pass `immediateRender: false` to stop that. Exception: an element your CSS hides (`opacity: 0`, `visibility: hidden`, SVG `opacity="0"`) stays hidden until a `fromTo` whose start values would show it begins, so a pulse ring `fromTo('#ring', { opacity: 0.9, scale: 0.8 }, { opacity: 0, scale: 2 }, 16.5)` with `#ring { opacity: 0 }` appears only at 16.5 s (pass `immediateRender: true` to show the start values early anyway; `data-motion="classic"` keeps the old rule). `hideBefore: true` on any tween keeps the element hidden (`visibility`) until that tween starts, without touching its other styles.
- A property only in the start values of a `fromTo` is set when the tween starts and kept (`fromTo(el, { autoAlpha: 1, x: -100 }, { x: 0 }, 17)` shows the element at full opacity from 17 s while it moves).
- Pulse or hit ring that is invisible before and after: CSS `opacity: 0` on the ring, then `tl.fromTo('#ring', { opacity: 0.9, scale: 0.6 }, { opacity: 0, scale: 2.4, duration: 0.8, ease: 'out-cubic' }, t)`.
- `check` warns (`timeline-after-clip`) when a tween starts after the clip it is timed in has ended: a timeline without a scope times each target in its own clip, so `15.05` on an element with `data-start="15"` would be 30.05 s of the video. Use `0.05`, or `gm.timeline(scope, { global: true })` for video times.
- When tweens overlap on the same property, the one that started last (in video time) wins, also across different timelines. Different properties on one element (an `x` tween and a `y` tween at the same time) combine.
- SVG shapes scale and rotate around their own center unless you set `transform-origin`. A timeline transform replaces the SVG `transform="…"` attribute, so put the position on a parent `<g transform="translate(…)">` and animate the child (a gauge needle: `<g transform="translate(400 300)"><path id="needle" style="transform-origin: 0 0" …/></g>`).
- `draw` uses the stroke dashes itself, so it replaces your own `stroke-dasharray`; for a dotted line that draws on, draw a solid copy as a mask or reveal the dotted line with a `clip-path`.
- Stagger split text in plain CSS instead: `.title .gm-word { animation: fade-up .5s var(--ease-out-expo) calc(var(--i) * 60ms) both; }`

## Fly from A to B in one scene

No pixel math: `gm.fly('#event', { from: '#slot2', at: 7.5, duration: 0.8, ease: 'power3.inOut' })` (or `tl.fly('#event', { from: '#slot2', duration: 0.8 }, 7.5)` with timeline positions). Place `#event` where it ends up (in the calendar grid, by layout); it appears on top of `#slot2`'s box at `at` (seconds in its clip) and flies and resizes into its own place.

- Both boxes are measured once at load where they rest, without their animations (a panel that slides in later counts at its final place), so keep both in the same layer (the same camera world) and do not move them with other tweens during the flight.
- Options: `size` (`true`: start at the source's size, scaled evenly to fit inside it when the proportions differ; `'stretch'`: exactly the source's box; `false`: only move), `hideBefore` (default `true`: hidden until it takes off; `false`: it waits on the source), any tween option.
- It is a plain `fromTo` of `x`, `y`, `scaleX`, `scaleY`, so `data-anchor` labels and camera `follow` see it. Give it a higher `z-index` than what it flies over; fade the source yourself if it should go (`tl.to('#slot2', { opacity: 0.4 }, 7.5)`).

## Sequences: cuts, cut-align and local time

- `data-sequence` on a container plays its children one after another. Every child needs `data-duration`, or give the container `data-cuts="0 2.13 4.27 6.41"` (when each child starts, e.g. the music's bar starts from `givemotion audio`; or on the `<html data-bpm>` grid: `data-cuts="beats: 0 4 8 14"` / `"bars: 0 1 2 4"`) and the durations are worked out for you; the last child runs to the end of the video (or give it `data-duration`).
- Options: `data-gap="0.2"` (negative = overlap), `data-transition="<name> <seconds> [easing]"` which overlaps neighbours and animates the change. A child can set its own `data-transition` (how it comes in). Each transition overlaps two scenes, so it takes its length off the total: 3 scenes of 4s with `fade 0.5` last 11s. `npx givemotion inspect video.html` prints the real start/end of every clip.
- With transitions, `data-cut-align="middle"` puts the middle of each transition on the cut time (so the change lands on the beat). **Then each child's own time 0 is half a transition before its cut** (a `0.6` transition: the scene starts 0.3 s before the cut), so local times (`data-enter` delays, timeline positions, camera shots, block `times`) count from there (the cursor block also takes `times="video: …"` or `"beats: …"`).
- To place something on the cut, add half the transition, or use video times: `gm.timing('#s3').start` (any clip's start, end, duration in video time), `gm.beat(n)` in a `{ global: true }` timeline. `inspect` prints each scene's start.

## The morph transition

`data-transition="morph"`: elements with the same `data-morph="name"` in both scenes fly and resize from the old place to the new one while the rest crossfades (keynote "magic move"). Use it to carry a logo, card, photo or shape from one scene into the next.

- A pair with the same content (same text, same picture) reads as one object: the old one stays solid and the new one fades in on it.
- A pair with different content (`</>` into a play-button SVG, `48,000` into `48,000 users`) hands over in flight: the old one is gone a bit before the middle and the new one arrives in the second half, so they never sit half and half on top of each other.
- Pairs with other proportions (two texts) fly center to center and scale evenly. An inline `<span>`/`<b>` in a sentence works (it becomes an inline-block).
- Put `data-morph` on an element the camera or a path travel is not moving at the same time (wrap it).
- `check` reports `morph-no-pairs` when no names match in both scenes. Inside one scene, use `gm.fly` instead.
