# Hand-drawn whiteboard
Use for: whiteboard / sketch / Excalidraw-style explainers, flows drawn step by step, "draw it out" briefs.

## What makes it look premium
- **Order like a hand.** Outline first (0.9-1.1 s), fill after it (0.6-0.8 s, starting ~0.8 s into the outline), label written last (0.6 s), then the arrow to the next step (0.9 s). Never draw everything at once.
- **Pen easing.** Every stroke `power2.inOut`: the pen speeds up and slows into the end. Handwriting `sine.inOut`, ~0.1 s per letter. Linear strokes look plotted.
- **Wobble, round caps, thick ink.** `data-sketch="1.4"` (default 1 looks too clean), `data-sketch-boil="3"` on the drawing so held lines stay alive (redrawn on threes), `data-sketch-ink="0.8"` for a pen or brush line (tapered ends, pressure) instead of a marker, `stroke-linecap: round`, 7 px outlines, 10 px accent underlines, labels ≥ 84 px in world units (they shrink in the overview).
- **Fills as separate shapes.** A copy of the shape with `stroke="none"` and its own fill style: hatched (default), `cross`, or `solid`, drawn after the outline so you see the hand go back in to color.
- **Arrows: shaft then head.** `gm.connect(..., { sketch: true, draw: [t, 0.9] })` draws the shaft and finishes with the head. Bend them (`curve: ±0.25`); straight arrows look like software.
- **Camera stays close and keeps drifting.** Frame two neighbours at a time (`padding: 90-110`), move 1.6 s `in-out-sine`, start each move as the next step starts drawing; pull back once at the very end.
- **Frame 0:** the title write-on starts at frame 0 with its first letter already showing (start the clip at 90%, not 100%).
- **Finish with a flourish:** `gm.sketch.loop` circles the payoff (1 s), then the wide shot.

## Recipe
```html
<html data-width="1920" data-height="1080" data-fps="30" data-duration="12">
<style>
  :root { --paper:#fbfaf6; --ink:#1e1e1e; --accent:#1971c2; --accent-2:#e8590c; --hand: Caveat, cursive; }
  body { background: var(--paper); color: var(--ink); font-family: var(--hand); }
  .paper { position:absolute; inset:-10%; opacity:.07; background: radial-gradient(var(--ink) 1.2px, transparent 1.4px) 0 0 / 36px 36px; }
  #world { position:absolute; left:0; top:0; width:2200px; height:1240px; }
  #world svg { position:absolute; inset:0; overflow:visible; stroke-linecap:round; stroke-linejoin:round; }
  .lbl { position:absolute; margin:0; font-size:84px; font-weight:700; white-space:nowrap; }
  #title { left:540px; top:70px; font-size:130px; }
</style>
<section class="scene" data-duration="12">
  <div class="paper" data-parallax="0.4"></div>
  <div id="world">
    <h1 id="title" class="lbl">How an idea ships</h1>
    <svg viewBox="0 0 2200 1240" data-sketch="1.4">
      <path id="u1" d="M550 250 C 850 236, 1150 260, 1470 242" stroke="var(--accent-2)" stroke-width="10" fill="none"/>
      <circle id="idea-fill" cx="420" cy="640" r="150" fill="var(--accent)" stroke="none" data-sketch-gap="16"/>
      <circle id="idea" cx="420" cy="640" r="150" fill="none" stroke="var(--ink)" stroke-width="7"/>
      <rect id="build-fill" x="900" y="520" width="380" height="250" rx="26" fill="var(--accent-2)" stroke="none" data-sketch-fill="cross" data-sketch-gap="18"/>
      <rect id="build" x="900" y="520" width="380" height="250" rx="26" fill="none" stroke="var(--ink)" stroke-width="7"/>
      <polygon id="ship-fill" points="1600,480 1880,640 1600,800" fill="var(--accent)" stroke="none" data-sketch-fill="solid"/>
      <polygon id="ship" points="1600,480 1880,640 1600,800" fill="none" stroke="var(--ink)" stroke-width="7"/>
    </svg>
    <p class="lbl" data-anchor="#idea bottom 24">idea</p>
    <p class="lbl" data-anchor="#build bottom 24">build</p>
    <p class="lbl" data-anchor="#ship bottom 24">ship it!</p>
  </div>
</section>
<script>
const tl = gm.timeline('#world');
const pen = (sel, at, dur = 1) => tl.fromTo(sel, { draw: 0 }, { draw: 1, duration: dur, ease: 'power2.inOut' }, at);
const write = (sel, at, dur = .6) => tl.from(sel, { clipPath: 'inset(-20% 100% -20% -5%)', duration: dur, ease: 'sine.inOut' }, at);
tl.fromTo('#title', { clipPath: 'inset(-20% 90% -20% -5%)' }, { clipPath: 'inset(-20% -5% -20% -5%)', duration: 1.3, ease: 'sine.inOut' }, 0);
pen('#u1', 1.3, .45);                                            // quick underline flick
pen('#idea', 2.2);       pen('#idea-fill', 3.0, .7);             // outline, then hatch
write('#world p:nth-of-type(1)', 3.2);
gm.connect('#idea', '#build', { sketch: true, curve: -0.25, width: 7, draw: [3.6, .9] });   // shaft, then head
pen('#build', 4.4, 1.1); pen('#build-fill', 5.35, .8);
write('#world p:nth-of-type(2)', 5.6);
gm.connect('#build', '#ship', { sketch: true, curve: 0.25, width: 7, color: 'var(--accent-2)', draw: [6.2, .9] });
pen('#ship', 7.0, .9);   pen('#ship-fill', 7.8, .6);
write('#world p:nth-of-type(3)', 8.0, .7);
gm.sketch.loop(['#ship', '#world p:nth-of-type(3)'], { draw: [8.9, 1], color: 'var(--accent-2)', width: 6, in: '#world' });
// Close on each step while it draws; shots flow into each other; one pull back at the end.
gm.camera('#world')
  .shot(0,   { fit: '#title', padding: 200 })
  .shot(1.2, { fit: ['#title', '#idea'], padding: 90, duration: 1.6, ease: 'in-out-sine' })
  .shot(3.0, { fit: ['#idea', '#build'], padding: 110, duration: 1.6, ease: 'in-out-sine' })
  .shot(6.0, { fit: ['#build', '#ship'], padding: 110, duration: 1.6, ease: 'in-out-sine' })
  .shot(10,  { fit: ['#title', '#idea', '#ship', '#world p'], padding: 110, duration: 1.6, ease: 'in-out-cubic' });
</script>
```

## Make it yours
- **Calm / teaching:** roughness 1.2, outlines 1.3 s, 1 s of stillness-with-drift between steps, single accent.
- **Energetic:** roughness 1.8, outlines 0.6 s `power3.inOut`, arrows 0.5 s, camera moves 1.0 s, a little `rotate: ±2` on shots.
- **Playful:** `data-sketch-fill="cross"` everywhere, two accents, labels rotated -3° to 3°, a `data-sketch-mark="circle"` on the punchline word.
- **Brand / corporate whiteboard:** brand ink instead of black, `data-sketch-fill="solid"` fills at 85% opacity, Inter 600 labels with `data-enter="write"` instead of Caveat.

## Variations
- Preset version: `data-enter="draw 1.2 3"` on a sketched shape draws outline + fill together; `data-enter="write 0.8 11.9"` writes a label later in the scene.
- Highlight on text: `<span data-sketch-mark="highlight" data-sketch-mark-at="4.2">key word</span>` (also `underline`, `circle`, `box`, `strike`); with a voice-over, draw it as the word is said: `data-sketch-mark-at="@cheaper"`. With no `-at`, it draws once the element's entrance is done.
- Own path data: `<path d="${gm.sketch.arrow(200, 400, 700, 380, { curve: .2 })}">` then `pen('#myArrow', t)`.
- Something travelling the flow: `gm.path.travel('#dot', arrow, { stops: [[4, 0], [5, 1]] })` with `arrow = gm.connect(...)`.

## Pitfalls
- Fill and outline on one shape draw at the same time: split them into two shapes (fill copy with `stroke="none"` first in the SVG, outline on top).
- 3 px ink and 40 px labels look faint and tiny in the final pull-back; use 6-7 px strokes and ≥ 84 px labels in world units.
- A camera shot fitted to a `gm.sketch.loop` id is measured at the world origin (it does not exist yet at load): fit the shapes and labels it circles with a bigger `padding` instead.
- `camera-stop` (ℹ): a shot that starts 0.2-0.4 s after the previous one arrives brakes and sets off again. Start it as the previous one arrives, or hold ≥ 0.5 s.
- Drawing a shape while the camera is still travelling to it starts the stroke off-screen: start the pen ≥ 1 s after the move begins.
- Clip-path write-on cuts letter tails (`y`, `p`, italics): pad the inset with negative values (`-20%` top/bottom, `-5%` sides).
