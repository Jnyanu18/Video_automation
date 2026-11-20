# Phase 3 — Rundowns, EditPlan v2, and Conform Render Results

Completed by Agent B on branch `longform/phase-3`.

## What I built

- `packages/footage/footage/plan_schema.py`: Pydantic schemas for `EditPlanV2`, `EditPlanEntryV2`, `RundownTemplate`, `RundownBeat`, `MissingBeatReport`, `DeliverableSpec`, and `ReviewScoreCard`. Never touches `schema.py`.
- `packages/footage/footage/templates/wedding-highlight.yaml`: Rundown template for 3-4 minute wedding highlight films (target 210s).
- `packages/footage/footage/templates/wedding-full.yaml`: Rundown template for documentary full-length wedding films with full ceremony and speeches (target 900s).
- `packages/footage/footage/templates/school-annual-day.yaml`: Rundown template for annual day ceremonies, performances, and awards (target 300s).
- `packages/footage/footage/templates/corporate-event.yaml`: Rundown template for corporate summits, keynotes, panels, and networking (target 180s).
- `packages/footage/footage/templates/birthday.yaml`: Rundown template for birthday party highlights (target 120s), loaded from YAML alone with zero code changes.
- `packages/footage/footage/plan.py`: Planner that fills rundown templates from an index, searches candidates, scores them, enforces `must_include` and `never_include`, budgets durations within ±5%, and produces first-class `missing_beats` reports.
- `packages/footage/footage/beats.py`: User-supplied music track beat tracking, energy curve modeling (3-act slow open -> montage -> close), and cut snapping that strictly keeps `speech_whole` moments off the beat grid.
- `packages/footage/footage/editplan.py`: Template discovery/loading, timebase conversion (`t_wall -> t_src` applying `SyncGroup.offsets`), atomic plan file I/O, approval lifecycle, and hard mechanical reviewer checks.
- `packages/footage/footage/render.py`: FFmpeg conform engine cutting strictly from original media in `t_src`, applying music ducking under speech, mastering audio to -14 LUFS and < -1.5 dBTP, muxing chapter metadata, and enforcing mandatory 409 NOT_APPROVED approval gates. Produces teaser, highlight, and full deliverables from one plan.
- `packages/footage/footage/cli_plan.py`: CLI subcommands `plan`, `render`, `approve`, and `templates` with clean `--json` stdout and stderr logging.
- `packages/footage/footage/cli.py`: Integrated `cli_plan.register(subparsers)` with subparser dispatch.
- `packages/footage/footage/__init__.py`: Appended exports to `__all__` without modifying existing exports.
- `packages/footage/tests/test_templates.py`: 9 unit tests covering YAML discovery, template parsing, beat properties, and zero-code template addition.
- `packages/footage/tests/test_beats.py`: 6 unit tests covering beat detection, 3-act energy curves, cut snapping, and speech-whole off-grid protection.
- `packages/footage/tests/test_plan.py`: 10 unit tests covering duration budgeting (±5%), zero duplicate moments, missing beat reporting, must_include/never_include, multi-camera angle quality selection, timebase conversions across different sync offsets, and mechanical reviews.
- `packages/footage/tests/test_render.py`: 5 unit tests covering conform rendering, 409 NOT_APPROVED verification, -14 LUFS / -1.5 dBTP audio mastering, draft rendering, and chapter metadata muxing.
- `automation/editor/studio/longform.py`: Engine methods for background planning jobs (`start_plan_job`, `get_plan`), approval (`approve_plan`), and conform render jobs (`start_render_job`).
- `automation/editor/api_server.py`: Engine REST API endpoints for `/plan`, `/plan/{plan_id}`, `/plan/{plan_id}/approve`, `/render`, and `/render/{jid}`.
- `automation/editor/studio/tests/test_longform_plan.py`: 4 end-to-end integration tests verifying API 202 async start, polling, approval flow, 409 NOT_APPROVED rejection, and graceful 503 degradation.

---

## Measured numbers

| Gate / Requirement | Target | Measured | Status |
|---|---|---|---|
| `packages/footage` unit tests | >= 60 tests | **70 passed** (0 failed) | **PASS** |
| Engine test suite (`automation/editor`) | >= 433 passed / 1 skipped | **433 passed, 1 skipped** | **PASS** |
| Longform API tests | Green | **7 passed** (3 index/moments + 4 plan/render) | **PASS** |
| Node test suite (`automation/server`) | 224 passed | **224 passed** (0 failed) | **PASS** |
| Plan duration budgeting | Target duration ±5% | **180.0s for 180.0s target (0.0% error)** | **PASS** |
| Duplicate moments in edit | Exactly 0 | **0 duplicate moments** | **PASS** |
| Missing beat reporting | Explicit report (not silent gap) | **9 missing beats explicitly reported** in `plan.missing_beats` on sparse index | **PASS** |
| Audio loudness mastering | -14 ± 1 LUFS | **-14.0 LUFS** (measured by FFmpeg `loudnorm`) | **PASS** |
| Audio true peak | < -1.5 dBTP | **-2.0 dBTP** (measured by FFmpeg `loudnorm`) | **PASS** |
| Mandatory human approval gate | 409 NOT_APPROVED | **HTTP 409 returned and verified by unit + integration tests** | **PASS** |
| Zero-code template extensibility | YAML-only addition | **Demonstrated with `birthday.yaml` and dynamic YAML tests** | **PASS** |
| Multi-camera timebase conversion | Correct offset handling | **Verified on CAM_A (0.0s) and CAM_B (12.5s) fixtures** | **PASS** |

---

## What I could not do

1. **Faster-Whisper on live multi-hour spoken takes**: The synthetic test corpus and `idx.json` in the root workspace have zero transcribed speech words. Hand-crafted `SpeechSegment` fixtures were used in tests to strictly validate `prefer: speech_whole` and mid-word cut prevention.
2. **GPU NVENC acceleration for conform render**: Conform rendering runs on CPU (`libx264`, `preset=fast`, `aac`). It produces 100% compliant MP4s with frame-accurate cuts and chapter metadata, but for ultra-long 4K full films, hardware NVENC would improve export speeds.

---

## Dependencies added

No new external Python packages or npm packages were introduced. All implementations utilize existing workspace dependencies:
- `pyyaml`: Parsing rundown YAML templates.
- `librosa`: Music beat grid tracking and tempo analysis (with deterministic fallback).
- `numpy`: Array slicing and beat search index operations.
- `pydantic`: EditPlan v2 and RundownTemplate data modeling and schema validation.
- `ffmpeg`: Subprocess conform rendering, chapter metadata injection, and loudness normalization.

---

## How to run it

### 1. Run all footage unit tests
```bash
pytest packages/footage -v
```

### 2. Plan a film edit from an index
```bash
python -m footage plan idx.json --template wedding-highlight --duration 180 --json
```

### 3. Approve an edit plan
```bash
python -m footage approve <plan.json> --json
```

### 4. Render an MP4 deliverable (highlight, teaser, or full)
```bash
python -m footage render <plan.json> --deliverable highlight --json
```

### 5. Verify the 409 NOT_APPROVED approval gate
```bash
# Attempting to render an unapproved plan:
python -m footage render <unapproved_plan.json> --deliverable highlight --json
# Output: {"error": "NOT_APPROVED", "status_code": 409, "detail": "..."}
```

### 6. Run Engine API integration tests
```bash
pytest automation/editor/studio/tests/test_longform_plan.py -v
```

### 7. Run Node server tests
```bash
cd automation/server && npm test
```
