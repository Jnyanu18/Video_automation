# BUILD SPEC — Long-form footage editor (Phases 1–3)

**You are the implementing agent.** Build this in three phases, in order. Do not skip ahead, do not
redesign the architecture, and do not start Phase 2 until Phase 1 passes its gate.

Another agent (Claude Code) will test and deploy your work. It will run the exact acceptance commands
in this document. Anything that does not pass them is not done, however good the code looks.

---

## 0. The product you are building

Today's editor only handles short creator footage: 3–4 minutes of a talking head, cut by removing
silence from a transcript. That is the wrong machine for the real business.

**The target:** a client uploads **1–8 hours** of raw event footage — a wedding, a school annual day,
a corporate event, a birthday — often from **2–3 cameras plus an audio recorder** — and gets back
edited films: a 60–90s teaser, a 3–5 minute highlight, and a 20–40 minute full film with chapters.

A wedding has almost no continuous speech, so transcript-driven silence cutting is useless here. The
edit must be driven by **what the footage contains** (shots, motion, focus, faces, audio energy,
speech where it exists) and by **the known structure of the event** (arrival → ceremony → vows →
speeches → first dance → exit).

**The one architectural rule that makes this possible: never let an AI model watch 8 hours of video.**
A cheap local pass throws away 85–95% of the footage first. Only the survivors reach a model. If you
send whole clips to a video model, the product is unaffordable and you have failed the task.

---

## 1. Hard constraints — read before writing any code

### Do not touch these
- `apps/motion-api/`, `packages/motion-kit/`, `projects/`, `skills/motion-director/` — a different
  product (motion-graphics films). Out of scope entirely.
- `.env` and any file holding an API key. Never print, copy, commit or rewrite one. If you need a key,
  read it from the environment and fail with a clear message when it is missing.
- `agentic-video-editor/` — **read it, do not refactor it.** It is installed machine-globally as an
  editable package (`site-packages/_editable_impl_agentic_video_editor.pth` points at
  `J:\ai editor\agentic-video-editor`). Renaming or moving files there silently breaks imports
  elsewhere. Reuse it by importing or by copying code into your new package.
- Existing green tests. The engine currently passes **433 Python tests (1 skipped)** and **224 Node
  tests**. If your change makes any of them fail, that is a regression and the phase does not pass.

### Windows / this machine
- `J:\ai editor\automation` is a **junction**, not a folder and not a symlink. `os.path.islink()`
  returns `False` for it. The real engine path is
  `J:\ai editor\new project - marketing automatio\new project - marketing automatio\automation`.
  Any directory walker you write must test the reparse-point bit or it will walk the engine twice.
  `shutil.move` follows junctions and duplicates the tree — use `os.rename` for moves.
- Write files containing Windows paths with Python, never with `printf` or `echo`. `printf` turns
  `\a` into a BEL byte and `\n` into a newline mid-path.
- VS Code's file watcher holds locks on directories. If a rename fails with `EPERM`, say so and move
  on; do not retry in a loop.
- ffmpeg 9.0.2 and ffprobe are on PATH. Use them directly; do not add a Python video-encoding
  dependency.
- The full Python suite takes **~9 minutes**, not the ~2.5 the old docs claim. Run it in the
  background or run only the directory you changed while iterating.

### Decisions already made — do not relitigate
- **Backend of record: `api_server.py` and its `create_app()` factory** in
  `automation/editor/`. The Expo app in `automation/app` calls those `/api/editor/*` routes and they
  have the test coverage. `services/api/editor_api/` is a second, overlapping FastAPI app — ignore it;
  do not add routes there.
- **New code lives in a new package: `packages/footage/`.** It must be importable and testable on its
  own, with no FastAPI import and no engine import. The engine depends on it, never the reverse.
- **The index is the system of record.** Both the engine and AVE read the index your Phase 1 writes.
- **Models: use Gemini for bulk vision work** (describing surviving moments). Anthropic keys are not
  yours to spend in this task. Keep every model call behind one interface so it can be swapped, and
  make every model call optional — all three phases must run end to end with no API key at all,
  returning degraded-but-valid output.

### Dependencies
Already available in `automation/editor/requirements.txt`: `numpy`, `opencv-python`,
`faster-whisper`, `fastapi`, `pydantic>=2`, `pytest`, `httpx`. `scenedetect` (PySceneDetect) is used
by `agentic-video-editor` — add it to `packages/footage` requirements if you use it. Before adding any
other dependency, prefer ffmpeg filters or numpy. Justify every new dependency in one line in the PR
notes.

---

## 2. Read these files first

| File | Why |
|---|---|
| `agentic-video-editor/src/pipeline/preprocess.py` | existing shot detection (`ContentDetector`, threshold 27.0) + whisper word timings |
| `agentic-video-editor/src/models/schemas.py` | `Shot`, `FootageIndex`, `EditPlan`, `ReviewScore` — your v2 schema extends these ideas |
| `agentic-video-editor/src/agents/director.py`, `trim_refiner.py`, `reviewer.py` | the agent loop and the review-and-retry gate you are rebuilding at scale |
| `agentic-video-editor/src/tools/analyze.py` | `analyze_footage()` — **the thing to replace.** It sends an entire clip to a video model per file. Understand why that cannot scale to 8 hours |
| `automation/editor/api_server.py` | route conventions: `@app.post(..., status_code=202)` to start a job, `@app.get(".../{jid}")` to poll it |
| `automation/editor/studio/ingest.py` | `IngestJobs` — the background-job pattern to copy, including progress callbacks |
| `automation/editor/studio/ave_integration.py` | the existing bridge to AVE; extend this style, keep `is_ave_available()`-type graceful degradation |
| `automation/editor/studio/store.py` | durable state (`editor/work/studio_state.json`) |

---

## 3. PHASE 1 — Proxies, triage ladder, index (no AI at all)

This is the phase that decides whether the product is feasible. It uses **zero model calls.**

### 3.1 Build `packages/footage/`

```
packages/footage/
  pyproject.toml            # name: ailo-footage, package dir: footage/
  requirements.txt
  footage/
    __init__.py
    cli.py                  # python -m footage ...
    probe.py                # ffprobe -> MediaFile
    proxy.py                # 540p proxy transcode
    shots.py                # shot boundary detection
    metrics.py              # motion, focus, exposure, audio RMS, audio class
    faces.py                # face presence + clustering
    sync.py                 # multi-camera audio sync
    speech.py               # faster-whisper + speaker turns
    triage.py               # keep_score, reject reasons, dedupe
    moments.py              # shots -> cross-camera moments
    index.py                # FootageIndex v2 read/write/validate
    schema.py               # pydantic models
  tests/
```

### 3.2 Proxies — do this before any analysis

Analysis never touches the original files. For each source file write a proxy:

```
ffmpeg -i <src> -vf scale=-2:540 -r 25 -c:v libx264 -preset veryfast -crf 30 \
       -c:a aac -b:a 96k -movflags +faststart <proxy>
```

Proxies go in `<work>/proxies/<media_id>.mp4`. Record `proxy_path` in the index. Keep a checksum of
the source so a re-index can skip unchanged files. The **final render conforms from the originals**,
never the proxies.

Transcode files in parallel across CPU cores (cap at `os.cpu_count() - 1`). This is the single
biggest lever on wall-clock time.

### 3.3 The triage ladder

**L0 — per-shot local metrics.** Split each proxy into shots, then compute per shot:

| metric | how | used for |
|---|---|---|
| `motion` | mean absolute frame difference on sampled frames | handheld vs locked-off; dead tripod footage |
| `focus` | variance of Laplacian (OpenCV) | rejects out-of-focus and smeared pans |
| `exposure` | mean luma + clipped-pixel fraction | rejects blown-out and black frames |
| `audio_rms` | ffmpeg `astats` or numpy on decoded audio | silence vs activity |
| `audio_class` | cheap heuristic: speech / music / applause / noise / silence from RMS envelope + spectral flatness | finds speeches, dancing, applause |
| `faces` | OpenCV detector on 2–3 sampled frames | people present, face count, largest face area |

Sample frames, do not decode every frame. 2–4 samples per second of proxy is enough.

**L1 — keep score and rejection.** Every shot gets `keep_score` in `[0,1]` and, when rejected, a
`reject_reason` from a fixed vocabulary: `too_short`, `out_of_focus`, `over_exposed`,
`under_exposed`, `static_dead`, `silent_dead`, `duplicate`, `no_people`. **Rejections are recorded,
never deleted** — a human must be able to see what was thrown away and why, and tune thresholds.

Every threshold lives in one `TriageConfig` dataclass with documented defaults. No magic numbers
scattered through the code.

**Target: `keep` is 5–15% of total source duration.** If a run keeps more than 25%, the ladder is
not working — print a warning in the stats block.

### 3.4 Multi-camera sync and moments

- `sync.py`: estimate per-file offsets within a camera group by **cross-correlating audio envelopes**
  (decode mono 8 kHz, build an RMS envelope, FFT cross-correlation). Report `confidence`. Fall back to
  file-creation timestamps when correlation is weak, and mark `method: "mtime"`.
- `camera_id`: infer from the parent folder name (`CAM_A`, `cam-b`, `A001`...) and the device metadata
  ffprobe reports; let the caller override it. Never guess silently — record how it was decided.
- `moments.py`: a **moment** is one real-world event covered by one or more camera angles. Group
  shots that overlap in synced wall-clock time into a single moment with an `angles[]` list, best
  angle first by `keep_score`. This is what stops the edit showing the same kiss three times.

### 3.5 Speech

Run faster-whisper **only on shots whose `audio_class` is `speech`** and whose duration exceeds 2s.
Store word timings. Add simple speaker turns from pause structure and channel energy — real
diarization is not required in Phase 1, but the field must exist in the schema.

### 3.6 FootageIndex v2 schema

One JSON file, written atomically (temp file plus `os.replace`), validated by pydantic on read:

```jsonc
{
  "index_version": 2,
  "project_id": "wedding-sharma-2026",
  "created_at": "2026-11-20T10:00:00Z",
  "source_dirs": ["J:\\...\\raw"],
  "media": [{
    "media_id": "m001", "path": "...", "camera_id": "CAM_A",
    "duration": 3600.0, "fps": 25.0, "width": 3840, "height": 2160,
    "codec": "hevc", "has_audio": true, "start_wallclock": "...",
    "proxy_path": "...", "checksum": "..."
  }],
  "sync_groups": [{
    "group_id": "g1", "media_ids": ["m001","m002"],
    "offsets": {"m001": 0.0, "m002": 12.48},
    "method": "audio_xcorr", "confidence": 0.91
  }],
  "shots": [{
    "shot_id": "s00001", "media_id": "m001", "start": 0.0, "end": 4.2,
    "motion": 0.31, "focus": 0.82, "exposure": 0.55,
    "audio_rms": 0.12, "audio_class": "speech", "faces": 2, "face_area": 0.08,
    "keep_score": 0.74, "reject_reason": null
  }],
  "moments": [{
    "moment_id": "mo0001", "t_start": 120.0, "t_end": 126.5,
    "angles": [{"shot_id": "s00031", "camera_id": "CAM_A", "quality": 0.81}],
    "keep_score": 0.81, "tags": [], "description": null,
    "speech": {"text": "...", "speaker": "S1"}
  }],
  "speech": [{"media_id": "m001", "start": 120.4, "end": 126.1, "speaker": "S1",
              "text": "...", "words": [{"word": "we", "start": 120.4, "end": 120.6}]}],
  "stats": {
    "total_source_seconds": 28800.0, "media_count": 6, "shots": 4182,
    "moments": 611, "kept_seconds": 2340.0, "keep_ratio": 0.081,
    "proxy_seconds": 1180.0, "index_wall_seconds": 2904.0,
    "realtime_factor": 9.9, "model_calls": 0
  }
}
```

`stats` is not decoration — it is how the gate is judged. Populate every field.

### 3.7 CLI

```
python -m footage index <source_dir> --out <index.json> --work <work_dir> [--camera-map A=CAM_A] [--json]
python -m footage stats <index.json>
python -m footage sheet <index.json> --out <dir> [--kept-only]   # contact sheet JPEGs of moments
```

`--json` prints exactly one JSON object on stdout and sends all logging to stderr. The tester depends
on this.

### 3.8 Engine wiring

- `automation/editor/studio/longform.py` — a thin adapter: start an index job, poll it, read stats.
  Background-job pattern copied from `studio/ingest.py`, progress persisted through `studio/store.py`
  so a restart does not lose a 1-hour job.
- Routes in `api_server.py`, following the existing convention exactly:
  - `POST /api/editor/longform/index` → `202 {"job_id": ...}`
  - `GET  /api/editor/longform/index/{jid}` → progress, then stats
  - `GET  /api/editor/longform/{project_id}/moments` → paged moments, filterable by tag/keep
  - `GET  /api/editor/longform/{project_id}/rejected` → what triage dropped, with reasons
- Degrade gracefully: if `packages/footage` is not installed, the routes must return a clear
  "unavailable" payload, exactly as `is_ave_available()` does today — never a 500 at import time.

### 3.9 PHASE 1 GATE — the tester runs these

1. `cd packages/footage && python -m pytest -q` → all pass, **≥ 25 tests**, covering: probe parsing,
   triage thresholds, reject vocabulary, sync offset recovery on a synthetic pair with a known
   offset, moment grouping across cameras, atomic index write, schema round-trip.
2. `python -m footage index "<real footage dir>" --out idx.json --json` on real footage from
   `raw footage/cuts` → valid v2 JSON, `model_calls: 0`.
3. **Speed: `realtime_factor ≥ 6`** (8 hours indexed in under ~80 minutes), measured, reported in
   `stats`, with the proxy pass included in the number.
4. **Triage: `keep_ratio` between 0.05 and 0.25**, and every rejected shot carries a reason from the
   fixed vocabulary.
5. `python -m footage sheet idx.json --out sheets/` → contact sheets a human can actually judge.
6. The engine's full Python suite still passes: **at least 433 passed, 1 skipped**, run from
   `automation/editor` with `python -m pytest`.
7. `packages/footage` imports with **no** FastAPI and **no** engine import. The tester will check with
   a clean `python -c "import footage"`.

Write the measured numbers into `docs/longform-phase1-results.md`. Do not report a phase as passing
without the numbers in that file.

---

## 4. PHASE 2 — Understanding the survivors (model calls allowed, cheaply)

Only moments that survived Phase 1 reach this phase. Hard budget: **the model sees at most 40 minutes
of footage per 8-hour project.**

### 4.1 Describe
- `footage/describe.py`: for each kept moment, send **a short proxy segment or 3–5 sampled frames**
  (not the clip, never the original) to Gemini and fill `description`, `tags[]`, `energy` (1–5) and
  `people_count`.
- Batch moments into one request where the model supports it. Cache by moment content hash in
  `<work>/cache/describe/<hash>.json` so re-runs are free. Never re-describe an unchanged moment.
- **With no API key, this must still succeed**, filling `description` from the local metrics
  ("handheld, 2 faces, speech, high motion") and tagging from `audio_class`. The pipeline never hard
  depends on a model.

### 4.2 Identity and search
- `faces.py` grows face **clustering** (embeddings + agglomerative clustering, local only, no
  external service). Output `people[]` clusters with representative thumbnails so a client can name
  them once: "this is the bride", "this is grandmother". Store names in the index, not in code.
  These are biometric-adjacent features of private individuals: keep every embedding and thumbnail
  inside the project's own work directory, never send them to any external service, and support
  deleting a project's face data outright.
- `search.py`: `find_moments(query, index)` combining keyword match over description/tags/speech with
  an optional embedding similarity. Deterministic and testable; keyword path must work with no model.

### 4.3 Highlight scoring
- `score.py`: a defensible per-moment `highlight_score` from keep_score, energy, face area, audio
  class, speech presence, named-person presence, and novelty (penalise near-duplicates). Weights in
  one config dataclass, documented.

### 4.4 PHASE 2 GATE
1. `pytest` in `packages/footage` still green, **≥ 40 tests** total, including a no-API-key path test
   that asserts descriptions are still produced.
2. `python -m footage describe idx.json --json` reports `model_seconds_sent ≤ 2400` for an 8-hour
   project and `cache_hits` on the second run equal to the moment count.
3. `python -m footage search idx.json "first dance"` returns ranked moments with timestamps, and the
   top 5 are genuinely relevant when the tester opens the contact sheets.
4. Face clustering on real footage groups the same person across camera angles; the tester will check
   a named cluster by eye. No face data leaves the work directory.
5. Engine suite still at least 433 passed / 1 skipped.

Numbers go in `docs/longform-phase2-results.md`.

---

## 5. PHASE 3 — Rundowns, the edit plan, and the render

### 5.1 Rundown templates — the commercial core
`packages/footage/templates/*.yaml`, one per vertical: `wedding-highlight`, `wedding-full`,
`school-annual-day`, `corporate-event`, `birthday`. Each template is an ordered list of beats:

```yaml
name: wedding-highlight
target_duration: 210
beats:
  - id: arrival
    must_have: [exterior, guests]
    duration: [10, 20]
    search: ["arrival", "entrance", "guests arriving"]
  - id: vows
    must_have: [speech, two_people]
    duration: [25, 45]
    search: ["vows", "ceremony", "ring"]
    prefer: speech_whole      # never cut mid-sentence
```

A template is data, not code. Adding a new event type must require **no code change**.

### 5.2 Planner
`plan.py` fills a rundown from the index: for each beat, search candidates, pick the best
non-duplicate moment, respect the duration budget, and **report missing beats explicitly** — "no
usable arrival footage found" is a first-class, client-visible output, not a silent gap.

The model's job here is selection and ordering within the rundown's constraints, not free-form
authorship. Deterministic fallback: highest `highlight_score` per beat, so planning works with no
model at all.

### 5.3 Beat-locked cutting
Accept a user-supplied music track (and only user-supplied: do not generate or fetch music here).
Detect the beat grid, snap cut points to beats, and ramp cut density with the energy curve — slow at
the start, fast in the montage, slow for the exit. Keep speech-whole moments off the beat grid; never
chop a vow or a speech to fit a beat.

### 5.4 EditPlan v2 and conform render
Extend AVE's `EditPlan` with what long-form needs: `media_id` plus `camera_id` per entry, source
in/out **in original-file timebase** (not proxy time), angle choice, transition, speed, music bed
with gain automation, chapter markers for the full film, and a title/lower-third slot.

`render.py` conforms **from the originals** with ffmpeg: cut, crossfade, duck the music under speech,
master to −14 LUFS and under −1.5 dBTP, and write chapter metadata. Render the three deliverables
from one plan: teaser, highlight, full film.

Reuse the review-and-retry gate from `agentic-video-editor/src/agents/reviewer.py`, extended with
hard mechanical checks that need no model: no shot under 0.4s, no two adjacent shots from the same
angle of the same moment, no repeated moment, audio continuity across cuts, and total duration inside
the template's budget.

### 5.5 Human approval — mandatory
Nobody ships a wedding film unreviewed. The existing approval gate must be honoured: final render
returns `409 NOT_APPROVED` until approved, and a revision withdraws approval. Add `must_include` and
`never_include` moment lists that the planner obeys absolutely, so a client's "my grandmother must be
in it" is a constraint and not a suggestion.

Routes, same conventions:
- `POST /api/editor/longform/{project_id}/plan` → `202`, then the plan
- `GET  /api/editor/longform/{project_id}/plan/{plan_id}` → plan with missing-beat report
- `POST /api/editor/longform/{project_id}/plan/{plan_id}/approve`
- `POST /api/editor/longform/{project_id}/render` → `202`; `409 NOT_APPROVED` when unapproved
- `GET  /api/editor/longform/{project_id}/render/{jid}` → progress, then outputs and scorecard

### 5.6 PHASE 3 GATE
1. `pytest` green in `packages/footage`, **≥ 60 tests** total: template loading, beat filling, missing
   beat reporting, duplicate-angle rejection, proxy→original timebase conversion (an off-by-one here
   ruins every cut — test it hard), `must_include` enforcement, beat snapping, the no-model fallback.
2. `python -m footage plan idx.json --template wedding-highlight --duration 180 --json` → a plan whose
   duration is within ±5% of target, with zero duplicate moments and an explicit missing-beat list.
3. `python -m footage render plan.json --deliverable highlight --json` → a real MP4 cut from the
   **originals**, with measured `lufs` within −14 ±1 and `peak` under −1.5 dBTP in the JSON.
4. The tester watches it. It must not contain: a repeated moment, a sub-0.4s flash, a cut mid-word in
   a vow or speech, or an out-of-focus shot that triage should have rejected.
5. `409 NOT_APPROVED` is returned for an unapproved render — proven by a test, not by assertion.
6. A new event type added **by writing one YAML file only**, no code change. Demonstrate with
   `birthday`.
7. Engine suite still at least 433 passed / 1 skipped; Node suite still at least 224.

Numbers go in `docs/longform-phase3-results.md`.

---

## 6. How to work

- **Commit per phase, on a branch**, never to `main`/`master` directly. Branch names:
  `longform/phase-1`, `longform/phase-2`, `longform/phase-3`. Do not merge; the tester reviews.
- Keep each module under ~400 lines. If `triage.py` grows past that, the thresholds belong in config
  and the metrics in `metrics.py`.
- Every function that touches time must document its timebase in the docstring: **proxy seconds,
  original-file seconds, or synced wall-clock seconds.** Mixing these is the most likely way this
  project fails. Name variables accordingly (`t_src`, `t_proxy`, `t_wall`).
- Fail loudly on bad input; never silently skip a file. A file you could not probe goes in the index
  as `media` with an `error` field so the client knows it was not edited.
- Determinism: same footage plus same config equals the same index. No wall-clock seeds, no
  dictionary-order dependence.
- No progress-bar spam. One line per file, plus a final stats block.

## 7. Report back in this format

For each phase, in `docs/longform-phase<N>-results.md`:

```
## What I built
<file list with one line each>

## Measured numbers
<the exact gate numbers, from real runs on real footage — not estimates>

## What I could not do
<be specific and honest; a known gap is useful, a silent one is not>

## Dependencies added
<each with a one-line justification>

## How to run it
<copy-pasteable commands>
```

If you cannot hit a gate number, **stop and write down the number you did hit and why.** Do not
loosen the gate, do not fake the stats, and do not report a phase as passing when it is not. The
tester reruns every command in this document.
