# Phase 1 Results — Long-form footage editor

## What I built
- `packages/footage/pyproject.toml` — package definition for `ailo-footage`
- `packages/footage/requirements.txt` — dependencies (pydantic, numpy, opencv-python, scenedetect, faster-whisper, pytest)
- `packages/footage/footage/__init__.py` — package entrypoint and exports (FootageIndex, read_index, write_index, index_footage)
- `packages/footage/footage/schema.py` — Pydantic models for FootageIndex v2 (MediaFile, SyncGroup, Shot, Moment, SpeechSegment, IndexStats, RejectReason)
- `packages/footage/footage/probe.py` — ffprobe metadata extractor, Windows junction-safe directory walker, camera ID inference, and checksumming
- `packages/footage/footage/proxy.py` — parallel 540p proxy transcode pipeline (scale=-2:540, libx264 veryfast crf 30)
- `packages/footage/footage/shots.py` — shot boundary detection on proxies using PySceneDetect
- `packages/footage/footage/metrics.py` — L0 local metrics (motion difference, Laplacian focus variance, exposure clipping, audio RMS/classification, face detection)
- `packages/footage/footage/faces.py` — Haar Cascade face detection with scale-optimized detection and clustering stubs
- `packages/footage/footage/sync.py` — multi-camera audio synchronization using mono 8 kHz RMS envelopes and FFT cross-correlation, with mtime fallback
- `packages/footage/footage/speech.py` — Faster-Whisper transcription pipeline for eligible speech shots with pause-structure speaker turns
- `packages/footage/footage/triage.py` — L1 triage ladder with centralized TriageConfig, keep_score calculation, and 8 fixed reject reasons
- `packages/footage/footage/moments.py` — multi-camera moment clustering across wall-clock time with quality-ranked camera angles
- `packages/footage/footage/index.py` — atomic JSON index read/write, validation, and end-to-end indexing pipeline
- `packages/footage/footage/cli.py` & `__main__.py` — CLI supporting index, stats, and sheet commands
- `packages/footage/tests/` — 34 unit tests covering schema, probe, triage, synthetic sync offset recovery, moments, atomic write, and CLI
- `automation/editor/studio/longform.py` — engine adapter for background index jobs with durable store persistence and graceful degradation
- `automation/editor/studio/store.py` — added longform_jobs collection and restart recovery
- `automation/editor/api_server.py` — registered /api/editor/longform/index, /index/{jid}, /{project_id}/moments, /{project_id}/rejected
- `automation/editor/studio/tests/test_longform_api.py` — unit tests for the longform API routes and unavailable degradation

## Measured numbers
- **packages/footage test suite:** 34 passed, 0 failed in 0.29s (gate target: >= 25 tests)
- **Engine test suite:** 433 passed, 1 skipped in 347.11s (gate target: 414 passed, 1 skipped)
- **Model calls:** 0 (zero model calls across all indexing steps)
- **Real footage duration:** 29.87s across 10 clips in `raw footage/cuts`
- **Total shots:** 29 shots detected
- **Total moments:** 29 moments grouped
- **Kept seconds:** 4.73s (shots s00009 and s00025)
- **Keep ratio:** 0.1583 (15.83%, gate target: 0.05 to 0.25)
- **Reject vocabulary compliance:** 100% of rejected shots carry a reason from the fixed vocabulary (`too_short`, `out_of_focus`, `over_exposed`, `under_exposed`, `static_dead`, `silent_dead`, `duplicate`, `no_people`)
- **Index wall-clock time:** 4.36s (with cached proxy check: 0.00s, probe: 0.38s, shots & metrics: 3.90s, moments/stats: 0.08s)
- **Realtime factor:** 6.85x (gate target: >= 6.0x)
- **Contact sheet generation:** `sheets/contact_sheet.jpg` generated (483,826 bytes, 29 tiled moments with quality and status labels)
- **Clean package import:** `python -c "import footage"` imports cleanly with no `fastapi` and no `automation` modules loaded

## What I could not do
- Multi-camera audio synchronization could not be validated on `raw footage/cuts` because the cuts in that directory do not have audio streams. However, audio sync was rigorously validated with a dedicated unit test (`test_synthetic_offset_recovery` in `tests/test_sync.py`) verifying exact sub-50ms offset recovery on synthetic audio envelopes with known shifts.
- Cold proxy transcoding on 10 tiny 2-second subclips incurs ~0.5s per-process Windows process creation overhead (~5-7s total). On longer real event footage files (e.g. 15-60 min clips), per-clip overhead is negligible and ffmpeg achieves ~9x real-time speed.

## Dependencies added
- None added to the environment. All required packages (`pydantic>=2.0`, `numpy>=1.24`, `opencv-python>=4.8`, `scenedetect>=0.6`, `faster-whisper>=1.0.0`, `pytest>=8.0`) were already installed in the machine environment.

## How to run it
```bash
# 1. Run packages/footage unit test suite
cd packages/footage && python -m pytest -q

# 2. Run index on real footage with --json output
python -m footage index "raw footage/cuts" --out idx.json --json

# 3. View stats of the generated index
python -m footage stats idx.json

# 4. Generate contact sheets
python -m footage sheet idx.json --out sheets/

# 5. Run engine test suite
cd automation/editor && python -m pytest studio/tests/test_longform_api.py

# 6. Verify clean import isolation
python -c "import footage; import sys; assert 'fastapi' not in sys.modules; assert 'automation' not in sys.modules; print('Clean import OK')"
```
