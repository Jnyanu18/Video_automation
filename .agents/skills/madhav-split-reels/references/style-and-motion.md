# Exact style and motion recipe

Derived from the completed AI-course music/FX edit, not inferred from the supplied still. Exact values below describe that implementation. Preserve the visual system; retime meaningful events for each new narration.

## Layout at 1080 x 1920

| Region | Left | Top | Width | Height | Treatment |
|---|---:|---:|---:|---:|---|
| Teaching panel | 54 | 166 | 972 | 696 | 30px radius, 2px pale border, soft shadow |
| Lesson content | 96 | 202 | 888 | 616 | One phase visible; panel stays fixed |
| Progress rule | 96 | 829 | 888 | 3 | Left-origin blue fill |
| Caption zone | 82 | 876 | 916 | 154 | Centered, unboxed, frontmost |
| Presenter window | 54 | 1050 | 972 | 820 | 30px radius, overflow clipped |

Panel bottom is 862; captions begin 14px below it and end at 1030, 20px before the presenter. Presenter bottom is 1870, leaving 50px. These are reference coordinates, not a guarantee of safety under every platform overlay. Check phone-size readability and platform UI on the delivered framing.

Presenter is `object-fit: cover; object-position: 70% 62%` for the actual office clip. Reinspect eyes, glasses, mouth and gestures for a different source before carrying that crop forward. Do not stretch the face. Keep native presenter motion; the CSS has no simulated camera drift.

## Color, typography and content components

- Canvas: linear gradient from `#e4e5e6` to `#fafafa` at 37%. Text `#222324`; secondary text `#555b65`; restrained blue `#4263a6`.
- Upper panel: `linear-gradient(100deg, #ffffff 10%, #f3f7fd 46%, #ffffff 82%)`; border `#eef0f3`; shadow `0 24px 42px rgba(25,32,44,0.10)`. This subtle selected treatment is not permission for heavy gradients/glass effects elsewhere.
- Font: Montserrat. Main hook 61px/700, line-height 1.13, tracking -2px. Scene heading 54px/700, inherited line-height 1.04. Kicker 26px/700, tracking 2.2px. Bundle an authorized Montserrat font for deterministic rendering; verify the actual loaded font rather than silently accepting fallback.
- Caption: 61px/700, line-height 1.12, tracking -1.8px, max-width 916px. One or two short centered lines. Rewrite/chunk long speech before shrinking the entire system.
- Three hook tiles: 20px gap, 260px tall, 19px radius, 2px `#d8dce2` border. Topic-specific outline icons: 126px square, blue 6px rounded strokes. Short 26px labels.
- Comparison: two equal halves with 24px gap, 18px radius, pale `#f6f8fc` background; concise labels and a meaningful contrasting example.
- Questions: sequential 95px-minimum rows, 58px check icons, 36px main labels, 26px explanations. Final checklist: 35px labels with 34px vertical gaps.
- Do not populate every blank region. Blank space supports reading; it does not justify missing proof. Old masthead, footer and dark caption rail are hidden.

`assets/split-style.css` preserves both CSS layers from the final HTML in their original cascade order. The earlier base values are intentionally overridden by the second layer; do not use that base layer alone. Its selectors expect matching markup. Topic-specific selector names are implementation references, not immutable script copy.

## Actual animation vocabulary

| Primitive | Start state | End state | Duration | Ease |
|---|---|---|---:|---|
| Hook headline | scale 0.88, opacity 0 | scale 1, opacity 1 | 0.333333s | power3.out |
| Content reveal | x -22px, opacity 0 | x 0, opacity 1 | 0.350000s | power3.out |
| Check/path drawing | dash offset = path length | dash offset 0 | 0.375000s | power2.out |
| Progress increment | previous scaleX | 0.333 / 0.666 / 1 | 0.416667s | power2.out |
| Caption phrase | hidden outside speech interval | visible during interval | instantaneous sets | none |

Initialize each `.draw` SVG path with its measured total length for both dash array and offset. Use a paused seekable GSAP root registered with HyperFrames. Do not run independent browser timers or CSS animation loops. The final code changes caption word colors to the SAME black on/off: there is no visible karaoke highlighting. Do not invent one for an exact match.

The reference switches `.phase` sections at clip boundaries; it does not fly the whole panel around or use an elaborate exit transition. Maintain continuity through the stationary presenter window, panel and progress rule. Reveal individual ideas on their spoken cues, then let them settle.

## Reference timing and semantic anchors

| Phase | Start | End | What the viewer learns |
|---|---:|---:|---|
| Hook | 0 | 2.466667 | Three checks before paying |
| Check 1 | 2.466667 | 8.683333 | Following a demo versus building a project |
| Check 2 | 8.683333 | 13.650000 | Reviewer, frequency and included support |
| Check 3 | 13.650000 | 19.300000 | Ask who is counted and over what period |
| Decision rule | 19.300000 | 25.333333 | Compare syllabus, feedback and total cost |
| Save CTA | 25.333333 | 28.166667 | Finish the three-item checklist |

Exact cue events are retained in `assets/split-preset.json`. Examples: hook tiles at 0.541667, 1.083333 and 1.683333; comparison halves at 3.100000 and 4.016667; project check at 4.466667; closing checks at 25.416667, 25.833333 and 26.250000. Last check settles at 26.625; the finished checklist holds about 1.542s before the end.

The source had 24 caption groups and 95 word events; the last caption ends at 27.365833, narration at 27.497708, output at 28.166667. A short ending tail is not permission for an extended frozen talking avatar. Keep moving speech through the complete spoken CTA and deliberately design any non-speaking final hold.

## Topic retiming, not blind scaling

1. Write new speech and mark semantic anchors for each reveal: contrast A, contrast B, proof, question, qualifier and takeaway.
2. Obtain final narration and source-matched word timings. If requested, pitch-preserve speed before presenter generation; label whether speed is already baked in.
3. Assign each phase boundary and event to those new anchors; keep approximately the primitive durations above. Allow extra reading time where content is denser. Do not multiply all old timestamps by a new total-duration ratio.
4. Keep both comparison halves on screen long enough to compare after the second has settled. Withhold optional detail rather than turning the scene into an unreadable flash.
5. Review the hook and densest moving beat at final speed. A near-blank very first reference frame is a consequence of the short headline entrance, not a required long blank opener.

For an exact replay of the same approved audio, the saved times may be reused only after verifying the identical audio hash or valid alignment. For a new topic, reference times and counts are examples, not acceptance criteria.
