"""Claude Editor backend API. `create_app()` builds an app with its own DB/queue/storage."""
import asyncio
import json
import logging
import re
import shutil
import subprocess
import traceback
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Body, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from . import adapters, config
from .db import Database
from .jobqueue import InProcessQueue

log = logging.getLogger("editor_api")
TERMINAL = {"job.completed", "job.failed"}
MAX_UPLOAD = 4 * 1024**3


class ProjectIn(BaseModel):
    name: str = "Untitled"


class MessageIn(BaseModel):
    content: str = Field(min_length=1)


class RenderIn(BaseModel):
    quality: str = Field(default="final", pattern="^(final|preview)$")


def probe_video(path: Path) -> dict:
    """ffprobe -> {duration,width,height,fps}; zeros if ffprobe missing/unreadable."""
    info = {"duration": 0.0, "width": 0, "height": 0, "fps": 30}
    if not shutil.which("ffprobe"):
        return info
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
             "stream=width,height,r_frame_rate:format=duration", "-of", "json", str(path)],
            capture_output=True, text=True, timeout=30)
        d = json.loads(out.stdout or "{}")
        s = (d.get("streams") or [{}])[0]
        num, _, den = (s.get("r_frame_rate") or "30/1").partition("/")
        info.update(duration=float(d.get("format", {}).get("duration") or 0),
                    width=int(s.get("width") or 0), height=int(s.get("height") or 0),
                    fps=round(float(num) / float(den or 1)) if float(den or 1) else 30)
    except Exception as e:
        log.warning("ffprobe failed: %s", e)
    return info


def initial_plan(src_path: Path, info: dict) -> dict:
    return {
        "version": 1,
        "source": {"path": str(src_path), **info},
        "output": {"width": 1080, "height": 1920, "fps": info["fps"] or 30},
        "keep": [{"id": "k1", "start": 0.0, "end": info["duration"]}],
        "captions": [],
        "reframe": {"mode": "none", "track": []},
        "overlays": [],
        "style_ref": None,
        "notes": "",
    }


def create_app(data_dir: str | Path | None = None, queue_factory=InProcessQueue) -> FastAPI:
    root = Path(data_dir) if data_dir else config.data_dir()
    root.mkdir(parents=True, exist_ok=True)
    db = Database(str(root / "editor.db"))

    def emit(pid, type_, **data):
        return db.add_event(pid, type_, data)

    # ---- job handlers (run on the queue worker) ----
    def handle_agent(job):
        pid, msg = job["project_id"], job["payload"]["message"]
        cur = db.latest_plan(pid)
        emit(pid, "agent.started", job_id=job["id"])
        # Earlier chat turns, so Claude keeps context across messages (the current message is passed separately).
        history = [{"role": x["role"], "content": x["content"]} for x in db.list_messages(pid)
                   if x["role"] in ("user", "assistant") and x["content"] and x["id"] != job["payload"].get("message_id")]
        wd = root / "projects" / pid / "work" / "agent"
        out = adapters.run_agent(pid, msg, cur["plan"] if cur else None, history=history, workdir=wd)
        for ev in out.get("events", []):
            ev = dict(ev) if isinstance(ev, dict) else {"text": str(ev)}
            emit(pid, ev.pop("type", "agent.event"), job_id=job["id"], **ev)
        reply = out.get("reply") or ""
        m = db.add_message(pid, "assistant", reply)
        emit(pid, "message", message=m)
        newv = db.save_plan(pid, out["plan"], "agent", f"agent: {msg[:80]}") if out.get("plan") else cur
        if newv and (not cur or newv["version"] != cur["version"]):
            emit(pid, "plan.updated", version=newv["version"])
            enqueue(pid, "render_preview", {})  # so the player shows the edit; runs after this job
        return {"reply": reply, "plan_version": newv["version"] if newv else None,
                "backend": out.get("backend")}

    def make_render_handler(quality):
        def handle(job):
            pid = job["project_id"]
            cur = db.latest_plan(pid)
            if not cur:
                raise RuntimeError("no plan: upload a video first")
            emit(pid, "render.started", job_id=job["id"], quality=quality)
            work = root / "projects" / pid / "work"
            fn = adapters.render_final if quality == "final" else adapters.render_preview
            path, backend = fn(cur["plan"], work)
            p = Path(path)
            a = db.add_asset(pid, f"render_{quality}", p.name, p, p.stat().st_size,
                             {"plan_version": cur["version"], "backend": backend})
            emit(pid, "render.done", job_id=job["id"], quality=quality, asset_id=a["id"],
                 plan_version=cur["version"])
            return {"asset_id": a["id"], "plan_version": cur["version"], "backend": backend}
        return handle

    def runner(job, handler):
        pid = job["project_id"]
        db.update_job(job["id"], "running")
        db.set_status(pid, "processing")
        emit(pid, "job.started", job_id=job["id"], kind=job["kind"])
        try:
            result = handler(job)
        except Exception as e:
            log.error("job %s failed: %s", job["id"], traceback.format_exc())
            db.update_job(job["id"], "error", error=str(e))
            db.set_status(pid, "error")
            emit(pid, "job.failed", job_id=job["id"], kind=job["kind"], error=str(e))
            return
        db.update_job(job["id"], "done", result=result)
        db.set_status(pid, "ready")
        emit(pid, "job.completed", job_id=job["id"], kind=job["kind"], result=result)

    q = queue_factory(runner)
    q.register("agent", handle_agent)
    q.register("render_final", make_render_handler("final"))
    q.register("render_preview", make_render_handler("preview"))

    @asynccontextmanager
    async def lifespan(app):
        yield
        q.shutdown()

    app = FastAPI(title="Claude Editor API", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
                       expose_headers=["*"])
    app.state.db, app.state.queue, app.state.root = db, q, root

    def need_project(pid):
        p = db.get_project(pid)
        if not p:
            raise HTTPException(404, "project not found")
        return p

    def enqueue(pid, kind, payload):
        job = db.create_job(pid, kind, payload)
        db.set_status(pid, "processing")
        emit(pid, "job.queued", job_id=job["id"], kind=kind)
        q.enqueue(job)
        return job

    # ---- endpoints ----
    @app.get("/health")
    def health():
        return {"ok": True}

    @app.post("/projects", status_code=201)
    def create_project(body: ProjectIn = Body(default_factory=ProjectIn)):
        return db.create_project(body.name)

    @app.get("/projects")
    def list_projects():
        return db.list_projects()

    @app.post("/projects/{pid}/upload", status_code=201)
    async def upload(pid: str, file: UploadFile = File(...)):
        need_project(pid)
        name = re.sub(r"[^A-Za-z0-9._-]", "_", Path(file.filename or "upload.mp4").name) or "upload.mp4"
        d = root / "projects" / pid / "uploads"
        d.mkdir(parents=True, exist_ok=True)
        dest, size = d / name, 0
        with open(dest, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD:
                    f.close()
                    dest.unlink(missing_ok=True)
                    raise HTTPException(413, "file too large")
                f.write(chunk)
        if size == 0:
            dest.unlink(missing_ok=True)
            raise HTTPException(400, "empty file")
        info = await asyncio.to_thread(probe_video, dest)
        asset = db.add_asset(pid, "source", name, dest, size, info)
        plan = db.save_plan(pid, initial_plan(dest, info), "upload", f"uploaded {name}")
        db.set_status(pid, "uploaded")
        emit(pid, "upload.done", asset_id=asset["id"], plan_version=plan["version"])
        return {"asset": asset, "plan_version": plan["version"], "plan": plan["plan"]}

    @app.post("/projects/{pid}/messages", status_code=202)
    def post_message(pid: str, body: MessageIn):
        need_project(pid)
        if not db.latest_plan(pid):
            raise HTTPException(409, "upload a video before chatting")
        m = db.add_message(pid, "user", body.content)
        emit(pid, "message", message=m)
        job = enqueue(pid, "agent", {"message": body.content, "message_id": m["id"]})
        return {"message": m, "job": job}

    @app.get("/projects/{pid}")
    def get_project(pid: str):
        p = need_project(pid)
        cur = db.latest_plan(pid)
        return {**p, "plan": cur["plan"] if cur else None,
                "plan_version": cur["version"] if cur else None,
                "messages": db.list_messages(pid), "assets": db.list_assets(pid),
                "jobs": db.list_jobs(pid)}

    @app.get("/projects/{pid}/plans")
    def list_plans(pid: str):
        need_project(pid)
        return db.list_plans(pid)

    @app.get("/projects/{pid}/plans/{version}")
    def get_plan(pid: str, version: int):
        need_project(pid)
        p = db.get_plan(pid, version)
        if not p:
            raise HTTPException(404, "plan version not found")
        return p

    @app.post("/projects/{pid}/plans/{version}/restore", status_code=201)
    def restore_plan(pid: str, version: int):
        need_project(pid)
        old = db.get_plan(pid, version)
        if not old:
            raise HTTPException(404, "plan version not found")
        new = db.save_plan(pid, old["plan"], "restore", f"restored v{version}")
        emit(pid, "plan.updated", version=new["version"])
        return new

    @app.put("/projects/{pid}/plan", status_code=201)
    def put_plan(pid: str, plan: dict = Body(...)):
        """Manual user edit of the plan -> new version."""
        need_project(pid)
        if not isinstance(plan.get("keep"), list):
            raise HTTPException(422, "plan.keep must be a list")
        new = db.save_plan(pid, plan, "user", "manual edit")
        emit(pid, "plan.updated", version=new["version"])
        return new

    @app.post("/projects/{pid}/render", status_code=202)
    def start_render(pid: str, body: RenderIn = Body(default_factory=RenderIn)):
        need_project(pid)
        if not db.latest_plan(pid):
            raise HTTPException(409, "upload a video first")
        return enqueue(pid, f"render_{body.quality}", {})

    @app.get("/projects/{pid}/render")
    def get_render(pid: str, quality: str = Query("final", pattern="^(final|preview)$")):
        need_project(pid)
        a = db.latest_asset(pid, f"render_{quality}")
        if (not a or not Path(a["path"]).is_file()) and quality == "preview":
            # Nothing rendered yet: let the player show the uploaded source instead of a 404.
            a = db.latest_asset(pid, "source")
            if a and Path(a["path"]).is_file():
                return FileResponse(a["path"], filename=a["filename"], content_disposition_type="inline")
        if not a or not Path(a["path"]).is_file():
            raise HTTPException(404, f"no {quality} render yet; POST /projects/{pid}/render")
        return FileResponse(a["path"], media_type="video/mp4", filename=f"{quality}.mp4")

    @app.get("/projects/{pid}/source")
    def get_source(pid: str):
        need_project(pid)
        a = db.latest_asset(pid, "source")
        if not a:
            raise HTTPException(404, "no source uploaded")
        return FileResponse(a["path"], filename=a["filename"])

    @app.get("/projects/{pid}/events")
    async def events(pid: str, request: Request, after: int = 0, follow: bool = True):
        """SSE. Replays events with id > Last-Event-ID (or ?after=), then streams live.
        follow=false: send backlog and close (useful for tests/polling clients)."""
        need_project(pid)
        last = int(request.headers.get("last-event-id") or after or 0)

        async def gen():
            nonlocal last
            idle = 0.0
            while True:
                evs = await asyncio.to_thread(db.events_after, pid, last)
                for e in evs:
                    last = e["id"]
                    yield f"id: {e['id']}\nevent: {e['type']}\ndata: {json.dumps(e['data'])}\n\n"
                    idle = 0.0
                if not follow and not evs:
                    return
                if await request.is_disconnected():
                    return
                await asyncio.sleep(0.1)
                idle += 0.1
                if follow and idle >= 15:
                    idle = 0.0
                    yield ": keepalive\n\n"

        return StreamingResponse(gen(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    return app


def app_factory():
    return create_app()
