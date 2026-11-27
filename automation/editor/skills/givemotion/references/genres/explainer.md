# Genre: explainer (how something works, 20–40 s)

Purpose: structure, pacing and the moves that scored well for step-by-step explainers (processes, systems, journeys).

**Structure that scored best: one world, one camera route.** Build the whole process as one big scene (a map, a factory, a system diagram, 2–3 frames wide) and move a `gm.camera` from step to step, with a short wide recap at the end. Separate slide-like scenes per step scored lower; a "website hero" opening (phone mockup plus headline) was called static.

| Time (25 s video) | Beat |
|---|---|
| 0–2.5 s | Hook: the question or the end result, already moving (title over the world, camera drifting) |
| 2.5–20 s | Steps, ~4 s each: the camera arrives, the step's object acts (moves, lights up, draws on), a short label lands, then the camera moves on along the route |
| 20–24 s | Wide recap: the whole world, the route drawn through all steps, step numbers or a kinetic summary line ("Tap. Pick. Drive. Deliver.") |
| 24–25 s | Out: logo or final line, still moving |

Moves and tools:
- A moving subject carries the story (a package, a data packet, a drop of water): `gm.path.travel` along the route, camera `follow` with lead room (`offset`), holds at each stop. Handing it between vehicles: the riding recipe in `references/camera.md`.
- Step labels with `data-anchor` next to their object, numbered (1–4), ≥ 48 px in world units; card subtitles were called tiny: keep them ≥ 32 px on screen or drop them.
- Draw the route behind the subject (`draw` or `strokeDasharray` from `trip.progress(t)`).
- Calm tone does not mean static: slow camera moves, small secondary motion on every object (wheels turning, robot arm moving, lights blinking).

What judges marked down: labels and props cut by the frame while panning ("Local hu", "Your door"), the title overlapping the world during the first transition, tiny card subtitles, still title and outro holds, a busy map where the small step reads small. Fix: fit each step with its label (`fit: ['#hub', '#hub-label']`), keep neighbours' labels fully out of frame, check the pans with `snapshot --from a --to b --every 0.25`.
