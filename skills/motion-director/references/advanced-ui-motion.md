# Advanced UI motion — selectively adopted direction

Use this toolkit for a prompt-led UI study or SaaS/product trailer. It extends the existing motion, brand and reference rules. It does not replace every project with a technical showreel. The defaults below are proposed settings, not keyframes recovered from the uploaded references.

For layered shadows, projected parallax, stronger grid bursts and contact ripples use [depth-and-impact.md](depth-and-impact.md) with `starter/src/depth-motion.ts`. Its 0.012s-per-cell burst preset is separate from the existing 0.04s-per-cell ripple preset; do not silently change older projects.

For measured line staggering, separate hero/internal reveals and action-centered zoom/recoil use [type-and-camera.md](type-and-camera.md). The 10px text-focus and 16px macro-background blur settings are contextual presets, not replacements for all existing focus treatments.

For tactile extrusion, comic impacts and cross-material transformations use [mixed-media.md](mixed-media.md). Actual acrylic shaders, inflated glyph meshes and fully covering 3D wipes require additional implementations; the existing source examples do not acquire those capabilities from a preset name.

For approved variable-font axes, frame-quantized beat swaps and corrected goo masks use [high-kinetic-ui.md](high-kinetic-ui.md). Its stronger style remains optional; existing font families, physical trajectories, truthful linear telemetry and quiet holds stay valid.

## What to prioritize

Prefer spatial continuity, physical response and choreographed attention when one state becomes another. Avoid a sequence of unrelated panels that merely slide and fade. A shared hero object can be a container, card, image, word or cursor target. Keep its identity and anchor legible during transformation.

Use deliberate hard cuts for new thoughts, beat accents or scene contrasts. Child crossfades and small position adjustments remain useful while the shared parent morphs. Do not interpret the direction as a ban on opacity or all cuts.

## Timing and physics, with corrected numbers

The supplied `cubic-bezier(0.16,1,0.3,1)` reaches about **75.2%** of its distance after 20% elapsed time, not 85–90%. It is a fast-decay Bézier, not literally an exponential function. Use the curve for its measured feel. If that 85–90% target is actually required, the optional `(0.10,1,0.12,1)` preset reaches about 86.7% at 20%; preview the result before selecting it.

`stiffness:280, damping:22, mass:1` is a useful expressive preset: an ideal normalized step has approximately **6.45%** overshoot. A spring's apparent duration depends on its settling threshold and implementation. Do not stretch/truncate every response to the same arbitrary duration or reset its velocity when a new target arrives. `easeOutBack` is an authored easing alternative, not an interchangeable physical mass-spring solver.

Use distinct behavior for large shells, type, small controls and camera motion. Stable UI/camera presets may have almost no overshoot. A mandatory 5–8% overshoot on every property can clip content or move a cursor away from its target. Keep opacity, truthful data, aspect-safe bounds and invalid dimensions clamped independently of expressive position.

Avoid default linear hero/UI travel. Constant-speed loops, direct drag tracking, timecode, progress bars and real-time data playback can legitimately use linear time. Physics-driven free fall or circular paths have their own motion equations; do not replace every physically meaningful trajectory with the same Bézier.

`starter/src/motion-policy.ts` supplies tested presets and planning helpers. These are utility functions; a template must explicitly call them from its frame-driven animation code. Their presence does not automatically upgrade an unsupported scene.

## Micro-press and cursor choreography

Treat `scale 1 → 0.95` and 120ms as a starting preset, not a law. In this preset **120ms is the compression phase**, with a separate spring release. At 60 fps it quantizes to 7 frames; at 30 fps, 4 frames. Tune travel to element size and reading needs. In a real interactive app, do not delay a network request merely to wait for a decorative press animation.

For rendered UI actions: cursor arrival → contact/press → response → readable settlement. Specify the actual target point and click frame. Use a curved cubic path when it suits the trajectory; evaluate the path with eased temporal progress. The cursor must meet the control after camera/layout transforms are applied, not a stale screen coordinate.

Camera follow and push-in are optional. A proposed 1.35× zoom needs focal-point, safe-area and clipping checks. Hold a clear frame while the viewer reads. Do not zoom every click or move camera and hero independently without a common coordinate system.

## Shared container and cross-medium continuity

Keep one **logical** parent shell across related UI states. In a frame renderer this means a common geometry/state function; it need not always be literally the same DOM node. Derive width, height, center, radius, color and contents from explicit state timings. Never depend on a browser's wall-clock CSS layout transition to generate video frames.

Cross-dissolve outgoing/incoming contents over the shell resize. Small ~8px offsets are one option. Remove outgoing content before it becomes illegible, reveal incoming details when enough space exists, and keep typography independent of severe shell distortion. Interpolate colors only when permitted by the chosen palette; a polarity snap or mask can preserve a strict palette better than passing through muddy grays.

For cross-device drag/match cuts, persist the asset ID, focal crop, world anchor and target bounds. Recompute its projection through both the scene and camera transforms. Mobile, desktop and physical mockup states need real approved assets or explicitly new illustrations. Do not substitute an unrelated photo at the cut.

Metaphor funneling is an optional transition: several cards collect into a meaningful object, full coverage hides the scene change, then a zoom reveals the destination. It needs implemented vector geometry and an explicit cover/cut frame; the metaphor should relate to the product.

## 2.5D layouts and procedural systems

- **Perspective:** 1200px is a useful initial stage distance. Check foreshortening and text size at the actual output resolution. The proposed rotateX(22°)/rotateZ(-12°) layout is a 2.5D tilted grid, not a mathematically exact isometric projection.
- **Cylindrical arrays:** position cards on a common radius, control depth ordering, synchronize media, and bring the selected card to a known flat target. A normal gallery entrance is not a rotating cylinder. Budget video decoder and blur costs on the actual worker.
- **Tilted dashboards:** use real chart coordinates and their projection. An SVG spline on a flat card does not automatically travel through a real Z-axis. Show glow/area fill only if the brand and contrast rules allow it.
- **Radial stagger:** define distance units. Use `delaySeconds = (distancePx / cellSpacingPx) * 0.04`, capped to a scene-appropriate budget, initially 0.45s. Multiplying raw pixel distance by 0.04 seconds can accidentally create delays many seconds long. Normalize the total spread to preserve the reading hold.
- **Ridges:** seed the noise; define world-space x/z scales; draw rows back-to-front with opaque lower fills for occlusion. Do not label a sine wave as Perlin noise. Existing gym waves are sinusoidal and beat-driven.
- **Metaballs:** use compatible blur/alpha-threshold compositing, a controlled filter region and stable frame-driven positions. Difference blending changes resulting colors; mask-based polarity inversion can preserve a strict palette. Neither technique is a full fluid solver.

## Data, words and visual polish

Use digit-ribbon odometers for selected hero metrics when they improve clarity. Preserve approved values, separators, decimals, signs, units and factual context. A simple counting number is not an odometer. No fade-in ban should force an unsupported or unreadable treatment onto every small metric.

Tie an odometer's progression, spline reveal, leading dot and selected markers to one timeline/data model. Decorative telemetry must not masquerade as verified revenue, customer counts, performance, FPS or product capability. Keep actual HUD timecode/progress truthful and separate from spring overshoot.

Rack focus can direct attention through a type stack: active text crisp, inactive lines subdued. Blur 8px/opacity 0.25 is a starting preset. Check caption contrast and legibility at phone size. Use actual generated voice alignment for keyword highlights/icon strokes. Quantize cues to frames: nearest-frame timing at 60 fps has up to 8.33ms quantization error, at 30 fps up to 16.67ms, before any alignment/encoding uncertainty. Do not promise exact arbitrary millisecond synchronization from a frame-based export.

Choose structural anchors by product: a quiet viewfinder HUD for an appropriate reel, or a step header/split-screen message for a SaaS workflow. Keep overlays outside the content's safe area and update them consistently at cuts. Match labels and telemetry to the real project, not copied reference text.

Glass, specular borders, dots, crosshairs, vignettes and grain are optional materials. The 20px blur, 8% translucent fill, 35% specular alpha and 3% grain settings are presets, not universal defaults. Flat Neo-Swiss work may deliberately omit glass/glows/gradient chart fills. Preview backdrop filters on the target worker, keep labels high-contrast and foreground HUD lines sharp.

## Modular archetypes, not mandatory scripts

1. **Shared-container study:** input/dot → player → slider → segmented control/chart → command/search → action → optional return to the initial state. Retime the number of states to the requested duration. For a seamless loop, match geometry, content, opacity, asset crop, procedural seed and motion state across the boundary; avoid a duplicate held endpoint. A resetting HUD may be intentionally visible and should not be called seamless.
2. **SaaS launch:** hook → one concrete input/action → output breadth → approved proof → brand/CTA. A light-to-dark generation transition is one option, not a requirement. Real assets and verified proof are dependencies. Duration can be 20–45 seconds when the brief needs it; do not inflate a requested 15-second ad to fit the template.
3. **Neo-Swiss reel:** select techniques from [neo-swiss-kinetic.md](neo-swiss-kinetic.md). Palette flips, HUD, radial grids, liquid, ridges and compositing are available ideas; use only implemented, relevant techniques. For ads, keep the message and CTA ahead of effect variety.

## Capability boundaries in this package

| Mechanism | Current support |
| --- | --- |
| Basic type/UI/counter/gallery/orbit/simple illustration | Standard registry, with documented limits |
| Per-character springs, shell continuity, squash/stretch | Source example: `examples/shared-container-study` (historical 10-second study, not a ready-made 15-second seamless loop) |
| Neo-Swiss HUD/type/morph/rings/liquid/waves/bento | Source example: `examples/neo-swiss-gym` (15s/60fps landscape) |
| Bézier timing, curved path sampling, bounded radial delay, timecode, frame alignment | Tested planning utilities in `starter/src/motion-policy.ts`; template integration required |
| Full 3D card cylinders, cross-device/physical match journey, true odometers, Perlin ridges, rack-focus caption system | Reconstruction guidance; needs custom component/assets and visual testing |

The API interpreter can select `shared-container-ui`, `saas-launch` or `neo-swiss-kinetic` as an explicit advanced execution profile. These return a custom-renderer handoff rather than silently using basic panels. The shared-container and gym examples are execution references; a full SaaS-launch template is not bundled. Host-side registration, adaptation, validation and isolated execution remain required. Ordinary projects keep the standard path.

Do not invent renderer properties, claim full reference fidelity from a capability name, or mistake instructions for working animation code. Retain the existing reference-comparison and approval/export rules. This update does not request or authorize video generation by itself.
