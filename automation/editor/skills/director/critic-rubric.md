# Critic rubric

Be a harsh critic of your own work. Score honestly. A 3 means it's fine but forgettable.

## §1 Concept score (before building)

Score each concept 1–5 on:

| Criterion | 5 means |
|---|---|
| Insight | It names a real tension the audience feels |
| Ownability | Only this brand could run it. Swap in a competitor's logo, and if it still works, it scores 1 |
| Motion metaphor | The main motion *is* the idea, not decoration on top of it |
| Simplicity | Explainable in one sentence; one idea, not a feature list |
| Ending | The final frame is strong, readable and earned by what comes before |
| Brief fit | It honours every explicit request: format, tempo, product, CTA |

Build the highest total. Below 22/30 means drafting a better concept.

## §2 Plan check (before building)

- [ ] Every shot-table row has a "what it means" that links to the insight
- [ ] The contrast curve has at least one hard reversal; no two neighbouring sections share a texture
- [ ] At least one persistent object or match cut, one callback and one bookend
- [ ] Colour pairs alternate; the accent is used deliberately
- [ ] The CTA is real (or explicitly a stand-in); the hold is ≥ 1.5 s
- [ ] Every number, claim, logo and URL is supplied by the client, or listed as a stand-in

## §3 Frame QA (each still you render)

Render stills at every section's hold, mid-transition, and the last frame. View each one and check:

**Text**
- [ ] No text is clipped by its container: pills, buttons, discs, cards
- [ ] No text overflows the frame or touches the edge (≥ 40 px clear)
- [ ] No orphan word on a last line; no word broken across lines
- [ ] Outline or stroked type shows no internal contour lines
- [ ] Every frame is readable at phone size: display type is big enough, small text has contrast

**Layout**
- [ ] No unintended collisions or overlaps between elements (chips, labels, cards)
- [ ] Rotating or ring elements stay inside the frame and the safe zones
- [ ] Panels contain their content: nothing pushed past a container's edge
- [ ] Key text sits inside the 9:16 safe zones
- [ ] No large dead areas unless the emptiness is intended

**Motion and continuity**
- [ ] Mid-transition frames have no geometry inversions, gaps or unintended black frames
- [ ] Motion blur sits on the axis of motion only; type is sharp at rest
- [ ] A persistent object keeps the same geometry across its cut
- [ ] The first frame already shows motion or content (no black opener)

**Brand**
- [ ] Only the defined colour pairs appear
- [ ] The logo is legible on its background (use a reversed variant if needed)
- [ ] The fonts actually loaded (no fallback font)

Fix every failure, re-render those moments, and look again.

## §4 Final scorecard (after the final render)

Measured (all must pass):

| Check | Pass |
|---|---|
| Duration | The requested length ±0.05 s |
| Resolution / fps / codec | As planned; H.264 yuv420p + AAC |
| Loudness | −14 LUFS ±1 integrated |
| True peak | ≤ −1.5 dBTP on the delivered .mp4 (the mix targets −2.0 in `finalize()` to leave AAC-encode headroom) |
| Final readable hold | ≥ 1.5 s |
| Cuts | Present on the planned beats (scene detection ≈ the planned count) |

Judged 1–5 (ship only if every score is ≥ 4):

| Criterion | Question |
|---|---|
| Hook | Would a scrolling viewer stop in the first second? |
| Clarity | After one watch, can they say what it is and what to do? |
| Rhythm | Does the cutting feel musical, with contrast, not monotone? |
| Craft | Spacing, type, physics and sound: would a senior motion designer sign it? |
| Brand | Does it feel like this brand and no other? |

Write the scorecard into `plan.md` with one honest sentence per judged score.
