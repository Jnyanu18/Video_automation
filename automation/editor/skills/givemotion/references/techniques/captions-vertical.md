# Word-by-word captions and vertical clips
Use for: TikTok/Reels/Shorts, voice-over clips, any brief with word-timed captions, a hook title, or "subtitles that pop".

## What makes it look premium
- **Phrases, not sentences.** 1-3 words per caption, broken at pauses > 0.3 s and after `. ! ? ,`. 92 px, weight 850, centered; never more than ~6 words on screen.
- **Each word pops 60 ms before it is spoken** (y 36 → 0, scale 0.7 → 1, 0.28 s `back.out(2.2)`). Exactly on the timestamp reads late; 60 ms early reads in sync.
- **One highlight pill per phrase that slides** to the spoken word (0.12 s `power3.out`, starting 0.1 s early), not a box per word fading on and off (two half-boxes at once look muddy). The spoken word turns dark on the pill and scales 1.06; it hands back over 0.06 s.
- **Fast exits.** The phrase leaves 0.14 s `power2.in` upward, 0.16 s before the next one. Two phrases never share the screen.
- **Hook on frame 0.** The title is visible at frame 0 (it is the thumbnail), lands by 0.5 s, then steps back (scale 0.86, 0.6 s `power3.inOut`) to hand focus to the captions.
- **The background answers the voice.** On each phrase change the big glow jumps (0.9 s `power3.out`) and the hue turns 25°. The beat is felt without anything new to read.
- **Layers:** a slow camera on the whole frame (`push 1.04, float 10`), a second glow breathing (2.4 s `sine.inOut` yoyo), soft text-shadow on idle words.
- **Safe zones (1080×1920):** keep key text out of the top 220 px and bottom 380 px, and 60 px in from the sides. Hook at y ≈ 300, captions at y ≈ 1180; the middle band is for the subject.

## Recipe
```html
<html data-width="1080" data-height="1920" data-fps="30" data-duration="5" data-safe-zone="shorts">
<style>
  :root { --bg:#0d0f1a; --ink:#f4f5fa; --accent:#ffd23f; --accent-2:#6d5dfc; --font: Inter, system-ui, sans-serif; }
  body { background: var(--bg); color: var(--ink); font-family: var(--font); overflow: hidden; }
  .glow { position:absolute; width:1300px; height:1300px; background: radial-gradient(closest-side, var(--c), transparent); }
  #g1 { --c: var(--accent-2); left:-500px; top:0; opacity:.6; }  #g2 { --c: var(--accent); left:300px; top:900px; opacity:.22; }
  #hook { position:absolute; left:90px; right:90px; top:300px; margin:0; font-size:128px; font-weight:900; line-height:.95;
          letter-spacing:-.04em; text-transform:uppercase; transform-origin:0 0; }
  #hook .w { display:inline-block; }  #hook em { font-style:normal; color: var(--accent); }
  .cap { position:absolute; left:70px; right:70px; top:1180px; text-align:center; isolation:isolate;
         font-size:92px; font-weight:850; line-height:1.1; letter-spacing:-.02em; }
  .cap .w { display:inline-block; padding:0 .14em; --hl:0;               /* --hl: 0 idle, 1 spoken */
            color: color-mix(in oklab, var(--bg) calc(var(--hl) * 100%), var(--ink));
            text-shadow: 0 6px 24px rgb(0 0 0 / calc(.5 - var(--hl) * .5)); }
  .pill { position:absolute; left:0; top:.02em; height:1.06em; border-radius:.2em; z-index:-1; background: var(--accent);
          box-shadow: 0 10px 40px color-mix(in oklab, var(--accent) 45%, transparent); }
</style>
<main class="scene" data-camera="push 1.04, float 10">
  <div id="bg"><div class="glow" id="g1"></div><div class="glow" id="g2"></div></div>
  <h1 id="hook"><span class="w">Stop</span> <span class="w">editing</span> <span class="w"><em>by&nbsp;hand</em></span></h1>
  <div id="caps"></div>
</main>
<script>
const words = [['Your',.5,.7],['video',.7,1],['is',1,1.1],['just',1.1,1.35],['HTML.',1.35,1.9],['Write',2.3,2.55],
  ['it',2.55,2.65],['once,',2.65,3.1],['render',3.25,3.6],['anywhere.',3.6,4.3]].map(([text, start, end]) => ({ text, start, end }));
const phrases = [[]];                       // 1. break on a pause > 0.3 s, after . ! ? , or at 3 words
words.forEach((w, i) => { const cur = phrases.at(-1), prev = words[i - 1];
  if (cur.length && (cur.length === 3 || w.start - prev.end > .3 || /[.!?,]$/.test(prev.text))) phrases.push([]);
  phrases.at(-1).push(w); });
const tl = gm.timeline();
// 2. Hook: visible at frame 0 and already moving, then it steps back.
tl.from('#hook .w', { y: 70, scale: 1.25, opacity: .35, filter: 'blur(10px)', duration: .5, ease: 'expo.out', stagger: .06 }, 0)
  .to('#hook', { scale: .86, y: -40, duration: .6, ease: 'power3.inOut' }, .45);
const caps = phrases.map(ph => { const el = document.createElement('div'); el.className = 'cap';
  el.innerHTML = '<i class="pill"></i>' + ph.map(w => `<span class="w">${w.text}</span>`).join(' ');
  document.getElementById('caps').append(el); return el; });
gm.wait(document.fonts.ready.then(() => phrases.forEach((ph, p) => {   // measure words once fonts are in
  const el = caps[p], spans = el.querySelectorAll('.w'), pill = el.querySelector('.pill'), next = phrases[p + 1];
  const box = i => ({ x: spans[i].offsetLeft, width: spans[i].offsetWidth });
  tl.fromTo(pill, { ...box(0), scale: .5, opacity: 0 }, { scale: 1, opacity: 1, duration: .22, ease: 'back.out(2)' }, ph[0].start - .04);
  ph.forEach((w, i) => {
    tl.fromTo(spans[i], { opacity: 0, y: 36, scale: .7 }, { opacity: 1, y: 0, scale: 1, duration: .28, ease: 'back.out(2.2)' }, w.start - .06);
    if (i) tl.to(pill, { ...box(i), duration: .12, ease: 'power3.out' }, w.start - .1);      // 3. pill slides
    tl.to(spans[i], { '--hl': 1, scale: 1.06, duration: .06 }, w.start - .03)                 // 4. spoken word
      .to(spans[i], { '--hl': 0, scale: 1, duration: .06 }, ph[i + 1] ? ph[i + 1].start - .1 : w.end + .3);
  });
  if (!next) tl.to(pill, { opacity: 0, scale: .9, duration: .2, ease: 'power2.in' }, ph.at(-1).end + .3);
  else tl.to(el, { y: -50, opacity: 0, duration: .14, ease: 'power2.in' }, next[0].start - .16);   // 5. fast exit
  tl.to('#g1', { x: gm.random('x' + p) * 500 - 150, y: gm.random('y' + p) * 600 - 300, duration: .9, ease: 'power3.out' }, ph[0].start - .1)
    .to('#bg', { filter: `hue-rotate(${p * 25}deg)`, duration: .6, ease: 'sine.inOut' }, ph[0].start - .1);  // 6. bg reacts
})));
gm.to('#g2', { scale: 1.25, duration: 2.4, ease: 'sine.inOut', repeat: -1, yoyo: true });            // 7. ambient
</script>
```
Real timestamps: load a whisper-style JSON with `gm.wait(fetch('words.json').then(r => r.json()).then(build))` and build the same timeline inside.

## Make it yours
- **Calm / corporate:** no overshoot (`power3.out`), 0.35 s pops, pill as an underline (`height: .12em; top: 1em`), hue turn 0, Inter 700 mixed case.
- **Energetic / punchy:** `back.out(3)`, pop from scale 0.4 with rotate ±6°, 1-2 words per phrase, `text-transform: uppercase`, hue turn 40°, add a `shake 8 2.1-2.4` (window around the key word) to the `data-camera` list.
- **Playful:** a pill color per phrase (`gm.pick(['#ffd23f','#5ef2c2','#ff7ab6'], 'c' + p)`), `bouncy` ease, rotate the pill ±3°.
- **Luxury:** no pill; the spoken word goes from 40% to 100% opacity, `"Playfair Display"` 80 px, slower 0.45 s rises, `sine.out`.

## Variations
- **Captions only, no code:** `<gm-include src="blocks/captions.html" file="captions.json" words="3">` (pages and highlights for you; less control).
- **Phrase lands as one unit** (fast talkers, > 3.5 words/s): pop the whole `.cap` and only slide the pill per word.
- **Keyword emphasis:** for words in a set, `tl.to(span, { scale: 1.3, rotate: -4, duration: .2, ease: 'back.out(3)' }, w.start)` and fire `gm.burst(..., { kind: 'sparks', global: true, at: w.start })`.
- **Line that re-centres as it grows:** the word-grow pattern in `references/motion-design.md` §6.

## Pitfalls
- `phrases[p + 1]` is an array: use `next[0].start`. A wrong time silently leaves old phrases on screen (`text-overlap` everywhere).
- Measuring `offsetLeft` before fonts load puts the pill in the wrong place: measure inside `gm.wait(document.fonts.ready…)`.
- Captions over the subject or in the bottom 380 px: `check` warns `unsafe-zone` with `data-safe-zone="shorts"`; keep the caption band at y 1100-1400.
- A `filter: blur(140px)` glow on a 1080×1920 frame is slow to render; a `radial-gradient(closest-side, …)` looks the same and costs almost nothing.
- Words that pop in place leave a one-word phrase off-centre for a moment; that is fine for 1-3 words. For longer phrases use the re-centring variation.
