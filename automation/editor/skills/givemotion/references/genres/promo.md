# Genre: product promo / launch video (15–30 s)

Purpose: structure, pacing and the moves that scored well for premium launch videos.

| Time (18 s video) | Beat |
|---|---|
| 0–3 s | Problem in kinetic type, on the beat ("Copy. Paste. Repeat."), with a visual of the pain (a swarm of task chips, a pile of tabs) |
| 3–6 s | Reveal: logo or product name, a hit (burst, flash, shake), the product screenshot arriving in 3D |
| 6–14 s | Three benefits, ~2.5 s each, joined by one camera move or one connecting line, each with its own small visual (not three identical cards) |
| 14–18 s | End card: logo, call to action and URL, a slow push or shine so it is never still; ≤ 2 s of hold |

Moves that scored well:
- The screenshot tilted in 3D (`rotateY` 12–20°, `transformPerspective`), with a soft shadow, gliding next to a big headline, then the camera pushing into the part of the UI that matters.
- A live counter or micro-interaction (a "Deploy" button pressed with the cursor, a toggle going live) instead of describing a feature.
- A glowing path the camera travels along from benefit to benefit (one world), or `morph` carrying the logo or a card between scenes.
- Cuts on the beat: `npx givemotion audio music.m4a`, then `data-cuts="beats: …"` with `data-cut-align="middle"`.

What judges marked down: a flat, small, centered screenshot that just scrolls ("reads like a website demo"), benefits as centered one-per-scene cards, a black strip at the edge of a moving screenshot (the image did not cover its box during the move), text cropped mid-pan, a near-empty frame mid-video, ghost echoes of text, still end cards. Keep the screenshot big (≥ 60% of the frame width) and in motion.
