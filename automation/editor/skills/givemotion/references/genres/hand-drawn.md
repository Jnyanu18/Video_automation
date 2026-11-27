# Genre: hand-drawn whiteboard explainer (20–40 s)

Purpose: structure, pacing and the moves that scored well for Excalidraw-style videos on one canvas. API: `references/diagrams.md` (sketch, arrows, anchors, marks) and `references/camera.md`.

**Structure: one big canvas, one camera, everything stays.** Lay the steps out close together on one world (left to right, or a loop), draw each step when the camera gets there, and pull back to the whole diagram only at the end.

| Time (30 s video) | Beat |
|---|---|
| 0–3 s | Handwritten title written on (`write`) with a scribble underline, camera close |
| 3–26 s | Steps, ~4–5 s each: the camera moves a short distance to the next spot, the shape draws on (`draw`), the label is written (`write`, anchored with `data-anchor`), an arrow draws from the previous step (`gm.connect` with `sketch: true`, `draw`), a highlight or circle mark lands on the key word |
| 26–30 s | Pull back to the whole diagram (`fit: 'content'`), big labels still readable, a final "ta-da" scribble (`gm.sketch.loop([...every step and label], { draw: [27, 1.2] })` circles the whole flow) or title |

Rules (from three test rounds):
- Ink: strokes 5–7 px, labels ≥ 48 px in world units (they shrink in the overview), saturated accents (`#1971c2`, `#e8590c`), hatch fills. 3 px ink was judged "thin and faint".
- Camera: close shots, handwriting ≥ 40 px on screen; short moves that never cross empty paper (`empty-frame`); the title and earlier parts must not sit half out of frame during later shots (fit each step with its label, keep neighbours fully in or out).
- A shot's time is when the move starts: start the move to a step as that step starts drawing, not before.
- Character: a few playful touches (a phone-book card for DNS, a globe for the internet, the page drawn inside the laptop) scored well; lines that look ruler-straight do not: keep the default roughness or raise it (`data-sketch="1.5"`).
- Overview: fade small notes, keep big labels; it should fill the frame, not leave the diagram small in empty paper.
