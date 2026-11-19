# Camera: orthographic iso dolly

File: `template/src/world/cam.ts` (pure maths, no three.js import, so beats/overlays can use it in
Node) and `CamRig` in `template/src/world/scene.tsx`.

## Model
- Direction from target to camera: `DIR = normalise(1, E, 1)` with elevation factor `E = 1.12`
  (1 = true isometric; a little higher reads better on a tall 9:16 frame).
- Screen axes: `RIGHT = (1/sqrt2, 0, -1/sqrt2)`, `UP = normalise(-E, 2, -E)`.
- A camera state is `{ x, y, z, zoom, sx, sy }`: the world point `(x, y, z)` lands at screen pixel
  `(sx, sy)`, with `zoom` px per world unit (three.js `OrthographicCamera.zoom`).
- `camCentre(state)` converts that into the point the camera actually looks at;
  `CamRig` places the camera 60 units back along `DIR`, `lookAt` the centre, sets zoom, updates matrices.
- `project(t, p)` / `projectWith(state, p)` map any world point to screen pixels with the same maths,
  so HTML pills sit exactly on 3D anchors (tile tops, the diamond, the painting, the scale pans).

## Keys
`k(t, d, target, zoom, sx, sy)`: arrive at `t`, moving over the `d` seconds before it; ease in-out;
zoom interpolates in log space (even feel). Between keys the camera holds still.

First film (v6): overview `zoom 42` anchored at (600, 640); tile views `zoom 120-135` anchored at
(640, 650); detail pushes (painting, diamond) `zoom 205-220`. One key per beat or sentence change,
`d` 0.4-0.5 s.

## Rules that came from review
- No drift, no slow push across a whole beat, no handheld (`kit/camera.tsx` has handheld/shake for
  2D worlds; do not use them here).
- Never move toward his face; the anchors keep subjects in the top band / upper right.
- Push into a detail only on the word that names it, pull back on the next sentence.
- The end card pulls out to the whole island (sunset) and holds.
- With v6 staging the target must land above y ~780 or to the right of x ~700; check every key in stills.
