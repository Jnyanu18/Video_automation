# UI / product demo
Use for: showing an app doing one task: a window arrives, the cursor clicks and types, the result appears, the view changes.

## What makes it look premium
- **The window arrives in 3D, not as a fade.** `rotateX 28°, rotateY -16°, y +160, scale 0.86` → flat in 1.3 s `expo.out` with `transformPerspective: 1800`; its contents (bar, input, list) follow 60 ms apart. Big object: long, decelerating, no bounce.
- **Film it like a zoomed screen recording.** `gm.camera` fits the control being used (input + button, padding ~200), pulls back to see the result land, ends on a slow 1.8 s push. UI text is 32–38 px in the layout and ≥ 45 px on screen once zoomed.
- **The cursor aims at real elements** (cursor block, selectors, `!` = click with press + ripple). It travels on a slight arc with in-out easing; leave 0.7–1.5 s between points so it never teleports. Aim inside a field with `@20%,50%`, not its middle.
- **Typing has rhythm.** Word bursts at ~15–18 chars/s with 0.15–0.2 s pauses between words, blinking caret, focus ring (accent border + 6 px soft glow) from the click.
- **Lists reflow, they don't jump.** Lay the new row out in its final place; the old rows start one row up (`from y: -96`) and slide down 0.55 s `power3.out`, 40 ms stagger; the new row drops in 40 px and gets a 22% accent flash that fades over 1.2 s.
- **A tick is three beats in 0.4 s:** box fills and pops to 112% (`back.out(3)` back to 100%), the check stroke draws (0.3 s), the strike-through sweeps (0.35 s), the label dims to 50%.
- **Views cross-slide together:** old view out and new view in by one window width, same 0.7 s `power4.inOut`, 8 px blur while moving, clipped by the window (`overflow: hidden`); the tab indicator slides 0.45 s; new content builds 0.45 s later (bars `scaleY` 0→1, 70 ms stagger).
- **Ambient:** a blurred accent glow drifting behind (`animation: float`), and the camera never fully stops.
- **The app does the work, so the work comes out of the app.** When the app reads an email, opens a web page or fills a form, show that page coming out of the app (from behind its window, out of the message or button that started it) and going back, not sliding in from the frame edge. While the app is driving another page, let that page show it (an accent edge glow, the app's cursor), so the viewer sees who is acting.
- **Fewer, longer camera moves in longer demos.** A 15 s demo can push into every control; in a 60–90 s product video, frame each scene once (or push once) and let the cursor and the UI carry the motion (`references/motion-design.md`, "A camera budget").

## Recipe
Needs `npx givemotion add cursor`. Times are seconds into the scene.
```html
<!doctype html>
<html data-width="1920" data-height="1080" data-duration="9">
<head><style>
:root { --bg:#0e1116; --panel:#171b22; --line:#262c36; --ink:#eef1f6; --mute:#8a93a3; --accent:#6c8cff; }
body { background:var(--bg); color:var(--ink); font-family:Inter, sans-serif; }
.glow { position:absolute; inset:-300px auto auto -200px; width:1100px; height:1100px; border-radius:50%; background:radial-gradient(var(--accent), transparent 65%); opacity:.3; filter:blur(140px); animation:float 9s ease-in-out infinite alternate; }
#world { position:absolute; inset:0; }
#app { position:absolute; left:290px; top:150px; width:1340px; height:780px; border-radius:28px; background:var(--panel); border:1px solid var(--line); box-shadow:0 60px 120px #0009; overflow:hidden; }
.bar { height:84px; display:flex; align-items:center; gap:44px; padding:0 80px; border-bottom:1px solid var(--line); font:600 32px Inter; color:var(--mute); position:relative; }
#ink { position:absolute; bottom:-1px; left:0; height:4px; background:var(--accent); }
.view { position:absolute; inset:84px 0 0; padding:48px 64px; }
.entry { display:flex; gap:20px; font-size:38px; }
#field { flex:1; height:92px; border-radius:18px; border:2px solid var(--line); display:flex; align-items:center; padding:0 28px; white-space:pre; }
#field[data-focus] { border-color:var(--accent); box-shadow:0 0 0 6px #6c8cff38; }
.caret { width:3px; height:44px; background:var(--accent); animation:blink 1s steps(1) infinite; }
#add { padding:22px 40px; border-radius:18px; background:var(--accent); color:#fff; font-weight:700; }
li { position:relative; height:96px; display:flex; align-items:center; gap:28px; font-size:38px; border-bottom:1px solid var(--line); background:var(--panel); list-style:none; }
ul { margin:40px 0 0; padding:0; } .flash { position:absolute; inset:0; background:var(--accent); opacity:0; }
.box { width:44px; height:44px; border-radius:12px; border:3px solid var(--mute); display:grid; place-items:center; }
.box path { fill:none; stroke:#fff; stroke-width:4; stroke-linecap:round; }
.label { position:relative; } .strike { position:absolute; inset:52% -4px auto; height:3px; background:var(--mute); transform-origin:left; }
.bars { display:flex; align-items:flex-end; gap:36px; height:420px; margin-top:40px; } .bars b { flex:1; border-radius:14px 14px 4px 4px; background:var(--accent); }
</style></head>
<body><section class="scene" data-duration="9">
  <div class="glow"></div>
  <div id="world"><div id="app">
    <div class="bar"><span id="tabA" style="color:var(--ink)">Today</span><span id="tabB">Insights</span><span id="ink"></span></div>
    <div class="view" id="viewA">
      <div class="entry"><div id="field"><span class="ph" style="color:var(--mute)">Add a task…</span><span id="w1"></span><span id="w2"></span><span id="w3"></span><span class="caret"></span></div><div id="add">Add</div></div>
      <ul><li id="fresh"><span class="flash"></span><span class="box" id="tick"><svg width="30" viewBox="0 0 30 30"><path d="M6 16l6 6 12-14"/></svg></span><span class="label">Ship the beta<span class="strike"></span></span></li>
        <li class="old"><span class="box"></span>Review pull requests</li><li class="old"><span class="box"></span>Plan the launch call</li><li class="old"><span class="box"></span>Update the roadmap</li></ul>
    </div>
    <div class="view" id="viewB"><h2 style="font-size:56px;margin:0">This week</h2><div class="bars"><b style="height:40%"></b><b style="height:62%"></b><b style="height:48%"></b><b style="height:86%"></b><b style="height:70%"></b></div></div>
  </div>
  <gm-include src="blocks/cursor.html" points="1500,900 #field@20%,50%! #add! #tick! #tabB!" times="1.3 2.0 3.5 5.0 6.4" show="auto" ring="#ffffff"></gm-include></div>
</section>
<script>
const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
const A = document.querySelector('#tabA'), B = document.querySelector('#tabB');
gm.set('#ink', { x: A.offsetLeft, width: A.offsetWidth });
gm.timeline('.scene')
  // window swings in from a 3D tilt: big object, long expo.out, no bounce; its contents follow 60 ms apart
  .from('#app', { rotateX: 28, rotateY: -16, y: 160, scale: 0.86, transformPerspective: 1800, duration: 1.3, ease: 'expo.out' }, 0)
  .from('#app', { opacity: 0.25, duration: 0.4 }, 0)
  .from('#app > *', { opacity: 0, y: 24, stagger: 0.06, duration: 0.5 }, 0.35)
  // click the field (2.0): focus ring, caret; type in word bursts with short pauses (a text tween types from empty: one span per burst)
  .set('#field', { attr: { 'data-focus': '' } }, 2.0).set('.ph', { display: 'none' }, 2.0).fromTo('.caret', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 2.0)
  .to('#w1', { text: 'Ship ', duration: 0.3, ease: 'none' }, 2.25)
  .to('#w2', { text: 'the ', duration: 0.22, ease: 'none' }, 2.7)
  .to('#w3', { text: 'beta', duration: 0.3, ease: 'none' }, 3.0)
  // Add (3.5): field resets; the new row is already in the layout, the old rows start one row up and reflow down
  .set('#w1, #w2, #w3', { text: '' }, 3.6).set('.ph', { display: '' }, 3.6).set('.caret', { autoAlpha: 0 }, 3.6).set('#field', { attr: { 'data-focus': null } }, 3.6)
  .from('.old', { y: -96, stagger: 0.04, duration: 0.55, ease: 'power3.out' }, 3.6)
  .from('#fresh', { opacity: 0, y: -40, scale: 0.96, duration: 0.5 }, 3.65)
  .fromTo('#fresh .flash', { opacity: 0.22 }, { opacity: 0, duration: 1.2, ease: 'power2.out' }, 3.9)
  // tick (5.0): box fills with a 12% pop, check draws, strike sweeps, label dims
  .to('#tick', { backgroundColor: accent, borderColor: accent, scale: 1.12, duration: 0.15 }, 5.05)
  .to('#tick', { scale: 1, duration: 0.35, ease: 'back.out(3)' })
  .fromTo('#tick path', { draw: 0 }, { draw: 1, duration: 0.3, ease: 'power2.out' }, 5.1)
  .fromTo('#fresh .strike', { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: 'power3.inOut' }, 5.25)
  .to('#fresh .label', { opacity: 0.5, duration: 0.3 }, 5.3)
  // tab (6.4): indicator slides; both views travel one window-width together, blurred, clipped by the window
  .to('#ink', { x: B.offsetLeft, width: B.offsetWidth, duration: 0.45, ease: 'power3.inOut' }, 6.45)
  .to('#viewA', { x: -1340, filter: 'blur(8px)', duration: 0.7, ease: 'power4.inOut' }, 6.45)
  .fromTo('#viewB', { x: 1340, filter: 'blur(8px)' }, { x: 0, filter: 'blur(0px)', duration: 0.7, ease: 'power4.inOut', hideBefore: true }, 6.45)
  .from('#viewB .bars b', { scaleY: 0, transformOrigin: 'bottom', stagger: 0.07 }, 6.9);
gm.camera('#world')
  .shot(0,   { fit: '#app', padding: 90 })
  .shot(1.3, { fit: ['#field', '#add'], padding: [220, 160, 220, 160], duration: 0.9 })  // close on the input while typing
  .shot(3.7, { fit: ['.entry', 'ul'], padding: 100, duration: 0.9 })                     // pull back to see the row land
  .shot(5.8, { fit: '#app', padding: 90, duration: 0.9 })
  .shot(7.2, { fit: '#viewB', padding: 60, duration: 1.8, ease: 'in-out-sine' });       // slow push keeps the end alive
</script></body></html>
```

## Make it yours
- Colors: change the `:root` variables only. Light UI: `--bg:#eef0f4; --panel:#fff; --line:#e3e6ec; --ink:#111; --mute:#6b7280`, shadow `0 40px 90px #0002`, ring default (dark).
- Calm/corporate: 3D tilt 12°/-8°, window 1.5 s, camera moves 1.2 s `in-out-sine`, no blur on the view slide. Energetic: tilt 35°, 0.9 s, camera 0.6 s, tick pop 120%, `data-camera="handheld 4"` on a wrapper.
- Playful: `back.out(1.6)` on the new row, `gm.burst(..., { from: '#tick', kind: 'sparks', count: 24 })` on the tick. Luxury: slower everything (×1.4), thinner borders, no flash, longer final push.

## Variations
- Hover before click: `#add[data-gm-hover] { filter: brightness(1.15); }` (the cursor block sets the attribute).
- Skeleton loading before a result: `.from('.row', { opacity: 0, stagger: 0.05 }, t).fromTo('.skel', { opacity: 1 }, { opacity: 0 }, t + 0.6)` with `.skel { animation: shimmer 1s linear infinite }`.
- A result flies into place from the button: `gm.fly('#event', { from: '#add', at: 3.6 })`.
- Phone UI: `npx givemotion add phone`, same timeline inside it; camera `fit` the phone, then `zoom: 1.6` on the control.

## Pitfalls
- A `text` tween always types from empty: typing in bursts into one span re-types the whole word. Use one span per burst, and `white-space: pre` on the field so trailing spaces survive.
- `points` in the cursor block are split on spaces: `#fresh .box!` is two points. Give the target an id.
- `display: inline-block` beats the `hidden` attribute: show/hide a caret with `autoAlpha`, not `hidden`.
- A view parked off-window (`x: 1340`) is clipped visually, but `check` still sees it cut by the frame: `hideBefore: true` keeps it hidden until it moves.
- `ℹ camera-stop` at the first move is expected here (the wide shot rests, then the camera sets off). Fine.
