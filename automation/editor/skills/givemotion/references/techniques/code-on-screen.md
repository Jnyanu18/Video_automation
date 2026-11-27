# Code on screen
Use for: code explainers and dev-tool videos: code types into an editor, the key line is singled out, a diagram shows what it does.

## What makes it look premium
- **Big, readable code.** 34 px JetBrains Mono, line-height 1.62, 8–12 lines, in an editor window with a tab bar and dim line numbers (60% of `--mute`). Never shrink the window to fit; let the camera frame it.
- **Typing with a human rhythm, not a constant ticker:** ~90 chars/s with ±45% seeded jitter per char, +50 ms after `( { ;`, +100 ms at each line end, auto-indent appears at once. A 3 px accent caret blinks and rides the last char; it leaves when explaining starts. 10 lines take ~3.5 s.
- **The camera pushes while it types** (`zoom: 1.1` over 3.4 s, `in-out-sine`), so the frame is never still.
- **Single out one line in three layers (0.5 s):** a highlight bar sweeps in from the left (`scaleX` 0→1, `power3.out`, 16% accent + 5 px accent edge), the other lines dim to 28% rippling outward from it (20 ms stagger `from` that line), then the key token turns accent 0.5 s later.
- **Zoom on the characters, not the line box.** `fit: '.ln[data-n="6"] i'` frames the text itself (a block line is full width, so fitting it barely zooms). ~2.5× here: code reads at ~85 px.
- **The diagram is in the same world**, to the right; the camera slides there (1.3 s `in-out-quart`). The timeline axis draws at constant speed (`ease: 'none'`: it is time passing) and each marker pops (`back.out(2.2)`) exactly when the line reaches it.
- **End back on the code line**, with the highlight breathing (opacity 1↔0.5 yoyo): cause and effect, and no frozen end.

## Recipe
```html
<!doctype html>
<html data-width="1920" data-height="1080" data-duration="11">
<head><style>
:root { --bg:#0d1017; --panel:#141923; --line:#232a37; --ink:#e6e9f0; --mute:#6c7689; --accent:#ffb454;
        --kw:#c792ea; --fn:#82aaff; --str:#c3e88d; --num:#f78c6c; --mono:"JetBrains Mono", monospace; }
body { background:radial-gradient(120% 90% at 30% 20%, #18202e, var(--bg)); color:var(--ink); font-family:Inter, sans-serif; }
#world { position:absolute; inset:0; width:2900px; }
#editor { position:absolute; left:160px; top:170px; width:1180px; border-radius:24px; background:var(--panel); border:1px solid var(--line); box-shadow:0 50px 110px #0008; overflow:hidden; }
.tab { height:72px; display:flex; align-items:center; gap:14px; padding:0 30px; border-bottom:1px solid var(--line); font:500 28px var(--mono); color:var(--mute); }
.tab i { width:14px; height:14px; border-radius:50%; background:var(--line); }
pre { position:relative; margin:0; padding:34px 40px 40px 0; font:400 34px/1.62 var(--mono); }
.ln { display:block; position:relative; padding-left:110px; white-space:pre; }
.ln::before { content:attr(data-n); position:absolute; left:0; width:76px; text-align:right; color:var(--mute); opacity:.6; }
.k { color:var(--kw); } .f { color:var(--fn); } .s { color:var(--str); } .n { color:var(--num); }
#hl { position:absolute; top:0; left:0; right:0; height:55px; background:color-mix(in srgb, var(--accent) 16%, transparent); border-left:5px solid var(--accent); transform-origin:left; opacity:0; }
#caret { position:absolute; left:0; top:0; width:3px; height:42px; background:var(--accent); animation:blink 1s steps(1) infinite; }
.code i { font-style:normal; visibility:hidden; } .code i.on { visibility:visible; }
#diagram { position:absolute; left:1560px; top:260px; width:1180px; height:560px; }
#diagram h3 { font:600 44px Inter; margin:0 0 30px; }
#axis { position:absolute; left:0; top:300px; }
.hit { position:absolute; top:268px; width:64px; height:64px; margin-left:-32px; border-radius:50%; background:var(--panel); border:5px solid var(--mute); }
.hit.ok { border-color:var(--str); background:var(--str); }
.gap { position:absolute; top:150px; text-align:center; font:600 34px var(--mono); color:var(--accent); }
.gap::after { content:""; display:block; height:18px; margin-top:10px; border:3px solid var(--accent); border-bottom:0; border-radius:8px 8px 0 0; }
</style></head>
<body>
<section class="scene" data-duration="11">
  <div id="world">
    <div id="editor">
      <div class="tab"><i></i><i></i><i></i>&nbsp;retry.ts</div>
      <pre class="code"><div id="hl"></div><span id="caret"></span><span class="ln" data-n="1"><span class="k">async function</span> <span class="f">retry</span>(fn, tries = <span class="n">4</span>) {</span><span class="ln" data-n="2">  <span class="k">for</span> (<span class="k">let</span> i = <span class="n">0</span>; i &lt; tries; i++) {</span><span class="ln" data-n="3">    <span class="k">try</span> {</span><span class="ln" data-n="4">      <span class="k">return await</span> <span class="f">fn</span>();</span><span class="ln" data-n="5">    } <span class="k">catch</span> {</span><span class="ln" data-n="6">      <span class="k">await</span> <span class="f">sleep</span>(<span class="n">2</span> ** i * <span class="n">250</span>);</span><span class="ln" data-n="7">    }</span><span class="ln" data-n="8">  }</span><span class="ln" data-n="9">  <span class="k">throw new</span> <span class="f">Error</span>(<span class="s">"gave up"</span>);</span><span class="ln" data-n="10">}</span></pre>
    </div>
    <div id="diagram">
      <h3>Each retry waits twice as long</h3>
      <svg id="axis" width="1180" height="20"><path id="axisPath" d="M0 10H1160" stroke="#6c7689" stroke-width="4" stroke-linecap="round"/></svg>
      <div class="gap" style="left:60px;width:150px">250</div><div class="gap" style="left:210px;width:300px">500</div><div class="gap" style="left:510px;width:600px">1000 ms</div>
      <div class="hit" style="left:60px"></div><div class="hit" style="left:210px"></div><div class="hit" style="left:510px"></div><div class="hit ok" style="left:1110px"></div>
    </div>
  </div>
</section>
<script>
// 1. split the code into chars; give each a reveal time with a human rhythm
const chars = [];
for (const ln of document.querySelectorAll('.code .ln')) {
  const walk = (node) => [...node.childNodes].forEach((c) => {
    if (c.nodeType === 3) { const f = document.createDocumentFragment(); for (const ch of c.data) { const i = document.createElement('i'); i.textContent = ch; f.append(i); chars.push(i); } c.replaceWith(f); }
    else walk(c);
  });
  walk(ln); chars.push(null);                                   // null = end of line
}
let t = 0.6; const times = [];                                  // typing starts at 0.6 s
chars.forEach((c, k) => {
  if (!c) { t += 0.1; return; }                                 // breath at each line end
  const indent = c.textContent === ' ' && (!chars[k - 1] || chars[k - 1].dataset.indent);
  if (indent) { c.dataset.indent = 1; times.push(t); return; }  // auto-indent appears at once
  t += (1 / 90) * (0.55 + gm.random('c' + k) * 0.9);           // ~90 chars/s, ±45% jitter
  if ('({;'.includes(c.textContent)) t += 0.05;
  times.push(t);
});
const typed = chars.filter(Boolean);
const caret = document.querySelector('#caret');
gm.onFrame('.scene', (now) => {
  let n = 0; while (n < typed.length && times[n] <= now) n++;
  typed.forEach((c, k) => c.classList.toggle('on', k < n));
  const last = typed[Math.max(0, n - 1)];
  const ln = last.closest('.ln');                               // char offsets are relative to their line
  caret.style.translate = `${ln.offsetLeft + last.offsetLeft + (n ? last.offsetWidth : 0)}px ${ln.offsetTop + 6}px`;
  caret.style.opacity = now > 4.4 ? 0 : 1;                     // caret leaves when the explaining starts
});
// 2. choreography
const L = (n) => `.ln[data-n="${n}"]`, line6 = document.querySelector(L(6));
gm.set('#hl', { y: line6.offsetTop });
gm.timeline('.scene')
  .from('#editor', { y: 120, rotateY: 14, rotateX: 8, transformPerspective: 2000, duration: 1.1, ease: 'expo.out' }, 0)
  .from('#editor', { opacity: 0.3, duration: 0.4 }, 0)
  .fromTo('#hl', { opacity: 1, scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power3.out' }, 4.5)
  .to('.ln:not([data-n="6"])', { opacity: 0.28, duration: 0.5, stagger: { each: 0.02, from: 5 } }, 4.5)
  .to(L(6) + ' .n', { color: '#ffb454', duration: 0.3 }, 5.0)
  .from('#diagram h3', { y: 40, opacity: 0, duration: 0.6 }, 6.5)
  .fromTo('#axisPath', { draw: 0 }, { draw: 1, duration: 1.8, ease: 'none' }, 6.7)        // constant speed: it is time passing
  .from('.hit', { scale: 0, duration: 0.45, ease: 'back.out(2.2)', stagger: (i, el) => 1.8 * el.offsetLeft / 1160 }, 6.7)  // each dot pops as the line reaches it
  .from('.gap', { opacity: 0, y: 20, scaleX: 0.4, duration: 0.5, stagger: (i, el) => 1.8 * (el.offsetLeft + el.offsetWidth) / 1160 }, 6.6)
  .fromTo('#hl', { opacity: 1 }, { opacity: 0.5, duration: 0.3, repeat: 3, yoyo: true, ease: 'sine.inOut' }, 9.8);
gm.camera('#world')
  .shot(0,   { fit: '#editor', padding: 110 })
  .shot(0.8, { fit: '#editor', padding: 110, zoom: 1.1, duration: 3.4, ease: 'in-out-sine' })        // slow push while it types
  .shot(4.4, { fit: L(6) + ' i', padding: [240, 200, 240, 260], duration: 1.1 })   // fit the line's characters, not the full-width line box
  .shot(6.1, { fit: '#diagram', padding: 110, duration: 1.3, ease: 'in-out-quart' })
  .shot(9.2, { fit: L(6) + ' i', padding: [240, 200, 240, 260], duration: 1.2 });  // back to the line it explains
</script>
</body></html>
```
Color the code by hand with spans (`.k` keyword, `.f` function, `.s` string, `.n` number); the splitter keeps them.

## Make it yours
- Theme: swap the `:root` tokens. Light editor: `--panel:#fbfbfd; --ink:#1d2330; --kw:#7c3aed; --fn:#2563eb; --str:#15803d; --num:#c2410c`, highlight 12%.
- Calm/tutorial: 45–60 chars/s, line-end pause 0.25 s, camera moves 1.5 s. Energetic/social: 140 chars/s or paste lines in whole (`.from('.ln', { opacity: 0, x: -30, stagger: 0.06 })`), camera 0.6 s, a `whip-left` cut to the diagram.
- Luxury/keynote: no caret, lines fade up one by one, very slow push (`zoom: 1.05` over 5 s).

## Variations
- Code that changes: type a new value into a token with `.to('#val', { text: '500', duration: 0.3, ease: 'none' }, t)` after a 0.15 s red flash on the old one.
- Several lines in turn: move the bar `.to('#hl', { y: line9.offsetTop, duration: 0.5, ease: 'power3.inOut' }, t)` and re-dim; camera `fit` the next line's `i`.
- Arrow from a note to a token: `gm.connect` with `sketch: true` (`references/diagrams.md`).
- Quick version without the splitter: `npx givemotion add code-window` (`typing`, `highlight`, `focus`, `.gm-line[data-line]`); less control over rhythm.

## Pitfalls
- Char offsets are relative to their line (`.ln` is `position: relative`): add `ln.offsetLeft/offsetTop` when placing the caret.
- An absolute bar inside `pre` without `top: 0` starts below the padding, so `y: line.offsetTop` lands half a line low.
- Typing that runs into the explaining: count chars ÷ rate + line pauses and finish ≥ 0.3 s before the highlight.
- A final wide shot of code + diagram makes the code ~19 px (`tiny-text`). End close on the code instead.
- Hide not-yet-typed chars with `visibility`, not `display`, so lines keep their width and the camera fit does not change.
