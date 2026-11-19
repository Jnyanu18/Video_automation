# evals/ (agent H): automatic edit-quality harness

```bash
# from repo root
python -m evals score VIDEO PLAN.json [--transcript t.json] [--style styles/x.json] [--json]
python -m evals golden FOLDER [--style ...] [--strict]     # --strict: exit 1 if any video fails
python -m pytest evals styles -q
```
Python: `evaluate(video, plan, transcript=None, style=None, config=None) -> report`, `render_scorecard(report)`,
`run_golden(folder, plan_fn=None, style=None)`, `baseline_plan(video)`.

## Checks (all in SOURCE time, matching EditPlan `keep`/`captions`)
| check | fails/warns when |
|---|---|
| `min_segment` | any merged keep segment < 0.4 s (touching keeps are merged, not cuts) |
| `no_cut_mid_word` | a cut point lies inside a transcript word (2 ms-scale guard 0.02 s). Skipped without transcript |
| `caption_length` | caption > 84 chars (2x42) -> warn |
| `caption_reading_speed` | > 20 chars/s warn, > 25 fail; caption < 0.7 s with > 12 chars warn |
| `silence_remaining` | silences >= 0.3 s (-35 dB RMS) left in the output: longest > limit (0.6 s, or the style's `max_pause`), or > 8% of output |
| `duration_reduction` | output longer than source or empty = fail; reports % removed (optional `config={"min_reduction":x}`) |
| `loudness_jumps` | RMS level difference across a cut (0.25 s each side): > 6 dB warn, > 10 dB fail; cuts touching silence are ignored |

Overall = FAIL if any fail, WARN if any warn, else PASS; `score` is the mean of per-check 0..1 scores. Thresholds live in
`evals.checks.DEFAULTS` and can be overridden with `config`.

## Golden set
`run_golden(folder)` scores each video; next to `foo.mp4` it reads `foo.plan.json` (else uses `plan_fn(video)` or a baseline
silence-cut plan) and `foo.transcript.json` (optional). Writes `golden_report.json` in the folder. A video that cannot be read
is reported as ERROR and counted as failed without stopping the batch. Wire `plan_fn` to the real agent loop to regression-test it.

## Limits (read this)
- These are objective proxies. **A human-judgement layer cannot be automated here**: whether the edit keeps the right content, pacing
  feels good, the hook works, B-roll fits, captions look good, or the result matches the creator's intent must be reviewed by a person
  (side-by-side review of the golden set, with a rating sheet). A passing scorecard means "no mechanical defects", not "good edit".
- `no_cut_mid_word` is only as accurate as the transcript's word timings (Whisper timings are often 50-150 ms off; the guard is small).
- Loudness jump uses RMS, not LUFS; silence uses a fixed -35 dB threshold (noisy rooms will under-detect).
- Captions are checked in source time as stored in the plan; output-time remapping (tools/edit/timeline.py) is not applied.
- No schema validation against tools/edit/editplan.schema.json (did not exist when this was written); only the fields used are read.
