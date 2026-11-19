# Camera and 3D (what the bubble adds to luminous-cosmos-3d)

The 3D kit (`world/cam.ts`, `world/mats.ts`, `world/parts.tsx`) is the luminous-cosmos-3d kit. Read that skill's
`reference/camera-rig.md`, `shaders.md` and `pitfalls.md` first; this page covers the bubble-specific parts.

## One canvas, everything f(t)
- One `ThreeCanvas` (from `kit/three-canvas.tsx`, never the stock one: it holds the frame with `delayRender` until the
  scene has drawn) inside `Finish` (bloom 0.75, vignette, grain), `dpr={1}`, `fov 40, near 0.05, far 5000`.
- Mount pieces only in their windows (`coins` while pouring, `Objects` until Q2, `Desk` while `deskK > 0`), so render
  time stays sane at 1440x2560.
- Materials and geometry are built once (`useMemo` / module constants); per frame only uniforms, `GlowPoints` fills and
  canvas-texture redraws (`tx.needsUpdate = true`) change.
- No `useFrame`, no state, no `Math.random()`. Seeds: `random("ct" + i)` style keys, one prefix per stream.

## Poses (`world/rig.ts`)
`orb(dist, azimuth, elevation, screenXY, target)` builds a `Pose` whose target point lands at **screen pixel
`c = [x, y]`** (the kit's off-centre projection). This is how the bubble is put *into a zone* rather than at the centre:

| Pose | Screen point of the bubble | Used for |
|---|---|---|
| `P_HOOK` | `HOOK_BUBBLE = [830, 1010]` (right column) | hook, Q1, Q2 |
| `P_MONEY` | `MONEY_BUBBLE = [540, 600]` (top band) | money |
| `P_TOUCH` | `TOUCH_BUBBLE = [610, 520]`, further out | touch (room for the icons) |
| `P_DESK` = `P_STEPS` | desk target `[0, 0.07, 0]` at `[470, 540]`, distance 4.4 (camera inside the bubble) | Microsoft / code / night / orchestrate / steps / plain |
| `P_PIPE` | `PIPE_BUBBLE = [830, 1010]` | the pipeline beats (grid owns the top band) |
| `P_TEN` | `CORE_XY = [720, 490]` | stay / comment |
| `P_END` | `[830, 800]` | end card |

`KEYS` lists `[t, pose, easing?]`; `cut(t, a, b)` = two keys 1 ms apart (a hard cut), otherwise a 0.6 s eased move.
Keep this rule: **one pose per beat**. Put cuts where the picture changes anyway (question cards, desk in/out).

## Placing things where the layout needs them
- `unproject(pose, sx, sy, dist)` returns the world point that projects to pixel `(sx, sy)` at `dist` from the camera.
  Icons (`OBJ_XY`) and workflow nodes (`stepAt(722, 910 ... 1190)`) are authored in **screen pixels** this way, so
  they sit exactly in the right column regardless of the 3D layout.
- `project(pose, P)` (via `anchor(t, P)` in overlay.tsx) returns the pixel of a 3D point, so HTML chips follow 3D
  objects (icon labels, the AI agent chip, the step chips, the beams).

## Bubble state (`bubbleAt(t)`)
- `R = 3.0 + 1.2 * money` (money ramps over 2.2 s from `T.pouring - 0.2`); `DESK_R = 5.6` while the desk shows (the
  camera is inside the shell then: `uInside` dims the film); `R *= 1 + 0.035 * hard`.
- Tension window `win(T.bubble1 - 0.1 .. B.money.s + 0.2)`: stretch 7% vertical, wobble 1.4; a ripple pulse at
  `T.pop + 0.1`; `crack = progS(T.pop - 0.05, 0.4)` (never pops).
- `hard = smooth(progS(T.stayW - 0.1, 1.2))`: shell alpha fades to 8%, the planet fades in, the crack turns gold.

## Shaders (`world/bubble-mats.ts`)
- `SHELL_VERT`: noise displacement scaled by `uWob` (capped 2.5) + `uRipple` sine; `vK = faceKeep(gl_Position)`.
- Shell fragment: thin-film colour * fresnel, back faces at 45%, two window highlights, blue rim, crack line; output is
  premultiplied additive with alpha = brightest channel (so bloom and the dark studio read it as light).
- `planetMaterial`: navy glass with fbm, iridescent rim from the same `thinFilm`, gold grid + market dots behind `uGrid`
  (0 in v6), gold crack.
- `studioMaterial` / `floorMaterial`: backdrop and floor pool; `uGold` warms them with money / hardening.

## Face mask
`FACE.uFace` = `SIDE_FACE` box in output pixels, `FACE.uFaceK` = strength (set every frame in `BackScene`). Every kit
material includes `faceKeep()`, which fades glow within ~110 px of the box, so additive light never sits on his face.
Update `SIDE_FACE` in `presenter.tsx` whenever the take or staging changes.

## Performance notes
- Sphere 160x120 segments for a smooth silhouette at 1440 px; the city is instanced.
- Render at `--concurrency=6` (`CONCURRENCY` env in `render_ig.sh`) with `--gl=angle` on Windows; lower it if the GPU
  runs out of memory or a WebGL context is lost.
