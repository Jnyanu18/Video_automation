# JavaScript: onFrame, helpers, particles, canvas

Purpose: the `gm.*` JavaScript helpers (frame callbacks, interpolation, springs, noise, seeded random, particles, logging) and the rules that keep scripts seekable.

Contents
- The gm API
- Particle bursts
- Rules for seekable JS
- Canvas, WebGL, libraries, Lottie, GIFs

## The gm API

```js
gm.onFrame((t, info) => { box.style.rotate = `${t * 90}deg`; });        // t = VIDEO seconds; info.frame, info.progress
gm.onFrame('#scene2', (local, info, el) => { /* local time while that clip is on screen; info.time = video time; el = #scene2 */ });
gm.interpolate(t, [0, 1, 2], [0, 300, 0], { easing: 'out-cubic' });     // numbers or colors; clamps by default
gm.spring(t, { from: 0, to: 1, stiffness: 170, damping: 26, delay: 0.2 });
gm.noise(t) /* smooth, 0..1 */, gm.lerp(a, b, p), gm.clamp(v), gm.ease.outExpo(p)
gm.data            // JSON passed with --data / --props, or <script type="application/json" id="gm-data">
gm.beat(8), gm.bar(2)  // video time of beat 8 / bar 2 from <html data-bpm data-beat-offset data-bar-offset> (printed by `givemotion audio`); ready at once, so you can build timelines on the beat: tl.to(..., gm.beat(8)) in a { global: true } timeline
gm.width, gm.height, gm.fps, gm.duration, gm.px, gm.time
gm.timing('#scene2')   // { start, end, duration } of that clip in video time
gm.wait(promise)   // hold rendering until it resolves (fetch JSON, load a model…)
gm.onLayout('#scene2', (local, info, el) => { /* runs after all animations are placed: measure with getBoundingClientRect, follow or aim at elements */ });
gm.color.mix('#ff0', 'oklch(60% .2 260)', 0.5), gm.mapRange(v, 0, 1, 10, 50), gm.wrap(v, 0, 360), gm.snap(v, 10)
gm.random('dot-7')  // the same number in [0,1) for that seed, every frame and every render; gm.rng(seed) → generator; gm.pick(array, seed)
gm.log('pkg at', x)  // like console.log, but `check` and `inspect --at` print it with the video time (repeats are grouped)
gm.motion          // 'natural' (default) or 'classic' (<html data-motion="classic">): which motion defaults the engine uses
```
**Which time a callback gets.** With an element (or selector), `onFrame`/`onLayout` call `fn(local, info, el)`: `local` counts from that element's clip start (like `gm.timeline('#scene2')`), `info` also has `time` (video time), `local` and `clipDuration`, and `el` is the element. Without one, `fn(t, info)` gets the **video's** time, wherever the script is. So in a script inside a scene that starts at 12 s, `gm.onFrame((t) => …)` sees 12 at the scene's first frame: write `gm.onFrame('#scene', (local) => …)` instead (`check` warns `onframe-global-time` with that fix; a selector that matches nothing warns `onframe-no-target`). To swap a word or a label at a time, you need no callback: `tl.set('#label', { textContent: 'Done' }, 2)` (`references/timeline.md`).

Shapes, paths and sketch path data (`gm.shape`, `gm.path`, `gm.sketch`): `references/diagrams.md`. Timeline and tweens: `references/timeline.md`. Audio analysis (`gm.audio`): `references/media-audio.md`. Charts (`gm.chart`): `references/charts.md`.

## Particle bursts

```js
gm.burst('#scene3', { at: 2.1, kind: 'confetti', x: '50%', y: '60%' })  // also 'sparks', 'dust', 'bubbles'
```
- `at`: seconds into `#scene3` (add `global: true` for a video time, e.g. a beat or a voice word).
- `x`, `y`: `'50%'` of `#scene3`'s box, or px at 1080p (`960` or `'960px'`); default the center.
- `from: '#icon'` throws from that element's center instead of x/y (and follows it; inside a camera world the particles pan and zoom with the camera); `behind: '#icon'` draws under that element (in its layer, so it works in camera worlds).
- `count`, `colors`, `size` (px), `speed` (px/s), `gravity` (px/s², positive = down), `drag` (how fast pieces slow down), `duration` (s), `spread` (deg), `angle` (deg: -90 up, 90 down, 0 right, 180 left), `stagger` (s over which pieces leave, default 0.06), `seed`. Sizes and speeds are at 1080p.
- Defaults (count / speed / gravity / drag / size / duration / spread): confetti 160 / 1000 / 1100 / 1.8 / 17 / 2.8 s / 360°; sparks 80 / 1600 / 500 / 3.2 / 6 / 1 s / 360°; dust 60 / 260 / -40 / 1.2 / 6 / 2.2 s / 360°; bubbles 40 / 380 / -120 / 0.8 / 16 / 2.4 s / 120°. All start pointing up (`angle: -90`).
- The physics: each piece leaves at a random share (12-107%) of `speed` and slows down with `drag`, so it flies at most about `speed / drag` px (confetti: ~550 px) before it only falls; then it falls at about `gravity / drag` px/s (confetti: ~600 px/s). For a wider cloud raise `speed`; for confetti that hangs in the air lower `gravity` (300-500) and raise `duration`.
- The end: each piece lives 70-100% of `duration` (after its stagger delay) and fades out over the last quarter of its life; then it is gone. Nothing is left on screen after `duration` (+ stagger). For confetti still in the air at the last frame, make `duration` reach past the end of the video.
- `edge: 'top'` (or `'bottom'`, `'left'`, `'right'`): the pieces start spread along that edge of the target (just outside it) and drift in over the first half of `duration` (up to 1.6 s): confetti raining from above. Its defaults: `angle` pointing inward, `spread: 50`, `speed: 260`; `x`/`y` are ignored.
- `behind:` works by layer order, so a title that is still fading in (opacity below 1) shows the pieces through it. Fire the burst once the title is opaque, or bring the title in without opacity (a mask, a scale).

Recipes:
```js
gm.burst('#end', { at: 0.3, kind: 'confetti', edge: 'top', count: 220, duration: 4 })                  // confetti falling from above
gm.burst('#end', { at: 0.2, kind: 'confetti', x: '0%', y: '100%', angle: -60, spread: 25, speed: 2200, count: 90 })   // cannon from the bottom-left corner
gm.burst('#end', { at: 0.2, kind: 'confetti', x: '100%', y: '100%', angle: -120, spread: 25, speed: 2200, count: 90 }) // and its mirror
gm.burst('#end', { at: 0.2, kind: 'confetti', speed: 1600, gravity: 450, duration: 3.5, behind: '#title' })            // a round burst behind the title
```
- For a big hit, layer it: a burst of sparks + a ring (`tl.fromTo` scale/opacity) + `camera.shake` (or `data-camera="shake 14 2.1-2.5"`) at the same time. Keep particles off key text (judges marked down confetti and rays crossing numbers and headlines).

## Rules for seekable JS

- In `onFrame`, compute everything from `t`. Don't accumulate state between calls.
- Prefer the engine's tools over a hand-built drawing engine: shapes that move by `transform` get motion blur, `check` and `inspect` see them, and `data-sketch` (with `-ink`, `-boil`), `gm.path.stream`, `gm.burst`, `draw` and `morph` cover most hand-drawn, flow and particle looks. Rewriting path data every frame works, but none of that applies to it.
- A callback that writes styles writes its whole state every frame: every property it ever sets, set back (`''` or `none`) when not in use. If one look sets a `box-shadow` and a later look on the same element does not clear it, the shadow stays in the render (frames in order) but not in a `still` (one seek), so stills look right and the video is wrong.
- Don't toggle classes inside `onFrame` to start CSS transitions; they can't be seeked (`check`: `non-seekable-animation`). To do something "at 2s", use `setTimeout(fn, 2000)` (virtual and exact) or give the element `data-start="2"`.
- Measure elements in `gm.onLayout`, not in `onFrame` (in `onFrame` boxes are from before this frame's animations).
- What the engine fixes for every computer, so a render is the same everywhere: the time zone is UTC and the language en-US (`new Date()`, `toLocaleString()`, `Intl` read the same on every machine; pass a time or a format in your data to show another), `prefers-reduced-motion` is `no-preference` and `prefers-color-scheme` is `light` (switch a look with a class or a `data-*` attribute, not a media query), scrolling is instant (`scroll-behavior: smooth` and `behavior: 'smooth'` are ignored), `loading="lazy"` images load at once, and SVG animations (`<animate>`, `<animateTransform>`, `<animateMotion>`, `<set>`) follow the video clock from the start of their clip.
- Script errors are reported with file and line (`script-error`, `console-error`); fix them first, they can cause misleading pacing warnings.

## Canvas, WebGL, libraries, Lottie, GIFs

- Canvas size: at `--scale 2` the page has `devicePixelRatio` 2 (the layout stays 1920×1080 but the frame has twice the pixels). A canvas drawn at its CSS size is stretched and looks soft: size it by the ratio, `canvas.width = cssWidth * devicePixelRatio` and `ctx.scale(devicePixelRatio, devicePixelRatio)`.
- Canvas / WebGL / three.js: draw inside `onFrame` (three.js: `preserveDrawingBuffer: true`). Libraries that animate with `requestAnimationFrame` (anime.js, Motion, GSAP) also work as they are, because the clock is virtual; `gm.timeline` is faster and frame-exact in parallel.
- Lottie (After Effects JSON): `<gm-include src="blocks/lottie.html" file="anim.json" width="500" height="500">` plays it on the video clock (`lib="path/to/lottie.min.js"` for offline renders).
- Animated GIF / WebP / APNG in `<img>` play frame-exact on clip time (`data-loop="false"`, `data-rate`).
