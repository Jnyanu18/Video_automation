# Text reveals
Use for: any line of text that must arrive with care: headlines, titles, stats, captions. Mask reveals per word/char, typewriter with caret, scramble, underline/highlight/strike drawn on, number swaps, and the exit.

## What makes it look premium
- **Mask, not fade.** Each word rises out of its own invisible edge: `yPercent` 100→0 while its `clipPath` opens in step (the clip moves opposite to the word, so the edge stays still). 0.9 s `expo.out`, 80 ms stagger, plus a 6° tilt that settles to 0: the tilt is what makes it feel hand-set. Fade each word in over the first fifth of its rise (`opacity` 0→1 in ~0.15 s, from the same start time): otherwise the first frames show crisp slivers of letter tops at the mask line, which read as stray dashes (judges flagged it in all three tools' titles).
- **Lines overlap.** Line 2 starts 0.25 s after line 1 (not after it ends). The whole headline reads in ~1 s.
- **Marks come after the words land** (+0.3–0.5 s), each with its own easing: a hand-drawn underline (SVG path, `draw` 0→1, 0.5 s `in-out-cubic`, like a pen), a marker highlight behind one word (scaleX 0→1 from the left, 0.45 s `in-out-quart`), a strike-through (0.3 s). One mark per beat, never all at once.
- **Value swaps tell a story:** strike the old value, dim it to 45%, then the new value slides in 20 px and counts (720→38, 1.4 s `expo.out`: fast, then it settles). Use `tabular-nums` so digits do not jitter.
- **Texture by kind:** monospace kicker typed at 30 chars/s with a caret that leaves 0.6 s after; a status value scrambles in over 0.9 s. Different reveal per role, same rhythm.
- **Exit shorter and ease-in:** marks retract first (0.25 s), then words leave out the top of their masks (0.4 s `in-expo`, 40 ms stagger from the last word). Small text fades up 30 px.
- **Ambient:** `data-camera="push 1.04"` on the text block keeps the hold alive.

## Recipe
```html
<!doctype html>
<html data-width="1920" data-height="1080" data-fps="30" data-duration="6.5">
<head><style>
  :root { --bg: #f3efe7; --ink: #15161a; --muted: #5d5a55; --accent: #ffcf3f; --accent-2: #e5482f;
          --font: Inter, system-ui, sans-serif; --mono: "JetBrains Mono", monospace; }
  body { background: var(--bg); color: var(--ink); font-family: var(--font); }
  .bg { position: absolute; inset: -10%; background: radial-gradient(50% 60% at 80% 20%, #fff8, transparent 70%); }
  .wrap { position: absolute; left: 180px; right: 180px; top: 190px; }
  .kicker { font: 500 44px var(--mono); color: var(--muted); margin: 0 0 40px; }
  h1 { font-size: 176px; font-weight: 800; letter-spacing: -.035em; line-height: 1.02; margin: 0; }
  h1 .gm-word { display: inline-block; }
  .hl { position: relative; z-index: 0; }   /* marker sits behind the word */
  .hl::before { content: ""; position: absolute; inset: 12% -3% 6%; background: var(--accent); z-index: -1; transform-origin: left; scale: var(--hl, 0) 1; }
  .u { position: relative; }
  .ul { position: absolute; z-index: 1; left: -2%; width: 104%; bottom: -10px; height: 30px; overflow: visible; }  /* above line 2's marker */
  .ul path { fill: none; stroke: var(--accent-2); stroke-width: 9; stroke-linecap: round; }
  .stats { display: grid; grid-template-columns: 760px auto; margin-top: 110px; font-size: 96px; font-weight: 700; }  /* fixed column: the count shrinking must not shift its neighbour */
  .stat small { display: block; font: 500 34px var(--mono); color: var(--muted); margin-bottom: 12px; }
  .old { position: relative; display: inline-block; color: var(--muted); }
  .strike { position: absolute; left: -4%; right: -4%; top: 50%; height: 10px; background: var(--accent-2); transform-origin: left; }
  .new { color: var(--accent-2); font-variant-numeric: tabular-nums; }
</style></head>
<body>
<section class="scene" id="s" data-duration="6.5">
  <div class="bg"></div>
  <div class="wrap" data-camera="push 1.04">
    <p class="kicker" data-type="30" data-type-caret="0.6">// release notes, v4</p>
    <h1><span id="l1" data-split="words"><span class="u">Faster<svg class="ul" viewBox="0 0 600 30" preserveAspectRatio="none"><path id="ul" d="M6 18 C 150 4, 330 30, 594 12"/></svg></span> builds,</span><br>
      <span id="l2" data-split="words"><span class="hl" id="hl">fewer</span> surprises.</span></h1>
    <div class="stats">
      <div class="stat"><small>build time</small><span class="old">12 min<i class="strike" id="strike"></i></span>
        &nbsp;<span class="new"><span id="secs">720</span> s</span></div>
      <div class="stat"><small>cache</small><span id="cache" data-scramble="0.9" data-scramble-delay="3.3">WARM, 98%</span></div>
    </div>
  </div>
</section>
<script>
const MASK_IN = 'inset(-30% -10% 100% -10%)', MASK_OPEN = 'inset(-30% -10% -30% -10%)';  // -30%/-10%: room for ascenders, tilt
gm.timeline('#s')
  .fromTo('#l1 .gm-word', { yPercent: 100, rotate: 6, clipPath: MASK_IN },
                          { yPercent: 0, rotate: 0, clipPath: MASK_OPEN, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0.15)
  .fromTo('#l2 .gm-word', { yPercent: 100, rotate: 6, clipPath: MASK_IN },
                          { yPercent: 0, rotate: 0, clipPath: MASK_OPEN, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0.4)
  .fromTo('#ul', { draw: 0 }, { draw: 1, duration: 0.5, ease: 'in-out-cubic' }, 1.25)              // pen underline
  .to('#hl', { '--hl': 1, duration: 0.45, ease: 'in-out-quart' }, 1.6)                              // marker
  .from('.stat small', { opacity: 0, y: 12, stagger: 0.12, duration: 0.4, ease: 'out-quart' }, 2.0)
  .fromTo('.old', { yPercent: 100, clipPath: MASK_IN }, { yPercent: 0, clipPath: MASK_OPEN, duration: 0.7, ease: 'expo.out' }, 2.1)
  .fromTo('#strike', { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: 'in-out-cubic' }, 2.6)        // strike, then dim
  .to('.old', { opacity: 0.45, duration: 0.3 }, 2.85)
  .from('.new', { opacity: 0, x: -20, duration: 0.4, ease: 'out-quart' }, 2.8)
  .fromTo('#secs', { textContent: 720 }, { textContent: 38, duration: 1.4, ease: 'expo.out' }, 2.8)
  .from('#cache', { opacity: 0, duration: 0.1 }, 3.3)                // hide the scramble until its delay
  .to('#hl', { '--hl': 0, duration: 0.25, ease: 'in-quad' }, 5.45)   // exit: marks retract first
  .to('#ul', { draw: '1 1', duration: 0.25, ease: 'in-quad' }, 5.45)
  .to('.ul', { opacity: 0, duration: 0.1 }, 5.65)
  .to(['.stats', '.kicker'], { opacity: 0, y: -30, duration: 0.35, ease: 'in-quad', stagger: 0.05 }, 5.5)
  .to(['#l2 .gm-word', '#l1 .gm-word'], { yPercent: -100, clipPath: 'inset(100% -10% 0% -10%)', duration: 0.4, ease: 'in-expo', stagger: { each: 0.04, from: 'end' } }, 5.6);
</script>
</body></html>
```

## Make it yours
- **Calm / corporate:** no tilt, 1.0 s `out-quart`, 100 ms stagger, marker only (no underline or strike).
- **Energetic / social:** 0.5 s `expo.out`, 40 ms stagger, per char (`data-split="chars"`, `.gm-char { display: inline-block }`), tilt 12°, marks 0.25 s.
- **Luxury / editorial:** serif, words rise only 40% (`yPercent: 40`) with `filter: blur(8px)`→0, 1.2 s `out-quart`, 120 ms stagger, a thin 2 px rule instead of a marker.
- **Playful:** chars rise with `back.out(2)`, alternating rotate `i => (i % 2 ? 10 : -10)`, a wobbly underline path.

## Variations
- Per char from the side: `data-split="chars"`, `fromTo('.t .gm-char', { xPercent: -100, clipPath: 'inset(-30% -10% -30% 100%)' }, { xPercent: 0, clipPath: 'inset(-30% -10% -30% -10%)', stagger: 0.025, duration: 0.6, ease: 'expo.out' })`.
- Handwriting: `<p data-split="lines" data-enter="write" data-stagger="0.6">` (Caveat font; pen-speed write-on).
- Swap one word in place: `tl.to('#w', { text: 'safer', duration: 0.5 }, 3)` types the new word; or mask the old word out (`yPercent: -100`) and a second word in, 0.15 s apart.
- Blur-in for soft titles: `from('.t .gm-word', { opacity: 0, filter: 'blur(16px)', scale: 1.15, stagger: 0.06, duration: 0.8, ease: 'out-quart' })`.

## Pitfalls
- A clip that does not move with the word (only `yPercent`, no `clipPath`), or `overflow: hidden` on the whole line, cuts tilted words and descenders. Animate `clipPath` together with `yPercent` as above.
- The exit clip end must be `inset(100% … 0% …)`; a negative bottom leaves commas and descenders visible after the word has gone.
- `data-scramble` shows changing random glyphs before its `data-scramble-delay`; hide it with an opacity tween until the delay (as above).
- An underline under line 1 is painted over by a positioned element in line 2 (the marker); give the SVG `z-index: 1`.
- A counter changes width as digits drop (720 → 38) and pushes its neighbours sideways in a flex row; give it a fixed grid column (as above) and `tabular-nums`.
- Fading two lines in place of each other ghosts; mask the old one out before the new one comes in.
