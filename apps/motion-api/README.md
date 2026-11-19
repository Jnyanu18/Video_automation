# motion-api

Product 2's service. A creative brief goes in; Claude directs a motion-graphics
film, writes it in code against the shared Remotion kit, renders frames, **looks
at those frames as images**, critiques its own work, iterates, then renders the
final film and scores it.

Implements `skills/motion-director/references/api-integration.md`.

## Run

```powershell
cd apps\motion-api
pip install -r requirements.txt
$env:ANTHROPIC_API_KEY = "sk-ant-..."
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
python -m motion_api.main          # :8795
```

| Endpoint | Does |
|---|---|
| `POST /motion/jobs` | `{"brief": "..."}` -> 202 with a job id; runs in a background thread |
| `GET /motion/jobs` | all jobs, newest first |
| `GET /motion/jobs/{id}` | status, rounds, stills, scorecard, errors |
| `GET /motion/jobs/{id}/film` | the rendered mp4 |
| `GET /health` | liveness |

Environment: `ANTHROPIC_API_KEY`, `CHROME_PATH`, and optionally
`MOTION_KIT_ROOT`, `MOTION_SKILL_ROOT`, `MOTION_JOBS_ROOT`, `MOTION_PORT`.

## How it is put together

| Module | Responsibility |
|---|---|
| `sandbox.py` | The only path that turns a model-authored string into a real file. Deny-by-default. |
| `kit.py` | Shells out to `packages/motion-kit`; parses `render.mjs --final --json`. |
| `llm.py` | The model boundary, plus `FakeClient` so everything is testable offline. |
| `prompt.py` | Builds the cached system prefix from the director skill. |
| `director.py` | The agent loop. |
| `jobs.py` | File-backed job records. |
| `main.py` | FastAPI. Client, renderer and store are all injectable. |

**Why a manual loop and not the SDK tool runner:** tool results here carry image
blocks so the model can see its own frames, and the runner's tool functions
return plain strings. That is the documented reason to drop to a manual loop.

**Prompt caching:** `SKILL.md` plus all `references/*.md` go in one stable system
block (~41K characters) with a `cache_control` breakpoint at its end. The brief
and any brand kit go in the first *user* message. Putting per-job content in the
system block would invalidate the cache on every request. Watch
`usage.cache_read_input_tokens` to confirm it is working.

## The sandbox

`write_file` accepts only `src/film.tsx`, `score.py`, `plan.md`, or a new file
directly under `src/kit/`. Everything else is refused: absolute paths, drive
letters, `..` traversal in any separator style, nested subdirectories, odd
extensions, null bytes, and paths that cross a symlink **or a Windows junction**.

The junction case matters here specifically. `os.path.islink()` returns `False`
for a junction, so the sandbox tests the reparse-point bit instead and walks the
whole chain from the target up to the job root. There is a test that creates a
real junction inside the job directory and proves a write through it is refused.

## Tests

```powershell
cd apps\motion-api
python -m pytest -q
```

**38 passed** as of 2026-11-19. They cover: the sandbox allow/deny matrix
including the live junction case, the loop reaching a scored film, stills coming
back as well-formed base64 JPEG image blocks labelled with their timestamps, a
blocked write becoming an `is_error` tool result rather than a crash, a tool
exception being reported back to the model, a refusal stopping the loop, the
failing-scorecard fix round, the round cap, and the HTTP surface including job
persistence across a restart.

### What the tests do NOT cover

Be clear about this before trusting it in front of a client:

- **No request has ever been sent to the Anthropic API from this code.** There is
  no API key in this environment. The loop is exercised entirely through
  `FakeClient`. The request shape (adaptive thinking, `effort`, the fallbacks
  beta, streaming) is written against the current API but is **unverified
  against a live endpoint**.
- **The loop has never driven the real Remotion kit.** `KitRenderer` is covered
  only by its own argument construction; the kit's CLI was verified separately
  (a real 7.5s film rendered at 1080x1920/60fps, measured -13.68 LUFS and
  -1.87 dBTP), but not through this service.
- No concurrency limit, no per-job timeout budget, and no container isolation.
  `api-integration.md` calls for a sandboxed worker per job; this runs the kit as
  a subprocess on the host. The path sandbox limits *where* the model can write,
  not what `score.py` does once it runs.

First live run to do: one real brief, one job, watch the rounds and the cache
hit rate.
