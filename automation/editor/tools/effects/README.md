# tools/effects

`set_speed`, `add_zoom`, `add_transition`, `set_color_grade`, `clear_effects`: pure `fn(plan, **args) -> {plan, result, warnings}` on the EditPlan
fields `speed`, `zooms`, `transitions`, `color_grade` (see docs/CONTRACT.md, "Phase 1 additions"). All times are SOURCE seconds.
`ffmpeg.py` turns the settings into filter text and is shared with `services/render/cut.py`.

Run: `python -m pytest tools/effects -q` (unit) and `python -m pytest services/render/tests/test_effects_render.py -q` (real renders, ~70 s).
Verified: tool validation; real renders compared frame-by-frame (speed hits the right source moments, zoom is a centred crop, grades change colour,
transitions blend and shorten the output). Not verified: LUTs other than a synthetic inverting .cube; HDR sources; zoom with face-follow reframe.
Limits: one zoom centre per piece (overlapping zooms are averaged); grades are global; zoom above 2x is soft.
