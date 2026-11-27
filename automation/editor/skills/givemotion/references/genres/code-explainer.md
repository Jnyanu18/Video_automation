# Genre: code explainer (developer-video style, 15–30 s)

Purpose: structure, pacing and the moves that scored well for explaining a programming idea with code on screen.

| Time (22 s video) | Beat |
|---|---|
| 0–2 s | Title or the problem in one line ("Your search box fires 10 requests"), moving |
| 2–7 s | The code types on (`code-window` with `typing`, or `data-type`), big: code ≥ 32 px on screen |
| 7–13 s | Camera pushes into the key lines; the other lines dim (`focus`); numbered callouts or hand-drawn arrows explain each part (cancel, restart, run after quiet) |
| 13–19 s | A visual of what the code does: a live simulation (events firing as dots on a timeline, a countdown that resets, a burst when the call finally fires), with counters ("10 events → 1 call") |
| 19–22 s | Takeaway line or outro, still moving |

Tools: `code-window` block (`.gm-line[data-line="6"]` for the camera, `⟦ ⟧` marks for a part of a line, `highlight`, `focus`, `gutter`) in the Terminal look (`references/styles.md`); `gm.camera` with `fit: '.gm-line[data-line="6"]'`; `gm.connect` with `sketch: true` for arrows from notes to code; `data-sketch-mark` to circle a token.

What judges marked down: the code window and the simulation small in a big empty frame (tiny labels), zoomed code cut hard at the left or bottom edge (fit the whole lines you are explaining, with padding), callout text running into the frame edge, row labels cut while panning, a ghost word from the previous scene during the cut to the outro, an outro holding still for 2.5 s, and on-screen claims that do not match the code ("6 lines" over nine lines). Liked: dimming the rest of the code during the zoom, a real input being typed into a search box driving the simulation, cause and effect shown with live counters.
