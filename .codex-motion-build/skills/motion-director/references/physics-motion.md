# Motion behavior: springs, letters and deformation

See [advanced-ui-motion.md](advanced-ui-motion.md) and `starter/src/motion-policy.ts` for measured Bézier values, configurable spring/press presets, bounded radial delays and frame-level timing. Overshoot and deformation are selected per element; they are not required on every property.

Motion quality needs an explicit specification for each element, beyond a style label. Plan the movement's anticipation, launch, peak speed, overlap, overshoot and readable settlement.

For kinetic headings, animate individual characters from fixed layout positions. Give each its own delay, spring response, rotation and controlled stretch. Keep the baseline and letter spacing stable after settling. Separate clamped opacity from spring position so opacity cannot overshoot. Test the last letter's reading time as well as the first.

For shape morphs, use damped spring responses for dimensions and radius, maintaining residual movement when the target changes. Assign different masses and damping to the shell, text, small controls and artwork. Fast resizing and real spring settling should be visually distinguishable.

Add squash/stretch as a separate deformation around a stable center. Reciprocal scale factors can preserve area during a small deformation. Render the text separately so shell compression does not make labels unreadable. Small contacts can produce a damped impulse; large morphs can use velocity-dependent strain.

For contact-driven baseline ripples, traveling waves, 3D launch vectors and bounded reciprocal strain use [depth-and-impact.md](depth-and-impact.md). A reciprocal X/Y pair preserves local 2D area; a uniform growth transform belongs on a separate parent. This is not a 3D soft-body volume solver. Derive impact timing from the same event as the object's contact; do not use independent timers or restart springs when momentum must persist.

A premium result depends on controlled timing, typography, hierarchy and restraint. Evaluate the resulting motion against a selected reference at several matching phases, then inspect transitions and full-speed playback. Mathematical or schema correctness alone cannot certify style.

The Spring Study 03 source implements a concrete example with reusable physics.ts profiles and motion checks. These functions still require integration into a registered component before a JSON-only app generator can use them. Describing a physics effect in a prompt does not add the missing renderer code.
