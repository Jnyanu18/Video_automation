# Shapes and motion graphics
Use for: flat-shape animation, logo stings, abstract openers, transitions between ideas, explainer visuals built from circles, bars and lines instead of boxes of text.

## What makes it look premium
- **Every big move has three parts: anticipation, action, follow-through.** Before growing, squash 12-15% for 0.15 s (`in-quad`); grow with `back.out(1.6-1.8)` (~8% past); settle. For merges, `back.in(1.5)` pulls the shapes outward first, then they slam in.
- **Squash and stretch on contact.** A falling ball is stretched `scaleY 1.3 / scaleX 0.8` (`in-quad`, 0.5 s), flattens to `1.4 / 0.6` for 0.08 s on impact, then springs back with `elastic.out(1, 0.4)`. Shapes shooting sideways start `scaleX 1.3 / scaleY 0.8` and recover (`elastic.out(1, 0.5)`).
- **Grow by morphing, squash by scaling.** Size changes through `morph: gm.shape.circle(r)` keep `scaleX/scaleY` free for squash, so both layer cleanly. Morph between families (circle, star, rounded square, triangle) with a 30-45 deg turn, 0.6 s `back.out(1.6)`, 80 ms between shapes.
- **Lines draw after the shape lands.** A ring (`stroke-linecap: round`, 8-12 px) draws 0.15-0.25 s after the shape starts, 0.7-0.9 s `out-cubic`, starting at 12 o'clock (`rotate(-90deg)`).
- **Rows slide with offsets.** Alternate rows come from opposite sides, `expo.out` 0.9 s, 40 ms per item and 70 ms per row; on rows coming from the left stagger `from: 'end'` so the leading item goes first and nothing crosses. Then the rows keep drifting 150 px over the scene in alternate directions.
- **Bold flat color, three hues and an ink.** Big hero shape in the strongest color, background pattern at 15-20% opacity, small accents (orbit dots) in ink. No gradients needed; depth comes from layers moving at different speeds.
- **Ambient:** an orbit that turns once every 6 s (`ease: 'none'`), drifting rows, `data-camera="push 1.05"`.

## Recipe
```html
<html data-width="1920" data-height="1080" data-duration="6">
<style>
  :root { --bg:#f3ede2; --ink:#17161a; --a:#ff5a36; --b:#2b4bff; --c:#ffc21a; }
  body { background: var(--bg); }
  svg { position:absolute; inset:0; overflow:visible; }
</style>
<section class="scene" data-duration="6" data-camera="push 1.05">
  <svg viewBox="0 0 1920 1080">
    <g id="rows"></g>
    <g transform="translate(960 540)">                    <!-- position on the parent, animate the children -->
      <circle id="ring" r="330" fill="none" stroke="var(--ink)" stroke-width="10" stroke-linecap="round" style="transform: rotate(-90deg)"/>
      <g id="orbit" style="transform-origin:0 0"><circle cx="400" r="30" fill="var(--ink)"/><circle cx="-400" r="22" fill="var(--a)"/><circle cy="400" r="18" fill="var(--b)"/></g>
      <path id="left" fill="var(--b)" style="opacity:0"/><path id="right" fill="var(--c)" style="opacity:0"/><path id="hero" fill="var(--a)"/>
    </g>
  </svg>
</section>
<script>
  const S = gm.shape, $ = (s) => document.querySelector(s);
  $('#hero').setAttribute('d', S.circle(70));
  $('#left').setAttribute('d', S.circle(150)); $('#right').setAttribute('d', S.circle(150));
  const colors = ['var(--b)', 'var(--c)', 'var(--a)', 'var(--ink)'];
  $('#rows').innerHTML = [0, 1, 2, 3].map((r) => `<g id="row${r}">` + [0, 1, 2, 3, 4, 5].map((c) =>
    `<rect class="pill" x="${c * 360 + (r % 2) * 180 - 200}" y="${110 + r * 270}" width="${220 + ((c + r) % 3) * 60}" height="40" rx="20" fill="${colors[(c + r) % 4]}" opacity=".18"/>`).join('') + '</g>').join('');

  gm.timeline('section')
    // backdrop rows whip in from alternate sides; frame 0 is already moving
    .fromTo('#row0 .pill, #row2 .pill', { x: -2200 }, { x: 0, duration: 0.9, ease: 'expo.out', stagger: { each: 0.04, from: 'end' } }, 0)
    .fromTo('#row1 .pill, #row3 .pill', { x: 2200 }, { x: 0, duration: 0.9, ease: 'expo.out', stagger: 0.04 }, 0.07)
    // 1. fall (stretched), impact (squash), spring back
    .fromTo('#hero', { y: -420, scaleX: 0.8, scaleY: 1.3 }, { y: 0, duration: 0.5, ease: 'in-quad' }, 0)
    .to('#hero', { keyframes: [{ scaleX: 1.4, scaleY: 0.6, duration: 0.08, ease: 'out-quad' }, { scaleX: 1, scaleY: 1, duration: 0.45, ease: 'elastic.out(1, 0.4)' }] }, 0.5)
    // 2. anticipation, then grow with overshoot; the ring draws as it lands
    .to('#hero', { scaleX: 1.12, scaleY: 0.86, duration: 0.16, ease: 'in-quad' }, 1.05)
    .to('#hero', { morph: S.circle(250), scaleX: 1, scaleY: 1, duration: 0.6, ease: 'back.out(1.7)' }, 1.21)
    .fromTo('#ring', { draw: 0 }, { draw: 1, duration: 0.9, ease: 'out-cubic' }, 1.35)
    .fromTo('#orbit', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.4)' }, 1.4)
    // 3. split: shrink while two copies shoot out, stretched along the move
    .to('#hero', { morph: S.circle(150), duration: 0.5, ease: 'out-quart' }, 2.1)
    .to('#ring', { scale: 0.6, opacity: 0, duration: 0.4, ease: 'in-cubic' }, 2.1)
    .fromTo('#left', { x: 0, autoAlpha: 1 }, { x: -440, duration: 0.6, ease: 'back.out(1.5)' }, 2.1)
    .fromTo('#right', { x: 0, autoAlpha: 1 }, { x: 440, duration: 0.6, ease: 'back.out(1.5)' }, 2.1)
    .fromTo(['#left', '#right'], { scaleX: 1.3, scaleY: 0.8 }, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' }, 2.2)
    // 4. morph into three families, 80 ms apart, each with a turn
    .to('#left', { morph: S.rect(260, 260, { r: 48 }), rotate: 45, duration: 0.6, ease: 'back.out(1.6)' }, 3.0)
    .to('#hero', { morph: S.star(5, 180, 80), rotate: 36, duration: 0.6, ease: 'back.out(1.6)' }, 3.08)
    .to('#right', { morph: S.polygon(3, 170), rotate: -30, duration: 0.6, ease: 'back.out(1.6)' }, 3.16)
    // 5. merge: back.in pulls out first, then they slam in; the hero takes the hit and wobbles
    .to(['#left', '#right'], { x: 0, rotate: 0, morph: S.circle(150), duration: 0.5, ease: 'back.in(1.6)' }, 4.1)
    .to('#hero', { morph: S.circle(150), rotate: 0, duration: 0.5, ease: 'in-out-cubic' }, 4.1)
    .set(['#left', '#right'], { autoAlpha: 0 }, 4.6)
    .to('#hero', { keyframes: [{ morph: S.circle(290), scaleX: 1.15, scaleY: 0.9, duration: 0.12, ease: 'out-quad' },
                               { morph: S.circle(250), scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)' }] }, 4.6)
    .fromTo('#ring', { draw: 0, scale: 1, opacity: 1 }, { draw: 1, duration: 0.7, ease: 'out-cubic', immediateRender: false }, 4.65);

  gm.to('#orbit', { rotate: 360, duration: 6, ease: 'none', repeat: -1 });                                // ambient
  [0, 1, 2, 3].forEach((r) => gm.to(`#row${r}`, { x: r % 2 ? -160 : 160, duration: 6, ease: 'none' }));
</script>
```

## Make it yours
- **Calm / corporate:** drop squash and elastic; grow with `out-expo` 0.8 s, morph with `in-out-cubic`, rows 120 ms apart, muted palette, one accent.
- **Energetic / punchy:** halve every duration, `back.out(2.2)`, add `gm.burst('section', { at: 4.6, kind: 'sparks' })` and `data-camera="shake 12 4.6-4.9"` on the merge; cut on the beat.
- **Playful:** more squash (`1.5 / 0.55`), `bouncy` springs, a wobbling `gm.shape.blob` instead of the circle (`gm.onFrame(t => hero.setAttribute('d', S.blob(250, { t })))`).
- **Luxury:** one shape, thin 2-4 px rings, slow 1.2-1.6 s `in-out-sine` moves, no overshoot, dark background with a single metallic color.

## Variations
- **Carry the shape into the next scene:** put `data-morph="dot"` on the final circle (wrapped in a div) and the same name on a shape in the next scene, `data-transition="morph"`.
- **Circle wipe to the next scene:** `.to('#hero', { morph: S.circle(1200), duration: 0.6, ease: 'in-expo' })` until it fills the frame, then cut.
- **Lines that draw in a burst:** 8 `<line>`s around a center, `fromTo({ draw: 0 }, { draw: 1, duration: 0.35, stagger: 0.03 })`, then `.to({ draw: '1 1' })` so they retract from the start.
- **Bars as a rhythm:** a row of rounded rects with `scaleY` keyframes `[0.3, 1, 0.5]`, `stagger: { each: 0.05, from: 'center' }`, `repeat: -1`, `yoyo: true`.

## Pitfalls
- **Spawning shapes from nowhere.** New shapes should come out of shapes already on screen: split circles squeeze out of the parent (start at its center and size, stretch as they leave), and when something new is needed (an underline, a bar), pick one of the existing shapes and move/rotate/scale it into that role.
- Shapes waiting at the center show through before their entrance: CSS `opacity: 0` on them and a `fromTo` with `autoAlpha: 1` (shown only when it starts).
- A second `fromTo` on the same element (the ring here) shows its start values from the beginning of the clip and hides the first one: pass `immediateRender: false`.
- `transform="…"` on the animated SVG shape is replaced by the tween: put the position on a parent `<g>`; set `transform-origin: 0 0` on a group that should rotate around the parent's origin.
- Overshoot on everything looks cheap: overshoot the hero, keep backdrop rows on `expo.out`.
- Rows that start just off-frame but are wider than the frame still show at frame 0: start them a full row width away (2200 px here).
