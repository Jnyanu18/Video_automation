# tools/edit (agent E)

Pure-function edit tools on EditPlan dicts: `fn(plan, **args) -> {"plan", "result", "warnings"}`.
`from tools.edit import TOOLS, remap_to_output` (run from repo root).

- `editplan.schema.json`: JSON Schema (adds optional `time_base`, `timeline`, caption `words`).
- `timeline.py`: `remap_to_output(plan)` returns a new plan with captions/overlays/reframe track in OUTPUT time,
  `keep` normalized (sorted, merged, empty dropped, clamped), plus `timeline.segments` and `time_base: "output"`
  (idempotent). Items spanning a cut are split (ids `c1`, `c1~2`); items inside cuts are dropped.
  Also `source_to_output`, `output_to_source`, `output_duration`, `segments`.
- Tools: `cut_silences`, `cut_segments`, `set_captions`, `style_captions`, `reframe_vertical`, `preview_frame`.
- `styles.py`: `CAPTION_STYLES` data (bold-pop, clean-lower, karaoke, boxed) for the renderer.

Run tests: `python3 -m pytest tools/edit -q` (needs ffmpeg for the preview test; generates its own test video).
Mocked: nothing. Not covered: actual caption rendering (owner C), face tracks come from D's track_faces.
