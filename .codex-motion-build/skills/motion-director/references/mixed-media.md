# Mixed-media direction: tactile objects, comic impacts and material handoffs

Use this optional art-direction toolkit when the brief benefits from a change of material or visual language. Select a few connected treatments around the message. Preserve approved fonts, palette, factual copy, assets and logo geometry. Magenta is an optional brand-compatible accent, not a required comic color. Quiet editorial typography, fades, reading holds and restrained camera work remain valid.

Plan each effect with a named subject, trigger, coordinate system, entry, readable settlement and exit. Follow [production-direction.md](production-direction.md), [depth-and-impact.md](depth-and-impact.md) and [type-and-camera.md](type-and-camera.md). Effect names do not establish implementation support.

## Tactile acrylic and helical notifications

Acrylic can combine thickness, softened edges, controlled highlights and readable embedded content. Genuine bevels, refraction and view-dependent reflections require suitable geometry, materials and lighting. CSS translucency, layered rectangles and gradients are useful authored approximations; label them as such. A backdrop blur does not create a volumetric refracting object. Check the actual worker's transparency, depth ordering and filtering support.

For a hero cursor, toast or button, **16–24 design units of extrusion** is a starting proportion. Define its world-unit conversion and bevel radius, keep text on a readable face, and use restrained rim highlights and optional active-state emission. Match a 3D cursor's leading contact point after projection; thickness is not permission to move its hit point.

For notifications arranged on a helix, declare radius, height per turn, angular units, phase and camera position. Evaluate phase from frame time with stable seeds rather than timers or accumulated simulation state. Keep geometry away from the camera near plane; inspect projected bounds, card overlap and back faces. Give the selected notification a known readable orientation and use approved content. Decorative notification counts must not masquerade as real activity.

`helixPoint()` winds around Z, with pitch along Z; choose one axis mapping if the stage uses a different up direction. Stagger spawn times while the camera orbits and pulls back through the same coordinate system. Its sampled points do not render notification slabs or move a camera automatically.

A click shockwave should originate at the actual contact point after projection. Tie its radius, displacement and opacity to the same event as the press response. Cap its extent and let it decay. An expanding ring is an authored graphic; a refractive shockwave needs an implemented distortion pass. Keep essential labels and faces legible through the response.

Choreograph press compression → a short local optical flare → prop impulse and camera pullback. Derive each prop's outward velocity from the contact origin, handling a zero-distance prop explicitly. `shockwaveImpulse()` samples gravity-free travel with linear drag, not collisions. Its velocity input uses simulated seconds; its returned velocity uses video seconds. A shared slow-motion simulation clock can drive props and camera; audio stays on the output clock, with event frames recomputed rather than silently slowing narration.

## Comic impacts and halftone texture

Short impact poses can use **2–3 frames at 60 fps**, approximately **33–50ms**, around a named landing or reversal. Declare whether the treatment preserves a frame count or a duration: a two-frame pose remains two output frames in frame mode, while time mode retimes from seconds. Do not silently switch between those contracts when changing frame rate. Impacts supplement readable copy; they do not replace its hold.

Use occasional local contrasts, displaced contours or original speed marks rather than repetitive full-field strobing. A reduced-flash treatment can retain the beat through local deformation, bounded recoil and color-stable marks. Choose according to the brief and playback quality; this is not an additional approval gate. Use original comic vocabulary without importing Spider-Verse characters or assets.

An impact pose can combine radial speed lines, inverted silhouettes and rough brush marks in monochrome or an approved accent. Keep its drawing stable across the intended two/three-frame hold unless deliberate line boil is part of the selected treatment.

Corner halftone masks can introduce texture while preserving the hero. Keep dots away from faces, small labels and the CTA. Define spacing and dot radius in design units, then inspect the delivered scale for moire, crawling edges and temporal aliasing. Anchor the field consistently to the intended surface or screen; accidental phase changes look like flicker. Density changes should remain bounded and deterministic.

## Geometry and material handoffs

A 2D stroke becoming a 3D ribbon needs a shared path, anchor and timing contract. Match segment correspondence, winding, thickness and visible silhouette through the handover. Check normals, occlusion and material continuity as depth appears. A compatible SVG interpolation or layered strip can be a convincing authored alternative, but it is not automatically an extruded mesh or cloth simulation.

Grow depth from the same visible stroke and use the ribbon's leading point as a planned camera target, with controlled follow lag and near-plane clearance. The ribbon can motivate the pull into the next scene; its path and camera need a shared space and continuous direction.

Inflated type likewise needs an explicit implementation choice: beveled/extruded glyph geometry with shaders, a simulated deforming mesh, or an authored vector/shape approximation. Preserve counters, spacing, baseline and a recognizable silhouette. A soft-looking easing curve is not a soft-body solver. If using a baked simulation, stage its approved output deterministically and validate random-frame seeking. Describe authored deformation honestly instead of claiming physical collision or volume conservation.

Stamping the inflated words over flat notes, wireframes or text walls can provide material contrast. Keep the background subordinate and place essential meaning in the readable settled word.

For **mesh → halftone → flat UI**, carry a shared silhouette and focal anchor through distinct material phases. Keep semantic labels stable or reveal them once the destination is readable. Plan how lighting, dot density and flat colors resolve; an unexplained opacity swap does not establish a continuous geometry transformation. Check topology changes for holes, inverted surfaces and popping edges.

Cards labeled `.aep` or `.blend` are visual assets unless a separately tested importer exists. A filename extension does not establish file-format interoperability.

## Oversized type and full-lens cover

Type slams at **6–8× the normal design size** can intentionally crop one emphasis word. Plan its visible fragment and safe bounds, while holding the complete semantic line elsewhere or in a nearby readable phase. Essential meaning and final CTA cannot depend on deciphering a cropped glyph. Keep uniform enlargement separate from local squash/stretch and camera scale so their combined projection remains intentional.

Define the following 100% word as the approved 1× typesetting state; the contrast comes from the preceding oversized crop. Radial camera blur likewise requires an actual compositing pass and a legible settled state.

A **40-design-pixel directional blur** is a contextual stylization preset. Derive direction and envelope from projected motion, adjust for output scale and clear the blur for settlement. It is not a physical shutter guarantee or an implementation of temporal motion blur. Use an actual supported directional filter or renderer sampling; inspect clipping and ghost trails rather than assuming a scalar blur creates the effect.

A canopy wipe can hide a cut only beneath **verified 100% opaque viewport coverage**. Check the fully transformed and composited mask, including corners, filter regions, blur falloff and every active temporal sample around the cut. A large radius, center coverage or nominal bounding box alone is insufficient. Give the opaque core sufficient margin; a translucent acrylic canopy cannot conceal a cut by itself. If coverage is unverified, use another tested transition and report the limitation.

Place the incoming typography behind the same occluder, then let the object drift away to reveal it. Preserve that depth order and reveal timing through the hidden cut.

## Brand resolve and execution

A ribbon-to-logo ending must arrive at the **exact approved logo asset or approved path geometry**. Match visible bounds, proportions, color and orientation, then hold the identity and complete CTA. Do not use an AI redraw as the final endpoint. A handoff hidden by a covering shape is acceptable when its coverage and final alignment are checked.

`ribbonToLogoPoint()` interpolates supplied point correspondences and clears Z exactly at the approved endpoint. It does not solve topology or create a logo. Switch to the exact approved vector/asset for the final hold where needed. A footer drawer can settle after the mark without disturbing its final geometry or covering the CTA.

The helpers in [mixed-media.ts](../starter/src/mixed-media.ts) supply deterministic calculations and planning utilities only. They add no scene JSON fields, bevel/shader system, mesh renderer or soft-body engine. Register and test the actual custom renderer before promising an effect. Review transitions, projected contacts, material changes and copy at sampled frames and full playback. This skill-only update generates no media.
