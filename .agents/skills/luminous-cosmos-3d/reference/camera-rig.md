# Camera rig patterns

Source: `template/cosmos/cam.ts`, `template/cosmos/rig.ts`.

## Pose and the screen-centre offset `c`

```ts
type Pose = { p: V3; t: V3; fov: number; c?: [number, number]; up?: V3 };
```

`applyPose` sets position, up, `lookAt(t)`, then

```ts
const [cx, cy] = pose.c ?? [W / 2, H / 2];
cam.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);   // lens shift
```

so the look-at target lands on screen pixel `c` without tilting the camera (verticals stay vertical,
no keystone). Think of `c` as "where on the phone the subject sits":

| Situation | Typical `c` |
|---|---|
| OUT, world full frame, captions at y 1300-1500 | `[540, 600-820]` |
| SIDE, cut-out bottom-left, captions bottom-right | `[560-740, 540-660]` (up and right of his head) |
| Hand-off: tile lands / emerges at pixel P | `c = P` exactly (`HAND.x.at`) |
| End card: hero centred behind the card | `[540, 900]` |

`mixPose` interpolates `c` too, so a camera can slide the subject across the screen while it moves
(the cube shot moves `c` from `[640,1030]` to `[740,1060]`, the tile's emerge point).

The same `applyPose` drives an offscreen camera in `project()` / `unproject()` / `atDepth()`, which
is why HTML labels and screen-placed 3D objects line up exactly with the canvas.

## Keyed poses

```ts
const boardCam = (t: number): Pose => keyed(t, [
  [S("board").t0,  { p: [0, 1.0, 25],  t: O, fov: 32, c: [540, 700] }],
  [T.findY + 0.6,  { p: [-1.6, 0.7, 23], t: O, fov: 32, c: [540, 700] }],
  [T.doIt + 1.0,   { p: [2.5, 2.0, 31], t: [0, -0.4, 0], fov: 32, c: [600, 400] }],   // pull back for the cards
  [T.moveY - 0.1,  { p: [1.0, 0.6, 26.5], t: O, fov: 32, c: [560, 600] }],           // push in for the move
  [T.recog,        { p: [-9, 4.5, 19], t: [0, 0, -2], fov: 36, c: [540, 760] }],     // swing to the network
  [S("board").t1,  { p: [-13, 2.5, 13], t: [0, 0, -2.5], fov: 38, c: [540, 760] }, (x) => x],
]);
```

- Each key: `[time, pose, ease of the segment INTO this key]` (default `easeInOut`).
- Key times are cue words, so the camera arrives as the word lands.
- The last segment uses linear `(x) => x` so the camera is still moving at the set's end; the fly-through
  continues that velocity instead of stopping then starting.
- Push in for a detail (a glyph moving), pull back for a crowd (practice cards), swing for a reveal.

## Orbit cameras

```ts
orbit(center, dist, azDeg, elDeg)   // az around +Y (0 = +Z), el above the horizon
const recallCam = (t) => {
  const k = (t - t0) / (t1 - t0);
  return { p: orbit(O, lerp(16, 14.5, k), lerp(-18, 16, easeInOut(k)), lerp(8, 5, k)), t: O, fov: 38, c: [740, 600] };
};
```

A slow orbit of 30-35 degrees over a set gives continuous parallax while the content holds still enough
to read. Mix: `keyed` keys whose `p` are `orbit(...)` values (the books and cosmos sets).

## Hand-off cameras (fixed ray)

When the footage tile flies to pixel P and must land on an object, the camera for that window looks
at the object with `c = P` and dollies only along the line from the object:

```ts
const hub = L.galaxyHub, back = norm(sub(L.galaxyReveal, hub));
const handPose = (d: number): Pose => ({ p: add(hub, mul(back, d)), t: hub, fov: 44, c: [540, 760] });
if (t < tH) return handPose(lerp(2.4, 12, easeInOut(...)));   // start close, pull back as the tile shrinks in
return keyed(t, [[tH, handPose(12)], [10.9, { p: L.galaxyReveal, ... }], ...]);   // then reveal the whole galaxy
```

Because the target projects to P for every distance along that ray, the landing point never slides.
`drift` is masked to zero across hand-off windows for the same reason.

## Chained sets and fly-throughs

```ts
type SetSpec = { id; t0; t1; cam: (t) => Pose; fog: number; chain?: { from: SetId; D: number } };
```

Placement (computed once at module load):

1. Take the previous set's last world pose `ae = worldPose(a, a.t1)`.
2. Direction `dir = norm(ae.t - ae.p)`; new eye point `pw = ae.p + dir * D`.
3. World basis at `pw` looking along `dir` with the previous up.
4. Local basis of the new set's first camera pose `ls = s.cam(s.t0)`.
5. `MAT[s.id] = worldBasis * inverse(localBasis)`: the new set's first local camera pose maps exactly
   onto `pw` looking along `dir`.

In `rigAt(t)`, between `a.t1` and `b.t0` (a gap of `2 * TW` = 0.8 s) the pose is
`mixPose(worldPose(a, a.t1), worldPose(b, b.t0), easeInOut(k))`, both sets render, the outgoing one
gets `fade = 1 - k`, fog lerps between the sets' densities. Visually: the camera keeps flying forward
through the last set and arrives at the next set's opening framing. `D` of 40-56 units was used.

Do not chain across a presenter beat that covers the frame (FULL/FWD) or a big change of place (deep
space); start that set fresh (`MAT = identity`) and let the presenter's tile or mode change carry the cut.

## Drift

```ts
const a = 0.011 * |p - t| * driftMask(t);     // proportional to the shot size
dp = [sin(.37t) + .5 sin(.91t+1), .7 sin(.29t+1) + .3 sin(.83t), .8 sin(.23t+2)] * a
dt = [...] * a * 0.5
```

Incommensurate low frequencies feel handheld without repeating. `driftMask` is 0 from 0.6 s before to
0.6 s after every hand-off window, and the end camera has no drift so the last frame is stable.

## Useful conversions

- `toWorld(id, p)`: set-local point to world (for `anchor()`).
- `poseInSet(id, rig.pose)`: the camera in set-local space; with `poseQuat` gives billboard
  orientation for cards, with `unproject` places things at screen pixels inside a set.
- `unitsPerPx(pose, depth)`: size things in pixels at a given depth (e.g. a card that must be 600 px wide).
- `atDepth(pose, sx, sy, depth)`: world point at screen pixel and view-axis depth.

## Framing checklist per set

- Subject in the free part of the screen for the mode (see table above); nothing important under the
  presenter's head or the caption band.
- Nothing wide clipped at the left/right edge at any key; check the widest key, not just the first.
- Wide glass cards read as whole panels with their glowing frame inside the shot; a partly visible edge band reads as a stray bar.
- The camera moves in every shot (orbit, push, drift); it holds still only at a hand-off and the last frame.
