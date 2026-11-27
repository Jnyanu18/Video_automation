# Genre: data story (numbers that tell a story, 15–30 s)

Purpose: structure, pacing and the moves that scored well for animated charts, growth stories and metric reveals. API: `references/charts.md`.

**Structure that scored best: the camera rides the data.** A wide `gm.chart.line` inside a camera world, the camera following the line head with a live counter riding it, pushing in on each key event, then pulling back to the whole series, then a payoff number.

| Time (18 s video) | Beat |
|---|---|
| 0–2 s | Hook: the starting number big, or the question ("How did we get to 48,000?"), something already moving |
| 2–12 s | The line draws, camera follows the head (`follow: chart.head`, `offset: [260, 0]`); a hold, push-in, colored segment, callout and small shake on each event (the dip, the jump) |
| 12–15 s | Pull back: the whole series fills the frame, both callouts visible, labels still readable |
| 15–18 s | Payoff: one huge number or ratio ("40x in one year") counting up, burst, end on motion |

Rules:
- Put the numbers in `data.json` and use `gm.data` / `{{data.values}}`; test with a second data file (other values, a different number of points).
- Every number on screen comes from the chart (`data-chart-text`, `chart.valueAt(t)`): judges caught a counter that disagreed with the line ("MAR 2,217" after the line left March, a "-8%" tag still showing).
- Make dips visible: `rescale: true` (a small dip on an axis that ends at 48,000 is flat).
- Big hierarchy: the current value 120–200 px, the label 40–60 px, axis labels ≥ 32 px on screen. Tiny axis text and secondary labels were the most common complaint.
- Callouts above the line and away from the frame edge (they were cut at the bottom during camera moves). One color per event, used on the segment, the callout and the burst.
- The overview must fill the frame (not a thin strip with tiny labels): `fit: '#growth'` with the chart's `overview: true`, or scale the key labels up.
- Avoid a blur transition into the overview (it left an almost empty blurred frame).
