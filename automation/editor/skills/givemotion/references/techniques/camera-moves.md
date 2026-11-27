# Camera moves
Use for: any scene that should feel filmed, not laid out: slow pushes on a title, a whip to the next idea, a push into a detail, following something that travels, an impact.

## What makes it look premium
- **Every move has a reason.** The camera pushes because something matters, follows because something moves, shakes because something hits. Start a move when its reason appears, not before.
- **Slow push/pull: 1.04–1.10 over 2–4 s, `in-out-sine`.** It should be felt more than seen. A push that is visible as a zoom (> 1.15 in 2 s) reads as a slideshow effect.
- **Whip pan: 0.35–0.5 s, `in-out-expo`, plus directional blur** that peaks mid-move (40–50 px along the move, 0 across it). Without blur a fast pan strobes; uniform `blur()` looks out of focus instead of fast.
- **Push in to a detail and back out: 0.8–1 s in, hold ≥ 0.5 s, 0.6–0.8 s out** (`in-out-cubic`). Pair it with a focus pull: the rest blurs 8–12 px and dims to 30–40% while you are close.
- **Follow with lead room and lag.** `follow` + `offset` 300–450 px ahead of the direction of travel, `lag: 0.2–0.3` so the frame trails like an operator. The subject moves with `in-out-quad`, the camera with its own lag: two curves, not one.
- **Impact shake: 10–16 px, 0.3–0.4 s**, on the frame of the hit, with a ring (scale 0.5→2.2, opacity 0.9→0, 0.7 s `out-cubic`) and a 1.15× pop on the target. Shake alone looks like a glitch.
- **Ambient layer.** A background outside the world with `data-parallax="0.2–0.3"` drifts less than the world, so every move shows depth.

## Recipe
One camera world, five moves in 10 s: push, whip, push-in with focus pull, follow, impact.
```html
<html data-width="1920" data-height="1080" data-fps="30" data-duration="10"><head><style>
  :root { --bg: #0d1017; --ink: #f2efe8; --muted: #8a90a0; --accent: #ff6a3d; }
  body { background: var(--bg); color: var(--ink); font-family: 'Space Grotesk', sans-serif; }
  .glow { position: absolute; inset: -20%; background: radial-gradient(40% 35% at 30% 40%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 70%); }
  #world { position: absolute; left: 0; top: 0; width: 3400px; height: 1800px; filter: url(#whipblur); }
  #title { position: absolute; left: 140px; top: 430px; margin: 0; font-size: 170px; line-height: .95; letter-spacing: -.04em; }
  #title em { color: var(--accent); font-style: normal; }
  #card { position: absolute; left: 1750px; top: 260px; width: 1000px; height: 600px; border-radius: 28px;
    background: color-mix(in oklab, var(--ink) 6%, var(--bg)); box-shadow: 0 40px 90px -30px #000; }
  #card .rest { position: absolute; left: 70px; top: 70px; font-size: 48px; color: var(--muted); }
  #card .bars { position: absolute; left: 70px; bottom: 70px; display: flex; gap: 18px; align-items: end; }
  #card .bars i { width: 48px; border-radius: 8px; background: color-mix(in oklab, var(--ink) 25%, transparent); }
  #detail { position: absolute; right: 80px; top: 150px; font-size: 200px; font-weight: 700; color: var(--accent); }
  #lane, #fill { position: absolute; left: 1700px; top: 1418px; width: 1600px; height: 6px; background: color-mix(in oklab, var(--ink) 18%, transparent); }
  #fill { background: var(--accent); transform-origin: left; }
  #dot { position: absolute; left: 1650px; top: 1371px; width: 100px; height: 100px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 70px var(--accent); }
  #goal { position: absolute; left: 3300px; top: 1421px; }
  #goal b, #ring { position: absolute; left: -60px; top: -60px; width: 120px; height: 120px; border-radius: 50%; border: 6px solid var(--ink); }
  #ring { border-color: var(--accent); opacity: 0; }
  #goal span { position: absolute; left: -200px; width: 400px; top: -230px; text-align: center; font-size: 110px; font-weight: 700; }
</style></head><body>
<svg width="0" height="0" style="position:absolute"><filter id="whipblur" x="-10%" width="120%"><feGaussianBlur id="whipk" stdDeviation="0 0"/></filter></svg>
<section class="scene" data-duration="10">
  <div class="glow" data-parallax="0.25"></div>
  <div id="world">
    <h1 id="title">Move with<br><em>intent.</em></h1>
    <div id="card"><div class="rest">Weekly retention</div>
      <div class="bars"><i style="height:120px"></i><i style="height:180px"></i><i style="height:150px"></i><i style="height:240px"></i><i style="height:300px"></i></div>
      <div id="detail">92%</div></div>
    <div id="lane"></div><div id="fill"></div>
    <div id="goal"><b></b><div id="ring"></div><span>Launch</span></div><div id="dot"></div>
  </div>
</section>
<script>
gm.camera('#world')
  .shot(0,    { fit: '#title', padding: 260 })                                       // a touch wide
  .shot(0.05, { fit: '#title', padding: 150, duration: 2.3, ease: 'in-out-sine' })   // slow push, felt not seen
  .shot(2.4,  { fit: '#card', padding: 120, duration: 0.45, ease: 'in-out-expo' })   // whip pan
  .shot(3.6,  { fit: '#detail', padding: 90, duration: 0.9, ease: 'in-out-cubic' })  // push in to the detail
  .shot(5.0,  { fit: '#card', padding: 120, duration: 0.8, ease: 'in-out-cubic' })   // and back out
  .shot(6.0,  { follow: '#dot', zoom: 1.25, offset: [420, -120], duration: 0.9, lag: 0.25 }) // lead room
  .shake(8.55, { amount: 16, duration: 0.4 });                                       // impact on arrival
const k = document.getElementById('whipk');   // horizontal-only blur, peaks mid-whip (2.4 → 2.85)
gm.onFrame(t => k.setAttribute('stdDeviation', gm.interpolate(t, [2.4, 2.6, 2.85], [0, 46, 0]) + ' 0'));
gm.timeline('#world')
  .to('#card .rest, #card .bars', { filter: 'blur(10px)', opacity: 0.35, duration: 0.7 }, 3.7)   // focus pull
  .to('#card .rest, #card .bars', { filter: 'blur(0px)', opacity: 1, duration: 0.6 }, 5.0)
  .to('#dot', { x: 1600, duration: 2.4, ease: 'in-out-quad' }, 6.15)                // the subject motivates the move
  .fromTo('#fill', { scaleX: 0 }, { scaleX: 1, duration: 2.4, ease: 'in-out-quad' }, 6.15)
  .fromTo('#ring', { opacity: 0.9, scale: 0.5 }, { opacity: 0, scale: 2.2, duration: 0.7, ease: 'out-cubic' }, 8.55)
  .fromTo('#goal span', { scale: 1 }, { keyframes: [{ scale: 1.15, duration: 0.12 }, { scale: 1, duration: 0.4, ease: 'out-back' }] }, 8.55);
</script></body></html>
```

## Make it yours
- **Calm / corporate:** pushes 1.04 over 3–4 s, no whip (use a 1.2 s `in-out-cubic` move), no shake, `float 8` while holding.
- **Energetic / punchy:** whips 0.3 s with 50–60 px blur, push-ins 0.5 s `expo.out`, shake 16–20 px on every hit, `handheld 6` between moves.
- **Luxury:** very slow (push 1.03 over 5 s), long focus pulls (1–1.2 s, 14 px blur), no shake, slight `rotate: -2` on a shot.
- **Playful:** overshooting arrivals (leave the shot's default overshoot on), bank 3–5° into whips.

## Variations
- Bank/rotate into a move: `.shot(4, { fit: '#b', rotate: -4, duration: 0.8 })`, then `rotate: 0` on the next shot.
- No world needed: `data-camera="push 1.06, float"` on a scene; `"pull 1.08"` for a reveal; `"handheld 6"` for documentary.
- Impact without a world: `data-camera="shake 14 2.1-2.5"` (window in seconds of the clip).
- Vertical whip: blur `'0 46'` instead of `46 + ' 0'`, and arrange the world top to bottom.

## Pitfalls
- **Whip without blur** strobes (the text jumps 300+ px per frame). Add the SVG directional blur; a uniform `filter: blur()` reads as defocus.
- **Moves with no reason** (a push on nothing, a pan across empty space) look like a screensaver. Keep subjects close in the world; check the mid-whip frame with `snapshot --every 0.1 --from A --to B`.
- **Push-in that cuts its neighbour:** a label half in frame reads as a mistake. Fit the detail with its label, or blur/dim the rest.
- **`camera-stop` note** after a push-in hold is fine when the hold is meant (≥ 0.5 s, as here); chain shots back-to-back when it is not.
- **Shake on calm brands** or on every beat cheapens it; one or two hits per video.
- `filter: url(#…)` on a very large world costs render time; turn the blur to `0 0` outside whips (the interpolate above does).
