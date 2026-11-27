# Light and depth
Use for: logo reveals, title cards, end cards, product heroes: any frame that looks flat, "web page", or too clean.

## What makes it look premium
- **Three depths, three speeds.** Far: huge color blobs (1000–1400 px, `blur(120–160px)`, opacity 0.3–0.4) drifting 200–260 px over the scene. Mid: the subject. Near: a few small soft dots (`blur(14px)`, opacity 0.2–0.3) moving 3–4× faster the other way. The speed difference is what reads as depth.
- **Light has a source and a moment.** Bloom = a blurred copy of the text (`blur(24–40px)`) that flashes to 1.0 in 0.25 s as the thing lands, then settles to 0.4–0.5 and breathes (±0.2 over 1.2 s). A constant glow looks like a CSS effect; a flash that settles looks like light.
- **One light sweep per hero, 0.9–1.2 s, `in-out-sine`, 100–110° angle,** a narrow band (12% of the gradient). Cross the mark first, then the word 0.15 s later at the same angle: one light passing over both. Text must be mid-tone (ink mixed 60–70% with the accent) or a white sheen will not show.
- **Fast things smear.** While something moves > ~1500 px/s: `blur(8px)` + stretch along the move (`scaleY 1.25, scaleX 0.9`), back to sharp on arrival, then a squash (`0.88 / 1.08` for 0.08 s, `out-back` back). Add 2–3 trail copies at opacity 0.35 → 0, 40 ms apart.
- **Contact shadows.** A blurred dark ellipse under the object grows from 0.3 → 1 and darkens as it comes down; plus a soft drop shadow (`0 30px 60px -20px`) and a 1 px inner highlight on cards.
- **Finish: vignette + grain.** Radial vignette to 55% black at the corners; fractal-noise grain at opacity 0.05–0.08, `mix-blend-mode: overlay`, jumping 5 positions per 0.5 s (`steps(5)`). It removes the "digital flat" look and banding in gradients.
- **Entrances out of focus:** text rises 90 px from `blur(14px)` with `expo.out`, chars 30–40 ms apart.

## Recipe
A 5 s logo card with every layer.
```html
<html data-width="1920" data-height="1080" data-fps="30" data-duration="5"><head><style>
  :root { --bg: #0a0b14; --ink: #f5f2ff; --accent: #7c5cff; --accent2: #ff5fa2; }
  body { background: var(--bg); color: var(--ink); font-family: 'Space Grotesk', sans-serif; overflow: hidden; }
  .layer { position: absolute; inset: -10%; } .blob { position: absolute; border-radius: 50%; }
  #far .blob { width: 1400px; height: 1000px; filter: blur(160px); opacity: .4; }
  #far .b1 { left: -10%; top: -20%; background: var(--accent); }
  #far .b2 { right: -10%; bottom: -30%; background: var(--accent2); opacity: .28; }
  #near .blob { width: 60px; height: 60px; background: var(--ink); filter: blur(14px); opacity: .25; }
  .vignette { position: absolute; inset: 0; background: radial-gradient(75% 75% at 50% 50%, transparent 55%, rgb(0 0 0 / .55)); }
  .grain { position: absolute; inset: -50%; opacity: .07; mix-blend-mode: overlay; animation: grain .5s steps(5) infinite;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
  @keyframes grain { 0% { translate: 0 0 } 20% { translate: -5% 3% } 40% { translate: 4% -6% } 60% { translate: -3% 5% } 80% { translate: 6% 2% } }
  #stage { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 70px; }
  .markwrap { position: relative; }
  .mark, .ghost { width: 260px; height: 260px; border-radius: 34%; background: linear-gradient(140deg, var(--accent2), var(--accent)); }
  .mark { position: relative; overflow: hidden; box-shadow: 0 30px 60px -20px rgb(0 0 0 / .7), 0 0 0 1px rgb(255 255 255 / .12) inset; }
  .ghost { position: absolute; left: 0; top: 0; opacity: 0; }                                  /* trail copies */
  .floor { position: absolute; left: 10%; right: 10%; bottom: -60px; height: 40px; border-radius: 50%; background: rgb(0 0 0 / .8); filter: blur(18px); }
  .title { position: relative; font-size: 230px; font-weight: 700; letter-spacing: -.05em; line-height: 1; }
  .title .txt { color: color-mix(in oklab, var(--ink) 62%, var(--accent)); }                  /* mid-tone so the sheen shows */
  .title .bloom { position: absolute; inset: 0; color: var(--accent2); filter: blur(28px); opacity: 0; }
  .title .sheen { position: absolute; inset: 0; color: transparent;     /* clip after the shorthand, or it resets */
    background: linear-gradient(105deg, transparent 44%, #fff 50%, transparent 56%) 100% 0 / 300% 100%; -webkit-background-clip: text; background-clip: text; }
  .mark .sheen { position: absolute; inset: 0; background: linear-gradient(105deg, transparent 40%, rgb(255 255 255 / .6) 50%, transparent 60%) 100% 0 / 300% 100%; }
</style></head><body>
<section class="scene" data-duration="5">
  <div class="layer" id="far"><div class="blob b1"></div><div class="blob b2"></div></div>
  <div id="stage" data-camera="push 1.08">
    <div class="markwrap"><div class="floor"></div><div class="ghost"></div><div class="ghost"></div><div class="ghost"></div>
      <div class="mark"><div class="sheen"></div></div></div>
    <div class="title"><span class="bloom" aria-hidden="true">Lumen</span><span class="txt" data-split="chars">Lumen</span><span class="sheen" aria-hidden="true">Lumen</span></div>
  </div>
  <div class="layer" id="near"><div class="blob" style="left:12%;top:20%"></div><div class="blob" style="left:78%;top:30%;scale:1.6"></div>
    <div class="blob" style="left:30%;top:78%;scale:2.2"></div><div class="blob" style="left:66%;top:72%"></div></div>
  <div class="vignette"></div><div class="grain"></div>
</section>
<script>
gm.timeline('.scene')
  .to('#far .b1', { x: 260, y: 120, duration: 5, ease: 'sine.inOut' }, 0)        // far: slow drift
  .to('#far .b2', { x: -220, y: -90, duration: 5, ease: 'sine.inOut' }, 0)
  .to('#near', { x: -240, duration: 5, ease: 'none' }, 0)                         // near: faster, other way
  // fast drop from frame 0: smeared while fast, squash on landing, trails 40 ms apart, shadow tightens
  .fromTo('.mark', { y: -520, scaleY: 1.25, scaleX: 0.9, filter: 'blur(8px)' },
                   { y: 0, scaleY: 1, scaleX: 1, filter: 'blur(0px)', duration: 0.45, ease: 'in-quad' }, 0)
  .to('.mark', { keyframes: [{ scaleY: 0.88, scaleX: 1.08, duration: 0.08 }, { scaleY: 1, scaleX: 1, duration: 0.35, ease: 'out-back' }] }, 0.45)
  .fromTo('.floor', { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'in-quad' }, 0)
  .fromTo('.ghost', { y: -520, opacity: 0.35 }, { y: 0, opacity: 0, duration: 0.45, ease: 'in-quad', stagger: 0.04 }, 0)
  .from('.title .gm-char', { y: 90, opacity: 0, filter: 'blur(14px)', stagger: 0.035, duration: 0.7, ease: 'expo.out' }, 0.3)
  // bloom flashes as the word lands, settles, then breathes
  .fromTo('.title .bloom', { opacity: 0 }, { keyframes: [{ opacity: 1, duration: 0.25 }, { opacity: 0.45, duration: 1.2, ease: 'out-quad' }] }, 1.0)
  .to('.title .bloom', { opacity: 0.7, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 2.6)
  // one light passes over the mark, then the word
  .fromTo('.mark .sheen', { backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', duration: 0.9, ease: 'in-out-sine' }, 2.2)
  .fromTo('.title .sheen', { backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', duration: 1.2, ease: 'in-out-sine' }, 2.35);
</script></body></html>
```

## Make it yours
- **Calm / corporate:** far blobs only (opacity 0.25), no trails or smear, bloom ≤ 0.4 without the flash, one slow sweep (1.4 s), grain 0.04.
- **Energetic / punchy:** bloom flash to 1.0 on every hit, 3 trails, smear `blur(12px)`, near dots 5× the far speed.
- **Luxury:** dark bg, gold/white sheen at 120°, sweep 1.6 s, heavy vignette (0.7), grain 0.08, no bounce (`out-quart` landing instead of `out-back`).
- **Playful / light theme:** pastel blobs at 0.5 on a light `--bg`, shadows tinted with the accent instead of black, grain at `multiply` 0.05.

## Variations
- Drifting gradient without blobs: `tl.to('.bg', { backgroundPosition: '100% 50%', duration: 6, ease: 'sine.inOut' }, 0)` on a `background-size: 200% 200%` gradient.
- Directional motion blur (true smear along x): an SVG `<feGaussianBlur stdDeviation="30 0">` filter, set from `gm.onFrame` (see `camera-moves.md`).
- Light rays behind a logo: a `conic-gradient` of thin wedges, `blur(6px)`, `rotate` 20° over the scene, opacity 0.15; keep it off the text.
- Glass card: `background: rgb(255 255 255 / .06); backdrop-filter: blur(24px); border: 1px solid rgb(255 255 255 / .12)` over the far blobs.

## Pitfalls
- **Copies of text trip `check`** (`text-overlap`): mark bloom/sheen/echo copies `aria-hidden="true"`; do not put `data-check="ignore"` on the hero itself, or `check` stops seeing it (`empty-start`).
- **White sheen on white text is invisible;** dim the text or use an accent-tinted sheen.
- **Blobs as visible discs:** under 120 px blur, or opacity > 0.5, they read as shapes. Bigger, softer, dimmer.
- **Glow on everything** flattens again. One bloom per frame, on the hero.
- **Grain that does not move** looks like a dirty screen; too strong (> 0.1) looks like a broken stream.
- Large `filter: blur()` layers are the slowest thing to render; keep them few and static in size (move them, do not animate the blur radius).
