# Build guide: the kit

The kit is a Remotion project in `kit/`. Copy it per film and write two files: `src/film.tsx` (picture) and `score.py` (sound). Everything else is shared library code.

## Structure

```
kit/
  src/Root.tsx           registers the "Film" composition (don't edit)
  src/kit/film.tsx       <Film> runner: fonts, sections, HUD, motion blur, grain, audio (don't edit)
  src/kit/core.tsx       technique library (extend it)
  src/kit/devices.tsx    phone shell + status bar (extend it)
  src/film.tsx           YOUR FILM: palette, sections, config
  scorelib.py            instrument + groove library (extend it)
  score.py               YOUR SCORE: one block per section
  render.mjs             --stills <s...> | --preview | --final [--name x.mp4]
  public/                fonts (Geist, OFL), soundtrack.wav, grain.png
```

## Writing `src/film.tsx`

```tsx
const BPM=128,B=60/BPM,BAR=4*B,HB=B/2;
const C={ink:'#121016',paper:'#F1EBE1',accent:'#B4A2FF'};      // strict palette, fixed pairs

function hook(t:number):Frame{            // t = global seconds; derive local u = t - start
  const u=t, ...;
  return {bg:C.ink, ink:C.paper, el:<>...SVG...</>};
}
export const film:FilmConfig={
  width:1080,height:1920,fps:60,duration:8*BAR,
  sections:[{name:'HOOK',start:0,render:hook}, ...],     // starts on the beat grid
  hud:{left:'BRAND / CATEGORY',right:'LAUNCH'},          // or null for no HUD
  audio:'soundtrack.wav', grain:.06,
  // fonts:{display:{family,file},mono:{family,file}}   // optional brand fonts in public/
};
```

Everything is SVG in a W×H coordinate space (`S.W`, `S.H`, `S.CX`, `S.CY`). Sections return plain JSX, not components. Call kit functions directly inside render functions.

## Library: `core.tsx`

| Function | Purpose |
|---|---|
| `clamp, seg(t,t0,d), eo, eio, lerp` | Time and easing |
| `osc(dt,w,z)` | Spring step (z<1 overshoot, z≥1 critically damped) |
| `kick(t,start)` | Damped impulse for recoil and squash |
| `vel(f,t)`, `vblur(v)` | Velocity → blur amount |
| `blurF(sx,sy)` | Directional blur filter url |
| `clip(x,y,w,h,rx)` | ClipPath url |
| `rnd(i)` | Seeded noise |
| `tw(s,wt,sz,mono)`, `fit(s,wt,maxW,maxS,trk)` | Measure text; fit to width |
| `T(s,x,y,sz,wt,fill,{mono,anchor,ls,stroke,sw,op})` | SVG text |
| `outline(s,x,y,sz,wt,ink,bg,sw,o)` | Artifact-free outline type |
| `typed(s,p)` | Typewriter slice |
| `rise(node,base,sz,t,tIn,dur)` | Masked rise with blur |
| `letters(s,x,base,sz,wt,fill,t,tIn,{stag,trk,anchor,dur,stroke,sw,dy})` | Per-letter rise; `dy(i)` per-letter offsets (waves) |
| `slam(node,by,vv,{dir,dist,dur,stretch,rot})` | Lateral slam with stretch and blur |
| `slices(make,by,sz,amp,bands)` | Glitch slice displacement |
| `ringText(cx,cy,R,s,sz,wt,mono,rotDeg,fill,op)` | Circular type |
| `radial.circle/poly/rosette/rays/fn` | Star-shaped forms as radii |
| `morphRadii(a,b,e)`, `shapePath(r,ox,oy,s)` | Morph between any two forms; build the path |
| `gooInvert(balls,words(fill),{blobFill,outside,inside,sigma})` | Metaballs + inverted type |
| `pop(u,at,node,cx,cy,dist)` | Spring pop-in |
| `chip(text,x,y,u,at,fill,ink,dot)` | Notification/label pill |

`devices.tsx`: `phoneGeom(w,h,topY)`, `phone(geom,screen,{body,screenBg,dy,rot,sc,filter})` (draw screen content in local coordinates 0..sw × 0..sh), `statusBar(sw,ink)`.

**When the concept needs something new** (particles converging, a chart from real data, parallax, a scale bridge, path morphs of non-star shapes, a 3D card), write it in `film.tsx` first. Once it works, move it into `core.tsx` with a one-line comment, and add a row to the vocabulary.

## Writing `score.py`

`Score(duration,bpm)` gives you `B, BAR, HB` and these instruments:
- rhythm: `kick`, `clap`, `hat`, `beat_bar`
- tonal: `bass`, `pad(t0,t1,CHORDS[...])`, `pluck`, `stab`, `tone`
- effects: `bowl`, `swell`, `whoosh`, `riser`, `impact`, `ping`, `tick`

Mirror the sections; place events at the same times as the picture events. `finalize('public/soundtrack.wav')` loudness-normalizes to −14 LUFS and writes `grain.png`.

## Commands

```sh
npm install                       # once per copy
python score.py                   # soundtrack.wav + grain.png
npx tsc --noEmit                  # type-check
node render.mjs --stills 0.1 1.9 3.0 ...   # half-res PNGs in out/stills/ (no motion blur)
node render.mjs --preview         # half-res MP4 (no motion blur)
node render.mjs --final --name brand-reel.mp4   # full-res, 3-sample motion blur
```

Set `CHROME_PATH` to a Chromium or headless-shell binary, or let Remotion download its own.

Measure the final:

```sh
ffprobe -v error -show_entries stream=codec_name,width,height,pix_fmt,r_frame_rate:format=duration -of compact out/x.mp4
ffmpeg -i out/x.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:"
```

## Pitfalls (each one has burned a real render)

- **Composition props cross a JSON boundary.** Never pass functions through props. `Root.tsx` captures the film config in a closure.
- **Measure text only after the fonts load.** `<Film>` gates rendering on the fonts; don't measure at module load.
- **IDs must be unique per motion-blur sample.** Always use `uid()`, `addDef()`, `blurF()` and `clip()`, never hand-written IDs.
- **Variable fonts show their internal contours under a stroke.** Use `outline()`.
- **Text in containers** (pills, buttons, discs) must be sized from `tw()`/`fit()` against the container. Long labels clip.
- **Random placement collides.** Use fixed, designed slots for scattered elements.
- **Ring and orbit radii** must keep the text inside the frame (R + font size < W/2 − 40).
- Stills skip motion blur. Judge the blur on the final or on preview frames.
