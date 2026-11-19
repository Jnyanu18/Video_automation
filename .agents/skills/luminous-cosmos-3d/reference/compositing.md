# Compositing the 3D world over real footage

The presenter pipeline (EDL, proxy footage, local mattes, `presenter(t)` state, tile hand-offs,
caption regions) is defined in the `paper-lab-reel` skill. This page covers how the 3D world sits
around it.

## Layer stack (Film.tsx)

```tsx
<AbsoluteFill style={{ background: "#000" }}>
  <Back t fr />          // 3D world (opaque canvas) - unmounted while footage covers the frame
  <Presenter t ... />    // footage / cut-out / tile, dressed with world.cutoutFilter and world.tileStyle
  <Front t fr />         // transparent 3D canvas (FULL/FWD only) + HTML overlays
  <Caption ... />        // face-safe region per mode
  <Audio vo.wav /> <Audio bed-<world>.wav />
</AbsoluteFill>
```

## `covered(t)`: who owns the frame

```ts
export const covered = (t: number) => {
  const st = presenter(t);
  return st.vis && st.tile < 0.001 && st.garden > 0.999 && st.s >= 0.999;
};
```

- `covered` true (FULL/FWD, footage full size with its background): Back returns `null`; Front mounts
  its small transparent canvas if `frontActive(t)` (beats that have Front 3D content).
- `covered` false (SIDE, OUT, END, any transition, any tile flight): Back renders the world; Front shows
  only HTML.
- So only one WebGL canvas is alive at any frame, and the world never renders under opaque footage.

## Modes and where the world goes

| Mode | Presenter | World | Captions |
|---|---|---|---|
| FULL / FWD | full-frame footage (FWD: slow push-in 1.1 -> 1.2 about the face) | Front canvas: hero beside him in the right column (~x 840-860, y 640-760), motes in the top band (y 250-510); chips in the top band (y 230-480) or right column | x 90-990, y ~1260 |
| SIDE | cut-out at scale 0.66, bottom-left; face box ~x 90-370, y 940-1240 | Back world, set camera `c` up/right; action area y 240-1180 full width and x > 420 lower down | x 555-930, y 1215-1500 |
| OUT | off-screen (or a flying tile) | Back world full frame | centred, y 1300-1500 (keep that band calm) |
| END | tile flies into the hero | Back end set + end card | none |

## Front canvas (over footage)

```tsx
<ThreeCanvas width={W} height={H} dpr={1}
  gl={{ antialias: true, alpha: true, premultipliedAlpha: true }}
  camera={{ fov: 40, near: 0.05, far: 500 }} style={{ position: "absolute", inset: 0 }}>
  <Scene t={t} />
</ThreeCanvas>
```

- A fixed pose `{ p: [0,0,12], t: [0,0,0], fov: 40 }` and `at(x, y, d) = unproject(POSE, x, y, d)` place
  3D things at screen pixels, e.g. the hero at `at(850, 700 + sin(t*1.1)*10)`.
- Contents: `EnvMap`, a dim `ambientLight`, glow points, the hero with `light={0}` (no point light needed;
  it would light nothing), halo reduced. No Sky, no Fog, no Motes box (they would cover the footage).
- All glow materials must use the premultiplied output (see shaders.md) or every sprite becomes a black box.
- Keep it out of the face: right column or top band only. Check stills at every Front beat.

## Face-protection mask (SIDE)

`world.tsx`, every Back frame:

```ts
const st = presenter(t);
FACE.uFace.value.set(70, 900, 400, 1270);                       // a bit larger than the face box
FACE.uFaceK.value = st.vis && st.tile < 0.01 ? (1 - st.garden) * smooth((st.x + 500) / 400) : 0;
```

- On only while he is a cut-out (garden faded out), ramped by his x as he slides in from the left.
- All glow points, halos and motes fade inside the box with a 110 px soft edge, so bright particles pass
  behind his head without sparkling across his face. Solids (glass, planets) are not masked; frame them away.
- If the cut-out position or scale changes, update the box.

## Tile hand-offs (footage flies into the world)

The presenter state animates the whole footage frame to a rounded tile (scale 0.22 -> 0.02) flying to a
screen point; the world must put the matching object exactly there:

| Hand-off | Screen point | World object | Camera trick |
|---|---|---|---|
| tile flies into the world | (540, 760) | a hub of glass data tiles in the galaxy | fixed-ray dolly, `c = [540, 760]`, start close (d 2.4) and pull back to 12 as the tile shrinks in; then reveal |
| tile emerges from the result | (740, 1060) | the small amber cube | `c` slides to `[740, 1060]`, camera closes to 21.5 |
| tile flies into deep space | (540, 820) | the tiny hero at the origin | fixed ray along `COSMOS_DIR`, d 1.5 -> 9.5, `c = [540, 820]` |
| tile flies into the hero (end) | (540, 900) | the hero, which blooms into the end card | orbit closing in, `c = [540, 900]`, no drift |

Timing comes from `HAND` in `timing.ts` (derived from beat starts and the presenter's transition
constants T0 = 0.25 s, T1 = 0.4 s, flight 1.1 s). On landing add a flash: halo size and intensity pulse,
a point light pulse and an expanding ring of points. `drift` is masked to zero across each window.

Dress the tile and cut-out to belong to the world (in `WorldDef`):

```ts
cutoutFilter: "drop-shadow(0 0 16px rgba(94,231,255,.5)) drop-shadow(0 0 2px rgba(150,240,255,.55))",
tileStyle: { border: "9px solid rgba(190,245,255,.75)",
  boxShadow: "0 0 0 6px rgba(94,231,255,.35), 0 0 90px 24px rgba(94,231,255,.55), 0 30px 120px rgba(7,5,28,.8)" },
```

## HTML overlays on top

- Gauges, qualifier tags, anchored labels, CTA lower thirds, follow chip, end card.
- Anchored labels: `anchor(t, set, localPoint)` each frame; guard `a.ok`; clamp y to the safe area.
- Fixed-position tags in the top band (y 250-480) during OUT/SIDE; right column during FULL.
- End card: headline in a dark glass box at top 300 (~92 px), follow line in a dark box lower down (42 px),
  over the hero's bloom; settles ~0.5 s before the end and holds still to the last frame.

## Captions (world-specific look, shared text)

- Inter Tight 800, white, soft dark shadow (`0 3px 16px rgba(7,5,28,.92), 0 0 3px ..., 0 0 30px ...`),
  emphasis words amber with a pop scale and glow.
- `layout()` tries 62/58/56 px in the mode's region, and in SIDE may widen leftwards by up to 150 px
  (never past the face) to keep two lines.
- Word spacing: put `marginLeft: "0.26em"` on inline-block word spans; spaces were lost around
  emphasised words otherwise.
- The hook is its own composition: bigger rows revealed word by word on the voice; the key word
  ("compression?") arrives letter-spaced wide and squeezes together with a glow pulse.

## Without a presenter

Drop Front's canvas, the face mask and hand-offs; keep Back + overlays + captions; frame cameras with
`c` around the caption band instead of a person.
