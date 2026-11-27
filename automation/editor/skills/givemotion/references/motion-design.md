# Motion design: principles with numbers

Purpose: how to make a givemotion video feel like real motion design instead of slides; concrete timings, easing, camera grammar, continuity, and the mistakes blind judges punished in our test rounds.

Contents
1. What judges punished and rewarded
2. Timing and pacing numbers
3. Easing and movement principles (with recipes)
4. Camera grammar
5. Scene-to-scene continuity (and what every transition looks like)
6. Layout, type and hierarchy (a line that builds word by word, step captions)
7. Anti-patterns checklist

## 1. What judges punished and rewarded

Across nine rounds, fresh agents made videos from these docs and blind judges (senior motion designer brief, 2 fps contact sheets) scored them. Counted over the round-8 notes:

| Punished (share of notes) | What it looked like |
|---|---|
| Near-still holds (2 of 3 notes) | End card or a "booked" state frozen 1.5–3.5 s; a counter sitting at 96 for a second before it counts |
| Small secondary text (2 of 3) | Taglines, card subtitles, axis labels, code in an editor, labels in the final wide shot |
| Text cut by the frame (1 of 2) | During or after camera pans; a neighbour's label half in frame while the shot is about something else |
| Empty space / unbalanced (2 of 5) | Small UI in a big empty frame; layouts crowding the top-left or the top half (vertical) |
| Ghosted text (1 of 5) | Crossfades where two scenes' text sit half-visible on top of each other |
| Slide/website feel | A flat centered screenshot that just scrolls; one centered card per benefit; every scene the same "big number top-left, graphic right" template |
| Weak first frame | Nearly empty opening, 0.5–1.5 s where nothing changes |
| Whiteboard-specific | Thin pale ink (3 px), tiny labels in the overview, the camera crossing empty paper, lines "too clean" |
| Effects over the hero (three-tool rounds) | A ring, sparks or shapes crossing the title's letters as it lands, so the first frames of the payoff read as clutter. Let the burst sit behind or around the hero and clear before it is read |
| Beats that replace each other (three-tool rounds) | Three good shots joined by whips, where another version kept one world on screen (the next beat's set already visible): judges preferred the continuous one |
| Lumpy or broken shape changes (three-tool rounds) | In-between shapes of a morph that look dented, or text showing backwards through a card that turned past 90° |

Rewarded: a camera that pushes into the subject (zoom into the code with numbered callouts, dim the rest); one world with one camera route; a camera that follows a moving thing (the line head of a chart, a package on a map); tight zooms that stay readable on a phone; varied kinetic type; one strong hit (burst + shake + flash) at the key moment; things that move from frame one; an element carried from one scene into the next; live counters tied to the visual; a clear payoff at the end. Videos the judges preferred changed 26–40% of the picture per half second; slide-like ones 12–22%.

## 2. Timing and pacing numbers

| What | Number |
|---|---|
| First frame | Something on screen at 0.0 s and moving by 0.3 s; first message readable by ~1 s |
| Rhythm | A new change (entrance, move, cut, emphasis) every 0.5–1.5 s |
| Scene length | One idea per scene, 2.5–5 s (shorter for social, up to 6–8 s for one camera world step) |
| Reading hold | After text lands: ~1 s + 0.25 s per word. A 4-word headline holds ~2 s; never under 1 s |
| Element life | Plan it per element in the shot list: **in** (its entrance), **hold** (≥ 1 s + 0.25 s per word, ≥ 1 s for an icon or a picture, counted from fully in until it starts to leave or is covered), **out** (an exit, the scene's transition, or a hand-over: morph, `gm.fly`, the next element born from it). A card that lands on a word and is covered or cut a second later was never seen; something that blinks off with no exit cannot be transitioned out of (`check`: `short-hold`, `cut-exit`) |
| Holding is not freezing | During a hold keep a slow motion alive: camera `push 1.04–1.08`, `float`, a counter, a drifting background |
| End card | 1.5–2 s, with motion (slow push, a shine, the last word landing late); `still` fires at 1.9 s at the very end |
| Small element entrance (icon, chip, label) | 0.25–0.45 s |
| Text entrance | 0.5–0.8 s (per piece with stagger) |
| Big panel or full-frame move | 0.7–1.2 s |
| Camera move between shots | 0.8–1.6 s (fast push on a hit: 0.4–0.6 s) |
| Transition | 0.4–0.8 s; whip 0.3–0.5 s; morph 0.7–1.0 s |
| Exit | ~60–70% of the entrance duration, ease-in; or let the camera/transition carry it out |
| Stagger | 40–90 ms per item; keep the whole group under ~0.6 s (`stagger: { amount: 0.5 }`) |
| Overlap | Start the next move 0.1–0.3 s before the previous one ends (`'-=0.2'`, `'<0.1'`) |
| Social / vertical | Faster: a change every 0.4–0.8 s, scenes 1.5–3 s |

## 3. Easing and movement principles (with recipes)

- **Ease-out on entrances, ease-in on exits.** Things arriving decelerate into place (the default springs do this; by hand: `out-expo`, `out-quart`, `out-back`, `spring`); things leaving accelerate away (`in-quad`, `in-cubic`, `in-expo`). Moves from A to B on screen use in-out (`power3.inOut`, `in-out-quart`). Linear only for constant drifts, tickers and rotations.
- **Weight.** Big things move slower and overshoot less; small things are quick and can bounce. A full-frame panel: 0.9 s `out-quart`; a chip: 0.35 s `back.out(1.6)`.
- **Anticipation.** Before a big, fast move, a small move the other way (5–10% of the distance, 0.12–0.2 s, ease-in):
  ```js
  gm.timeline('#s2')
    .to('#card', { x: -30, scale: 0.97, duration: 0.15, ease: 'power2.in' }, 1.0)
    .to('#card', { x: 640, scale: 1, duration: 0.6, ease: 'expo.out' });
  ```
- **Overshoot and settle (follow-through).** Landings go slightly past and settle within ~0.3 s: `back.out(1.4–1.8)`, `bouncy`, `spring`, or presets `pop`, `drop`, `elastic`. Use it on the hero, not on everything (a whole screen of bouncing items looks cheap).
- **Overlapping action and secondary motion.** Parts of one thing do not stop together: the card lands, its icon arrives 60–120 ms later, its label 60–120 ms after that; a slight rotation (3–8°) that settles to 0; a shadow that grows as it lifts.
- **Arcs.** Natural movement curves. Move x and y with different eases at the same time, or travel along a path:
  ```js
  gm.timeline('#s3')
    .to('#ball', { x: 900, duration: 0.9, ease: 'power2.inOut' }, 2)
    .to('#ball', { keyframes: [{ y: -160, duration: 0.45, ease: 'sine.out' }, { y: 0, duration: 0.45, ease: 'sine.in' }] }, 2);
  ```
  For longer routes use `gm.path.travel` with `rotate: true` (`references/camera.md`).
- **Start states hide completely.** A `from`/`fromTo` start state is on screen from the clip's first frame until the entrance: `opacity: 0`, `scale: 0` or `clipPath: 'inset(50%)'` (`inset(50% 0)` / `inset(0 50%)` to open from the middle line). `inset(45% 0)` leaves a 10% sliver sitting there, which reads as a glitch (`check`: `sliver-start`).
- **Stepped motion only on small things.** `steps(n)` is a fine brand language for a counter, a blinking caret or text typing, but on a window, a card or the camera (more than ~15% of the frame) at 30 fps viewers read it as dropped frames (`check`: `stepped-move`). Give big moves a smooth ease.
- **Squash and stretch, lightly.** A landing can flatten for 0.08–0.12 s (`scaleX: 1.08, scaleY: 0.92`) and recover; skip it for text and UI.
- **Contrast of speed.** Fast in, slow drift while it is read, fast out. Constant medium speed everywhere reads as software.
- **Emphasis.** To make a word or number matter: scale it 1.1–1.3, change its color to the accent, add a mark (`data-sketch-mark`), a flash or a small shake. One emphasis per beat.
- **Marking a thing on screen** (a highlight, a glow, an underline, a ring) to say "look here":
  - It arrives after its target has landed, and holds ≥ 1 s (as text: ≥ 1 s + 0.25 s per word it covers).
  - It stays on its target. If the target moves, scrolls or the camera pushes, re-measure it every frame in `gm.onLayout` (`references/javascript.md`); a box measured once at load floats off. Measure only after fonts load (`gm.onLayout` runs after they have), never in the script's top level.
  - It belongs to what it marks: put it inside the target's card or window, so it is clipped by that card and goes under whatever covers the card. A mark painted on top of everything runs over the window that hides half the card.
  - One mark per thing. Two marks stacked on one line read as one darker mark with a seam.
  - To mark the next thing, let this mark leave and the next one appear on its target. A mark that slides across the screen to the next target reads as a glitch (except along a list, row to row).
  - Pick one look for the whole video from the style or brand (a highlighter wash for text, a glow on a card's own edge, an underline, a drawn ring for hand-drawn styles) and keep it. The look is taste; the rules above are not.
- **A big hit** (logo lock, peak number): at the same time, a burst of sparks, a ring that scales 0.6→1.6 while fading, `camera.shake` 10–16 px for 0.3–0.4 s, a 0.1 s brightness flash. Put it on a music hit if there is music.
- **Motion blur** is on by default (natural motion): whatever moves fast in a frame gets a camera's smear along its move, worked out per frame, for almost no render time. `--motion-blur off` (or `<html data-motion="classic">`) keeps every frame sharp; `--motion-blur 8` renders 8 sub-frames per frame instead (true blur, 8x slower). Whip transitions and `rise`/`blur` entrances already carry their own blur.

### What the engine already does for you (natural motion, the default)

Leave out `ease` and `duration` unless you need exact timing, and you get these for free. Setting an ease on everything throws them away (`check` warns `same-ease` when one curve is used for almost everything).
- **Entrances have mass.** `data-enter` presets and timeline entrances spring in: fades, slides, masks and text land crisp (no overshoot); `pop`, `grow`, `scale`, `spin-in`, `flip-up`, `stretch`, `tilt` overshoot a hair and settle. Explicit names: `natural(0.7)` (a spring released from rest; the number is the damping, 1 = no overshoot) and `natural-move` (a move that gathers speed and settles).
- **Exits leave under their own power.** A `to()` that ends at opacity 0 or scale 0 eases in (slow start, leaves at speed) instead of settling.
- **Bigger moves take a little longer.** Without a duration, timeline moves last about 0.4–0.65 s and `gm.fly` 0.65–1.05 s depending on the distance; presets that travel by the element's size scale the same way.
- **Moves flow.** Back-to-back tweens on the same property (one ends where the next starts) carry their speed through the joint instead of stopping.
- **Arcs.** Diagonal x+y moves and `gm.fly` bend slightly upward like a thrown object. `arc: 0` for a dead-straight line, `arc: 0.2` for more.
- **Staggers breathe.** Staggered rows vary a few percent in timing (seeded, the same every render); the first and last item keep their times.
- **Moving text glides.** Chrome puts text on whole pixels when it only moves or scales, so slow moves and camera drifts made it step and wobble against its box. The engine gives every element moved by an inline transform (timeline tweens, the camera) or by your own CSS `@keyframes` animation a tiny `rotate` (about 0.04°, invisible) so its text lands at quarter pixels. An element with a `rotate` of its own is left alone.
- **The camera moves like an operator** (`references/camera.md`): back-to-back shots become one continuous move, `follow` trails its target and settles, held shots breathe by a pixel or two, fast zooms overshoot a touch, and backgrounds next to the world drift for depth.
- `gm.motion` is `'natural'`; `<html data-motion="classic">` brings back the older fixed curves and cameras that stop between shots (only to match an earlier render).

To see how natural a render is: `npx givemotion analyze out/video.mp4 --motion` gives a 0–10 naturalness score with the camera stops, stop-and-go moments, sudden velocity changes and strobing frames it found; `--strips` writes 10 fps strips of the busiest moments (`references/review.md`).

## 4. Camera grammar

- **Every scene has a camera.** At least `data-camera="push 1.04–1.1"` or `"float"`; a locked-off frame with one element fading in is the slide look.
- **Shot order:** establish (wide, short, ≤ 1.5 s) → push in to the detail (zoom until text reads ≥ 32 px) → move to the next detail (short distance, through content, never across empty space) → wide recap at the very end, brief, with key labels scaled up.
- **Motivated moves.** The camera moves because something moves or matters: it follows the line head, the package, the cursor, or pushes in when a callout appears. Start a shot when the thing appears, not before.
- **Lead room.** A subject moving right sits in the left third with space ahead (`offset: [260, 0]` on a follow shot). A subject looking or pointing somewhere gets space on that side.
- **Frame cleanly.** Every label fully in or fully out of a held shot. Fit the subject together with its label.
- **Land on time.** A shot's time is when the move starts; to land on a beat or on a scene's key moment, start it `duration` earlier. Finish before the scene's exit transition (`camera-late`).
- **Depth.** Backgrounds next to a camera world (grid-bg, gradient-bg, full-frame layers behind it) drift with the camera by themselves; `data-parallax` 0.2–0.5 sets a layer's depth yourself, `data-parallax="0"` pins it; a soft blur on far layers helps. 3D tilt (`rotateX`/`rotateY` with `transformPerspective`) for screenshots and cards beats a flat rectangle.
- **Impacts** use `shake`; a handheld feel (`data-camera="handheld"`) suits documentary or energetic styles, not clean corporate ones.
- **A camera budget.** One deliberate move per shot (a push, a pan to the next detail, or a slow drift), then hold while it is read. Do not push in and fly straight back out (in and out within ~2 s), and do not chain big zooms (a scale change of 1.5× or more) one after another: the camera reads as hunting, and viewers tire. To show a new framing after a push, cut or dissolve to it instead of flying back. The judges' contact sheets reward motion; people watching a real 90 s product demo found a zoom in every scene too much. The longer the video, the calmer the camera: in videos over ~45 s and in product demos, most shots are one move or a drift.

## 5. Scene-to-scene continuity

- **Carry something across.** `data-morph` a logo, card, number or shape into the next scene (`references/timeline.md`), or end one scene's element where the next scene's element starts (match cut: same position, shape or color).
- **Direction means something.** Keep a consistent direction for "next" (e.g. always `push-left`/`whip-left`); `zoom-through` for going into detail; `iris` or a wipe from the hero element for a reveal; `dip` for a chapter break.
- **Prefer one world.** Many of the best-scored videos were one big world (map, whiteboard, dashboard, chart) with one camera route instead of separate scenes.
- **Exit text before a crossfade**, or use a transition that moves the old scene out (push, whip, cover, wipe, iris). Plain `fade` between two text scenes ghosts.
- **Mid-transition frames count.** Look at `snapshot --transitions`: the middle frame must not be nearly empty or a muddy mix.

What each `data-transition` looks like (direction = where the motion goes; `wipe-right` reveals from left to right):
- `fade` (= `crossfade`): the new scene fades in over the old. Ghosts text; exit the old text first.
- `push-left/right/up/down`: the new scene pushes the old one out, both moving together (`slide-*` is the same with a softer curve).
- `cover-left/right/up/down`: the new scene slides in over the old one, which stays put.
- `whip-left/right/up/down`: a fast push with motion blur (0.3–0.5 s), for energy and beat cuts.
- `wipe-left/right/up/down`: a hard straight edge crosses the frame and reveals the new scene behind it. No color.
- `diagonal`: like `wipe-right`, but the edge is slanted (its top runs ahead of its bottom). No color, no band.
- `band-right/left/up/down` (`band` = `band-right`): a solid color band sweeps across and the new scene is revealed behind it. `data-transition="band-right 0.4 #ff5a36 30% 20deg"`: duration, color, band width (share of the frame side it travels along, default 35%; `100%` covers the whole frame at the middle, a full color wipe), edge slant in degrees (default 0). Without a color it uses `--transition-color` on the incoming scene (so each scene can bring its own color), else `--accent`, else pink. The band's center crosses the frame's center exactly halfway, so with `data-cut-align="middle"` that moment sits on the cut (keep its default symmetric easing). It also works as an entrance on any HTML element: `data-enter="band-right 0.6 #fff"`.
- `clock`: a radial sweep like a clock hand. `iris`: a circle grows from the center.
- `zoom`: the new scene settles from 125% while fading in. `zoom-through`: the old scene flies past the camera (grows, blurs, fades) and reveals the new one.
- `flip`: a 3D card flip around the vertical axis. `dip`: down to black and back up. `blur`: the new scene comes in from a blur. `fade-up`: both scenes drift up while crossfading.
- `morph`: elements with the same `data-morph` fly from the old scene to the new; the rest crossfades.
- **Keep one look.** Same palette, fonts, corner radius, stroke width and motion personality across scenes (`references/styles.md`); change layout and camera, not the style.

## 6. Layout, type and hierarchy

- Sizes on screen (after camera zoom), 1920×1080: titles 96–160 px, kinetic lines 120–260 px, body ≥ 36 px, captions ≥ 56 px, secondary ≥ 32 px; ≥ 96 px from the edges; ~10 words on screen at most.
- **Fill the frame.** The subject (or the group being shown) should cover roughly 40–70% of the frame. If a UI or code window looks small in empty space, zoom the camera in or scale it up, do not shrink the text.
- **Titles break evenly.** A title on two lines gets `text-wrap: balance` (or a `<br>` at the phrase break), so no single short word sits alone on the last line (`check`: `orphan-word`).
- **Balance, not centering everything.** Use the thirds (`snapshot --grid`): a hero on one third with its supporting text on the other; a big number with a graphic that fills the opposite side. Vary the layout per scene. In vertical video use the whole height, not just the top half.
- **One hero per moment.** Dim the rest (opacity 0.3–0.4 or blur) when zooming into a detail; judges liked code with the other lines dimmed.
- **Contrast.** 4.5:1 for normal text, 3:1 for large; colored type on a colored background is the usual failure; add a backing, a shadow or change the color.
- **Shapes, lines and icons** drawn in SVG make it look designed; drop shadows, glows and grain give depth; avoid a page of rounded cards.

**A centred line that builds word by word.** With `data-split="words"` + `data-enter` + `data-stagger` the whole line is laid out from the start and each word appears where it will end up, so the first word sits left of center until the rest arrive. That is right for most kinetic type. If the words shown so far must stay centred as the line grows, let each word grow from zero width (the line re-centres smoothly as it widens; the space goes inside the word):
```html
<style>
  .build { text-align: center; white-space: nowrap; }
  .build .w { display: inline-grid; grid-template-columns: 0fr; animation: word-grow .5s var(--ease-out-expo) both; animation-delay: calc(.3s + var(--i) * .4s); }
  .build .w > span { min-width: 0; overflow-x: clip; overflow-clip-margin: .2em; animation: fade-up .5s var(--ease-out-expo) both; animation-delay: inherit; }
  @keyframes word-grow { to { grid-template-columns: 1fr; } }
</style>
<h1 class="build"><span class="w" style="--i:0"><span>Ship</span></span><span class="w" style="--i:1"><span>&nbsp;it</span></span><span class="w" style="--i:2"><span>&nbsp;faster.</span></span></h1>
```
(CSS animations are seekable; their delays count from the start of the element's clip.)

**Step captions** (one short caption at a time, e.g. the steps of a demo; for word-timed subtitles of a voice use the `captions` block): put them in a `data-sequence` with `data-cuts` at the moments each step starts, an entrance and a short exit on each, and **no** `data-transition`. Each caption leaves (0.15 s) before the next comes in, so two captions are never on screen together:
```html
<div class="captions" data-sequence data-cuts="0.4 1.8 3.2 4.6" style="position:absolute;left:0;right:0;bottom:120px;text-align:center">
  <p data-enter="mask-up 0.35" data-exit="fade-up 0.15">Connect your repo</p>
  <p data-enter="mask-up 0.35" data-exit="fade-up 0.15">Pick a template</p>
  <p data-enter="mask-up 0.35" data-exit="fade-up 0.15">Press deploy</p>
  <p data-enter="mask-up 0.35">Live in 30 seconds</p>
</div>
```
A crossfade between captions (`data-transition="fade"`) shows both half-visible on top of each other (ghosting) and, since sequence children sit in normal flow, stacks them for a moment. If you want them to overlap, keep it to 0.1 s and make the captions `position: absolute` in the same spot.

## 7. Anti-patterns checklist

Before rendering, none of these should be true:
- [ ] A frame where nothing moves for > 1 s (look at the motion strip and neighbouring sheet cells).
- [ ] The first frame is empty or only background.
- [ ] Any text under 32 px on screen that matters, or any text cut by the frame.
- [ ] A scene that is a centered title fading in and out.
- [ ] The same entrance (`fade-up` everywhere) or the same layout in every scene.
- [ ] A plain `fade` between every scene.
- [ ] The camera crosses empty space, or a wide shot holds for long with tiny labels.
- [ ] The camera pushes in and straight back out, or big zooms come one after another.
- [ ] A mark (highlight, glow, ring) that floats off its target, runs over a window covering its card, or sits on top of another mark.
- [ ] Particles, arrows or shapes crossing key text.
- [ ] The end card sits still for 2 s or more.
- [ ] Something that lands and is gone, covered or cut a second later; an element with no planned way out.
- [ ] A start state that leaves a sliver showing before the entrance; `steps()` on a big panel or the camera.
- [ ] The video drifts from the brief (a required part missing, a claim on screen that does not match what is shown, a dropped word from a required line).
