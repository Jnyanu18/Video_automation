# Flux — Spring Study 03

10 seconds, 1080×1920, 60 fps. A revision of Flow Study 02 that concentrates on motion behavior rather than adding scenes.

## Changes

- The shell now follows damped spring responses. New target changes add to the previous response, preserving residual motion instead of cutting the velocity at keyframes.
- Width, height and corner radius have visible overshoot and settling.
- The main headings use individual character entrances, 27 ms stagger, rotation, stretch/compression and spring settling. Outgoing letters overlap the next word's entrance.
- The closing title also uses character springs.
- Click and toggle contact produce a short damped squash impulse. Reciprocal X/Y scales preserve area for this deformation. Text is rendered separately to keep it crisp.
- Toggle travel and segmented controls use a faster spring preset. The selected segment stretches in response to its velocity.

These are deterministic spring animations and art-directed deformation rules, not a full soft-body material simulation. The composition and visual identity remain close to Study 02 so the motion difference can be judged directly.

## Run

Extract, run `npm install`, then `npm run render`. The output folder is beside the source. Set FLOW_OUTPUT_DIR to change it. Set the browserExecutable path in render.mjs for your installed Chromium/Chrome, or let Remotion manage its browser. Editable text/colors are near the top of Study.tsx; motion profiles and target events are in physics.ts.

Inter font license is included in public/OFL.txt. The sounds are synthetic starter SFX. No generated voiceover or live Claude/ElevenLabs requests were used.

## Checks

TypeScript check passed. Fourteen animation-state frames were inspected. physics-check.ts sampled all 600 frames and checked positive/in-bounds shell sizes, finite values, reciprocal deformation, spring overshoot and settlement, and continuity immediately around target changes. Maximum measured squash/stretch scale change was 5.65%; actual dimensions overshoot separately.

Still-frame and mathematical checks support correctness; visual quality should be assessed from playback. This revision is offered for review rather than claimed to match every supplied reference.
