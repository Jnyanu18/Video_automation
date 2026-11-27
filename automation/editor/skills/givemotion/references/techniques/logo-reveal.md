# Logo reveal / brand sting
Use for: intros, outros and stings (3–6 s) where a logo (SVG or IMG asset) assembles, lands on a hit and locks up with a wordmark and tagline.

## What makes it look premium
- **Frame 0 already moves.** Pieces (shards, strokes, dots) are on screen and travelling from frame 0 on curved paths (`arc: 0.3`), decelerating into a formation by ~0.9 s (`power3.out`, 35 ms stagger). Never an empty opening.
- **One hit, everything at once (±40 ms).** At ~1.0 s the logo lands: scale 0.4→1 with `back.out(2.2)` (≈8% overshoot), rotate -25°→0, `blur(14px) brightness(2.2)`→clean in 0.75 s. Same instant: a ring scales 0.5→2.3 while fading (0.8 s `out-cubic`), sparks behind the mark, a 0.35 s radial flash, camera shake 12 px for 0.4 s.
- **The build pieces do not just vanish:** on the hit they fire outward as thin rays (`scaleX` 1→0.15, out-expo 0.55 s). Follow-through sells the impact.
- **Light sweep cut to the logo's shape:** a white gradient bar moving across a layer masked with the logo file itself (`mask: url(logo.svg)`). 0.7 s `in-out-sine` right after the hit, a slower 1.1 s one in the end hold.
- **Wordmark after the mark, not with it** (+0.6 s): chars rise from a mask (35 ms stagger, `expo.out` 0.55 s) while tracking tightens .32em→.04em over 1.4 s. The tightening keeps moving after the letters land.
- **Tagline last and calm:** +0.7 s after the wordmark, 24 px rise + 6 px unblur, ≥ 48 px size.
- **The end hold still lives:** camera `push 1.06` over the whole sting, a breathing glow behind (sine, ±25% opacity), the second sweep at ~3.3 s.

## Recipe
```html
<!doctype html>
<html data-width="1920" data-height="1080" data-fps="30" data-duration="4.5">
<head><style>
  :root { --bg: #0b0d18; --ink: #f2f4fa; --muted: #a3abc2; --accent: #6f7dff; --accent-2: #7cf3d9; --font: "Space Grotesk", Inter, sans-serif; }
  body { background: var(--bg); color: var(--ink); font-family: var(--font); }
  .glow-bg { position: absolute; inset: -20%; background: radial-gradient(40% 40% at 50% 46%, color-mix(in oklab, var(--accent) 35%, transparent), transparent 70%); }
  .stage { position: absolute; inset: 0; display: grid; place-items: center; }
  .lockup { display: grid; justify-items: center; gap: 28px; }
  .mark { position: relative; width: 360px; height: 360px; }
  .mark img { width: 100%; height: 100%; display: block; filter: drop-shadow(0 0 40px color-mix(in oklab, var(--accent) 70%, transparent)); }
  .sheen { position: absolute; inset: 0; overflow: hidden; -webkit-mask: url(logo.svg) center / contain no-repeat; mask: url(logo.svg) center / contain no-repeat; }
  .sheen i { position: absolute; top: -20%; bottom: -20%; left: -60%; width: 45%; rotate: 20deg; background: linear-gradient(90deg, transparent, rgb(255 255 255 / .8), transparent); }
  .ring { position: absolute; left: 50%; top: 50%; width: 420px; height: 420px; margin: -210px; border: 3px solid var(--accent-2); border-radius: 50%; opacity: 0; }
  .shard { position: absolute; left: 50%; top: 50%; width: 120px; height: 14px; margin: -7px -60px; border-radius: 7px; background: linear-gradient(90deg, var(--accent-2), var(--accent)); }
  .flash { position: absolute; inset: 0; opacity: 0; background: radial-gradient(35% 45% at 50% 40%, var(--ink), transparent); mix-blend-mode: soft-light; }
  .word { font-size: 168px; font-weight: 700; line-height: 1; margin: 0; overflow: hidden; padding: 0 .1em;
          letter-spacing: .32em; text-indent: .32em; /* indent = tracking keeps it centred while it tightens */ }
  .tag { font-size: 56px; color: var(--muted); margin: 0; font-weight: 400; }
</style></head>
<body>
<section class="scene" id="sting" data-duration="4.5">
  <div class="glow-bg"></div>
  <div class="stage" data-camera="push 1.06, shake 12 1.05-1.45">
    <div class="lockup">
      <div class="mark" id="mark">
        <div class="ring"></div>
        <i class="shard"></i><i class="shard"></i><i class="shard"></i><i class="shard"></i><i class="shard"></i><i class="shard"></i>
        <img id="logo" src="logo.svg" alt="">
        <div class="sheen"><i></i></div>
      </div>
      <h1 class="word" id="word" data-split="chars">NORTHWIND</h1>
      <p class="tag" id="tag">Built to move.</p>
    </div>
  </div>
  <div class="flash"></div>
</section>
<script>
const tl = gm.timeline('#sting');
document.querySelectorAll('.shard').forEach((s, i) => {          // 0–0.9 s: fly in on arcs, lock into a ring
  const a = i * 60 * Math.PI / 180, r = 230;
  tl.fromTo(s, { x: Math.cos(a + 0.6) * 860, y: Math.sin(a + 0.6) * 560, rotate: i * 60 + 160, scaleX: 2 },
               { x: Math.cos(a) * r, y: Math.sin(a) * r, rotate: i * 60, scaleX: 1, duration: 0.9, ease: 'power3.out', arc: 0.3 }, i * 0.035)
    .to(s, { x: Math.cos(a) * 640, y: Math.sin(a) * 640, scaleX: 0.15, opacity: 0, duration: 0.55, ease: 'out-expo' }, 1.0); // fire out as rays
});
tl.fromTo('#logo', { scale: 0.4, rotate: -25, opacity: 0, filter: 'blur(14px) brightness(2.2)' },      // 1.0 s: the hit
                   { scale: 1, rotate: 0, opacity: 1, filter: 'blur(0px) brightness(1)', duration: 0.75, ease: 'back.out(2.2)' }, 0.98)
  .fromTo('.ring', { scale: 0.5, opacity: 0.9 }, { scale: 2.3, opacity: 0, duration: 0.8, ease: 'out-cubic' }, 1.02)
  .fromTo('.flash', { opacity: 0.8 }, { opacity: 0, duration: 0.35, ease: 'out-quad' }, 1.02)
  .fromTo('.sheen i', { x: 0 }, { x: 620, duration: 0.7, ease: 'in-out-sine' }, 1.45)                  // sweep
  .fromTo('.sheen i', { x: 0 }, { x: 620, duration: 1.1, ease: 'in-out-sine' }, 3.3)                   // slower sweep in the hold
  .from('#word .gm-char', { yPercent: 110, opacity: 0, stagger: 0.035, duration: 0.55, ease: 'expo.out' }, 1.6)
  .to('#word', { letterSpacing: '0.04em', textIndent: '0.04em', duration: 1.4, ease: 'expo.out' }, 1.6)
  .from('#tag', { y: 24, opacity: 0, filter: 'blur(6px)', duration: 0.6, ease: 'out-quart' }, 2.3);
gm.burst('#sting', { at: 1.02, kind: 'sparks', from: '#mark', behind: '#mark', count: 60, colors: ['#7cf3d9', '#6f7dff', '#ffffff'] });
const glow = document.querySelector('.glow-bg');                 // breathing glow + a bump on the hit
gm.onFrame('#sting', t => { glow.style.opacity = 0.75 + 0.25 * Math.sin(t * 2.2) + (t > 1 && t < 1.6 ? 1.6 - t : 0); });
</script>
</body></html>
```
Swap `logo.svg` (both the `<img>` and the two `mask` URLs) for the brand file; a PNG with transparency works too.

## Make it yours
- **Calm / corporate:** no shake, no flash, ring opacity 0.4; logo ease `out-quart` 0.9 s (no overshoot), scale 0.85→1; shards → 2–3 thin lines that draw on; one sweep only.
- **Energetic / punchy:** hit at 0.6 s, `back.out(3)`, shake 16 px, `count: 100` sparks, add `rotate: 360` on the ring, chars `stagger: 0.02`.
- **Luxury:** dark bg, gold `--accent`, 1.5× every duration, tracking ends at .12em (wide), no sparks, a long 1.6 s sweep, blur 20 px→0 instead of scale.
- **Playful:** logo `elastic.out(1, 0.4)`, shards become colored dots (`border-radius: 50%`, 28 px), confetti instead of sparks.

## Variations
- Logo drawn as strokes: inline the SVG and use `tl.fromTo('#logo path', { draw: 0 }, { draw: 1, duration: 1.2, stagger: 0.1 }, 0)`, then fade the fills in at the hit.
- Shapes morph into the mark: `tl.to('#blob', { morph: '#logoPath', duration: 0.9 }, 0.2)` (`references/diagrams.md`).
- Iris reveal: `tl.fromTo('#mark', { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 0.6, ease: 'expo.out' }, 1)`.
- Mark slides left to make room: lock the mark centred at the hit, then `tl.to('#mark', { x: -380 }, 1.8)` and mask the wordmark in from behind it (`.from('#word', { xPercent: -30, clipPath: 'inset(0 100% 0 0)' }, 1.9)`).

## Pitfalls
- `check` notes `straight-move` on `.sheen i`: expected, a light sweep is meant to be straight.
- Mask URL must match the logo file, or the sweep shows as a white bar over the whole box.
- Hit layers more than ~80 ms apart read as sloppy, not as one impact. Keep ring, flash, burst and shake within ±40 ms of the logo's start.
- Wordmark off-centre while tightening: tracking adds space after the last letter; tween `textIndent` with `letterSpacing` (as above).
- Taglines under 48 px read as noise in a sting; keep the lockup about 40–60% of the frame height.
- Flash too strong (full-frame white) looks cheap; keep it radial, `soft-light`, under 0.4 s.
