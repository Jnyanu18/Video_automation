"""Claude Director bridge: the website queues a video brief, a Claude agent builds the video, the website shows it.

The queue is plain files so any worker can serve it: today a Claude Code session on this machine (it watches the queue
with scripts/agent_worker.py), later a headless Claude worker on the server. The website never talks to the worker.

    <queue>/<job_id>/job.json     the brief, status and progress updates (written atomically)
    <queue>/<job_id>/output.mp4   the finished video, copied in by the worker
    <queue>/_worker.json          worker heartbeat: the UI shows "Claude online" while it is fresh

The queue is shared by every account (one worker serves them all); each job carries its owner's user id and the routes
below only ever show or serve the caller's own jobs.

The asset library is a list of folders in <editor>/agent_library.json ({"folders": ["J:/..."]}), re-read on every request
so a folder can be added without a restart. Files are listed read-only; a job may reference them by path, and the path
is checked to sit inside one of those folders.
"""
from __future__ import annotations

import json
import os
import re
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from studio import film_library

EDITOR_ROOT = Path(__file__).resolve().parents[1]
QUEUE_DIR = Path(os.environ.get("AGENT_QUEUE_DIR") or EDITOR_ROOT / "work" / "agent_queue")
LIBRARY_CONFIG = Path(os.environ.get("AGENT_LIBRARY_CONFIG") or EDITOR_ROOT / "agent_library.json")
HEARTBEAT_FRESH_S = 90
KINDS = ("motion", "edit", "event")
FORMATS = ("9:16", "16:9", "1:1")
MEDIA_EXT = {".mp4", ".mov", ".m4v", ".webm", ".mkv", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg",
             ".mp3", ".wav", ".m4a", ".aac", ".pdf"}
JOB_ID_RE = re.compile(r"^aj_[a-f0-9]{12}$")
_lock = threading.Lock()


# ------------------------------------------------------------------ file helpers (shared with scripts/agent_worker.py)
def now() -> float:
    return time.time()


def job_dir(job_id: str) -> Path:
    if not JOB_ID_RE.match(job_id or ""):
        raise ValueError(f"bad job id: {job_id!r}")
    return QUEUE_DIR / job_id


def read_job(job_id: str) -> Optional[dict]:
    try:
        return json.loads((job_dir(job_id) / "job.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def write_job(job: dict) -> dict:
    d = job_dir(job["id"])
    d.mkdir(parents=True, exist_ok=True)
    job["updated_at"] = now()
    tmp = d / f"job.{uuid.uuid4().hex}.tmp"
    tmp.write_text(json.dumps(job, indent=1, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, d / "job.json")
    return job


def update_job(job_id: str, **changes: Any) -> dict:
    with _lock:
        job = read_job(job_id)
        if job is None:
            raise KeyError(job_id)
        note = changes.pop("note", None)
        job.update(changes)
        if note:
            job.setdefault("updates", []).append({"t": now(), "text": str(note)[:500]})
        return write_job(job)


def all_jobs() -> List[dict]:
    if not QUEUE_DIR.exists():
        return []
    out = []
    for d in QUEUE_DIR.iterdir():
        if d.is_dir() and JOB_ID_RE.match(d.name):
            j = read_job(d.name)
            if j:
                out.append(j)
    return sorted(out, key=lambda j: j.get("created_at") or 0, reverse=True)


def worker_status() -> dict:
    try:
        hb = json.loads((QUEUE_DIR / "_worker.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"online": False, "last_seen": None, "worker": None}
    seen = float(hb.get("t") or 0)
    return {"online": now() - seen < HEARTBEAT_FRESH_S, "last_seen": seen, "worker": hb.get("worker")}


# ------------------------------------------------------------------ asset library
def library_folders() -> List[Path]:
    try:
        cfg = json.loads(LIBRARY_CONFIG.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    return [Path(f) for f in cfg.get("folders", []) if f and Path(f).is_dir()]


def in_library(path: str) -> Optional[Path]:
    try:
        p = Path(path).resolve()
    except OSError:
        return None
    for root in library_folders():
        r = root.resolve()
        if (p == r or r in p.parents) and p.is_file():
            return p
    return None


def list_library(limit: int = 2000) -> List[dict]:
    files: List[dict] = []
    for root in library_folders():
        for p in sorted(root.rglob("*")):
            if len(files) >= limit:
                break
            if p.is_file() and p.suffix.lower() in MEDIA_EXT and "node_modules" not in p.parts:
                files.append({"path": str(p), "name": p.name, "folder": root.name,
                              "rel": str(p.relative_to(root)), "size_mb": round(p.stat().st_size / 1e6, 2),
                              "type": p.suffix.lower().lstrip(".")})
    return files


# ------------------------------------------------------------------ API
class AgentJobRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=4000)
    kind: str = Field("motion", pattern="^(motion|edit|event)$")
    format: str = Field("9:16", pattern=r"^(9:16|16:9|1:1)$")
    duration: int = Field(30, ge=5, le=180)
    title: Optional[str] = Field(None, max_length=120)
    upload_ids: List[str] = Field(default_factory=list, max_length=40)
    library_files: List[str] = Field(default_factory=list, max_length=60)
    footage_paths: List[str] = Field(default_factory=list, max_length=40)  # files already in this account's media folders
    reference_url: Optional[str] = Field(None, max_length=500)
    reference_video_id: Optional[str] = None
    direction: Dict[str, str] = Field(default_factory=dict)  # every other form field (goal, audience, feeling, CTA...)


def public_job(job: dict) -> dict:
    out = {k: v for k, v in job.items() if k not in ("user_id",)}
    if job.get("status") == "done" and (job_dir(job["id"]) / "output.mp4").exists():
        out["video_url"] = f"/api/editor/agent/jobs/{job['id']}/video"
    return out


def register_agent_routes(app, user_id: Optional[str], uploads_dir: Optional[Path], roots: Optional[List[Path]] = None) -> None:
    owner = user_id or "local"
    media_roots = [Path(r).resolve() for r in (roots or [])]

    def in_media_roots(value: str) -> Optional[Path]:
        try:
            p = Path(value).resolve()
        except OSError:
            return None
        ok = p.is_file() and any(p == r or r in p.parents for r in media_roots)
        return p if ok else None

    def own(job_id: str) -> dict:
        if not JOB_ID_RE.match(job_id or ""):
            raise HTTPException(404, "Job not found")
        job = read_job(job_id)
        if not job or job.get("user_id") != owner:
            raise HTTPException(404, "Job not found")
        return job

    @app.get("/api/editor/agent/status")
    def agent_status():
        mine = [j for j in all_jobs() if j.get("user_id") == owner]
        waiting = [j for j in all_jobs() if j.get("status") == "queued"]
        return {"ok": True, **worker_status(), "queued_total": len(waiting),
                "mine": {"total": len(mine), "done": sum(j.get("status") == "done" for j in mine)}}

    @app.post("/api/editor/agent/jobs", status_code=202)
    def create_agent_job(req: AgentJobRequest):
        clips, missing = [], []
        for uid in req.upload_ids:
            if not re.fullmatch(r"[a-f0-9]{32}", uid or ""):
                raise HTTPException(400, f"Bad upload id: {uid}")
            p = (Path(uploads_dir) / f"{uid}.mp4") if uploads_dir else None
            (clips if p and p.is_file() else missing).append(str(p) if p else uid)
        if missing:
            raise HTTPException(400, f"{len(missing)} uploaded clip(s) could not be found on the server. Upload them again.")
        assets = []
        for f in req.library_files:
            p = in_library(f)
            if p is None:
                raise HTTPException(400, f"Not in the asset library: {f}")
            assets.append(str(p))
        for f in req.footage_paths:
            p = in_media_roots(f)
            if p is None:
                raise HTTPException(400, f"That footage file is not in your media folders: {Path(f).name}")
            clips.append(str(p))
        ref = (req.reference_url or "").strip() or None
        if ref and not re.match(r"^https?://", ref, re.I):
            raise HTTPException(400, "The reference video link must start with https://")
        studio_reference = None
        if req.reference_video_id:
            studio_reference = film_library.reference_path(req.reference_video_id)
            if studio_reference is None:
                raise HTTPException(404, f"Reference video '{req.reference_video_id}' not found")
        if req.kind in ("edit", "event") and not clips and not assets and not ref:
            raise HTTPException(400, "Add the clips to edit (upload them or pick them from the library).")
        direction = {str(k)[:40]: str(v)[:300] for k, v in list(req.direction.items())[:20] if str(v).strip()}
        job = {"id": "aj_" + uuid.uuid4().hex[:12], "user_id": owner, "status": "queued", "created_at": now(),
               "prompt": req.prompt.strip(), "kind": req.kind, "format": req.format, "duration": req.duration,
               "title": (req.title or "").strip() or None, "clips": clips, "assets": assets,
               "reference_url": ref, "reference_video_id": req.reference_video_id,
               "reference_video_path": str(studio_reference) if studio_reference else None,
               "direction": direction,
               "updates": [{"t": now(), "text": "Brief received. Your film is in the production queue."}],
               "output": None, "error": None}
        with _lock:
            write_job(job)
        return {"ok": True, "job": public_job(job)}

    @app.get("/api/editor/agent/jobs")
    def list_agent_jobs():
        return {"ok": True, "jobs": [public_job(j) for j in all_jobs() if j.get("user_id") == owner]}

    @app.get("/api/editor/agent/jobs/{job_id}")
    def get_agent_job(job_id: str):
        return {"ok": True, "job": public_job(own(job_id))}

    @app.post("/api/editor/agent/jobs/{job_id}/cancel")
    def cancel_agent_job(job_id: str):
        job = own(job_id)
        if job.get("status") in ("done", "failed", "cancelled"):
            raise HTTPException(409, f"This job is already {job['status']}.")
        return {"ok": True, "job": public_job(update_job(job_id, status="cancelled", note="Cancelled from the website."))}

    @app.get("/api/editor/agent/jobs/{job_id}/video")
    def agent_job_video(job_id: str):
        own(job_id)
        f = job_dir(job_id) / "output.mp4"
        if not f.is_file():
            raise HTTPException(404, "This job has no video yet")
        return FileResponse(str(f), media_type="video/mp4", filename=f"{job_id}.mp4")

    @app.get("/api/editor/agent/library")
    def agent_library():
        return {"ok": True, "folders": [str(f) for f in library_folders()], "files": list_library()}
