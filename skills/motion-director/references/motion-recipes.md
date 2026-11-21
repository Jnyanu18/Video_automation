# Reconstruction recipes

These are proposed engineering recipes grounded in visible motifs in the atlas. Easing, spring constants, layer counts, and durations are **starting settings**, not values recovered from the MP4s. At 60 fps convert seconds with `Math.round(seconds * fps)`; keep a single frame clock.

## Shared motion constants

Use a fast-out/slow-in cubic Bézier `(0.16, 1, 0.3, 1)` for clean panel entrances. A reasonable small UI spring starts at damping 19, stiffness 130, mass 0.7. Use critical/near-critical damping when a prompt asks for serious or premium behavior. Scale travel by the design canvas, not arbitrary viewport pixels. Reduce spring overshoot for large text and entire screens.

Stage attention: main shell starts at frame 0; main message at +4–8 frames; supporting content at +10–18; decorative motion last. An element should not be simultaneously blurred, rotating, scaling, bouncing and changing color without a specific purpose.

## 1. shared-anchor — R01, R02, R08

**Mechanism:** morph a persistent shell, then reveal its contents. Capsule → spinner → capsule → panel is visibly stronger when center and perceived mass remain continuous.

- State A: `(cx, cy, widthA, heightA, radiusA)`.
- State B: interpolate to `(same cx, same cy, widthB, heightB, radiusB)` over roughly 0.25–0.5s.
- Delay new text until the panel has expanded about 60%; remove old text before it gets stretched.
- Preserve a shared image's crop with `object-fit: cover`; interpolate its crop/viewport rather than swapping to a differently framed asset.
- Cursor arrives before contact, compresses briefly at click, then the object responds. UI success must follow the action, not precede it.

The starter's `ui` scene demonstrates a centered pill expanding into a panel with delayed contents. R08's full multi-control chain needs a custom finite-state component with all states driven from frame indices.

## 2. kinetic-type / feature-burst — R03, R06, R07, R09, R10

**Mechanism:** large type reveals through a clipping mask or swaps at a stable baseline.

```ts
const local = frame - revealStart - wordIndex * staggerFrames;
const t = interpolate(local, [0, entryFrames], [0, 1], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  easing: Easing.bezier(.16, 1, .3, 1),
});
// Parent clips overflow; child transform is translateY((1-t)*110%).
```

Use 2–5 words for a fast accent. Keep a second complete sentence out of a sub-half-second card. Tracking can compress from ~0.12em to the final brand tracking, but bound layout first so it does not clip at the edge. Limit RGB offset shadows to short reel accents; product text should settle to crisp aligned glyphs. Do not reproduce repeated tiny technical footers as essential user content.

Starter: `type` with `reveal`, `stagger`, or `tracking`. Rapid phrase swaps can be adjacent short type scenes with cuts; a voiceover sentence still needs reading/speaking time.

## 3. metric-payoff — R01, R04, R06, R07, R08

**Mechanism:** simplify a dense demo to one large number, synchronized chart, and a meaningful label.

Compute one eased progress `t` and derive count, line reveal, ring angle, and tooltip position from it. Use tabular numerals so changing digits do not shift layout. Add separators and decimals only according to the supplied value. An odometer should roll digits rather than randomize the entire number; precompute all digit positions and seek from frame.

For a real series, chart coordinates must come from the provided data. A normalized line reveal is `clipWidth = t * plotWidth`, not a new random line on each frame. Let the final number hold ~0.8–1.5s for a payoff. Claims must be supplied/verified or visibly labeled as demonstration data.

Starter: `metric` implements a counter with a decorative fixed trend curve. It is suitable for illustrative motion, not a faithful visualization of uploaded time series. Extend it with actual `dataPoints` and schema changes before depicting a real trend.

## 4. gallery-to-fullscreen / device-match — R02, R05, R06, R11

**Mechanism:** the selected tile becomes the next scene or device screen.

Measure tile bounds in the design coordinate system, hold the selected image ID/crop, and interpolate its bounding box to full screen. Other cards recede or lose opacity after selection. Radius reaches zero only as the image reaches the frame edges. Once full-screen, match-cut to a device layout containing the same image, then scale the device back to reveal context.

For a responsive layout, compute separate target bounds for portrait/square/landscape. Preserve focal points of photography. A live-action hanging-print segment needs source footage; do not approximate hands with abstract shapes and call it a match.

Starter `gallery` provides editable staggered cards; the actual full-screen bridge/device chain is a custom extension.

## 5. carousel-3d / gallery-depth — R04, R06, R11

**Mechanism:** cards share a shallow perspective stage; selected items move toward the viewer.

For a cylindrical carousel with angle `a = baseAngle + time * angularSpeed`, put cards at `x = R * sin(a)`, `z = R * cos(a) - R`, rotate Y by `a`, and project from a fixed camera. Sort consistently by depth if using SVG/canvas; CSS `preserve-3d` is an alternative only after checking Chromium rendering. Use a small angular speed when text must remain readable.

A reflection is a vertically flipped duplicate, clipped to the lower stage with a fading mask. It must not be independently animated. Budget performance before adding blur to every reflected video. Keep videos muted unless their audio is intentionally mixed into the composition.

Starter `gallery` uses shallow entrance perspective; it does not implement a spinning video cylinder. For repeated media instances, test decoder/resource limits on the actual worker.

## 6. phase-grid — R03, R07, R10

**Mechanism:** repeated primitives vary by distance from a moving center, rather than independent random keyframes.

Let cell center be `(x,y)` and wave center `(cx,cy)`. Compute `phase = hypot(x-cx,y-cy)*frequency - time*speed`. Use `wave = (sin(phase)+1)/2` to control scale, rotation, opacity, or corner radius. Limit to two main properties at once. Seed optional per-cell variation once from a stable index.

Use an SVG grid or canvas for large fields. A 12×20 field is enough for many 1080p compositions; avoid making several thousand React DOM nodes with separate CSS filters. A ring-shaped emphasis can use `exp(-((distance-radius)/width)^2)` to modulate cells.

Custom component required; choose this as a 1–2 second accent, not a moving background behind paragraph copy.

## 7. orbital-network / particle-glyph — R01, R03, R09, R10

**Mechanism:** keep particle identities stable across sphere, cloud, path, and text states.

For a sphere, a deterministic Fibonacci distribution is convenient:

```ts
const y = 1 - 2 * (i + 0.5) / count;
const radius = Math.sqrt(1 - y * y);
const angle = i * Math.PI * (3 - Math.sqrt(5));
const x = Math.cos(angle) * radius;
const z = Math.sin(angle) * radius;
// Rotate around Y using elapsed seconds, project, then depth-sort.
```

For glyph particles, load the actual font, rasterize the desired text to an offscreen canvas once, sample opaque pixels into a fixed point set, then interpolate from each particle's source to assigned target. Use the same count in both sets; deterministic spatial sorting or assignment reduces chaotic crossing. Do not pick fresh target points every frame. Add restrained overshoot or a short hold after particles settle so the word becomes readable.

For high counts, use canvas or a tested WebGL/Three renderer with fixed camera and a frame-driven shader time uniform. Avoid nondeterministic real-time physics. Bake simulations when necessary.

Starter `orbit` implements a small rotating SVG point sphere. Glyph morphing, avatar networks, bloom, and complex 3D knots require custom components/assets.

## 8. ring-type / cylindrical-type — R03, R09

**Mechanism:** repeated phrases follow concentric circular paths or wrap around a cylinder.

Flat rings: use SVG `<path id=...>` circles and `<textPath href=...>`, explicit `startOffset`, tracked text and frame-driven rotation. Give rings different radii and small speed differences; keep only the hero phrase semantically important.

Cylinder: map each character's horizontal coordinate to angle, project its `(R*sin(a), y, R*cos(a))`, and depth-sort. Fade or occlude the back face; screen-flat text rotated as a whole will not produce the same dimensional effect. Use a dedicated 3D text/texture plane when required. Texture atlases reduce per-glyph overhead.

Custom component required. Preserve font licensing and crispness at the target resolution.

## 9. shape-morph / liquid form — R03, R09

**Mechanism:** compatible paths or a signed-distance field carry continuous shape identity.

For an SVG circle-to-triangle-to-star morph, normalize path commands and point count, choose a consistent winding order and starting vertex, then interpolate matched coordinates. A crossfade is a valid stylistic option but should not be called a shape morph. Keep guide paths as separate subdued geometry.

For liquid blobs, use a deterministic metaball/SDF field or a precomputed compatible SVG path sequence. The field value can be a sum of `r_i^2 / distance_i^2` with frame-driven centers. Smooth the threshold and render consistently; do not use browser real-time physics. Add the outline/glow as a second field, keeping the title legible.

Custom component required. A plain soft gradient is only a placeholder for this effect.

## 10. terrain-lines / ribbon-field — R07, R09, R10

**Mechanism:** a family of paths share controlled displacement.

For each baseline `y_j`, compute `y(x) = y_j - peakHeight * exp(-((x-center)/width)^2) * sin(x*frequency + time*speed + j*phaseOffset)`. Use 20–50 SVG paths and clamp displacement so adjacent lines remain legible. Slight phase offsets create flow without frame-to-frame randomness.

Ribbons require a filled band between two nearby curves, a subtle gradient, and an ordering that respects foreground/background. A perspective mesh with coherent normals can provide real 3D lighting; use that only when the worker can reproduce it. Keep italic or fine serif type separate from busy ribbon intersections.

Custom component required.

## 11. step-explainer / draw-on / caption-sync — R11

**Mechanism:** one process step at a time, with a persistent progress rail and a concept revealed when spoken.

- Draw editable SVG paths with `pathLength=1`, `strokeDasharray=1`, `strokeDashoffset=1-progress`.
- Reveal filled illustration groups after their outlines, rather than drawing a raster image through arbitrary stripes and claiming it is editable vector art.
- Group the illustration by conceptual role: soil → roots → water → stem → leaf. Synchronize group starts to actual word/phrase timing from generated speech.
- Show captions from measured alignment. For word highlighting, accumulate character timing into words, preserving punctuation and language-specific segmentation. Do not infer word timing by equal division when the provider supplies alignment.
- Keep all captions inside aspect-specific safe bounds; avoid putting caption text over the illustration's key labels.

Starter `illustration` has editable SVG workflow and growth examples. Rich hand-drawn illustration, full step rail, and word-synchronized captions are custom work. Voiceover timing conversion is included; a complete caption renderer is not.

## 12. occlusion-cut — R01, R03, R05, R07, R10

**Mechanism:** a covering object allows a clean scene swap beneath it.

Options: circle grows past all corners; staggered opaque stripes fill frame; a selected card fills frame; a large logo shape occludes the camera. Change the underlying scene at full coverage, then reveal the new layout. Do not leave a blank frame between exit and entry.

Starter transition semantics: scenes occupy contiguous non-overlapping time ranges; transition duration is INCLUDED in the incoming scene's duration. The previous scene is frozen underneath the incoming wipe/iris/push. This keeps project duration equal to the sum of scene durations. A true overlapping transition series has different arithmetic; do not mix both models.

Hard cuts are zero-frame transitions. Prefer them whenever the visual change itself is clear; applying a wipe at every boundary weakens the contrast between moments.
