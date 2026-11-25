"""Films made by the creative director (studio/agent_bridge.py) as ordinary storyboard records.

Every finished director job becomes (or updates) one storyboard per project, so the Storyboard, Timeline, Projects,
Media and Analytics screens show it with no special case, and the ordinary approve -> final render path works: the
record's EditPlan has the delivered mp4 as its source, exactly like the motion lane.

A project is the chain of jobs sharing one `root` (the first brief). A change request from the Storyboard chat or the
Timeline inspector creates the next version as a new queued job; when it is delivered, the same storyboard record moves
to that version, keeps the conversation, and goes back to "awaiting approval".

The scene cards come from <job>/storyboard.json, written by the worker when it delivers:
    {"scenes": [{"start": 0, "end": 2.7, "title": "Hook", "action": "...", "on_screen": "...", "motion": "...",
                 "sfx": [{"name": "swoosh", "at": 2.5}]}], "music": "...", "lufs": -14.0}
Without it the film gets one scene card spanning its whole length.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import shutil
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, Request
from pydantic import BaseModel, Field

from . import agent_bridge as ab
from .presets import probe_video_file

log = logging.getLogger("ai_editor_server.agent_storyboards")
STYLE_REF = "creative_director"
SYNC_PATHS = ("/api/editor/storyboard", "/api/editor/overview", "/api/editor/media", "/api/editor/analytics",
              "/api/editor/versions", "/api/editor/activity", "/api/editor/agent/jobs")
BRIEF_KEYS = ("kind", "format", "duration", "title", "prompt", "clips", "assets", "reference_url",
              "reference_video_id", "reference_video_path", "audio_path", "direction")


class ReviseRequest(BaseModel):
    """Module level on purpose: with postponed annotations FastAPI resolves the body model by name from module globals."""
    message: str = Field(..., min_length=2, max_length=2000)
    scene: Optional[int] = Field(None, ge=1, le=200)


def root_of(job: dict) -> str:
    return job.get("root") or job["id"]


def render_id_for(job_id: str) -> str:
    """32 hex chars like the engine's own render ids: the dashboard only serves /render/<32 hex>.mp4."""
    return hashlib.md5(job_id.encode()).hexdigest()


def sb_id_for(root: str) -> str:
    return "sb_" + root[3:]  # aj_<12 hex> -> sb_<12 hex>: stable per project


def _scenes(job: dict, duration: float) -> List[dict]:
    try:
        data = json.loads((ab.job_dir(job["id"]) / "storyboard.json").read_text(encoding="utf-8"))
        rows = [s for s in data.get("scenes", []) if float(s.get("end", 0)) > float(s.get("start", 0))]
    except (OSError, ValueError):
        rows = []
    if not rows:
        rows = [{"start": 0.0, "end": duration, "title": "Full film", "action": job.get("prompt", "")[:300], "on_screen": ""}]
    return rows


def build_card(job: dict, duration: float) -> dict:
    rows, fmt = _scenes(job, duration), job.get("format", "9:16")
    framing = {"9:16": "Vertical 9:16", "16:9": "Horizontal 16:9", "1:1": "Square 1:1"}.get(fmt, fmt)
    source = "motion graphics" if job.get("kind") == "motion" else f"{len(job.get('clips') or [])} source clip(s)"
    scenes = []
    for i, s in enumerate(rows, 1):
        a, b = float(s["start"]), float(s["end"])
        scenes.append({
            "scene_number": i, "type": s.get("title") or f"Scene {i}",
            "timestamp_output": f"{a:.1f}s - {b:.1f}s ({b - a:.1f}s)", "source_range": s.get("source") or source,
            "duration": round(b - a, 2), "action": s.get("action", ""), "framing": framing,
            "camera_motion": s.get("motion", ""), "caption": s.get("on_screen") or "(no on-screen text)",
            "caption_style": STYLE_REF,
            "sfx": [{"name": c.get("name"), "at": round(float(c.get("at", 0)), 2), "volume_db": c.get("db")} for c in (s.get("sfx") or [])],
        })
    want = float(job.get("duration") or duration)
    hook_ok = bool(rows) and float(rows[0]["end"]) <= 3.3 and bool((rows[0].get("on_screen") or "").strip())
    cta_ok = bool((rows[-1].get("on_screen") or "").strip())
    len_ok = abs(duration - want) <= max(1.5, .1 * want)
    checks = [
        {"name": "three_second_hook", "status": "pass" if hook_ok else "warn", "score": 1.0 if hook_ok else .5,
         "detail": "The first scene states the hook on screen inside 3 seconds." if hook_ok else "The opening scene runs past 3 seconds or has no text."},
        {"name": "closing_call_to_action", "status": "pass" if cta_ok else "warn", "score": 1.0 if cta_ok else .5,
         "detail": "The last scene closes on a line or call to action." if cta_ok else "The last scene has no closing line."},
        {"name": "length", "status": "pass" if len_ok else "warn", "score": 1.0 if len_ok else .5,
         "detail": f"{duration:.1f}s delivered for a {want:.0f}s brief."},
    ]
    warns = [c["name"] for c in checks if c["status"] == "warn"]
    sfx = [c for s in scenes for c in s["sfx"]]
    return {
        "title": (job.get("title") or job.get("prompt") or "Film")[:90],
        "duration": {"original_seconds": round(duration, 2), "output_seconds": round(duration, 2), "removed_seconds": 0.0, "reduction_percent": 0.0},
        "scenes_count": len(scenes), "scenes": scenes,
        "sound_design": {"ducking_enabled": False, "target_lufs": -14, "music": True, "sfx_count": len(sfx),
                         "sfx": [{"name": c["name"], "at": c["at"], "id": None} for c in sfx]},
        "growth_signals": {"three_second_hook": {k: checks[0][k] for k in ("status", "detail", "score")},
                           "sendability": {k: checks[1][k] for k in ("status", "detail", "score")}},
        "scorecard": {"available": True, "reason": None, "status": "WARN" if warns else "PASS",
                      "score": round(sum(c["score"] for c in checks) / len(checks), 3), "failed_checks": [], "warnings": warns, "checks": checks},
    }


def register_agent_storyboards(app, user_id: Optional[str], store, work_dir: Path, renders_dir: Path) -> None:
    """Mount at the END of create_app, after register_agent_routes. Everything comes from the arguments."""
    owner = user_id or "local"
    work_dir, renders_dir = Path(work_dir), Path(renders_dir)
    lock, last = threading.Lock(), [0.0]

    def my_jobs() -> List[dict]:
        return [j for j in ab.all_jobs() if j.get("user_id") == owner]

    def deliver(sb_id: str, rec: Optional[dict], job: dict, versions: List[dict]) -> None:
        src = ab.job_dir(job["id"]) / "output.mp4"
        rid = render_id_for(job["id"])
        dst = renders_dir / f"{rid}.mp4"
        if not dst.is_file():
            shutil.copy2(src, dst)
        info = probe_video_file(dst)
        render = {"render_id": rid, "video_url": f"/render/{rid}.mp4", "quality": "preview", "duration": round(info["duration"], 2),
                  "resolution": f"{info['width']}x{info['height']}", "backend": "creative director", "warnings": [],
                  "seconds": None, "created_at": job.get("finished_at") or time.time()}
        plan = {"version": 1, "source": {"path": str(dst), **info},
                "output": {"width": info["width"], "height": info["height"], "fps": info["fps"]},
                "keep": [{"id": "k1", "start": 0.0, "end": info["duration"]}], "captions": [], "reframe": {"mode": "center", "track": []},
                "zooms": [], "transitions": [], "overlays": [], "style_ref": STYLE_REF,
                "notes": f"Brief: {job.get('prompt', '')[:400]}"}
        card = build_card(job, float(info["duration"]))
        done_ids = [v["id"] for v in versions if v.get("status") == "done"]  # versions arrive sorted by created_at
        n = 1 + done_ids.index(job["id"])
        note = next((u["text"] for u in reversed(job.get("updates") or []) if u.get("text")), "")
        msgs = list((rec or {}).get("messages") or [])
        if job.get("revision") and not any(m.get("version") == job["id"] for m in msgs):
            msgs.append({"role": "assistant", "content": f"Version {n} is ready. {note}", "version": job["id"], "at": time.time()})
        new = dict(rec or {})
        new.update({
            "id": sb_id, "status": "ready", "error": None, "lane": "motion" if job.get("kind") == "motion" else "footage",
            "video_path": str(dst), "style": STYLE_REF, "prompt": job.get("prompt", ""), "series": (rec or {}).get("series"),
            "plan": plan, "storyboard": card, "workdir": str(work_dir / sb_id), "agent_reply": note,
            "events": (rec or {}).get("events") or [], "messages": msgs,
            "approved": False, "approved_at": None, "latest_render": None, "latest_preview": render,
            "renders": ((rec or {}).get("renders") or []) + [render], "render_job": None,
            "agent": {"root": versions[0].get("root") or versions[0]["id"], "version": job["id"], "version_number": n,
                      "pending": None, "kind": job.get("kind")},
        })
        if rec is None:
            new["created_at"] = versions[0].get("created_at") or time.time()
        (work_dir / sb_id).mkdir(parents=True, exist_ok=True)
        store.put("storyboards", sb_id, new)
        store.log("storyboard", f"Version {n} of “{card['title']}” delivered", id=sb_id)

    def sync() -> None:
        with lock:
            projects: Dict[str, List[dict]] = {}
            for j in my_jobs():
                projects.setdefault(root_of(j), []).append(j)
            for root, versions in projects.items():
                versions.sort(key=lambda v: v.get("created_at") or 0)
                done = [v for v in versions if v.get("status") == "done" and (ab.job_dir(v["id"]) / "output.mp4").is_file()]
                pending = next((v["id"] for v in versions if v.get("status") in ("queued", "working")), None)
                sb_id, rec = sb_id_for(root), store.snapshot("storyboards", sb_id_for(root))
                if not done:
                    continue
                latest = done[-1]
                stale_id = (rec or {}).get("latest_preview", {}) and len(((rec or {}).get("latest_preview") or {}).get("render_id", "")) != 32
                if not rec or (rec.get("agent") or {}).get("version") != latest["id"] or stale_id:
                    deliver(sb_id, rec, latest, versions)
                elif (rec.get("agent") or {}).get("pending") != pending:
                    store.update("storyboards", sb_id, lambda r: r.setdefault("agent", {}).update(pending=pending))

    @app.middleware("http")
    async def agent_storyboard_sync(request: Request, call_next):
        if request.method == "GET" and request.url.path.startswith(SYNC_PATHS) and time.time() - last[0] > 2:
            last[0] = time.time()
            try:
                await asyncio.to_thread(sync)
            except Exception:  # never let the sync take a screen down
                log.exception("agent storyboard sync failed")
        return await call_next(request)

    @app.post("/api/editor/agent/jobs/{job_id}/revise", status_code=202)
    def revise_agent_job(job_id: str, req: ReviseRequest):
        if not ab.JOB_ID_RE.match(job_id or ""):
            raise HTTPException(404, "Job not found")
        job = ab.read_job(job_id)
        if not job or job.get("user_id") != owner:
            raise HTTPException(404, "Job not found")
        root = root_of(job)
        versions = sorted((j for j in my_jobs() if root_of(j) == root), key=lambda v: v.get("created_at") or 0)
        if any(v.get("status") in ("queued", "working") for v in versions):
            raise HTTPException(409, "A new version of this film is already in production. Wait for it, then ask again.")
        done = [v for v in versions if v.get("status") == "done"]
        if not done:
            raise HTTPException(409, "This film has no finished version to change yet.")
        base = done[-1]
        text = (f"Scene {req.scene}: " if req.scene else "") + req.message.strip()
        new = {k: base.get(k) for k in BRIEF_KEYS}
        new.update({"id": "aj_" + uuid.uuid4().hex[:12], "user_id": owner, "status": "queued", "created_at": ab.now(),
                    "root": root, "parent": base["id"], "revision": text, "output": None, "error": None,
                    "updates": [{"t": ab.now(), "text": f"Change request received: {text[:300]}"}]})
        with ab._lock:
            ab.write_job(new)
        sb_id = sb_id_for(root)
        store.update("storyboards", sb_id, lambda r: (
            r.setdefault("messages", []).append({"role": "user", "content": text, "at": time.time()}),
            r.setdefault("agent", {}).update(pending=new["id"]),
            r.update(agent_reply="Change request received. A new version is in production.")))
        return {"ok": True, "job": ab.public_job(new), "storyboard_id": sb_id}
