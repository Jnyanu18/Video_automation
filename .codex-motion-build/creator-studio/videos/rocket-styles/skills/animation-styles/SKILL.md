---
name: animation-styles
description: Make a vertical reel that shows one subject in one continuous take, redrawn in many animation styles (pixel art, chalkboard, blueprint, comic book, paper cut-out, neon glow, ink brush, flat vector, retro terminal, risograph). Use when the user asks for a "styles" video, the same scene in different styles, or any of these looks as an animation. Built with Remotion and SVG, no image generator.
---

# Animation styles reel

One subject, one continuous take, many styles. The subject never restarts: each new style sweeps up the screen while
the motion carries on, and at the end the frame splits into one band per style so every style is seen at once. That
continuity is what makes it watchable; ten separate clips with hard cuts are much weaker.

The working example is in `template/`: a rocket launches with a person watching below, in ten styles, 14 seconds,
1080 by 1920. Start from it.

## Set up

1. Make a Remotion project if there is none: `npx create-video@latest --blank`, then
   `npm i @remotion/google-fonts`.
2. Copy `StyleReel.tsx`, `Root.tsx` and `index.ts` from this skill's `template/` folder into the project's `src/`
   (they replace its own `Root.tsx` and `index.ts`).
3. Preview with `npx remotion studio src/index.ts`. Render with
   `npx remotion render src/index.ts StyleReel out/reel.mp4`.

## How the template is built

- `mk(t)` is the one source of motion: where the subject is at time `t` (the rocket's height, the flame's length,
  the smoke puffs, the person's arms, the scroll speed of the background). Every style calls it, so all styles show
  the same moment. Change the subject here.
- The shape helpers (`body`, `nose`, `finL`, `finR`, `flame`, `person`) return SVG paths from that state. Every style
  draws the same shapes, so the subject stays recognisable across styles.
- Each style is a `Draw` function: `(t, localTime, timing, idPrefix) => SVG`. It draws a background, the shapes in its
  own way and a few details of its own. Keep every SVG `id` prefixed with `idPrefix`, because two styles are on screen
  together during a sweep and all ten in the ending.
- `STYLES` lists the styles in order. `StyleReel` takes `starts` (the second each style begins) and `bands` (when the
  ten bands open). To sync with a voiceover, set `starts` to the moments each style is named.
- The sweep: the new style is clipped to a rectangle that grows up from the bottom over 0.28 s, with a thin white
  line on its edge.

## Making a new one

1. Ask what the subject is (a car, a cat jumping, a coffee pouring, a logo) and how long the reel should be.
2. Rewrite `mk()` and the shape helpers for that subject. Keep the motion continuous and readable at phone size: one
   big subject, one small second character or detail that reacts to it.
3. Keep or swap styles. The look rules for each are in its own style skill (pixel-art, chalkboard, blueprint,
   comic-book, paper-cut-out, neon-glow, ink-brush, flat-vector, retro-terminal, risograph). A style earns its place
   if it is recognisable in under a second.
4. Check before rendering the whole thing: render one still per style with
   `npx remotion still src/index.ts StyleReel out/s4.png --frame=150`, look at each one, and fix anything that is cut
   off, overlapping or unreadable. Then render the video.

## Rules

- The subject never restarts between styles.
- The same geometry in every style; only the drawing changes.
- Big shapes, few details: it is watched on a phone.
- Text inside the art is short (a sound word, a label, a sign).
- No 3D in this template: every style here is flat SVG with filters, which renders fast and looks deliberate.
- Fonts come from `@remotion/google-fonts` (Press Start 2P, VT323, Bangers, Caveat, IBM Plex Mono, Fraunces).
