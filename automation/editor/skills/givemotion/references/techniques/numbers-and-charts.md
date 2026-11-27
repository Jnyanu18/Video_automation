# Numbers and charts
Use for: stats, KPIs, growth stories, bar or line charts, "one number matters" moments, before/after comparisons.

## What makes it look premium
- **Counters and readouts.** A number counting from A to B: `data-count` (add `data-count-roll` for an odometer). A readout that jumps between values at set times (a depth meter, a score, "1 IN 10" → "1 IN 100"): `data-roll="0: 0200 M; 6.5: 1000 M"`. Both keep every frame readable (each character clipped to its own line, only what changed moves); a hand-built digit wheel shows half digits and neighbours bleeding in.
- **To scale, always.** One px-per-unit constant for every bar (`height = v * pxPerUnit`); the counter says what the bar shows. Grow bars with `scaleY` from `transform-origin: 50% 100%`, never `height`.
- **Rise, overshoot, settle.** Bars 0.8-1.0 s `back.out(1.3-1.5)` (about 4% past, settles in ~0.3 s), stagger 70-100 ms left to right. The number counts on the same clock with `expo.out` so it never shows a value above the real one.
- **Count only when the brief allows it.** A count-up shows every number on the way. When the brief lists the exact copy and says nothing else may appear, those in-between numbers break it (judges marked it down): reveal the final number instead (a mask wipe, a slot roll that lands, a scramble that settles), unless the brief says in-between values may show.
- **Labels ride the bar end.** `data-anchor="#b3 top 18"` keeps the value 18 px above the bar top every frame while it grows. Use `font-variant-numeric: tabular-nums` so digits do not jitter while counting.
- **Frame 0 is not empty.** Bars start as 4% stubs, the title at 30% opacity, the base line already drawn; grid lines draw from the left (`scaleX`, 0.9 s `expo.out`, 80 ms stagger).
- **One hero.** After the build, everything else drops to 25-30% opacity in 0.5 s (`out-cubic`); the hero value scales 1.3 with `back.out(2)` and takes the accent; the hero bar gets a 40 px glow and one ring (scale 0.4 to 2.2, fading, 0.9 s).
- **Push in on the data point.** `gm.camera` fit on hero + callout, 1.2-1.4 s `in-out-quart`, then a second shot with `zoom: 1.06` over ~2.5 s so the hold keeps drifting. Fade the title and the labels the push will crop before it starts.
- **Callout with a pointer.** `gm.connect` draws the pointer in 0.4-0.5 s, then the callout's number masks up 0.2 s later. The pointer arrives first; the eye follows it.
- **Ambient:** a drifting radial glow behind, a shine that crosses the hero bar every ~2 s.

## Recipe
```html
<html data-width="1920" data-height="1080" data-duration="6.5">
<style>
  :root { --bg:#0e1118; --ink:#f2f4f8; --muted:#8b93a3; --bar:#3a4357; --accent:#ffb340; }
  body { background: var(--bg); color: var(--ink); font-family: Inter, sans-serif; }
  .glow { position:absolute; inset:-20%; background: radial-gradient(40% 50% at 70% 40%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 70%); animation: drift 7s ease-in-out infinite alternate; }
  @keyframes drift { to { transform: translate(-6%, 4%) scale(1.1); } }
  #world { position:absolute; inset:0; }
  h2 { position:absolute; left:160px; top:110px; margin:0; font-size:76px; font-weight:800; }
  .grid { position:absolute; left:160px; width:1340px; height:2px; background: var(--muted); opacity:.25; transform-origin:left; }
  .bar { position:absolute; bottom:180px; width:150px; border-radius:14px 14px 4px 4px; background: var(--bar); transform-origin:50% 100%; overflow:hidden; }
  .bar.hero { background: var(--accent); }
  .val { font-size:44px; font-weight:700; font-variant-numeric: tabular-nums; white-space:nowrap; }
  .q { position:absolute; top:916px; width:150px; text-align:center; font-size:36px; color: var(--muted); }
  #callout { position:absolute; left:1600px; top:250px; font-size:38px; font-weight:600; color: var(--muted); }
  #callout b { display:block; font-size:88px; font-weight:800; color: var(--accent); }
  .ring { position:absolute; width:150px; height:150px; border:4px solid var(--accent); border-radius:50%; opacity:0; }
  .shine { position:absolute; inset:0; background: linear-gradient(100deg, transparent 30%, #fff7 50%, transparent 70%); transform: translateX(-120%); }
</style>
<section class="scene" data-duration="6.5">
  <div class="glow"></div>
  <div id="world">
    <h2 data-split="words">Revenue by quarter</h2>
    <div class="grid" style="top:340px"></div><div class="grid" style="top:560px"></div><div class="grid" style="top:900px;opacity:.5"></div>
    <div id="bars"></div>
    <div id="callout"><b>+52%</b>in one quarter</div>
    <div class="ring" data-anchor="#b5 top 0"></div>
  </div>
</section>
<script>
  const values = [12, 18, 15, 24, 31, 47], hero = 5, pxPerUnit = 11.5;      // one scale for every bar
  values.forEach((v, i) => document.querySelector('#bars').insertAdjacentHTML('beforeend',
    `<div class="bar${i === hero ? ' hero' : ''}" id="b${i}" style="left:${200 + i * 220}px;height:${v * pxPerUnit}px">${i === hero ? '<div class="shine"></div>' : ''}</div>
     <div class="val" id="v${i}" data-anchor="#b${i} top 18">$0M</div><div class="q" style="left:${200 + i * 220}px">Q${i + 1}</div>`));
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  gm.connect('#callout', '#v5', { from: 'left', to: 'right', curve: 0, color: accent, width: 4, gap: 16, draw: [3.0, 0.45] });

  gm.timeline('#world')
    .fromTo('h2 .gm-word', { yPercent: 60, opacity: 0.3 }, { yPercent: 0, opacity: 1, stagger: 0.07 }, 0)
    .fromTo('.grid', { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0.1)
    .fromTo('.bar', { scaleY: 0.04 }, { scaleY: 1, duration: 0.9, ease: 'back.out(1.4)', stagger: 0.09 }, 0.3)  // ~4% overshoot
    .from('.val', { opacity: 0, duration: 0.25, stagger: 0.09 }, 0.35)
    // focus: title and croppable labels leave, the rest dims, the hero grows and glows
    .to('h2', { y: -40, opacity: 0, duration: 0.4, ease: 'in-cubic' }, 2.3)
    .to(['#v0', '#v1', '#v2', '#v3'], { opacity: 0, duration: 0.3 }, 2.4)
    .to(['#b0', '#b1', '#b2', '#b3', '#b4', '#v4', '.q'], { opacity: 0.28, duration: 0.5, ease: 'out-cubic' }, 2.5)
    .to('#v5', { scale: 1.3, color: accent, duration: 0.5, ease: 'back.out(2)' }, 2.6)
    .to('#b5', { filter: `drop-shadow(0 0 40px ${accent})`, duration: 0.6 }, 2.6)
    .fromTo('.ring', { opacity: 0.9, scale: 0.4 }, { opacity: 0, scale: 2.2, duration: 0.9, ease: 'out-cubic' }, 2.7)
    .from('#callout b', { yPercent: 60, opacity: 0, duration: 0.5, ease: 'out-quart' }, 3.2)   // after the pointer lands
    .from('#callout', { opacity: 0, duration: 0.35 }, 3.3)
    .to('.shine', { x: '240%', duration: 0.9, ease: 'in-out-sine', repeat: 1, repeatDelay: 1.2 }, 3.6);
  values.forEach((v, i) => gm.timeline('#world').to(`#v${i}`, { textContent: v, duration: 1, ease: 'expo.out' }, 0.3 + i * 0.09));

  gm.camera('#world')
    .shot(0, { fit: ['h2', '#b0', '#b5', '.q'], padding: 100 })
    .shot(2.4, { fit: ['#b4', '#b5', '#v5', '#callout'], padding: 120, duration: 1.3, ease: 'in-out-quart' })  // push in
    .shot(3.9, { fit: ['#b4', '#b5', '#v5', '#callout'], padding: 120, zoom: 1.06, duration: 2.6, ease: 'in-out-sine' });
</script>
```

## Make it yours
- **Calm / corporate:** bars `power3.out` (no overshoot), stagger 120 ms, push zoom smaller (padding 200), no shine, glow 20 px.
- **Energetic:** bars 0.6 s `back.out(1.8)`, stagger 50 ms, push 0.6 s `out-expo` plus `cam.shake(t, { amount: 10, duration: 0.3 })` and `gm.burst` sparks from `#v5` on the hero.
- **Luxury / editorial:** thin 40 px bars, serif numbers (`Playfair Display`), slow 1.4 s `in-out-sine` everything, gold accent, no ring.
- Swap `values`, `pxPerUnit` (tallest bar about 50-55% of frame height) and the CSS variables; nothing else changes.

## Variations
- **Line that draws with a leading dot:** `gm.chart.line('#growth', { values, labels, delay: 0.6, duration: 4, holds: { Mar: 1 } })`; the dot is `chart.head` (follow it: `shot(0, { follow: chart.head, zoom: 1.2, offset: [260, 0] })`). Full API: `references/charts.md`.
- **Horizontal bars / bar race:** `transform-origin: 0 50%`, `scaleX`, label `data-anchor="#b3 right 18"`.
- **Big single number:** `.to('#n', { textContent: 1250, duration: 1.6, ease: 'expo.out' })` (write `0` in the HTML; the format, `$`, commas and decimals, is copied from it), then land it: `.to('#n', { keyframes: { scale: [1, 1.08, 1] }, duration: 0.45 })` plus a ring.
- **Before vs after:** two bars side by side, the "before" grows first and dims to 30% before the "after" grows past it.

## Pitfalls
- Counting with `back.out` shows "$49M" for a moment on a $47M bar: count with `expo.out`/`out-cubic`, overshoot only the shape.
- A push that leaves neighbour labels half in frame reads as a mistake (`text-offscreen`): fade those labels to 0 before the camera moves.
- A chart that fills only the left of the frame: start with `fit` on the chart content, not the whole world.
- Exaggerated scales (bar heights not proportional) get caught by viewers; keep one `pxPerUnit`.
