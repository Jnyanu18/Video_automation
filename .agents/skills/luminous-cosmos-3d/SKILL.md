---
name: luminous-cosmos-3d
description: >-
  Build a "Luminous Cosmos" real-3D explainer world: three.js via @react-three/fiber and
  @remotion/three, rendered in Remotion, with glowing additive points, halos, glass cards with
  canvas text, a recurring hero object, keyed set cameras and fly-throughs, composited over a
  real presenter's footage and cut-outs (or full frame without a presenter). Use when asked for
  "Luminous Cosmos", "real 3D", a "3D explainer", "make it 3D", or a three.js / R3F glowing
  world inside a Remotion video or Reel, on any topic.
---

# Luminous Cosmos 3D

A technique for building a deep, glowing 3D world in code and cutting it together with real
footage of a presenter. It is topic-agnostic: the world is a chain of 3D **sets** (one per idea),
each with its own keyed camera, all drawn from the voice's word timings, lit by emissive points and
real coloured lights, labelled with crisp HTML chips projected from 3D points, and composited
behind, beside or in front of the person.

First used for Madhav's "What if intelligence is just good compression?" Reel (Film3D, Oct 2026;
screenshots in `../../docs/luminous-cosmos-3d/`). That film's galaxy, network,
cubes and books are **examples of the technique, not the recipe**. Design new sets, palette and hero
for every topic.

Reusable code: [template/](template/README.md) (kit + three worked sets).
Deep dives: [shaders](reference/shaders.md), [camera rig](reference/camera-rig.md),
[set authoring](reference/set-authoring.md), [compositing over footage](reference/compositing.md),
[pitfalls](reference/pitfalls.md).

## Where this fits

- **Stages and approval stops come from the `animated-video` skill** (concept + beat sheet, style
  frames, key-frame board, final review). This skill replaces only its "how to build a luminous 3D
  world" parts. Never skip a stop because you have this playbook; an approved plan does not approve
  a look.
- **The shared spine comes from the `paper-lab-reel` skill**: EDL, `vo.wav`, `words.json`,
  `cue()`, `beats.ts` modes (FULL / FWD / SIDE / OUT / END), `presenter.tsx` (proxy footage,
  local mattes, tile hand-offs), captions text, `Film.tsx` and `WorldDef`. Build that spine first;
  this skill plugs a world into it. Without a presenter, use only Back + overlays + captions.
- Project rules win over template defaults: deliver the full-quality master only, and keep every
  upload / share / publish behind its own approval.

## 1. Architecture: one world, three layers

```
Film (Remotion composition, 1080x1920 @30)
 ├─ Back     one ThreeCanvas: CamRig + Fog + EnvMap + Sky + Motes + current set(s), inside Finish (bloom/vignette/grain)
 ├─ Presenter  footage (FULL/FWD), cut-out (SIDE), flying tile (hand-offs)        <- shared spine
 ├─ Front    transparent ThreeCanvas (only while footage covers the frame) + HTML overlays (chips, gauge, end card)
 └─ Caption  HTML, face-safe region per mode
```

Rules:

1. **One canvas mounted at a time per layer**, and in practice one WebGL canvas at a time overall:
   Back unmounts when the footage fully covers the frame (`covered(t)`), Front's canvas mounts only
   then. Two live canvases double GPU memory and render time and invite context loss.
2. **Use the kit's `ThreeCanvas`** (`animated-video/templates/remotion-film/src/kit/three-canvas.tsx`),
   never the stock one. It holds the frame with `delayRender` until the scene inside has drawn, so
   the first frame after any mount (new set, Front canvas appearing, a render worker joining) is
   never captured empty. Release other holds with `settle(handle)`, not `continueRender` in the same
   tick.
3. **Sets live in one scene graph**, each inside `<group matrixAutoUpdate={false} matrix={MAT[id]}>`,
   so a set is authored in its own local coordinates and placed in the world by the rig.
4. **Text that must be read is HTML, not 3D.** 3D text (canvas textures on glass cards) is for
   things that are objects in the world (law cards, equation glyphs, answer cards). Labels, tags,
   gauges, CTAs and the end card are HTML chips anchored to projected 3D points.
5. `world.tsx` exports a `WorldDef` (`Back`, `Front`, `Caption`, `bed`, `cutoutFilter`, `tileStyle`),
   so the same spine can carry several worlds (Film3D and FilmPaper shared everything except this).

## 2. Deterministic animation: everything is f(t)

Remotion renders frames out of order, in parallel workers, and stills must match the render.

- `t = frame / FPS`. Every position, opacity, uniform and camera pose is a **pure function of t**.
  No `useFrame`, no `useState` animation, no accumulated physics, no `Math.random()`, no clocks.
- Randomness: `random("key-" + i)` from `remotion` (seeded by string). Give every stream its own
  prefix (`rx${i}`, `ry${i}`); reusing a key correlates things that should look independent.
- Build geometry, materials and canvas textures **once** in `useMemo`; per frame only write uniforms,
  instance matrices, buffer attributes (`needsUpdate = true`) or GlowPoints `fill`. Apply them in
  `useLayoutEffect` (runs before the canvas draws) or directly in render for uniforms.
- Shape timing with the lib helpers: `progS(t, at, dur, ease)` (0 to 1 ramp), `popS(t, at, damping)`
  (spring overshoot), `smooth`, `lerp`, `win(t, a, b, fin, fout)` (fade in/out window), and
  Gaussian pulses `Math.exp(-((t - t0) / w) ** 2)` for flashes.
- Staggered crowds: `smooth(k * 1.4 - random("d"+i) * 0.4)` gives each particle its own start
  inside one global progress `k`.

## 3. Timing from the words

All times come from the voice, so a new take or a trimmed EDL re-times the whole film.

- `timing.ts` is a pure module (no React / three imports) read by sets, rig, overlays and events:
  - `T.name = cue("exact spoken phrase") + offset` for every action (`cue(..., nth)` when a phrase
    repeats; it throws if ambiguous or missing, which is what you want).
  - `HAND` = the presenter tile hand-off windows (`at` screen point, `t0`, `t1`) taken from beats.
  - `SET_T` = each set's `[t0, t1]` window, derived from beat starts (`B.x.s`) minus/plus `TW`
    (half a fly-through, 0.4 s). Start a set a little before its beat so a cut never shows a gap.
- Never hard-code seconds except as offsets from a cue. Land each action on its word within a few
  frames; something meaningful changes every 1.5-3 s.

## 4. Sets and the camera rig

Details and code: [camera rig](reference/camera-rig.md).

- **Pose** = `{ p: eye, t: look-at, fov, c?: [x, y], up? }`. `c` is the **screen point where the
  look-at target appears**, done with `camera.setViewOffset` (a lens shift, no tilt). This is how you
  frame a subject around the presenter: in SIDE (cut-out bottom-left) push the subject up/right with
  `c: [560-740, 540-650]`; in OUT keep it near `[540, 700-820]`; for a hand-off use the exact tile
  point (`c: HAND.x.at`).
- **Keyed cameras**: `keyed(t, [[time, pose, ease?], ...])` mixes poses (p, t, fov, c, up) with
  `easeInOut` per segment; pass `(x) => x` for the last segment so the camera is still moving into
  the next set. Key times are `T.*` cues.
- **Orbit helper**: `orbit(center, dist, azDeg, elDeg)`; a slow `lerp` of az over the set window
  gives a parallax orbit that never stops.
- **Set registry** (`SPECS` in `rig.ts`): `{ id, t0, t1, cam, fog, chain?: { from, D } }`.
  A **chained** set is placed so its first camera pose sits `D` units further along the previous
  set's last view direction: between `a.t1` and `b.t0` the rig mixes the two world poses and both
  sets render, the old one fading (`fade` prop). The result is a forward fly-through from one idea
  into the next instead of a cut. Unchained sets (after a presenter beat) start fresh at the origin.
- **Drift**: `drift(pose, t)` adds small multi-sine motion proportional to the eye-target distance,
  masked to zero around hand-offs (the tile must land on an exact pixel) and the last frame.
- `rigAt(t)` returns the pose, active set ids, fog density and transition; `toWorld(set, p)` and
  `poseInSet(set, pose)` convert between set-local and world.
- Cards that face the lens: `poseQuat(poseInSet(id, rig.pose))`.
- Place things at screen positions: `unproject(pose, sx, sy, dist)` / `atDepth(pose, sx, sy, depth)`
  (used for a light path starting "just off his shoulder").

## 5. The glow look (and why premultiplied alpha)

Details and full GLSL: [shaders](reference/shaders.md).

- Glows are `THREE.ShaderMaterial`s with `blending: AdditiveBlending`, `transparent: true`,
  `depthWrite: false`, `premultipliedAlpha: true`. Points draw a radial profile in the fragment
  shader (`gl_PointCoord`) and size by world size: `gl_PointSize = size * uScale / depth` with
  `uScale = 960 / tan(fov/2)` (`pxScale(fov)`), clamped by `uMax`, faded below 1.6 px instead of
  shrinking (no shimmering sub-pixel points).
- **The fragment must output premultiplied colour with alpha = its brightest channel:**

  ```glsl
  vec3 oc = vC * a * vA * uOpacity;
  gl_FragColor = vec4(oc, clamp(max(oc.r, max(oc.g, oc.b)), 0.0, 1.0));
  ```

  Why: on a **transparent** canvas (`gl={{ alpha: true, premultipliedAlpha: true }}`, the Front
  canvas over footage) the browser composites the canvas pixels as premultiplied RGBA. A typical
  additive shader writes alpha = 1 (or a constant) everywhere its quad covers, so each sprite's dark
  corners become **opaque black boxes** over the footage. Alpha = max channel makes the dark parts
  transparent and the bright core opaque, so glows composite like light. Screen-blending the canvas
  instead was tried and made the hero too faint. On the opaque Back canvas the same shader is
  harmless, so use it everywhere.
- Every glow shader also has fog (`exp(-(uFog*d)^2)`), optional near fade (`uNear`), and the face
  mask (`faceKeep(gl_Position)`, section 9).
- Building blocks in `parts.tsx` / `mats.ts`:
  - `GlowPoints n fill={(g) => g.set(i, pos, colour, worldSize, alpha)}`: the workhorse for
    particles, node cores, pulses on edges, streams, braids, paths. Variants: default (hot core +
    soft skirt), `soft` (bokeh disc), `gas` (huge, very soft nebula puffs, `maxSize` up to 1024).
  - `Halo`: billboarded radial glow for bright cores larger than point sprites allow.
  - `Sky`: a 2500-radius back-side sphere with an fbm nebula shader (indigo base, violet, cyan and
    magenta veils) + 5200 seeded stars, both following the camera position (never reachable).
  - `Motes`: 1400 dust specks + 90 bokeh discs in a box that wraps around the camera
    (`mod(p - cam, box)`), so near out-of-focus particles give real parallax and never run out.
  - `Fog`: `FogExp2` toward the base colour, density per set (0.0035 deep space .. 0.022 close sets).
  - `EnvMap`: a PMREM of a tiny procedural scene of coloured panels (cyan, violet, amber, magenta)
    so glass and clearcoat surfaces pick up coloured reflections. No HDR files.
  - `GlassCard`: rounded-box glass body (`MeshPhysicalMaterial`, clearcoat, opacity ~0.6), an
    additive **edge band** (ShapeGeometry ring) in the accent colour, and a canvas-text plane using
    `textMaterial` with `uGlitch` (RGB split, row offsets, magenta tint) and `uTint`.
  - Point lights: every set lights itself with a `hemisphereLight` (violet sky, near-black ground)
    and 2-3 coloured `pointLight`s (`decay={2} distance={0}`), plus lights *at* emissive things
    (the hero, a ribbon, a flash) so glows really light their surroundings.
- Text textures (`tex.ts`): draw on a 2D canvas with `CFONT(weight, px)` after `useFontsReady()`;
  `colorSpace = SRGBColorSpace`, `anisotropy = 8`. Draw "real things" (web page, code, chart, map,
  book cover, page) on canvases or an atlas rather than coloured rectangles.
- The Back canvas sits inside the kit's `Finish` (SVG bloom on pixels above ~62%, vignette, grain).
  Grain also prevents banding in the dark gradients after Instagram recompresses.

## 6. Palette and value discipline

- Base: deep indigo/violet space (`#07051c` to `#3a1d8f`), fog `#0c0829`.
- One meaning per accent: **cyan `#5ee7ff`** = data / information; **violet `#8a7dff`** = structure /
  network; **amber `#ffbf3c`** = the insight / rule / hero (the brightest thing on screen);
  **magenta `#ff5fd2`** = loss / error / warning; mint `#7dffb0` as a rare extra.
- Large surfaces stay under ~55% brightness; only real light sources bloom; one brightest thing per
  shot. Glass bodies are dark (`#1d1660`) with bright edges, not bright panels.
- Choose a different palette for a different topic when it reads better; keep the one-meaning rule.

## 7. The hero object (the visual thesis)

Pick one object that **is** the film's idea and let it recur across sets: it appears, grows, answers,
swallows, blooms into the end card. In Film3D it was the "seed", a faceted amber icosahedron:

- shell: `IcosahedronGeometry(1, 0)`, `MeshPhysicalMaterial` amber, `flatShading`, clearcoat,
  emissive scaled by `glow`, slightly transparent; core: smaller subdivided icosahedron,
  `MeshBasicMaterial` colour x2.2, `toneMapped: false`; edges: `EdgesGeometry` lines in pale gold;
- a `pointLight` at its centre (`60 * light * glow * s^2`), an amber `Halo`, and 30 orbiting motes on
  three tilted rings;
- props `glow`, `spin`, `light`, `halo`, `motes` so each set can dial it down. It sits beside the
  presenter in FULL beats on the Front canvas, and pulses on key words (Gaussian pulse into `glow`).

Keep its glow modest: a full-strength halo washed out whole frames (see pitfalls).

## 8. Labels: 3D anchors to HTML chips, readable on a phone

- `anchor(t, setId, localPoint)` = `project(rigAt(t).pose, toWorld(setId, p))` returns screen
  `{x, y, ok}` (ok = in front of the camera). Labels follow the 3D object exactly, including through
  fly-throughs, but are crisp HTML: no texture blur, no bloom bleed, real font hinting.
- Export position helpers from sets (`ribbonAt(u)`, `glyphPos(id, t)`, `bookPos(i)`) and anchor to
  them with an offset (below a cube: `[0, -edge/2 - 0.85, 0]`).
- `Chip`: glass backing (light gradient, accent border, outer glow, `backdrop-filter: blur(10px)`,
  dark drop shadow), `popS` scale-in, optional `sub` line and `glitch` (RGB-split text shadow plus
  jitter). Clamp anchored y into the safe area (`Math.max(300, a.y)`).
- **Readability rules** (1080 wide canvas, judged on a phone):
  - Labels at least **34 px**; key labels 40-50 px; captions 52-64 px; end-card headline ~92 px.
  - Anything over bright bloom gets a **dark glass backing** (`rgba(10,6,40,.62)` + border + big dark
    shadow). Text shadow alone did not survive the bloom.
  - Max two caption lines; never over the face; keep out of Instagram's top 220 px, bottom 420 px
    and right rail (x > 930 at y > 1100).
  - Exact qualifier wording from the fact-check notes; no invented numbers.

## 9. Compositing over real footage

Details: [compositing](reference/compositing.md).

- **Modes** decide the layers: FULL/FWD = footage covers frame, Back unmounted, Front canvas (hero
  beside him in the right column x 700-1000, y 480-1150, motes in the top band) + chips; SIDE =
  cut-out bottom-left (scale 0.66, face box ~x 90-370, y 940-1240) over the Back world, set cameras
  framed with `c` to the upper/right; OUT = world full frame; END = world + end card.
- **Front canvas**: `ThreeCanvas` with `gl={{ antialias: true, alpha: true, premultipliedAlpha: true }}`,
  a fixed pose, `unproject(POSE, x, y, d)` to place 3D things at screen pixels. Only glow and
  physically lit objects; no sky, no fog.
- **Face-protection mask**: one shared uniform pair `FACE = { uFace: vec4(x0,y0,x1,y1) px, uFaceK }`
  spread into every glow material. The vertex shader converts `gl_Position` to output px and fades
  points inside the box with a 110 px soft edge. `world.tsx` sets the box each frame and drives
  `uFaceK` from the presenter state (on only in SIDE, ramped as he slides in). Bright particles never
  cross his face while he stands beside the world.
- **Tile hand-offs**: the presenter's whole frame shrinks to a rounded glass tile and flies to a
  screen point (`HAND.x.at`) where the world has a matching object (a hub of tiles in the galaxy, the
  small cube, deep space, the hero). The set camera for that window uses a **fixed ray**: look at the
  landing object with `c = HAND.x.at` and dolly only along the line from it, with drift masked to
  zero, so the object stays on that exact pixel. Add a flash (halo + light + ring of points) when it
  lands. Reverse for emergence.
- Cut-out dressing per world: `cutoutFilter` (cyan rim: `drop-shadow(0 0 16px rgba(94,231,255,.5))`)
  and `tileStyle` (pale cyan border + outer glow).
- The presenter's real face, lips and voice are never regenerated or retouched.

## 10. Sound events from the same constants

- `events.ts` exports `EVENTS: SoundEvent[]` = `{ id, t, what, x?, dur? }`, built with the same `T`,
  `HAND`, set helpers (`stemAt(i)`, `GW.x`) the pictures use, so sound can never drift from picture.
- `what` carries keywords the mixer maps to sounds (`whoosh fly`, `slice`, `collapse converge`,
  `pulse`, `land card`, `glitch`, `bloom`, `check works`); `x` is a stereo hint -1..1. Aim for
  ~25-50 events a minute.
- Dump with a tiny `.mts` (`WORLD=cosmos` -> `out/events-cosmos.json`), then the mixer
  (`audio/mix.py cosmos`): a synthetic airy pad + bell arps (F major / D minor, 3.2 s chords),
  effects from keywords (synthetic glitch / laser-cut / unscramble / blip / glass-ping, CC0
  whoosh-deep and glass-ting from the video-edit sfx library), events landed 0.03 s before the
  visible hit, each kept 12 dB under the voice's 1-4 kHz band, music ducked -9 dB per phrase, FX
  -17 dB, music -9 dB. Report all synthetic audio as unauditioned.

## 11. Rendering

- Always `--gl=angle` on Windows (stills and renders): it is the GL backend that gives headless
  Chrome real WebGL for three.js here; every Film3D still and render used it.
- `npx tsc -p .` first; then `npx remotion render src/index.ts Film3D out/<name>.raw.mp4 --codec h264
  --crf 16 --pixel-format yuv420p --color-space=bt709 --gl=angle --concurrency=4..6`.
  The final 3D render (v2) ran at `CONCURRENCY=4` (script default 6); lower it if workers time out
  or the GPU runs out of memory.
- **Disk**: Remotion writes frames and bundles to `%TEMP%`. When the system disk is low (it hit 1.8 GB free and
  killed the render), set `TEMP`, `TMP` and `TMPDIR` to a folder on a roomier disk for the render and snapshot
  commands, delete that folder afterwards, and delete regenerable `out/bundle-*` folders (~1 GB each)
  once a snapshot round is done.
- Mastering: `finalize.sh` (VO + bed, gentle 3:1 compression, gain to target, oversampled limiter,
  -14.5 LUFS, TP <= -1.5 dBTP, AAC 256k, `-c:v copy`, `+faststart`).
- Delivery spec: 1080x1920 H.264 High, CFR 30, limited-range yuv420p, AAC 48 kHz, faststart.
  Never deliver or upload a proxy or a shrunk copy.

## 12. Snapshot review loop

Agents cannot watch video, so the 3D is built by stills:

1. `TEMP=<HEAVY_TEMP_DIR> COMP=Film3D PAR=3 ./snap.sh out/chk-a 6.0 7.2 9.5 12.4 15.0 ...` renders stills
   at chosen seconds (in parallel, `--gl=angle`) and a labelled contact sheet `sheet.png`
   (`BUNDLE=out/bundle-x KEEP=1` reuses a bundle between rounds).
2. Pick seconds that matter: each action's word, hand-off landings, fly-through midpoints, the
   held comparison, every label's first full frame, the first and last frame.
3. Look at the sheet as a phone viewer would: is the subject in the free area, is anything clipped
   at the edges, are labels >= 34 px and readable over the bloom, is the face clear, is one thing
   brightest, does the frame have depth (near motes, mid subject, far sky).
4. Fix (camera `c`/distance, card size and home, glow strength, label size), re-snap the same
   seconds into a new folder (`chk-b`), compare, repeat. Then render, `qa.sh` (streams, full decode,
   blackdetect, loudness, contact sheet at 2 fps, dense frames around every beat cut, first and last
   frames).
5. Report Technical, Factual, Creative and User-acceptance QA as four separate states; self-review
   by contact sheets is not creative approval.

## 13. Pitfalls actually hit (and the fix)

Full list with symptoms and code: [pitfalls](reference/pitfalls.md).

| Problem | Fix |
|---|---|
| Black boxes around every glow on the transparent Front canvas | Premultiplied output, alpha = max channel, `premultipliedAlpha: true` on material and canvas |
| Wide glass card edges read as stray bars | Reframe so the wide card reads as a whole panel, its glowing frame inside the shot |
| Hero glow washed out whole frames | Lower halo intensity / size, lower `glow`, `light`, halo `pow` higher |
| Law cards tiny and clipped | Bigger cards, homes moved inward, camera pulled back |
| Board clipped at the right edge | Camera moved back (wide keys now at 31-33 units) and `c` shifted |
| End-card text unreadable over the bloom | Dark glass backings behind both lines; headline 92 px; follow line 42 px |
| STEM cards hidden behind his head (SIDE) | Orbit radius 1.75, cards 1.4x1.55, camera 17.5 -> 15.5, `c` [620, 540] |
| Lossy card clipped / glitch unreadable | Wider card, calmer glitch (low base + short spikes) |
| Cube comparison clipped | Re-orbited camera (az -14 -> 0, distance 33 -> 29 -> 21.5) and a `c` path to the hand-off point |
| Small labels | Minimum 34 px; cube labels 40/42 px |
| Disk full killed the render | TEMP on a roomier disk, delete bundles, check free space before rendering |
| Background animator agents died with API 409 | Build the 3D world in the main session; don't hand long 3D builds to background agents |

## 14. Performance

- Budget per still: a few seconds at 1080x1920. Time the heaviest frame with `npx remotion still`
  before a full render (the sister Paper film ran ~3-4 s per still).
- Points are cheap: 24k galaxy points + 5.2k stars + 1.4k motes + a few thousand GlowPoints per set
  was fine. Prefer one `THREE.Points` per stream over many meshes; `InstancedMesh` for repeated
  solids (1150 tiles, network nodes).
- Story motion that touches thousands of points goes in **uniforms** evaluated in the vertex shader
  (galaxy rotation, slice, lift, contract, stream, wave) instead of rewriting buffers on the CPU.
- GlowPoints `fill` loops are fine to a few thousand points per frame; past that, move to a shader.
- `frustumCulled = false` on points and instanced meshes whose vertices move in the shader.
- `dpr={1}`; render only the active set(s); unmount the Back canvas when covered; cache textures,
  geometries and materials at module level or in `useMemo` (never per frame).
- Fonts: hold the frame until fonts are ready before drawing canvas text (`useFontsReady`).

## 15. Build order for a new video

1. Spine ready (paper-lab-reel): EDL, VO, words, beats with modes and tile points, presenter, captions.
2. Style frame of one beat in this look; get the pick (animated-video stop 2).
3. `timing.ts`: `T` cues for every action, `HAND`, `SET_T`.
4. Copy `template/` kit; set palette and hero; `world.tsx` shell with an empty set and the Sky,
   Motes, Fog, EnvMap. Snapshot to check the empty world has depth.
5. One set at a time: layout `L`, camera, content, lights, labels, events. Snapshot each.
6. Front canvas beats (hero beside him, motes), hand-off flashes, end card.
7. Key-frame board (stop 3), full snapshot sweep, fixes, render, finalize, QA, final review (stop 4).
