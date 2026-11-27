# Impacts and energy
Use for: the punch moments: a word or object slams in, a hit lands on a music beat, hard cuts and pulses on the beat, promo/hype/social energy.

## What makes it look premium
- **Fast in, then mass.** A slam is 0.18–0.22 s `power4.in` (accelerating into the hit, stretched 125% along the travel), then squash 86%/108% for 0.07 s and an `elastic.out(1.1, 0.35)` settle of ~0.5 s. The speed contrast is the punch; an ease-out slam looks soft.
- **Everything fires on the same frame (±1 frame):** squash + camera shake (18–24 px, 0.4–0.45 s, dies away) + flash (overlay 0.7→0 in 0.15 s) + ring (0.3→2.4 scale while fading, 0.6 s `out-cubic`) + sparks (70, speed 1900, upward 160° fan) + speed lines. Scale all of them down for smaller hits.
- **Squash and stretch on objects:** stretch 118/88% while falling (`power2.in`, gravity), squash 140/60% on contact with `transform-origin: bottom`, stretch again on the rebound (`power2.out` up, `power2.in` down), smaller squash on the second landing. A contact shadow grows and darkens as the object nears the floor.
- **Hierarchy of hits:** small hit (bounce) = shake 6 px + dust; big hit (slam) = the whole stack; cut hit = zoom punch 135%→100% (0.3 s `expo.out`) + unblur 10 px + 35% flash + rays.
- **On the beat:** set `<html data-bpm>` and time every hit with `gm.beat(n)` (120 bpm: a beat every 0.5 s). Hits on the strong beats (4, 8), cuts every 2–4 beats, `data-pulse` (6% scale, 0.2 s decay) and a `--beat` glow on the in-between beats.
- **Speed lines** are 16 thin gradient streaks around the center: `x` 200→900, `scaleX` 0.3→1, fading in 0.45 s `expo.out`, 8 ms random stagger. Behind the type, never over it.
- **Ambient:** a slow `data-camera="push 1.08"` under the shakes, and the beat glow keeps the hold alive.

## Recipe
```html
<!doctype html>
<html data-width="1920" data-height="1080" data-duration="6" data-bpm="120" data-beat-offset="0">
<head><style>
:root { --bg:#120d1f; --ink:#fff7ec; --accent:#ff4d6d; --accent-2:#ffd166; --font:"Bebas Neue", Impact, sans-serif; }
body { background:radial-gradient(80% 70% at 50% 60%, #2a1640, var(--bg)); color:var(--ink); font-family:var(--font); }
.cam { position:absolute; inset:0; }
.floor { position:absolute; left:0; right:0; top:760px; height:4px; background:linear-gradient(90deg, transparent, #fff3, transparent); }
#shadow { position:absolute; left:790px; top:740px; width:220px; height:40px; border-radius:50%; background:radial-gradient(#000a, transparent 70%); }
#ball { position:absolute; left:800px; top:580px; width:180px; height:180px; border-radius:50%; background:radial-gradient(circle at 35% 30%, var(--accent-2), var(--accent)); transform-origin:50% 100%; }
.word { position:absolute; left:0; right:0; top:440px; text-align:center; font-size:340px; line-height:320px; letter-spacing:.01em; transform-origin:50% 100%; }
#hit { color:var(--ink); text-shadow:0 0 60px color-mix(in srgb, var(--accent) 60%, transparent); }
#w2, #w3 { top:380px; color:var(--accent-2); visibility:hidden; }
.ring { position:absolute; left:960px; top:760px; width:600px; height:200px; margin:-100px -300px; border:6px solid var(--accent-2); border-radius:50%; opacity:0; }
.rays { position:absolute; left:960px; top:600px; }
.rays i { position:absolute; left:0; top:-3px; width:560px; height:8px; border-radius:4px; background:linear-gradient(90deg, transparent, var(--ink) 60%, transparent); transform-origin:0 50%; rotate:calc(var(--i) * 22.5deg); opacity:0; }
.flash { position:absolute; inset:0; background:var(--ink); mix-blend-mode:overlay; opacity:0; pointer-events:none; }
.beatglow { position:absolute; inset:0; background:radial-gradient(50% 40% at 50% 60%, var(--accent), transparent 70%); opacity:calc(.08 + var(--beat, 0) * .35); }
</style></head>
<body>
<section class="scene" data-duration="6" data-camera="push 1.08">
  <div class="beatglow" data-pulse="beat 0 0.3"></div>
  <div class="cam" id="cam">
    <div class="floor"></div>
    <div id="shadow"></div><div id="ball"></div>
    <div class="ring" id="ring"></div>
    <div class="rays" id="rays"></div>
    <div class="word" id="hit" data-pulse="beat 0.06 0.2">IMPACT</div>
    <div class="word" id="w2">LOUDER</div>
    <div class="word" id="w3">NOW</div>
  </div>
  <div class="flash" id="flash"></div>
</section>
<script>
const rays = document.querySelector('#rays');
for (let i = 0; i < 16; i++) rays.insertAdjacentHTML('beforeend', `<i style="--i:${i}"></i>`);
const B = gm.beat;                                    // 120 bpm: beat n is at n * 0.5 s
const slam = B(4), cut2 = B(8), cut3 = B(10);         // 2.0 s, 4.0 s, 5.0 s
gm.timeline('.scene')
  // ball: falls with gravity (power2.in), stretches as it speeds up, squashes on the floor, rebounds
  .fromTo('#ball', { y: -480, scaleY: 1 }, { y: 0, scaleY: 1.18, scaleX: 0.88, duration: 0.95, ease: 'power2.in' }, 0.05)
  .to('#ball', { scaleX: 1.4, scaleY: 0.6, duration: 0.07, ease: 'power1.out' }, B(2))              // squash on contact
  .to('#ball', { keyframes: [{ y: -300, scaleX: 0.9, scaleY: 1.12, duration: 0.215, ease: 'power2.out' },
                             { y: 0, scaleX: 1, scaleY: 1, duration: 0.215, ease: 'power2.in' }] }, B(2) + 0.07)   // lands on beat 3
  .to('#ball', { keyframes: [{ scaleX: 1.2, scaleY: 0.8, duration: 0.06 }, { scaleX: 1, scaleY: 1, duration: 0.3, ease: 'elastic.out(1, 0.4)' }] }, B(3))
  // the slam on beat 4: the word drops fast (power4.in, 0.2 s), squashes 14%, springs back
  .fromTo('#hit', { y: -900, scaleY: 1.25, scaleX: 0.9 }, { y: 0, scaleY: 1.25, scaleX: 0.9, duration: 0.2, ease: 'power4.in', immediateRender: true }, slam - 0.2)
  .to('#hit', { keyframes: [{ scaleY: 0.86, scaleX: 1.08, duration: 0.07, ease: 'power2.out' },
                            { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1.1, 0.35)' }] }, slam)
  .to('#ball', { x: 1500, y: -520, rotate: 540, duration: 0.6, ease: 'power3.out' }, slam)            // knocked away
  .fromTo('#shadow', { scale: 0.35, opacity: 0.3 }, { scale: 1, opacity: 1, duration: 0.95, ease: 'power2.in' }, 0.05)  // shadow grows as it nears the floor
  .to('#shadow', { scale: 0.5, opacity: 0.4, duration: 0.215, repeat: 1, yoyo: true, ease: 'power2.out' }, B(2) + 0.07)
  .to('#shadow', { autoAlpha: 0, duration: 0.2 }, slam)
  .fromTo('#ring', { opacity: 1, scale: 0.3 }, { opacity: 0, scale: 2.4, duration: 0.6, ease: 'out-cubic' }, slam)
  .fromTo('#flash', { opacity: 0.7 }, { opacity: 0, duration: 0.15, ease: 'power2.out' }, slam)
  // hard cuts on beats 8 and 10, each with a zoom punch, rays and a smaller flash
  .set('#hit, #ball', { autoAlpha: 0 }, cut2)
  .fromTo('#w2', { autoAlpha: 1, scale: 1.35, filter: 'blur(10px)' }, { scale: 1, filter: 'blur(0px)', duration: 0.3, ease: 'expo.out' }, cut2)
  .set('#w2', { autoAlpha: 0 }, cut3)
  .fromTo('#w3', { autoAlpha: 1, scale: 1.6, rotate: -4 }, { scale: 1, rotate: 0, duration: 0.35, ease: 'back.out(2.5)' }, cut3)
  .to('#w3', { scale: 1.06, duration: 0.25, repeat: 1, yoyo: true, ease: 'sine.inOut' }, B(11))
  .fromTo('#flash', { opacity: 0.35 }, { opacity: 0, duration: 0.15 }, cut2)
  .fromTo('#flash', { opacity: 0.35 }, { opacity: 0, duration: 0.15 }, cut3);
// speed lines: streak outward from the center and thin out (0.45 s), on the slam and each cut
for (const t of [slam, cut2, cut3])
  gm.timeline('.scene').fromTo('#rays i', { x: 200, scaleX: 0.3, opacity: 1 }, { x: 900, scaleX: 1, opacity: 0, duration: 0.45, ease: 'expo.out', stagger: { each: 0.008, from: 'random' } }, t);
gm.burst('.scene', { at: B(2), kind: 'dust', x: 890, y: 760, count: 30, spread: 140, colors: ['#ffffff', '#ffd166'], behind: '#ball' });
gm.burst('.scene', { at: slam, kind: 'sparks', x: 960, y: 740, count: 70, speed: 1900, spread: 160, angle: -90, colors: ['#ffd166', '#ff4d6d', '#ffffff'], behind: '#hit' });
gm.camera('#cam').shake(B(2), { amount: 6, duration: 0.2 }).shake(slam, { amount: 22, duration: 0.45 }).shake(cut3, { amount: 10, duration: 0.25 });
</script>
</body></html>
```
No music file is needed for timing; add `<audio src="music.mp3">` and copy the `data-bpm data-beat-offset` that `npx givemotion audio music.mp3` prints.

## Make it yours
- Calm/corporate: no shake or 4–6 px, no flash, `back.out(1.4)` instead of elastic, ring only, cuts every 4 beats with `push-left` instead of hard cuts.
- Energetic/hype: shake 24–30 px, a flash on every cut, cuts every 2 beats, rays + sparks each cut, `data-camera="handheld 6"` on the scene.
- Playful: bigger squash (150/55%), `elastic.out(1, 0.3)`, confetti instead of sparks. Luxury: one hit only, slow 0.8 s settle, a thin ring and a soft glow, no particles.
- Colors: the `:root` tokens; pass the same colors to `gm.burst` (`colors: [...]`), which does not read CSS variables.

## Variations
- Anticipation before a throw: `.to('#obj', { y: 30, scaleY: 0.85, duration: 0.15, ease: 'power2.in' }, t - 0.15)` then the move.
- Shake by attribute instead of a camera: `data-camera="push 1.08, shake 20 2.0-2.45"` on the scene.
- Pulse anything on the beat: `data-pulse="beat 0 0.3"` + `opacity: calc(.08 + var(--beat, 0) * .35)` (no scale, only the variable).
- React to the real track: `const m = gm.audio('#music'); gm.onFrame((t) => el.style.scale = 1 + m.bass(t) * 0.1);`

## Pitfalls
- A `to()` at the hit time changes nothing before it: an element that must wait off-screen needs `fromTo(..., { immediateRender: true })` or CSS `visibility: hidden` + `fromTo({ autoAlpha: 1 })`.
- Hits slightly off the beat feel wrong: compute every time from `gm.beat(n)`; a move that should land on a beat starts at `beat - duration`.
- Flash too long or too strong reads as a glitch: ≤ 0.15 s and ≤ 0.7 on the big hit, ~0.35 on cuts.
- Particles over the headline were marked down: start sparks below the word with `behind`, keep `count` ≤ 80, and let them die within ~0.6 s.
- A knocked-away object that stops at the frame edge stays half visible: send it fully out (x ≥ 1500 here) or fade it.
- Bounce timing: keyframes durations must add up so the landing falls on the beat (0.07 squash + 2 × 0.215 = 0.5 s).
