# Neo-Swiss kinetic profile

Use this profile when the user requests bold editorial motion, a kinetic showreel, or a high-energy graphic advertisement. It is opt-in, not the default for every brand or product. The user supplied the design direction; these instructions select reusable mechanisms and distinguish them from a fixed showreel script.

## Creative priority

Motion principles can be the subject of a portfolio reel. For an advertisement, the product/audience/message/CTA remains the story; selected motion techniques support it. Do not substitute a nine-effect sampler for an ad brief. An eight-beat 15s structure at 128 BPM is one useful starting point, not a mandatory template.

Resolve the actual brand kit first. A user-requested project palette may use carbon black #0D0D0F, offwhite #F4F1EA, vermilion #FF4D1C, cobalt #1649FF, lime #D6FF2A, amber #FFC700, pink #FFA6C9 and mint #2EE59D. Preserve configured brand permissions. Do not globally rebrand a saved kit because this profile is selected.

## Reusable rules adopted

- Specify a meaningful motion change roughly every 1.5–2 seconds, leaving a legible CTA hold. Do not force so many scenes that their durations exceed the requested runtime.
- Use a persistent viewfinder/HUD if it supports the desired technical aesthetic. Generate its timecode from integer frame count and telemetry from the actual composition. Keep it subordinate to the message.
- Maintain HUD geometry across cuts. White HUD marks need a contrast-safe perimeter or backing on light scenes. Do not let fixed white marks disappear on offwhite backgrounds.
- Alternate a small set of high-contrast foreground/background pairs. No random gradients or accidental intermediate hues. Overlap, texture and mask inversions require deliberate contrast review.
- Use heavy neo-grotesque type with tight tracking, per-glyph spring staging, and restrained extrusion/outline echoes. Load the actual display and monospace fonts before capture.
- Give animated elements a launch, velocity profile, weight, overshoot and settlement. Shape deformation must be distinct from simple scaling. Keep text sharp/readable and preserve momentum across target changes.
- Use frame-driven directional blur, trails and impact accents deliberately. Constant-speed timecode/progress indicators are allowed; do not apply spring overshoot to their truthfulness.
- Use seeded, subtle grain as a surface treatment. Keep HUD lines crisp. Grain should not reduce text readability or make the palette muddy.
- Mix purposeful hard cuts with selected stepped/mosaic occlusion and scale changes. Align chosen cuts with a measured or explicitly composed beat grid; do not infer a beat grid from arbitrary transient peaks.

## Techniques and implementation requirements

1. **Timing/spacing:** gravity/restitution bounce; grounded contact; transient squash; onion-skin traces from previous states; ripples start at impact.
2. **Kinetic type:** independent letter offsets, tracked line layout, spring settlement and overlapping exits; stable final baseline; optional horizontal speed blur and outline repetition.
3. **Shape morph:** normalize path topology and point count for continuous interpolation. Draw guide handles/control dots as their own geometry. Named shape changes must correspond to an implemented interpolation, not a crossfade disguised as a morph.
4. **Spatial type:** SVG text rings with opposing eased rotations are supported by the gym example. Actual cylindrical 3D type requires a separate tested renderer/mesh implementation.
5. **Liquid:** deterministic metaball positions plus a thresholded blur mask. The gym example uses mask-based foreground inversion to preserve the strict palette. CSS difference blending is optional only when its resulting colors are acceptable.
6. **Generative fields:** deterministic line/particle fields with stable identities and frame-driven phase. A common composed beat envelope can drive audio and visuals; label that beat-driven rather than claiming the renderer analyzes arbitrary audio.
7. **Modular panels:** use a consistent grid, corner rules and staged hierarchy. Show relevant product information. Decorative FPS counters, Newton's cradles or graphs are optional showreel motifs, not required ad content or real business data.
8. **Compositing/pullbacks:** use actual registered scenes/assets for a video wall. The current gym example uses a training bento and collapse; it does not implement a wall of all prior scenes.
9. **Identity close:** a clear wordmark, restrained accent, meaningful CTA and a readable final hold. Never invent a real offer, address, result or signup URL.

## Implementation boundary

The basic seven-scene JSON registry cannot activate all these mechanisms by naming them. Use custom-component mode or a trusted registered template. The working example is `examples/neo-swiss-gym/`: GymAd.tsx, physics.ts, a render script, fonts, grain and original percussion. Its exact timing/copy are in the exported `plan` object. It is editable source and a concrete execution reference; production API registration remains host work.

Do not claim that a prompt, an expanded SKILL.md, or a named easing curve implements missing code. Before reusing a custom effect, type-check it, inspect representative states and boundaries, verify its frame arithmetic/assets, then render and review the result. Video quality cannot be certified by palette/schema tests alone.

The app-managed API example now classifies this as `executionProfile: neo-swiss-kinetic` and returns `needs_custom_renderer` (exit code 3) with the reviewed template location after interpretation. It deliberately does not generate a simplified seven-scene JSON substitute and present it as reference-quality execution. The host must connect the custom template/source workflow to its isolated worker. Ordinary projects retain the existing standard route.

## Example: 15-second gym ad

The fictional FORM / Training Club example uses 900 frames at 1920×1080 and 60 fps. Chapter starts are 0,112,225,337,450,562,675,787. Rounding is within half a frame of a four-beat 128 BPM grid. The story progresses from SHOW UP through strength/movement/rhythm to JOIN FORM. The bento labels training modes without fabricated performance numbers. The ending has roughly 1.5 seconds of settled readability.

Applied: HUD, flat palette flips, per-letter physics, bounce/trails, compatible polygon morph, concentric type, metaball masks, generative lines, training bento, grain and identity close. Omitted: mandatory full 3D cylinders, a separate particle-implosion simulation, unrelated Newton's cradle/FPS hero panels, and an all-scenes video wall. No live voice-generation call is required for this example.
