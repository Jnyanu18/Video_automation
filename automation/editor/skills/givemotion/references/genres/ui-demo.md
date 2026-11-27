# Genre: UI / app demo (15–30 s)

Purpose: structure, pacing and the moves that scored well for feature demos with a built UI, a cursor and step captions.

Build the UI in HTML/CSS at full size in one camera world, then film it like a zoomed screen recording: the camera stays close on the part that is changing, so it reads on a phone.

| Time (18 s video) | Beat |
|---|---|
| 0–2 s | Intro: a kinetic title ("Smart scheduling") or a quick wide establishing shot of the UI (`overview: true`, ≤ 1.5 s) |
| 2–14 s | Steps, 2.5–4 s each: camera pushes to the control, cursor glides and clicks (press ripple), the result appears (panel slides in, slots fill live, skeleton loading), the camera follows the result |
| 14–16 s | The result lands (the event flies into its slot with `gm.fly`, confetti), camera pulls back to show it in context |
| 16–18 s | End card or logo, moving |

Tools:
- `cursor` block with selectors and `!` clicks, `show="auto"`, inside the world (`references/data-templates.md`); style `[data-gm-hover]` / `[data-gm-pressed]`.
- `gm.fly('#event', { from: '#slot2', at: … })` for "the thing moves from the panel into the calendar"; `morph` for state changes across scenes.
- Camera `fit` on the control plus its context, zoomed so UI text is ≥ 32 px on screen; a `fit` on a tiny button over-zooms, so include its neighbours.

Captions: short step captions (3–6 words, ≥ 48 px) in a band the UI never uses (a bar at the bottom with the camera framing the UI above it), or as a label anchored next to the control. Judges repeatedly marked down captions sitting on top of the panel title, a row, or the first slot.

What judges marked down: captions covering UI, the booked/finished state frozen for 1.5–2 s, a suggestion panel too small to read on a phone, a messy crossfade where a half-faded panel collides with the button and caption. Keep the last state alive (a gentle push, a highlight pulse) and end within 2 s.
