# Paths and maps
Use for: journeys, routes, deliveries, travel, timelines along a road, "from A to B" stories, any line that draws while something rides it.

## What makes it look premium
- **Many riders: `gm.path.stream`.** A flow of items along a route (packets, coins, cars) is one call with a rate and a trip time, not a hand-built particle loop (`references/camera.md`, Moving along a path).
- **The line is drawn by the rider.** One `gm.path.travel` drives everything; the solid line is `strokeDasharray = trip.progress(t) + ' 2'` on a `pathLength="1"` path, so the line tip is always exactly under the rider. Ahead of it, the same path as a faint dotted "plan" (`stroke-dasharray="1 24"`, round caps, 60% opacity).
- **Stops with ease and holds.** `stops: [[0.4, 0], [3.0, 0.45], [3.7, 0.45], [6.2, 1]]` with `in-out-sine`: it gathers speed, slows into each stop, rests 0.5-0.8 s, leaves again. Never constant speed.
- **Bank into curves.** Roll the rider by how fast its heading changes (`rotateX` up to 45 deg for a top-down plane, `rotate` 6-12 deg for a car or a person), and scale it 0.7 to 1 for take-off / landing with the shadow offset growing with altitude (6 to 22 px).
- **Pins drop with weight.** From 160 px above, 0.55 s `bounce.out`; a blurred ground shadow grows 0.2 to 1 at the same time; the name follows 0.3 s later (0.45 s `out-quart`). Drop the pin ~0.25 s before the rider arrives so it lands as the rider does.
- **Camera follows with lag and lead.** `follow` at zoom 1.2-1.3, `lag: 0.25`, `offset: [180, 0]` (room ahead of a rider going right). Start the pull-back while the rider is still slowing (no dead stop), 1.6-2 s `in-out-cubic`, fit the route, pins and names.
- **Labels survive the pull-back.** Scale names and pins 1.5-1.7 during the pull-back (transform-origin on the side away from the pin), on a dark pill (alpha 0.88) so the route never runs through letters.
- **The world is bigger than the frame** (3200x1800 here): two-tone land blobs, a faint dot grid on the sea, a radial glow behind; the camera move makes it all drift.

## Recipe
```html
<html data-width="1920" data-height="1080" data-duration="8.5">
<style>
  :root { --bg:#0f1b2b; --land:#1d3047; --land-2:#24405e; --ink:#f4f1ea; --route:#ffcf5a; --pin:#ff5a5f; }
  body { background: var(--bg); color: var(--ink); font-family: Inter, sans-serif; }
  .sea { position:absolute; inset:-10%; background: radial-gradient(60% 60% at 40% 45%, #16283d, var(--bg) 70%); }
  #world { position:absolute; left:0; top:0; width:3200px; height:1800px; background: radial-gradient(circle, #ffffff12 2.5px, transparent 3px) 0 0 / 48px 48px; }
  .pin { position:absolute; width:56px; height:76px; margin:-76px 0 0 -28px; transform-origin:50% 100%; filter: drop-shadow(0 8px 10px #0006); }
  .shadow { position:absolute; width:46px; height:14px; margin:-7px 0 0 -23px; border-radius:50%; background:#0007; filter:blur(3px); }
  .city { font-size:48px; font-weight:700; white-space:nowrap; padding:6px 22px; border-radius:40px; background:#0f1b2be0; }
  #plane { position:absolute; width:110px; height:110px; }
  #plane > div, #plane svg { position:absolute; inset:0; }
</style>
<section class="scene" data-duration="8.5">
  <div class="sea"></div>
  <div id="world">
    <svg viewBox="0 0 3200 1800" width="3200" height="1800" style="position:absolute;inset:0">
      <g id="lands"></g>
      <path fill="none" stroke="var(--ink)" stroke-width="7" stroke-dasharray="1 24" stroke-linecap="round" opacity=".6" d="M 420 1250 C 900 650, 1250 1550, 1650 1050 S 2450 380, 2780 720"/>
      <path id="route" fill="none" stroke="var(--route)" stroke-width="10" stroke-linecap="round" pathLength="1" stroke-dasharray="0 2" d="M 420 1250 C 900 650, 1250 1550, 1650 1050 S 2450 380, 2780 720"/>
    </svg>
    <div id="pins"></div>
    <div id="plane"><div class="craft"></div></div>
  </div>
</section>
<script>
  const d = document.querySelector('#route').getAttribute('d'), $ = (s) => document.querySelector(s);
  const lands = [[700, 1100, 520], [1500, 1250, 460], [2300, 650, 560], [2850, 1250, 380], [1200, 500, 330]];
  $('#lands').innerHTML = lands.map(([x, y, r], i) => `<path d="${gm.shape.blob(r, { seed: i + 3, wobble: 0.35, cx: x, cy: y })}" fill="var(--land${i % 2 ? '-2' : ''})"/>`).join('');
  const jet = (fill) => `<svg viewBox="-50 -50 100 100"><path fill="${fill}" d="M46 0L10-6-6-44-16-44-6-6-30-4-40-16-46-16-40 0-46 16-40 16-30 4-6 6-16 44-6 44 10 6Z"/></svg>`;
  $('.craft').innerHTML = `<div class="shade" style="opacity:.35;filter:blur(4px)">${jet('#000')}</div><div class="body">${jet('var(--ink)')}</div>`;

  const stops = [[0.4, 0], [3.0, 0.45], [3.7, 0.45], [6.2, 1]];                 // [seconds, progress]; repeat = hold
  const cities = [['Lisbon', 0, 0, 'left 24', '100% 50%'], ['Cairo', 0.45, 2.75, 'bottom 52', '50% 0'], ['Delhi', 1, 5.95, 'top 16', '50% 100%']];
  cities.forEach(([name, p, , side, origin], i) => {
    const { x, y } = gm.path.point(d, p);
    $('#pins').insertAdjacentHTML('beforeend', `<div class="shadow" id="sh${i}" style="left:${x}px;top:${y}px"></div>
      <div class="pin" id="pin${i}" style="left:${x}px;top:${y}px"><svg viewBox="0 0 56 76"><path d="M28 74C28 74 2 44 2 27A26 26 0 0 1 54 27C54 44 28 74 28 74Z" fill="var(--pin)"/><circle cx="28" cy="27" r="10" fill="var(--ink)"/></svg></div>
      <div class="city" id="c${i}" data-anchor="#pin${i} ${side}" style="transform-origin:${origin}">${name}</div>`);
  });

  const trip = gm.path.travel('#plane', '#route', { stops, rotate: true, ease: 'in-out-sine' });
  const air = { alt: 0 };                                                         // 0 on the ground, 1 cruising
  gm.onFrame('#world', (t) => {
    const p = trip.progress(t);
    $('#route').style.strokeDasharray = p + ' 2';                                 // line drawn up to the plane
    const a0 = gm.path.point(d, Math.max(0, p - 0.01)).angle, a1 = gm.path.point(d, Math.min(1, p + 0.01)).angle;
    const roll = gm.clamp((((a1 - a0 + 540) % 360) - 180) * 2.2, -45, 45);       // bank into the turn
    $('.body').style.transform = `perspective(500px) rotateX(${roll}deg)`;
    $('.shade').style.transform = `translate(${6 + 16 * air.alt}px, ${8 + 22 * air.alt}px) perspective(500px) rotateX(${roll}deg)`;
    $('.craft').style.scale = 0.7 + 0.3 * air.alt;
  });

  const tl = gm.timeline('#world')
    .to(air, { alt: 1, duration: 0.9, ease: 'in-out-sine' }, 0.4).to(air, { alt: 0, duration: 0.7, ease: 'in-out-sine' }, 2.4)
    .to(air, { alt: 1, duration: 0.9, ease: 'in-out-sine' }, 3.7).to(air, { alt: 0, duration: 0.8, ease: 'in-out-sine' }, 5.5);
  cities.forEach(([, , at], i) => tl
    .fromTo(`#pin${i}`, { y: -160, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'bounce.out' }, at)
    .fromTo(`#sh${i}`, { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: 'out-quad' }, at)
    .fromTo(`#c${i}`, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'out-quart' }, at + 0.3));
  tl.to(['.city', '.pin'], { scale: 1.6, duration: 1.6, ease: 'in-out-cubic' }, 6.1);   // still readable when small

  gm.camera('#world')
    .shot(0, { follow: '#plane', zoom: 1.25, lag: 0.25, offset: [180, 0] })
    .shot(6.0, { fit: ['#route', '.pin', '.city'], padding: 120, duration: 1.8, ease: 'in-out-cubic' });  // reveal the route
</script>
```

## Make it yours
- **Calm / corporate:** no banking, `ease: 'in-out-cubic'`, pins `back.out(1.4)` instead of bounce, zoom 1.1, longer holds (1 s).
- **Energetic:** shorter legs (1.2-1.6 s), zoom 1.5, `lag: 0.15`, a `gm.burst` of sparks `from: '#pin1'` on each landing, a 0.3 s `cam.shake` of 8 px.
- **Playful:** a hand-drawn route (`data-sketch` on the path, `references/diagrams.md`), pins with squash on landing (`keyframes: [{ scaleY: 0.8, scaleX: 1.15, duration: 0.08 }, { scaleY: 1, scaleX: 1, duration: 0.2 }]`).
- **Luxury:** thin 4 px gold line, serif names, no pin bounce (0.8 s `out-expo` fade-down), slow follow at zoom 1.1.

## Variations
- **Dashed line that draws on:** keep the dashes and reveal them with a mask path drawn by `draw` (`draw` replaces your own `stroke-dasharray`): `<mask id="m" maskUnits="userSpaceOnUse"><path id="mpath" d="…same d…" stroke="#fff" stroke-width="30" fill="none"/></mask>`, `mask="url(#m)"` on the dashed path, and `tl.fromTo('#mpath', { draw: 0 }, { draw: 1, duration: 3 }, 0.5)`.
- **Car on a road:** same travel, `rotate: true`, a small `rotate` lean instead of `rotateX`, and `data-parallax="1.15"` trees in the world.
- **Route between HTML elements:** `const arrow = gm.connect('#a', '#b', { curve: 0.3, draw: [1, 1.2] })`, then `gm.path.travel('#pkg', arrow, { stops: [[1, 0], [2.2, 1]] })`.
- **Several legs, several vehicles:** one path and one travel per leg; hand the cargo over at the stop (`references/camera.md`, "One thing riding another").

## Pitfalls
- Drawing the line with its own timeline next to the travel: the tip and the rider drift apart on eases. Drive the line from `trip.progress(t)`.
- The rider sits on the pin at a stop and hides it: land small (scale 0.7) and put names on the side away from the arriving and leaving line.
- A pull-back that starts after the rider has stopped dead gives `camera-stop`; start it 0.2 s before the last stop.
- `fit: 'content'` or the whole world in the pull-back makes everything tiny; fit the route, pins and names.
- The camera crossing empty sea: keep legs close (each leg ≤ 1.5 frame widths at the follow zoom).
