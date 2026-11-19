# services/api — Claude Editor backend (FastAPI)

## Run
    pip install -r requirements.txt
    ./run.sh            # http://localhost:8000, SQLite + local disk in services/api/.data
    python3 -m pytest -q
Env: `EDITOR_DATA_DIR`, `EDITOR_AGENT=auto|fake|real`, `EDITOR_RENDER=auto|fake|real`, `PORT`.
`auto` = use real `agent.run_agent` only if importable AND `ANTHROPIC_API_KEY` set; use real `services.render` if importable; else fakes.

## Endpoints
| | |
|---|---|
| POST /projects `{name?}` | create (201) |
| POST /projects/{id}/upload (multipart `file`) | save to disk, ffprobe, create plan v1 |
| POST /projects/{id}/messages `{content}` | 202, stores msg, enqueues agent job (409 if no upload yet) |
| GET /projects/{id} | project + plan + plan_version + messages + assets + jobs |
| GET /projects/{id}/events | SSE; `id:`=event id, replay via `Last-Event-ID` or `?after=`; `?follow=false` drains and closes |
| POST /projects/{id}/render `{quality: final\|preview}` | 202, enqueue render job |
| GET /projects/{id}/render?quality= | mp4 of latest render (404 if none) |
| GET /projects/{id}/plans, /plans/{v}, POST /plans/{v}/restore, PUT /plan | EditPlan version history |
| GET /projects, /projects/{id}/source, /health | extras |

SSE event types: upload.done, message, job.queued/started/completed/failed, agent.started, any type emitted by
the agent in `events` (default agent.event), plan.updated, render.started, render.done.
Each plan change is a new immutable row in `plans` (identical plans are not re-saved). `plan["version"]` inside the JSON is the schema version and is left untouched; the history version is `plan_version`.

## Layout
`editor_api/main.py` app + endpoints, `db.py` SQLite layer, `jobqueue.py` JobQueue protocol + InProcessQueue (1 worker thread, FIFO),
`adapters.py` lazy agent/render adapters with fakes, `schema.sql` Postgres/Supabase (tables + RLS).

## Verified / not
Verified: 13 pytest tests (TestClient) + manual uvicorn run with live SSE; fake agent/render; adapter switching to real modules via injected stubs.
Not verified: real agent/render integration, ffprobe path on a real video, Postgres schema (not executed against a database).
Not implemented: Postgres/Supabase DB backend (only the schema; db.py is SQLite), auth, Supabase Storage, job recovery after restart (queued jobs are lost).
