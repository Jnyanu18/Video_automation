# Scene transitions
Use for: every change from one scene to the next; the moments that decide whether a video flows like motion design or clicks like slides.

## What makes it look premium
- **The new scene comes out of something in the old one.** A circle opens from the button that was just pressed, a shape flies into its new place (`morph`), the edge of a wipe carries the brand color. A transition from nowhere (fade, generic slide) is the slide look.
- **Length: 0.5–0.9 s** (whip 0.3–0.45, morph 0.7–1.0). The overlap of the two clips *is* the transition: explicit clips (`data-start` / `data-duration`) let you set each one.
- **Anticipation before a reveal:** the source squeezes to 0.85 for 0.25 s (`power2.in`), then pops to 1.4 as the circle opens. Shape wipes accelerate (`in-cubic`) so the last frames sweep the screen and the cut lands at speed.
- **Edges carry detail.** A wipe edge slanted ~10° with 2 stripes (110 px + 28 px, 40 px apart) riding on it reads as designed; a straight hard edge reads as a PowerPoint wipe.
- **Secondary motion on both sides.** The old scene drifts 150–200 px in the direction of travel and dims while it is covered; the new scene's text enters 0.35–0.55 s into its clip, so it lands as the transition ends.
- **Never crossfade text over text.** Old text exits (fade-up 0.3 s) before the middle of a morph or fade; or use a transition that covers or moves the old scene (circle, wipe, push, whip, cover).
- **Keep direction consistent:** "next" always goes the same way (left-to-right sweeps, `push-left`); `zoom-through` means going deeper.

## Recipe
Circle from an element, slanted wipe with stripes, then a shared-element `morph`. 10 s.
```html
<html data-width="1920" data-height="1080" data-fps="30"><head><style>
  :root { --bg: #10131a; --bg2: #1b2030; --ink: #f4f1ea; --accent: #ffcf3f; }
  body { background: var(--bg); color: var(--ink); font-family: 'Space Grotesk', sans-serif; }
  h1 { position: absolute; left: 150px; margin: 0; font-size: 190px; line-height: .92; letter-spacing: -.045em; }
  #a { background: var(--bg); } #a h1 { top: 330px; }
  #dot { position: absolute; left: 1400px; top: 460px; width: 160px; height: 160px; border-radius: 50%;
    background: var(--accent); box-shadow: 0 0 80px color-mix(in oklab, var(--accent) 60%, transparent); }
  #b { background: var(--accent); color: var(--bg); } #b h1 { top: 400px; }
  #c, #d { background: var(--bg2); } #c h1 { top: 300px; font-size: 150px; }
  .chip { position: absolute; border-radius: 28%; background: var(--accent); }
  #c .chip { left: 1360px; top: 380px; width: 320px; height: 320px; }
  #d .chip { left: 150px; top: 290px; width: 500px; height: 500px; }
  #d h1 { left: 760px; top: 420px; font-size: 150px; }
  #stripes { position: absolute; left: 0; top: 0; height: 100%; display: flex; gap: 40px; z-index: 10;   /* rides the wipe edge */
    transform-origin: 0 100%; transform: skewX(-10.5deg); translate: -400px 0; }
  #stripes i { height: 100%; width: 110px; background: var(--ink); } #stripes i + i { width: 28px; }
</style></head><body>
<main>  <!-- explicit clips: each overlap = the length of that transition -->
  <section class="scene" id="a" data-start="0" data-duration="3">
    <h1 data-camera="push 1.05">Every<br>cut</h1><div id="dot"></div>
  </section>
  <section class="scene" id="b" data-start="2.3" data-duration="3.3">       <!-- 2.3–3.0: opens out of #dot -->
    <h1 data-split="words" data-enter="mask-up 0.6 0.35" data-stagger="0.08" data-camera="push 1.04">should<br>carry</h1>
  </section>
  <div class="scene" data-sequence data-start="4.7">                         <!-- 4.7–5.6: wipe with stripes -->
    <section class="scene" id="c" data-duration="3.2">
      <h1 data-split="words" data-enter="mask-up 0.6 0.4" data-stagger="0.08" data-exit="fade-up 0.3 0.5">something<br>across.</h1>
      <div class="chip" data-morph="chip"></div>
    </section>
    <section class="scene" id="d" data-duration="3" data-transition="morph 0.8"> <!-- the chip flies into place -->
      <div class="chip" data-morph="chip"></div>
      <h1 data-split="words" data-enter="mask-up 0.6 0.55" data-stagger="0.08" data-camera="push 1.04">Keep it<br>moving.</h1>
    </section>
  </div>
</main>
<div id="stripes"><i></i><i></i></div>
<script>
// A → B: anticipation on the dot, then B opens as a circle centred on it
gm.timeline('#a').to('#dot', { scale: 0.85, duration: 0.25, ease: 'power2.in' }, 2.05)
                 .to('#dot', { scale: 1.4, duration: 0.4, ease: 'expo.out' });
gm.timeline('#b').fromTo('#b', { clipPath: 'circle(0px at 1480px 540px)' },
                               { clipPath: 'circle(2300px at 1480px 540px)', duration: 0.7, ease: 'in-cubic' }, 0)
  .to('#b h1', { x: -180, opacity: 0.6, duration: 0.9, ease: 'in-out-cubic' }, 2.4);   // B drifts out as C sweeps in
// B → C: C is revealed by a slanted edge (top 200 px ahead); the stripes use the same time and ease
const sweep = { duration: 0.9, ease: 'in-out-cubic' };
gm.timeline('#c').fromTo('#c', { clipPath: 'polygon(0px 0px, -200px 0px, -400px 100%, 0px 100%)' },
                               { clipPath: 'polygon(0px 0px, 2130px 0px, 1930px 100%, 0px 100%)', ...sweep }, 0);
gm.timeline().fromTo('#stripes', { x: 0 }, { x: 2330, ...sweep }, 4.7);   // #stripes has no clip: video time
</script></body></html>
```

## Make it yours
- **Calm / corporate:** 0.8–1.0 s, `in-out-sine`, `push-left` or `morph` only, one stripe or none, no anticipation.
- **Energetic / punchy:** 0.35–0.5 s, `whip-*` and circle wipes on beats, 3 stripes, anticipation 0.15 s.
- **Playful:** circle from every pressed thing; the incoming text `pop`s; stripes in two accent colors.
- **Luxury:** `morph` and slow `zoom-through` (0.9–1.2 s), no stripes, dark dips (`dip 0.8`) only for chapters.

## Variations
- Engine transitions in a sequence: `<main data-sequence data-transition="push-left 0.6">`, per scene `data-transition="whip-left 0.4"`, `"zoom-through 0.8"`, `"band-right 0.5 var(--accent) 100% 15deg"` (full color wipe).
- Match cut without morph: tween the outgoing element (`scale`, `x`) to exactly where the next scene's element sits at the cut; same color and shape on both sides of a hard cut.
- Text as the mask: give the next scene `clipPath: 'inset(0 100% 0 0)'` → `'inset(0 0% 0 0)'` and run a 6 px accent bar along its edge.
- Circle from another spot: change both `at` points; radius must reach the farthest corner (≈ 2300 px at 1080p).

## Pitfalls
- **Zooming in as a transition** (push into the old scene, then cut or slide): it reads as "look at this" and the viewer searches for a subject that is not there. Push only toward the thing the next moment is about; otherwise leave sideways or carry a shared element across.
- **Ghosted text:** a `fade`/`morph` with text on both sides shows two half-visible lines. Exit the old text (`data-exit="fade-up 0.3 0.5"`) or cover it.
- **Circle that starts off its source:** a camera push on the scene moves the source on screen; keep the camera on the text, not on the parent of the source, or aim at where it is at the cut (`inspect --at 2.3 --el "#dot"`).
- **Stripes out of sync with the reveal:** both tweens need the same start, duration and ease, and the same travel (edge starts at −400, ends at 1930: 2330 px). Keep the travel just past the frame, or the sweep crosses the screen in 2–3 frames.
- **Overlay visible at frame 0:** start the stripes fully off-frame (their right edge and skew included).
- `snapshot --transitions` only knows engine transitions; check custom ones with `snapshot --every 0.1 --from 4.7 --to 5.6`.
