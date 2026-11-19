# Set authoring recipe

A **set** is one idea made into a place: a 3D arrangement with a hero action that lands on a word,
lights of its own, labels and sound events. Examples in `template/cosmos/sets/` (galaxy, network,
board); the Film3D project also had cubes, books, recall, cosmos, stem/end.

## 1. Design the set from the line

Write one row before any code:

| line (spoken) | the real thing on screen | what changes, on which word | label (exact) | hand-off? |
|---|---|---|---|---|
| "We used all of that data and compressed it into an LLM" | the data galaxy | a glowing plane slices a thin layer on "used", the layer lights cyan on "compressed", streams away on "into an LLM" | "Real training sets: a filtered slice" | no |

Rules of thumb:

- Literal metaphors made physical read best: data as a galaxy of real-looking tiles, compression as a
  big glass cube flowing into a small amber one at the true size ratio, learning as books whose
  threads braid into one pattern, a rule as one ribbon that scattered points collapse onto.
- Show real things in the style (a web page, code, a map, a cloth-bound book, Maxwell's equations),
  never a labelled box.
- One brightest thing per shot, usually the hero or the insight in amber.
- Something meaningful changes every 1.5-3 s; hold a comparison at least 2-3 s once complete.

## 2. Skeleton

```tsx
export const XxxSet: React.FC<{ fade: number }> = ({ fade }) => {
  const rig = useRig();
  const t = rig.t;
  const q = poseQuat(poseInSet("xxx", rig.pose));          // card orientation facing the lens
  const m = useMemo(() => ({ /* geometries, materials, canvas textures */ }), []);
  // story ramps, all from T cues
  const appear = popS(t, T.word1, 13);
  const flow = progS(t, T.word2, T.word3 - T.word2, (x) => x);
  const flash = Math.exp(-(((t - T.word4) / 0.3) ** 2));
  return (
    <group>
      <hemisphereLight args={["#5a3dd0", "#07051c", 0.5]} />
      <pointLight position={[-6, 5, 6]} color={VIOLET} intensity={110} decay={2} distance={0} />
      <pointLight position={[0, 0, 1.5]} color={AMBER} intensity={30 + 60 * flash} decay={2} distance={0} />
      {/* solids: glass, hero, modelled objects */}
      {/* GlowPoints: particles, streams, node cores */}
      {/* GlassCard: in-world text objects */}
      {/* Halo: the bright core */}
    </group>
  );
};
```

Multiply every opacity by `fade`. Return `null` for elements before they appear (saves draw calls).

## 3. Reusable motion patterns

- **Stagger inside one ramp**: `smooth(k * 1.4 - random("d"+i) * 0.4)`.
- **Quadratic Bezier flight** (arcs instead of straight lines):
  `mix3(mix3(a, mid, k), mix3(mid, b, k), k)` with `mid` lifted (`+[0, 1.2, 1.5]`).
- **Flow along a path** forever: `u = (t * speed + random("p"+i)) % 1`, alpha `sin(u * PI)`.
- **Collapse onto a curve**: each point has a scatter position and a curve parameter; mix scatter ->
  `curveAt(u)` by a staggered collapse ramp; colour lerps palette -> amber as it lands.
- **Draw a tube on**: `TubeGeometry` of a `CatmullRomCurve3`, `geo.setDrawRange(0, floor(count*draw/6)*6)`.
- **Reveal a network**: node scale `smooth((reveal * N * 1.4 - i) / 6)`; activation wave
  `exp(-(((t - T.x) * 7 - layer * 2.2) / 1.6) ** 2)`; pulses along edges as GlowPoints.
- **Spiral into the hero**: angle `g * 2.2 * PI + i * 1.6`, radius `lerp(1, 0, g)`, scale shrinks with a
  tight smoothstep, opacity cuts in the last 15%.
- **Glyph swap**: two planes at one position, cross-fade opacity as it lands (`+` becomes `−`).
- **Flash on landing**: Gaussian pulse into a `Halo` size/intensity, a `pointLight` intensity and an
  expanding ring of GlowPoints (`r = 0.2 + k * 1.8`, alpha `exp(-k * 2.2)`).
- **Glitch for error/loss**: `textMaterial` `uGlitch`, magenta edge, magenta point light, a magenta
  strike-through chip in HTML.
- **Rhythmic life**: twinkle `0.6 + 0.4 * sin(t * 3 + i)`, bob `sin(t * 0.9 + i * 1.7) * 0.12`, slow spin.

## 4. In-world text vs HTML label

| Use a GlassCard with a canvas texture | Use an HTML Chip anchored to a 3D point |
|---|---|
| the text **is** an object in the story: an answer card that comes out of the hero, a law card that spirals into it, a practice card, a glyph that moves | the text **names** something: "one pattern", "weights ~0.8 TB", "given", qualifiers, gauges, CTAs |
| it must move/rotate with 3D depth | it must be crisp and readable at phone size |

Canvas text textures: draw at about 300 px per world unit (`textTex(Math.round(w*300), Math.round(h*300), lines)`)
with font sizes 90-290 px so the texture stays sharp when the card fills a third of the frame.

## 5. Layout constants and helpers

- Put the set's key points in `L` (rig.ts) in set-local units: hero at the origin when possible.
- Export pure helpers for anything an overlay or event needs: `ribbonAt(u)`, `glyphPos(id, t)`,
  `bookPos(i)`, `cubeState(t)`, `galaxyState(t)`, `stemAt(i)`. Overlays anchor to these and events
  import their times, so picture, labels and sound share one definition.

## 6. Scale and honesty

- When the film compares sizes, draw at the true ratio (Film3D: ~60 TB of text vs ~0.8 TB of weights
  as cubes of edge 4.2 : 1.0, the cube-root of the volume ratio) and label it "illustrative" if the
  numbers are estimates.
- On-screen numbers come only from the fact-check notes, word for word.

## 7. Check each set before the next

Snapshot 6-10 seconds across the set (each cue word, the fly-through in and out, the label's first full
frame, the held comparison). Check: subject placement for the mode, edges unclipped, labels >= 34 px,
one brightest thing, depth (near motes, mid subject, far sky/props), nothing bright on the face in SIDE.
