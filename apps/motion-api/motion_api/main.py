"""FastAPI service: a brief goes in, a directed film comes out.

    POST /motion/jobs        {"brief": "..."}  -> job id, runs in the background
    GET  /motion/jobs        list
    GET  /motion/jobs/{id}   status + scorecard
    GET  /motion/jobs/{id}/film   the rendered mp4
    GET  /health
"""
from __future__ import annotations

import threading

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .director import Director
from .jobs import Job, JobStore
from .kit import KitRenderer, Renderer
from .llm import LLMClient
from .prompt import build_system_blocks


class BriefIn(BaseModel):
    brief: str = Field(min_length=1)
    name: str = "film.mp4"


def run_job(job: Job, store: JobStore, client: LLMClient, renderer: Renderer) -> None:
    store.update(job.id, status="running")
    try:
        if hasattr(renderer, "prepare"):
            renderer.prepare(job.dir)
        director = Director(
            client=client,
            renderer=renderer,
            job_dir=job.dir,
            system_blocks=build_system_blocks(),
        )
        t = director.run(job.brief)
        card = t.scorecard
        store.update(
            job.id,
            status="done" if t.final_path else "failed",
            rounds=t.rounds,
            stills=t.stills,
            final_path=t.final_path,
            scorecard=(
                {
                    "duration": card.duration,
                    "fps": card.fps,
                    "lufs": card.lufs,
                    "peak": card.peak,
                    "passes": card.ok,
                    "failures": card.failures(),
                }
                if card
                else None
            ),
            errors=t.errors,
            stopped=t.stopped,
        )
    except Exception as exc:
        store.update(job.id, status="failed", errors=[f"{type(exc).__name__}: {exc}"])


def create_app(
    client: LLMClient | None = None,
    renderer: Renderer | None = None,
    store: JobStore | None = None,
    background: bool = True,
) -> FastAPI:
    """Everything is injectable, so the tests never touch the network or Remotion."""
    app = FastAPI(title="motion-api", version="0.1.0")
    app.state.store = store or JobStore()
    app.state.renderer = renderer or KitRenderer()
    app.state.client = client
    app.state.background = background

    def _client() -> LLMClient:
        if app.state.client is None:
            from .llm import AnthropicClient

            app.state.client = AnthropicClient()
        return app.state.client

    @app.get("/health")
    def health() -> dict:
        return {"ok": True, "service": "motion-api", "jobs": len(app.state.store.list())}

    @app.post("/motion/jobs", status_code=202)
    def create_job(req: BriefIn) -> dict:
        job = app.state.store.create(req.brief)
        args = (job, app.state.store, _client(), app.state.renderer)
        if app.state.background:
            threading.Thread(target=run_job, args=args, daemon=True).start()
        else:
            run_job(*args)
        return {"id": job.id, "status": app.state.store.get(job.id).status}

    @app.get("/motion/jobs")
    def list_jobs() -> dict:
        return {"jobs": [j.to_dict() for j in app.state.store.list()]}

    @app.get("/motion/jobs/{job_id}")
    def get_job(job_id: str) -> dict:
        job = app.state.store.get(job_id)
        if job is None:
            raise HTTPException(404, "no such job")
        return job.to_dict()

    @app.get("/motion/jobs/{job_id}/film")
    def get_film(job_id: str):
        job = app.state.store.get(job_id)
        if job is None or not job.final_path:
            raise HTTPException(404, "no film for this job")
        return FileResponse(job.final_path, media_type="video/mp4")

    return app


app = create_app()


if __name__ == "__main__":
    import os

    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("MOTION_PORT", 8795)))
