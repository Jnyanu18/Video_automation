# Kinetic typography
Use for: a headline, slogan or manifesto line told as motion: words slamming in, stacking, one emphasis word, the camera moving and tilting through the type, ending on a composed "poster".

## What makes it look premium
- **Each word gets its own move, matched to its meaning.** A slam (scale 1.9→1 + blur 18→0 px, 0.3 s `power4.in`: it accelerates *into* the hit), a punch from the side (x 700→0, skewX -25°→0, 0.35 s `expo.out`), letters that drop and land (y -500, ±14° rotation alternating, 50 ms stagger, `power3.in`). Never the same entrance twice in a row.
- **Impact = squash + shake on the landing frame.** `scaleY 0.9 / scaleX 1.06` for 70 ms, then `back.out(3)` back to 1 in 0.2 s; camera shake 9–14 px for 0.25–0.35 s starting at the same moment.
- **Scale contrast 1.5–2×.** Display caps at 260–300 px against an emphasis word at ~150 px in an italic serif and the accent color. The emphasis word moves softer (chars rise 60%, -12°, 40 ms stagger, `expo.out` 0.5 s) so it reads as a different voice.
- **The camera is part of the type.** Start tight on the first word (fit padding 140), travel to each new line as it lands (0.55–0.6 s `power3.inOut`), and change the tilt with every move (-4° → 3° → -2° → -5°). The final pull-back (1 s `expo.inOut`) reveals the whole stack as one composition.
- **Tight stacking:** line-height 1 with `margin-top: -.16em` between lines; uppercase condensed display face, `nowrap`.
- **Tracking that tightens** on a small kicker (1em → 0.3em over 1.6 s `expo.out`) keeps the poster moving after the big words stop. A rule (bar) draws under it 0.3 s later.
- **Hold alive, exit fast.** A 1.4 s `sine.inOut` push and tilt during the hold; the exit is 0.4 s `in-expo` up + blur, staggered 50 ms from the bottom line.

## Recipe
```html
<!doctype html>
<html data-width="1920" data-height="1080" data-fps="30" data-duration="6">
<head><style>
  :root { --bg: #111014; --ink: #f4efe6; --muted: #a59f95; --accent: #ff5a36;
          --display: "Bebas Neue", Impact, sans-serif; --emph: "Playfair Display", Georgia, serif; }
  body { background: var(--bg); color: var(--ink); }
  .bg { position: absolute; inset: -10%; background: repeating-linear-gradient(-12deg, transparent 0 140px, rgb(255 255 255 / .03) 140px 142px); }
  #world { position: absolute; inset: 0; display: grid; place-items: center; }
  .poster { display: grid; justify-items: center; font-family: var(--display); line-height: 1; text-transform: uppercase; }
  .poster > div { white-space: nowrap; }
  #l2, #l3 { margin-top: -.16em; }   /* tight stack; each line box still holds its glyphs (camera fit needs that) */
  .kicker { font: 600 44px/1 Inter, sans-serif; letter-spacing: 1em; text-indent: 1em; color: var(--muted); margin-bottom: 36px; }
  #l1 { font-size: 260px; }  #l2 { font-size: 260px; display: flex; align-items: baseline; gap: 36px; }
  .em { font: italic 400 150px var(--emph); text-transform: none; color: var(--accent); }
  #l3 { font-size: 300px; color: var(--accent); }
  .bar { width: 520px; height: 14px; background: var(--ink); margin-top: 28px; transform-origin: left; }
  .gm-char, .w { display: inline-block; }
</style></head>
<body>
<section class="scene" id="s" data-duration="6">
  <div class="bg"></div>
  <div id="tilt" style="position:absolute; inset:0"><div id="world">
    <div class="poster" id="poster">
      <div class="kicker" id="kicker">A note on motion</div>
      <div id="l1"><span class="w" id="make">Make</span></div>
      <div id="l2"><span class="em" id="every" data-split="chars">every</span><span class="w" id="frame">Frame</span></div>
      <div id="l3" data-split="chars">Count.</div>
      <div class="bar" id="bar"></div>
    </div>
  </div></div>
</section>
<script>
gm.camera('#world')                     // tight on each line as it lands, then pull back to the poster
  .shot(0,    { fit: '#l1', padding: 140 })
  .shot(0.85, { fit: ['#l1', '#l2'], padding: 60, duration: 0.6, ease: 'power3.inOut' })
  .shot(1.68, { fit: ['#l1', '#l2', '#l3'], padding: 40, duration: 0.55, ease: 'power3.inOut' })
  .shot(3.0,  { fit: '#poster', padding: 110, duration: 1.0, ease: 'expo.inOut' })
  .shot(4.0,  { fit: '#poster', padding: 60, duration: 1.4, ease: 'sine.inOut' })      // slow push in the hold
  .shake(0.12, { amount: 12, duration: 0.3 }).shake(1.3, { amount: 9, duration: 0.25 }).shake(2.25, { amount: 14, duration: 0.35 });
gm.timeline('#s').set('#tilt', { rotate: -4 }, 0)  // tilt on a wrapper, timed with each camera move
  .to('#tilt', { rotate: 3,  duration: 0.6,  ease: 'power3.inOut' }, 0.85)
  .to('#tilt', { rotate: -2, duration: 0.55, ease: 'power3.inOut' }, 1.68)
  .to('#tilt', { rotate: -5, duration: 1.0,  ease: 'expo.inOut' }, 3.0)
  .to('#tilt', { rotate: -3, duration: 1.4,  ease: 'sine.inOut' }, 4.0);
gm.timeline('#s')
  .fromTo('#make', { scale: 1.9, opacity: 0.5, filter: 'blur(18px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.3, ease: 'power4.in' }, 0)
  .to('#make', { keyframes: [{ scaleY: 0.9, scaleX: 1.06, duration: 0.07 }, { scaleY: 1, scaleX: 1, duration: 0.2, ease: 'back.out(3)' }] }, 0.3) // squash
  .from('#every .gm-char', { yPercent: 60, opacity: 0, rotate: -12, stagger: 0.04, duration: 0.5, ease: 'expo.out' }, 0.95)          // soft voice
  .fromTo('#frame', { x: 700, skewX: -25, opacity: 0 }, { x: 0, skewX: 0, opacity: 1, duration: 0.35, ease: 'expo.out', arc: 0 }, 1.18) // punch
  .from('#l3 .gm-char', { y: -500, rotate: i => (i % 2 ? 14 : -14), opacity: 0, stagger: 0.05, duration: 0.3, ease: 'power3.in' }, 1.95)
  .to('#l3', { keyframes: [{ scaleY: 0.92, duration: 0.06 }, { scaleY: 1, duration: 0.25, ease: 'back.out(2.5)' }] }, 2.25)
  .from('#kicker', { opacity: 0, duration: 0.4 }, 3.1)
  .fromTo('#kicker', { letterSpacing: '1em', textIndent: '1em' }, { letterSpacing: '0.3em', textIndent: '0.3em', duration: 1.6, ease: 'expo.out' }, 3.1)
  .from('#bar', { scaleX: 0, duration: 0.7, ease: 'expo.out' }, 3.4)
  .to(['#bar', '#l3', '#l2', '#l1', '#kicker'], { y: -160, opacity: 0, filter: 'blur(10px)', stagger: 0.05, duration: 0.4, ease: 'in-expo' }, 5.4);
</script>
</body></html>
```

## Make it yours
- **Calm / corporate:** sans display (Inter 800, sentence case), no shake, no squash; entrances `expo.out` 0.6 s mask-ups instead of slams; tilt ±1°; shots 0.9 s `in-out-sine`.
- **Energetic / punchy:** a word every 0.3–0.4 s, shots 0.4 s, shake 14–18 px, tilt ±6°, hard cuts between camera framings (`duration: 0.01`) on the beat.
- **Luxury / editorial:** serif display (Playfair 400), wide tracking that tightens on every line (0.6em → 0.08em), no shake, blur 12 px → 0 over 0.9 s, cream on near-black.
- **Playful:** chars `elastic.out(1, 0.5)` with ±20° rotation, a different accent color per line, `drop` bounces on landing.

## Variations
- One line, word by word on the beat: `tl.from('.line .gm-word', { scale: 2.2, opacity: 0, filter: 'blur(14px)', duration: 0.25, ease: 'power4.in', stagger: 0.42 }, 0)` (with `data-split="words"`).
- Outline echo behind the hero word: a copy with `color: transparent; -webkit-text-stroke: 3px var(--accent)` and `data-check="ignore"`, `tl.fromTo('#echo', { scale: 1 }, { scale: 1.35, opacity: 0, duration: 0.6, ease: 'out-cubic' }, 0.3)`.
- Fill the frame with one word: `data-fit="grow"` on a full-width line, then push through it: `.shot(t, { fit: '#word .gm-char:nth-child(2)', zoom: 3, duration: 0.5, ease: 'in-expo' })` into a cut.
- Word swap in place: `tl.to('#verb', { yPercent: -100, opacity: 0, duration: 0.25, ease: 'in-quad' }, 3).from('#verb2', { yPercent: 100, opacity: 0, duration: 0.4, ease: 'expo.out' }, 3.15)`.

## Pitfalls
- Do not put `rotate` on a `fit` shot (it frames off-centre and cuts the word); rotate a wrapper around the world instead, as above.
- `line-height` under 1 makes the glyphs overflow the line box, so the camera fit crops the top of the letters. Keep line-height 1 and tighten with negative `margin-top`.
- A stack taller than the world (1080 px) overflows upward and gets cut in the final pull-back; size the type so the whole poster fits.
- A fit on one line shows half of its neighbour line, and `check` warns `text-offscreen`. Fit neighbours together (`fit: ['#l1', '#l2', '#l3']`) or leave more space between lines.
- `check` notes `camera-stop` between shots that rest ~0.5–0.8 s: expected here, the camera rests while each word lands. `straight-move` on chars that punch in sideways is also fine.
- Frame 0: start the first slam at partial opacity (0.5) so the thumbnail is huge blurred type, not an empty frame.
