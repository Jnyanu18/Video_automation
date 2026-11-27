# Genre: vertical short (TikTok / Reels / Shorts, 10–30 s)

Purpose: structure, pacing, safe zones and the moves that scored well for 1080×1920 social clips.

Setup: `<html data-width="1080" data-height="1920" data-safe-zone="shorts">` (or `reels`, `tiktok`). The same pixel sizes as 1080p work (the short side is 1080). Keep the top 220 px and bottom 380 px free of key text and 60 px at the sides; `check` warns (`unsafe-zone`) and `snapshot --grid` draws the zone.

| Time (13 s video) | Beat |
|---|---|
| 0–1 s | Hook: the first words already big on screen at frame 0, moving |
| 1–11 s | One phrase per beat: big kinetic type (120–200 px, ≤ 6 words per line) plus a simple graphic for each idea (a code card tilted in 3D, a film strip, an arrow diagram HTML → video); a change every 0.4–0.8 s |
| 11–13 s | Payoff lockup (logo, the line, a CTA), still pulsing on the beat |

Rules:
- Captions from the voice-over file with the `captions` block (`offset` defaults to 420 px on vertical, above the app buttons; `words` 2–4 per page; preview with `npx givemotion captions captions.json --words 3`). Keep them on for the whole video if the brief asks for captions (judges noticed captions vanishing after 7 s) and keep every required word of the script.
- Big type must not collide with the captions: give each its own band (type in the upper-middle, captions low).
- Use the whole height: judges marked down top-heavy layouts with the lower half empty. Stack type, graphic and captions to fill the frame.
- Size type to the width, not to "1080p": the frame is 1080 wide, so a headline that would fill a landscape frame
  fills only a third of a vertical one. Hero lines span about 70-90% of the width (often 120-220 px); judges marked
  down vertical headlines that "fill only about a third of the width" in every tool.
- Every hold is a phone poster: one focal point, high contrast (dim type on a dark panel read as "nearly unreadable"),
  nothing cut by the side edges, and no near-empty frame at a hand-over (bring the next element in as the old leaves).
- Cut and pulse on the beat: `npx givemotion audio`, `data-cuts="beats: …"`, `data-pulse="beat 0.06"`. A pulse plus a camera push can push big type off screen: leave margin.
- Transitions that move the old text out (`push-up`, `cover-up`, `whip-*`), not crossfades: ghosted double words ("IN" over "IN") were the most common error. Check with `snapshot --transitions`.
- Pick a high-contrast look (Bold Pop or Neon Night); colored type on a colored background failed contrast.
