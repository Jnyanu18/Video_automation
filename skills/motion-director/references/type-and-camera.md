# Typography, component hierarchy and camera choreography

Use these optional treatments to give type, UI and camera movement specific jobs. Follow the saved brand, selected reference and message. This extends [physics-motion.md](physics-motion.md), [advanced-ui-motion.md](advanced-ui-motion.md) and [depth-and-impact.md](depth-and-impact.md); it does not replace editorial or wedding typography with a technical showreel.

## Typeset before animating

Load the actual font and measure its rendered line breaks at the target aspect ratio. Character counts are not font metrics. Fix layout positions before adding motion; check tracking, accents, descenders, outline width and clipping with the real copy. Reflow translated or revised text and recheck its reading hold. Segment animated characters as grapheme clusters so accents and combined glyphs remain intact.

An optional **line reveal** starts each line 32 design pixels below its resting baseline, staggered by 0.04 seconds, using `cubic-bezier(0.16,1,0.3,1)`. Scale travel to the design canvas; choose the reveal duration explicitly. The curve reaches about 75.2% travel at 20% elapsed time, not 85–90%. Quantize each line's absolute start independently to output frames rather than accumulating a rounded delay. Budget the readable hold from the last revealed line.

Per-letter springs remain a separate, valid kinetic treatment. Preserve stable final baselines and spacing, independent opacity bounds and controlled squash/stretch. Word reveals, calm holds and ordinary fades also remain useful. Choose the motion unit for the message rather than applying one reveal to every text block.

Display type with monospaced metadata can suit a technical brand; serif display type with a restrained grotesk can suit a wedding or editorial film. Respect approved font assets and fallback behavior. All caps and outlined headlines are optional choices. Check actual outline bounds and contrast; do not sacrifice small-copy readability or substitute a generic font pairing for the kit.

A ghosted outline behind solid type is optional: a 1-design-pixel stroke at roughly 20% alpha is a starting treatment. Use a brand-compatible color, check worker text-stroke support and keep the foreground crisp. Do not require white outlines on a light canvas.

Optional text focus can leave the active line sharp while inactive lines use up to **10 design pixels of blur and 0.25 opacity**. Interpolate focus deliberately and keep essential instructions, captions and CTA copy readable. This is a contextual preset, not a replacement for every existing focus setting; simulated blur is not optical depth of field.

## Tie words to measured audio

Use the generated recording and its measured word alignment to time keyword emphasis, strokes or icon reveals. Convert timestamps with `round(seconds * fps)` and inspect the resulting frames. At 60 fps, nearest-frame rounding alone can introduce up to 8.33ms error; alignment and encoding add uncertainty. Do not promise exact arbitrary millisecond synchronization. Preserve approved spoken copy and voice selection, and retime against the real take rather than forcing speech into an estimated slot.

Measure a highlight pill from the actual word bounds. Drive its emphasis and the associated SVG stroke-dashoffset from the same aligned event window. ElevenLabs character timing, where supplied, must be mapped to the actual words; an estimated reading cadence is not measured word timing.

## Expand the hero, then reveal its internals

Establish the hero's anchor, expand its shared shell, then sequence internal labels, controls and supporting objects as space becomes available. Overlap these phases where it strengthens continuity. Preserve logical identity across state changes and keep text independent of severe shell deformation; simultaneous entrances should have a clear purpose.

The proposed **0.3 → 1.08 → 1** scale is an authored peak, not a universal physical spring result. With a 0.3-to-1 launch, v1.5's 300/20/1 spring peaks around 1.076 in the ideal continuous response. Tune an explicit keyframe treatment if exactly 1.08 is required. Stage parent settlement → optional material/glass settlement → chart stroke → odometer roll. `internalRevealSchedule()` returns timing windows only; use zero-duration phases for omitted treatments, and verify the parent's actual settlement first. It does not implement glass, charts or odometers.

Reuse v1.5's bounded radial burst: `min(delayCapSeconds, (distancePx / cellSpacingPx) * 0.012)`. Define positive spacing, cap total spread and handle the center explicitly. Do not multiply raw pixels by 0.012 seconds. Alternating row tilts with a starting 15° pitch/−10° yaw and depth between **0 and 80 design units** are optional layout treatments; declare the unit mapping, perspective and projection before checking occlusion or cursor contact.

## Camera follows attention

A cursor-led **1.35× push over 15 frames at 60 fps (0.25 seconds)** is one preset. Derive the focal point from the actual projected target and align cursor arrival, contact and response. Recompute safe bounds after the transform. Scale the duration by frame rate; camera motion is not required for every click or reading hold.

A macro-card treatment can use **2.4× card scale with up to 16 design pixels of background blur**. Keep camera scale, card scale and local deformation separate. Evaluate their combined projection so multiple zoom factors do not accidentally crop the headline or CTA. Plan the crop around meaningful content and keep foreground text sharp.

Inertial recoil should respond to named contact or acceleration events, with bounded displacement/rotation and decaying settlement. Keep it deterministic and preserve continuity when impulses overlap. Constant shake is not inertia; a stable camera and quiet end card remain valid choices.

`anchoredCamera()` returns a CSS 2D matrix for `transform-origin: 0 0`; `projectPoint()` and `unprojectPoint()` use that same complete scale/rotation/translation. Recompute cursor contact after recoil, or let the cursor follow the stage. These helpers do not perform 3D perspective projection. `cameraRecoil()` samples one fixed event; combine overlapping responses continuously and budget their aggregate displacement in the template.

## Execution boundary

The helpers in [type-camera.ts](../starter/src/type-camera.ts) provide calculations that renderer code must explicitly use. They add no scene JSON fields, scene capabilities or renderer changes. Verify real font wraps, projected bounds, cursor contact, focus changes and settlement in sampled frames and full playback before claiming the treatment works. This skill-only update does not generate media.

The internal phase scheduler rounds each phase duration independently before adding it. A multi-phase total can differ by a frame from rounding the combined duration; use the returned integer boundaries as the actual timeline and recheck the final reading hold.
