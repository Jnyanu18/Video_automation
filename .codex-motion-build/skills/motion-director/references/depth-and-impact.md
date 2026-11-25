# Depth, parallax and impact

Use this optional toolkit when depth or contact helps explain the product. Follow [advanced-ui-motion.md](advanced-ui-motion.md), [physics-motion.md](physics-motion.md), the selected references and brand constraints. These settings are design presets, not universal styling rules or measured source keyframes.

## Layer depth and focus

Build depth in readable tiers: hero, supporting objects and background. A narrow contact shadow can establish attachment, a softer ambient shadow can separate surfaces, and a broad faint shadow can suggest elevation. Keep their direction and strength consistent with the intended light and surface. More shadows do not establish real 3D lighting; avoid dark halos, floating contact shadows and shadows that slide independently of their objects.

Rack focus should transfer attention between named targets. Keep the active hero crisp and preserve essential labels. Background blur can support separation; simulated CSS/SVG blur is not camera depth of field. Blur, translucency and glass remain optional brand treatments. Inspect overlap edges, filter clipping and foreground text at phone size.

Optional starting values: shadows `0 30px 60px rgba(0,0,0,.2), 0 4px 12px rgba(0,0,0,.1)`; focused scale 1.1 with zero blur; inactive scale 0.8, opacity 0.35 and blur 12px. The helper scales shadow offset/blur with bounded elevation above a receiving plane, not arbitrary camera Z. Scale design pixels to the delivery canvas, and account for perspective scaling before adding another explicit scale.

Unit contract: `elevationShadows()` accepts elevation in **design pixels** and returns offsets/blur in delivery pixels after `designScale`. `focusLayer()` likewise scales its design blur. `directionalBlurState()` accepts **projected delivery pixels per second**. Keep burst endpoints and baseline geometry in one declared coordinate system; convert/projection belongs to the template.

## Perspective and parallax coordinates

Choose a shared stage, camera, focal anchor and transform order. Define which values are world coordinates and which are projected screen coordinates. Project object positions, cursor contacts and shadow anchors consistently; applying camera movement twice creates drift. Check the near-camera range and perspective denominator so depth changes cannot produce infinite scale or inverted objects.

Parallax should follow relative depth and camera movement, with a clear sign convention. Verify near/far displacement, occlusion and scale at the opening, largest tilt and closest view. Recompute safe bounds after projection. A rotated flat panel is 2.5D; depth slices or independent layer offsets do not automatically make it a volumetric model.

## Bounded burst and spring response

For a radial grid burst, normalize distance before calculating delay:

`delaySeconds = min(delayCapSeconds, (distancePx / cellSpacingPx) * 0.012)`

Use positive cell spacing and a scene-appropriate cap that preserves the reading hold. This is **0.012 seconds per cell**, not per raw pixel. Derive direction from the burst origin; handle the zero-distance center explicitly. Radius, depth travel, rotation and return timing need bounds so objects cannot cross the camera or leave unrecoverable gaps.

`stiffness:300, damping:20, mass:1` gives approximately **10.85% overshoot** for an ideal unit step from rest. It is more expressive than the existing 280/22/1 preset; do not label it 5–8%. Actual rendered peaks depend on sampling, initial velocity and implementation. Use higher damping for quieter controls or cameras. Preserve residual velocity across changing targets; keep opacity, blur, dimensions and factual progress valid independently of positional overshoot.

## Impact, deformation and blur

Treat a baseline hit as a planned contact event. A small displacement ripple can propagate through adjacent letters or cells, with distance-based delay and decaying amplitude. **12 frames at 60 fps is 0.2 seconds**: a contextual response window, not a guaranteed physical settling time. Keep resting baselines and final spacing intact; prevent neighboring glyph collisions and allow the last element a readable hold.

The supplied baseline helper starts from zero displacement at contact, responds on subsequent frames, pins the line endpoints and returns smoothly to zero by the chosen response window. It is an authored traveling ripple, not collision detection. Supply its impact frame from the object's contact event.

That response window is global: a distant point may never respond before it ends. Increase the window or choose a suitable propagation speed when a longer line must visibly ripple; do not assume each point receives another full 0.2 seconds.

Separate uniform layout scale from local squash/stretch. Reciprocal factors, such as `scaleX = s` and `scaleY = 1/s`, preserve **2D area**, not true 3D volume. Keep the contact pivot intentional and render critical labels separately from severe shell deformation.

A **15px blur** and **8-frame window at 60 fps (about 0.133 seconds)** are contextual values at the chosen design size. Adjust for delivery scale, travel speed and sampling. Align the blur envelope with acceleration or peak motion and clear it for settlement. Isotropic blur is a stylization, not directional motion blur; temporal sampling requires renderer support and review for ghost copies.

## Execution and review

The helpers in [depth-motion.ts](../starter/src/depth-motion.ts) support planning and deterministic calculations; custom renderer code must explicitly wire them to frame-driven transforms. They add no scene JSON fields and do not upgrade existing templates automatically. Verify projected contacts, bounds, shadow attachment, focus transitions and impact settlement in sampled frames and full playback. Mathematical checks alone do not establish visual quality. This skill update does not authorize media generation.

`burstPosition()` samples a single spring launch from rest. Use a state-continuous track for target changes rather than resetting that sampler. `directionalBlurState()` returns a radius/angle envelope from projected screen velocity; it does not implement a directional filter or temporal renderer. Pass an eased weight to `focusLayer()`, put severe shape deformation on a separate wrapper, and leave captions/HUD crisp.
