# Luminous Cosmos 3D: template

Copied from the first Luminous Cosmos film's `film/src/cosmos/` (Film3D, Oct 2026).
Drop the `cosmos/` folder into a Remotion project as `src/<world>/` (rename freely). It is **not**
a standalone project: it plugs into the shared film shell described below.

## What is generic kit and what is per-video content

| File | Kind | What to do with it |
|---|---|---|
| `cam.ts` | Generic kit | Pose type, `orbit()`, `applyPose()` with the screen-centre offset `c`, `project` / `unproject` / `atDepth`, `poseQuat`, `unitsPerPx`, `mixPose`, `keyed()`. Use as is. |
| `mats.ts` | Generic kit + one example | `FACE` mask, `glowMaterial`, `haloMaterial`, `textMaterial` (glitch), `nebulaMaterial`, `motesMaterial` are generic. `galaxyMaterial` and `tileMaterial` are the galaxy set's custom shaders: keep them as patterns for "a points cloud with story uniforms". Palette numbers inside the GLSL (nebula colours, cyan in tiles, magenta in glitch) are per-video. |
| `parts.tsx` | Generic kit | Palette constants, `RigCtx`/`useRig`, `CamRig`, `makeGlow`/`GlowPoints`, `Halo`, `EnvMap`, `Sky`, `Motes`, `Fog`, `Seed` (the hero), `GlassCard`. Restyle the palette and the hero per video. |
| `tex.ts` | Generic helpers + examples | `canvas`, `toTex`, `textTex`, `glyphTex`, `bandsTex`, `ringTex` are generic. `tileAtlas`, `coverTex`, `pageTex` are examples of drawing "real things" on a canvas. |
| `fonts.ts` | Generic kit | Loads Inter Tight via `@remotion/google-fonts`, `CFONT()` for canvas text with maths-symbol fallbacks, `useFontsReady()` holds the frame until canvas text can be drawn. |
| `ui.tsx` | Generic kit | `anchor(t, set, p)` projects a set-local 3D point to screen px; `Chip` (HTML glass label); `win()` fade window. |
| `caption.tsx` | Generic pattern | Face-safe two-line captions with per-word emphasis and the hook composition. Hook rows and the "Squeeze" word are per-video. |
| `front.tsx` | Pattern, per-video content | The transparent Front canvas over footage. The `alpha:true, premultipliedAlpha:true` canvas, the fixed `POSE`, `at()` (screen px to world) are the reusable part; what it draws (motes, hero beside him) is content. |
| `world.tsx` | Generic shell | Back (one ThreeCanvas, current set(s) inside `Finish`), Front (Front canvas only while footage covers the frame + HTML overlays), FACE mask uniform per frame, `WorldDef` export. Edit only names, `bed`, `cutoutFilter`, `tileStyle`, and the face box. |
| `endcard.tsx` | Pattern | Dark glass backings over the bloom. Text is per-video. |
| `overlay.tsx` | Per-video content | Gauge, tags, labels anchored to 3D points. Shows how to use `anchor()` + `Chip`. Imports `./labels2` (included). |
| `rig.ts` | Mechanism generic, content per-video | `SetSpec`, chained-set placement (`MAT`), `rigAt()`, `drift()` with hand-off mask, `toWorld`, `poseInSet` are generic. The `L` layout constants, every `*Cam` function and `SPECS` are per-video. |
| `timing.ts` | Per-video content | `T` (cue phrases), `HAND` (tile hand-off windows), `SET_T` (set windows). Rewrite for every video; keep the shape. |
| `sets/galaxy.tsx` | Worked example | A procedural spiral galaxy of 24k shader points + 1150 instanced data tiles from a canvas atlas, a hub where the footage tile lands, and a slicing plane driven by uniforms. Pattern: big point cloud whose story lives in uniforms. |
| `sets/network.tsx` | Worked example | Reusable `buildNet` + `NetView` (instanced glass nodes, additive edge lines, activation glow, pulses along edges), plus a ribbon built with `TubeGeometry.setDrawRange` and 1500 points collapsing onto it. Pattern: structure + flowing particles. |
| `sets/board.tsx` | Worked example | Glass glyphs as textured planes moving along arcs between slots (`x + y = z` to `y = z − x`), practice cards flying in from depth, a faint field of glyphs, and the glyphs turning into a network. Pattern: text-as-objects in 3D. |

Not copied here: `lib.ts`, `presenter.tsx`, `beats.ts`, `captions.ts`, `Film.tsx` (the shared
film shell; take them from `../../paper-lab-reel/template/src/` and `../../paper-lab-reel/template/scripts/`), `kit/three-canvas.tsx` and `kit/finish.tsx`
(identical copies live in the cstack `animated-video` skill's `templates/remotion-film/src/kit/`), and the
other five sets (books, cubes, recall, cosmos, stem). No media, no `node_modules`.

## The contract this folder expects from the film shell

Imports resolve against the parent `src/`:

- `../lib`: `W`, `H` (1080x1920), `FPS`, `WORDS`, `cue(phrase, nth?)`, `cueEnd`, `lerp`, `smooth`,
  `easeInOut`, `easeIn`, `progS(t, at, dur, ease?)`, `popS(t, at, damping)`, `SoundEvent`.
- `../beats`: `B` (beat id -> `{s, e, mode, tile?}`), modes `FULL | FWD | SIDE | OUT | END`.
- `../captions`: `Chunk`, `isEmph`.
- `../Film`: `Region`, `WorldDef` (`Back`, `Front`, `Caption`, `cutoutFilter`, `tileStyle`, `bed`).
- `../presenter`: `presenter(t)` returning `{s, x, y, garden, tile, vis}`.
- `../kit/three-canvas` (`ThreeCanvas`, `settle`) and `../kit/finish` (`Finish`).

Packages: `three`, `@react-three/fiber`, `@remotion/three`, `@remotion/google-fonts`, `remotion`
(versions used: three 0.186, R3F 9.8, Remotion 4.0.535, React 19).

The galaxy/network/board sets also import `L`, `HAND`, `T` from `rig.ts` / `timing.ts`; when you
rewrite those for a new topic, rewrite the sets' references too.

## Starting a new set

1. Add its window to `SET_T` in `timing.ts` (start a little before its beat so a fly-through never
   shows a gap; `TW` = half a fly-through).
2. Add its local layout points to `L` in `rig.ts` (the set's own coordinates, origin at its hero).
3. Write its camera `xxxCam(t): Pose` with `keyed()` / `orbit()`; frame with `c` so the subject sits
   in the free part of the screen (away from the presenter and captions).
4. Add a `SPECS` row: `{ id, ...S(id), cam, fog, chain?: { from: "prevSet", D } }`. `chain` places the
   set D units further along the previous set's last view, so the camera flies on into it.
5. Create `sets/<id>.tsx` exporting `XxxSet: React.FC<{ fade: number }>`:
   - `const { t } = useRig();` everything is a pure function of `t` and `random("key")`.
   - Geometry, materials, canvas textures in `useMemo` once; per frame only set uniforms, instance
     matrices or GlowPoints `fill`.
   - Its own lights (`hemisphereLight` + 2-3 coloured `pointLight`s, `decay={2} distance={0}`).
   - Multiply every opacity by `fade` (the chain cross-fade).
   - Export the helpers the HTML overlays need (`xxxPos(t)`) so labels can `anchor()` to them.
6. Register it in `sets/index.ts`: `SET_VIEWS[id] = XxxSet`.
7. Add its labels to the overlay (via `anchor(t, id, localPoint)`) and its sound events to
   `events.ts` from the same `T` constants.
8. Snapshot 6-10 seconds across the set (`COMP=Film3D ./snap.sh out/chk 11.0 12.5 ...`) and fix framing
   before moving on.
