# Living backgrounds and ambient motion
Use for: every video that should never look frozen: title cards, promos, captions, holds and end cards; dark or light brands.

## What makes it look premium
- **Three depths, three speeds.** Far: 2-3 huge soft color blobs (1300 px, 7-11 s loops). Middle: a faint grid drifting one cell per 8 s. Near: 20-30 dust dots rising 12-40 px/s. Different speeds read as depth.
- **Periods that never line up.** Blob loops of 7, 9 and 11 s (`sine.inOut`, yoyo) and 160-280 px travel, so the pattern never visibly repeats. Constant drifts (grid, dust) are `linear`; nothing else is.
- **Quiet by default.** Blobs at 50-60% opacity on dark, 70% on light; grid 6-7%; dust 15-45% with a slow twinkle (`gm.noise`). If you notice the background before the headline, halve it.
- **It reacts to the story.** On a scene change, blobs swing to a new layout (1.4 s `power3.inOut`, the second one 50 ms later), a thin ring pulses out (scale 0.4 → 2.2, 1.1 s `expo.out`) and the grid flashes 6% → 14% → 6%. One reaction per cut; between cuts it only drifts.
- **Persistent across cuts.** The background lives outside the `data-sequence`, so scenes push over it and it keeps flowing: one world, not a reset per scene.
- **Edges fade.** Mask the grid with a radial gradient so it dissolves toward the frame edges; add 4-5% film grain (`overlay` on dark, `multiply` on light) to kill banding.
- **Cheap to render.** Soft blobs are `radial-gradient(closest-side, color, transparent)`, not `filter: blur()`; dust uses `transform` only.

## Recipe
```html
<html data-width="1920" data-height="1080" data-fps="30">
<style>
  :root { --bg:#0a0c14; --ink:#f2f4f8; --c1:#5b4bff; --c2:#00b3ff; --c3:#ff3d8b; --line:#ffffff; --glow:.55; --grid:.06; }
  body { background: var(--bg); color: var(--ink); font-family: Inter, system-ui, sans-serif; }
  #ambient { position:absolute; inset:0; overflow:hidden; }
  .blob { position:absolute; width:1300px; height:1300px; opacity: var(--glow); background: radial-gradient(closest-side, var(--c), transparent); }
  #b1 { --c: var(--c1); left:-450px; top:-500px; }  #b2 { --c: var(--c2); left:1050px; top:-150px; }
  #b3 { --c: var(--c3); left:300px; top:450px; opacity: calc(var(--glow) * .7); }
  #grid { position:absolute; inset:-80px; opacity: var(--grid);
          background: linear-gradient(var(--line) 1px, transparent 1px) 0 0 / 80px 80px, linear-gradient(90deg, var(--line) 1px, transparent 1px) 0 0 / 80px 80px;
          mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 100%); }
  .dot { position:absolute; width:6px; height:6px; border-radius:50%; background: var(--line); }
  #ring { position:absolute; left:960px; top:540px; width:700px; height:700px; margin:-350px; border-radius:50%; border:2px solid var(--c2); opacity:0; }
  #grain { position:absolute; inset:0; opacity:.05; mix-blend-mode: overlay;
           background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E"); }
  .scene { display:grid; place-items:center; }  h1 { font-size:150px; font-weight:800; letter-spacing:-.035em; margin:0; }
</style>
<div id="ambient">
  <div class="blob" id="b1"></div><div class="blob" id="b2"></div><div class="blob" id="b3"></div>
  <div id="grid"></div><div id="dots"></div><div id="ring"></div><div id="grain"></div>
</div>
<main data-sequence data-transition="push-left 0.7">
  <section class="scene" id="s1" data-duration="4" data-camera="push 1.05"><h1 data-split="words" data-enter="mask-up" data-stagger="0.07">Always moving</h1></section>
  <section class="scene" id="s2" data-duration="4" data-camera="push 1.06, rotate -1"><div style="text-align:center">
    <h1 data-split="words" data-enter="mask-up" data-stagger="0.07">Never loud</h1>
    <p style="font-size:44px;opacity:.75;margin:24px 0 0" data-enter="fade-up 0.6 1.4">The background supports, the subject leads.</p></div></section>
</main>
<script>
// 1. Far layer: each blob on its own loop (7/9/11 s), the grid drifts one cell per 8 s (seamless).
[['#b1', 240, 160, 9], ['#b2', -260, 180, 11], ['#b3', 280, -150, 7]].forEach(([el, x, y, d]) =>
  gm.to(el, { x, y, scale: 1.15, duration: d / 2, ease: 'sine.inOut', repeat: -1, yoyo: true }));
gm.to('#grid', { x: -80, y: -80, duration: 8, ease: 'none', repeat: -1 });
// 2. Near layer: dust rises, sways and twinkles; everything computed from t (seekable).
const dots = Array.from({ length: 28 }, (_, i) => {
  const d = document.createElement('i'); d.className = 'dot'; document.getElementById('dots').append(d);
  return { d, x: gm.random('x' + i) * 1920, y: gm.random('y' + i) * 1080, v: 12 + gm.random('v' + i) * 28, s: .5 + gm.random('s' + i) };
});
gm.onFrame(t => dots.forEach((p, i) => {
  p.d.style.transform = `translate(${p.x + Math.sin(t * .4 + i) * 20}px, ${gm.wrap(p.y - t * p.v, -20, 1100)}px) scale(${p.s})`;
  p.d.style.opacity = .15 + .3 * gm.noise(t * .5 + i * 7);
}));
// 3. React to the cut: blobs swing to a new layout, a ring pulses out, the grid flashes.
const cut = gm.timing('#s2').start;                    // video time the push starts
gm.timeline()
  .to('#b1', { xPercent: 45, yPercent: 30, duration: 1.4, ease: 'power3.inOut' }, cut)
  .to('#b2', { xPercent: -50, yPercent: 35, duration: 1.4, ease: 'power3.inOut' }, cut + .05)
  .fromTo('#ring', { opacity: .5, scale: .4 }, { opacity: 0, scale: 2.2, duration: 1.1, ease: 'expo.out' }, cut + .2)
  .to('#grid', { opacity: .14, duration: .2, ease: 'power2.out' }, cut + .15)
  .to('#grid', { opacity: .06, duration: .9, ease: 'sine.inOut' }, cut + .35);
</script>
```

## Make it yours
- **Light brand:** `--bg:#f5f2ec; --ink:#16181d; --c1:#ffb38a; --c2:#8ec5ff; --c3:#c7a6ff; --line:#16181d; --glow:.7; --grid:.07`, grain `mix-blend-mode: multiply`. Pastel blobs on off-white; dark ink keeps contrast.
- **Calm / corporate:** one or two blobs, 11-15 s loops, no dust, no ring; the cut reaction is only the blob swing.
- **Energetic / tech:** 5-7 s loops, grid 10%, dust 40-60 dots at 30-60 px/s, ring + `gm.burst(..., { kind: 'sparks', global: true, at: cut })` on the cut, blobs pulse on the beat (`data-pulse="beat 0.04"` on `#ambient`).
- **Luxury:** near-black or ivory, one warm blob at 30%, no grid, dust 10 dots at 8 px/s, 2% grain, slow 1.8 s swings.

## Variations
- Ready-made: `<gm-include src="blocks/gradient-bg.html" c1="…" c2="…" c3="…">` or `blocks/grid-bg.html` (drift on global time, behind every scene).
- Living blob shape: `gm.onFrame(t => path.setAttribute('d', gm.shape.blob(420, { t: t * .3 })))` on an SVG path with a gradient fill.
- Inside a camera world, put the ambient layer next to the world with `data-parallax="0.3"` so it drifts slower than the content.
- Brand color shift per scene: tween `--c1` at each cut, e.g. `tl.to('#b1', { '--c': '#ff7a1a', duration: 1.2 }, cut)`.

## Pitfalls
- A living background does not hide a frozen foreground: `check` still reports `still` when only the ambient layer moves for 2.5 s (1.9 s at the end). Give each scene a second beat (a subline, a counter, a camera move).
- `filter: blur(150px)` on big layers renders slowly at 1080p and 4K; use radial gradients or a small canvas scaled up (see `blocks/gradient-bg.html`).
- Saturated blobs behind colored text fail contrast; keep blobs mid-dark under white text and pastel under dark text, or add a soft scrim behind the headline.
- Particles crossing the headline read as dirt: keep dust small (≤ 6 px), low opacity, or mask it out of the text area.
- One shared loop period for everything (all 8 s) makes the frame "breathe" in sync and look mechanical; use co-prime periods.
- The grid flash ends at a fixed `.06`; if you change `--grid`, change that number too.
