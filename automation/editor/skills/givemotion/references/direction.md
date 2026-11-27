# Direction: deciding how the video should look before you build it

Purpose: a method that works for any genre (a type piece, a product launch, a data story, a poem). The engine can draw
anything; what separates a portfolio piece from a template is a clear direction, decided first and then held to.
This page is the method, not a style: the looks come from the brief and from your research.

Contents
- 1. Research the genre, when it adds something
- 2. Write the direction at the top of the page
- 3. Style frames: the key holds as stills, before any motion
- 4. Build to the direction, review against it

## 1. Research the genre, when it adds something

First take stock of what already decides the look: a brand kit or design system, earlier videos or parts in the
project, references the user gave, a brief that already fixes palette, type and motion. When those answer the
questions below, skip research and use them; consistency with earlier work matters more than novelty.

Research when something is still open: a genre or style you cannot picture concretely, a first video for a new brand,
a brief that names a look ("Swiss editorial", "risograph", "Apple-style launch") you have not built. Then, if you can
search the web, look for a few real examples of the genre and subject (studio reels, award sites, case studies) and
read how they are described; if you cannot, recall well-known pieces. Spend minutes, not the session. Pull out, in
words, only what is still open:

- **Layout:** where the focal point sits, how much empty space, a grid or a free composition, safe margins.
- **Type:** one family or a pairing, the size steps (e.g. 200 / 96 / 40 px), weight and tracking, how many words per frame.
- **Color roles:** background, ink, one accent and what the accent is for (the brief usually fixes the hex values;
  research says how much of each).
- **Motion vocabulary:** how things enter and leave (masks, slides, scale, draw-on), the easing families
  (snappy `expo.out` for UI and type, soft `sine.inOut` for ambient, `back.out` for playful landings), how scenes hand
  over (match cut, push, morph, wipe) and the rhythm (cuts on a steady beat, or long flowing takes).
- **One signature idea:** the thing a viewer remembers (the logo built from the data, the word that becomes the route).

Keep only what serves this brief. Copy no one's artwork, logo or exact sequence: learn the principles.

## 2. Write the direction at the top of the page

One short comment block above the shot list, so every later decision has something to check against:

```html
<!-- DIRECTION
  Look: calm editorial, lots of navy space, one bright accent per frame; references: museum title sequences.
  Type: Space Grotesk 700 at 180 / 72 px, Inter 400 at 36 px; max 5 words on screen.
  Motion: mask reveals and slides, expo.out 0.5-0.7 s in, power2.in 0.3 s out; ambient drift sine.inOut 6 s.
  Hand-overs: every scene carries one element into the next (the line becomes the route, the dot becomes the logo).
  Signature: the waterline is drawn once and stays the thread through the whole piece.
  SHOT LIST
  0.0-2.0  ...
-->
```

Turn the direction into tokens in CSS (`--h1: 180px; --accent: #…; --in: cubic-bezier(.16,1,.3,1)`), so the whole
piece uses the same few sizes, colors and curves.

## 3. Style frames

Before animating, build the two or three most important holds as still frames and render them:
`npx givemotion still video.html -t 6.5 -o frames/beat3.png`. Judge each as a printed poster:

- Is there one obvious focal point? Can you read every word at phone size?
- Do sizes follow the type scale, and edges line up with something (a margin, a center, another element)?
- Is the accent used for one thing only? Is anything cramped, touching an edge, or floating without a reason?

Fix the stills first. Motion cannot rescue a weak frame, and a strong frame makes the motion easy.

## 4. Build to the direction, review against it

Animate from frame to frame with the motion vocabulary you wrote down. Then `npx givemotion review video.html`
(see SKILL.md, step 3): score the result against the brief and against your own direction, fix the five worst
problems, and review again. If a choice in the video contradicts the direction, one of them is wrong: decide which.
