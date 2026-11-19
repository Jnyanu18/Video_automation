# Shaders and materials walkthrough

Source: `template/cosmos/mats.ts`, `template/cosmos/parts.tsx`. All per-frame change is a uniform
or a buffer attribute; geometry and materials are built once.

## 1. The additive-glow contract

Every glow material shares these settings:

```ts
new THREE.ShaderMaterial({
  uniforms: { ..., ...FACE },          // FACE = shared face-mask uniforms (same objects in every material)
  vertexShader, fragmentShader,
  transparent: true,
  depthWrite: false,                   // glows never occlude each other or the glass
  blending: THREE.AdditiveBlending,    // light adds up
  premultipliedAlpha: true,            // tell three the colour is already multiplied by alpha
});
```

and every fragment shader ends the same way:

```glsl
vec3 oc = vC * a * vA * uOpacity;                       // premultiplied colour = colour x profile x alpha
gl_FragColor = vec4(oc, clamp(max(oc.r, max(oc.g, oc.b)), 0.0, 1.0));
#include <colorspace_fragment>                         // linear -> sRGB like built-in materials
```

### Why alpha = brightest channel

- The Back canvas is opaque (dark sky behind everything), so the alpha written there is irrelevant.
- The Front canvas over the footage is transparent: `gl={{ alpha: true, premultipliedAlpha: true }}`.
  The page composites its pixels as `out = canvas.rgb + footage * (1 - canvas.a)`.
- With a stock additive shader the alpha is 1 (or the sprite's alpha) over the **whole quad**, so a
  sprite's dark corners write `rgb ~ 0, a ~ 1` and the footage beneath becomes black: a black square
  around every point, halo and mote.
- Writing `a = max(r, g, b)` of the premultiplied colour makes dark pixels transparent, the bright core
  opaque and the falloff partially covering: the glow composites as light over the footage, the same
  way it looks over the dark sky.
- Tried first: CSS `mix-blend-mode: screen` on the canvas. It removes the boxes but makes the hero
  far too faint against bright footage. Premultiplied output is the fix that keeps the glow's strength.
- Normal-blended materials (`textMaterial`, glass `MeshPhysicalMaterial`) output straight alpha as
  usual; they are fine on both canvases.

## 2. `glowMaterial`: glowing points

Vertex shader responsibilities:

```glsl
attribute float size; attribute float alpha; attribute vec3 aColor;  // per point
uniform float uScale, uFog, uMax, uNear;
vec4 mv = modelViewMatrix * vec4(position, 1.0);
gl_Position = projectionMatrix * mv;
float d = max(0.001, -mv.z);
float s = size * uScale / d;                 // world diameter -> pixels; uScale = 960 / tan(fov/2)
vA = alpha * exp(-pow(uFog * d, 2.0));       // exp2 fog matching scene FogExp2
if (uNear > 0.0) vA *= smoothstep(uNear * 0.4, uNear, d);   // fade points that reach the lens
vA *= faceKeep(gl_Position);                 // face mask (below)
if (s < 1.6) { vA *= s / 1.6; s = 1.6; }     // never sub-pixel: dim instead of shrinking (no shimmer)
gl_PointSize = min(s, uMax);                 // clamp huge near points
```

`uScale` must be updated when the fov changes: `pxScale(fov) = 960 / tan(fov/2 in rad)` (960 = H/2).

Fragment profiles (`r` = distance from sprite centre, 0..1, discard beyond 1):

| Variant | Profile | Use |
|---|---|---|
| default | `exp(-r*r*4)*0.5 + exp(-r*r*30)` | hot core + soft skirt: particles, node cores, pulses |
| `soft` | flat disc with a faint ring and centre | bokeh, out-of-focus things |
| `gas` | `exp(-r*r*3.2)*(1-r)` | huge, faint nebula puffs (`maxSize` up to 1024, size ~10 world units, alpha ~0.2) |

`makeGlow(n)` allocates position / aColor / size / alpha buffers and returns `set(i, p, colour, size, a)`
and `commit(rig, opacity)` (flags buffers dirty, sets uScale, fog, opacity). `GlowPoints` zeroes alphas,
calls your `fill`, commits, in `useLayoutEffect` every render. Unused slots stay at alpha 0.

## 3. Story-driven point clouds: `galaxyMaterial`

When thousands of points must move together, put the story in uniforms and compute in the vertex shader:

- `uRot`: differential rotation `ang = uRot * (0.6 + 6/(r+6))` (inner arms faster).
- `uSliceY`, `uSliceHalf`: a soft band `inS = 1 - smoothstep(half, half*1.7, |y - sliceY|)`.
- `uLift`, `uContract`: lift the band and pull it toward the axis.
- `uStream`, `uStreamTo`: per-point staggered (`aRnd`) flight of the band to a point.
- `uGlow` (band turns cyan and grows), `uDim` (everything else dims to 16%), `uWave` (a radial
  brightness ring sweeping outward on a cue word), twinkle from `uTime` and `aRnd`.

The CPU only writes ~12 uniforms per frame from `galaxyState(t)`, which overlays can also read.
Use the same pattern for any "the crowd does one thing" moment (a sweep, a squeeze, a split).

## 4. Instanced textured tiles: `tileMaterial`

`InstancedMesh(PlaneGeometry, tileMaterial(atlas), N)` with per-instance attributes `aAtlas` (cell in a
4x2 canvas atlas), `aRnd`, `aTint`. The vertex shader reads the instance centre from `instanceMatrix`
to apply the same rotation/slice logic as the points, so tiles and points move as one galaxy. Additive
with a near fade (`smoothstep(0.6, 2.0, d)`) so tiles passing the lens vanish instead of filling the frame.
The atlas itself (`tileAtlas()` in `tex.ts`) draws recognisable things: web page, photo, code, video,
map, chart, chat, document.

## 5. Text on glass: `textMaterial`

Normal blending (text must not add to the bloom). Uniforms: `map`, `uOpacity`, `uTint`, `uFog`, `uGlitch`, `uTime`.
Glitch = rows (11 bands) randomly offset per 1/18 s tick, RGB split of `0.012*uGlitch`, tint toward
magenta by `0.55*uGlitch`, random row dropouts. Keep a calm base (0.06) and short spikes:

```ts
const spike = 0.35 * Math.pow(Math.max(0, Math.sin(t * 2.1)), 30) + Math.exp(-(((t - t0 - 0.15) / 0.18) ** 2));
const glitch = 0.06 + 0.5 * Math.min(1, spike);
```

A constant strong glitch made the "Lossy" card unreadable.

## 6. `haloMaterial`: big billboarded glow

A unit plane billboarded in the vertex shader (`mv.xy += position.xy * uSize` after transforming the
centre), radial `pow(1 - r, uPow) * uI`. Higher `uPow` = tighter core. Use for bright cores larger than
point sprites allow (the hero, flashes when a tile lands, a ribbon's travelling spark). Keep `uI`
around 0.2-0.6; a halo at 1+ over a large size washes out the frame.

## 7. Sky: `nebulaMaterial` + stars

- BackSide sphere radius 2500 at the camera position, `depthWrite/depthTest: false`, `renderOrder -10`.
- 5-octave fbm noise on the view direction: base gradient (near-black to deep indigo by height), a violet
  veil, a cyan veil biased to +x, a magenta veil biased to -x, `uLift` to dim it, slow drift from `uTime`.
- Stars: 5200 glow points on a 2000 radius sphere, 15% cyan-white, 10% lavender, 3% warm, sizes skewed
  by `random^3`, 400 of them twinkling. Same group as the sphere so they follow the camera.

## 8. Motes: `motesMaterial`

Positions in a unit cube scaled by `uBox`, drifting with time, then wrapped around the camera:

```glsl
p = mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5 + uCam;
```

Faded near the lens (`smoothstep(0.6, 2.2, d)`) and toward the box edge. Two layers: 1400 hard dust
specks (`uMax 12`) and 90 soft bokeh discs (`uMax 200`). Gives foreground parallax in every shot for free.

## 9. Lit materials and the environment

- Glass: `MeshPhysicalMaterial` dark violet body (`#1d1660`), `roughness 0.14`, `clearcoat 1`,
  `clearcoatRoughness 0.06`, `opacity ~0.6`, `envMapIntensity 1.8`, `depthWrite: false`.
- Hero / emissive solids: `MeshPhysicalMaterial` with `emissive` + `emissiveIntensity` driven by story
  (`0.35 + 0.5 * glow`), `flatShading` for facets.
- Pure light lines / frames / cores: `MeshBasicMaterial` with colour multiplied above 1
  (`new THREE.Color(c).multiplyScalar(1.4..2.4)`) and `toneMapped: false`, so they exceed white and
  trigger the bloom.
- `EnvMap`: `PMREMGenerator.fromScene(scene of 5 coloured planes, 0.035)` assigned to
  `scene.environment` with `environmentIntensity ~0.9`. Gives glass coloured reflections without HDRIs.
- Lights per set: `hemisphereLight(["#5a3dd0", "#07051c", 0.5])` + coloured `pointLight`s with
  `decay={2} distance={0}` and physically large intensities (40-900). Put a light inside every emissive
  hero and at flashes; vary intensity with the story (`20 + 140 * works`).

## 10. The face mask (in every glow vertex shader)

```glsl
uniform vec4 uFace; uniform float uFaceK;   // box in output px, strength 0..1
float faceKeep(vec4 clip){
  vec2 ndc = clip.xy / max(1e-4, abs(clip.w));
  vec2 px = vec2((ndc.x + 1.0) * 540.0, (1.0 - ndc.y) * 960.0);   // W/2, H/2
  vec2 d = max(uFace.xy - px, px - uFace.zw);                      // signed distance outside the box
  return 1.0 - uFaceK * (1.0 - smoothstep(0.0, 110.0, max(d.x, d.y)));
}
```

`FACE` is one object whose uniform values are spread into every material, so setting
`FACE.uFace.value.set(...)` once per frame updates all of them. The 540/960 constants assume 1080x1920.

## 11. Render order convention (transparent sorting is manual)

| renderOrder | What |
|---|---|
| -10 / -9 | nebula sphere / stars |
| 1-3 | far glass, galaxy points, tiles, network edges and nodes |
| 4 | slicing plane, big glass cube |
| 5 | halos |
| 6-7 | hero shell / edges, ribbon, cube frames |
| 8 / 9 / 10 | glass card body / edge band / text plane |
| 12 | free-floating glyph planes |
| 20 / 21 | motes dust / bokeh (always on top, nearest the lens) |

`frustumCulled = false` on everything whose vertices move in a shader or that wraps around the camera.
