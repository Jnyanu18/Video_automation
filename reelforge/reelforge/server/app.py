"""FastAPI backend server for ReelForge."""
from __future__ import annotations

import logging
import os
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from ..config import DEFAULT_WORKSPACE, REELFORGE_MODEL
from ..workspace import WorkspaceManager
from ..doctor import run_doctor
from ..installer import ToolInstaller
from ..ingestion.queue import IngestionQueue
from ..style.aggregator import aggregate_styles
from ..style.reviser import revise_style
from ..storyboard.generator import generate_storyboard
from ..storyboard.editor import revise_storyboard, StoryboardHistory
from ..render.ffmpeg_ass import FFmpegAssRenderer
from ..render.hyperframes import HyperFramesRenderer
from ..schemas.style import StyleSheet
from ..schemas.storyboard import StoryboardPlan

log = logging.getLogger("reelforge.server")

app = FastAPI(title="ReelForge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# App Global State
class ReelForgeState:
    def __init__(self, ws_path: str = DEFAULT_WORKSPACE):
        self.workspace_mgr = WorkspaceManager(ws_path)
        self.ingestion_queue = IngestionQueue(ws_path)
        self.current_style: Optional[StyleSheet] = None
        self.storyboard_history: Optional[StoryboardHistory] = None
        self.active_render_job: Dict[str, Any] = {}
        self.renderer = HyperFramesRenderer(fallback_renderer=FFmpegAssRenderer())

    def set_workspace(self, path: str):
        self.workspace_mgr.close()
        self.workspace_mgr = WorkspaceManager(path)
        self.ingestion_queue = IngestionQueue(path)
        self.current_style = None
        self.storyboard_history = None

state = ReelForgeState()

# Request Models
class WorkspaceSetRequest(BaseModel):
    path: str

class IngestRequest(BaseModel):
    sources: List[str]

class StyleReviseRequest(BaseModel):
    feedback: str

class StoryboardGenerateRequest(BaseModel):
    raw_video_path: Optional[str] = None
    target_duration: Optional[float] = None
    instruction: str = ""

class StoryboardReviseRequest(BaseModel):
    feedback: str

class RenderRequest(BaseModel):
    quality: str = "draft" # "draft" or "final"

class ChatRequest(BaseModel):
    message: str

# 1. WORKSPACE ENDPOINTS
@app.get("/api/workspace")
def get_workspace():
    return state.workspace_mgr.status()

@app.post("/api/workspace")
def set_workspace(req: WorkspaceSetRequest):
    state.set_workspace(req.path)
    return state.workspace_mgr.status()

# 2. DOCTOR & INSTALLER ENDPOINTS
@app.get("/api/doctor")
def get_doctor():
    return run_doctor()

@app.post("/api/tools/install")
def install_tools(confirm: bool = True):
    return ToolInstaller.execute(confirm=confirm)

# 3. REFERENCE REELS INGESTION
@app.post("/api/reference/ingest")
def ingest_references(req: IngestRequest):
    items = state.ingestion_queue.add_bulk(req.sources)
    return {"queued": len(items), "items": [i.model_dump() for i in items]}

@app.get("/api/reference/queue")
def get_reference_queue():
    return [i.model_dump() for i in state.ingestion_queue.list_all()]

@app.get("/api/reference/list")
def list_analyzed_references():
    analyses = state.ingestion_queue.get_analyzed_reels()
    return [
        {
            "reel_id": a.reel_id,
            "duration": a.duration,
            "cuts_count": len(a.cuts),
            "avg_cut_interval": a.avg_cut_interval,
            "palette": [c.hex for c in a.palette],
            "wpm": a.audio.speech_wpm,
            "fonts": a.vision_style.font_families,
        }
        for a in analyses
    ]

# 4. RAW FOOTAGE
@app.get("/api/raw/list")
def list_raw_footage():
    st = state.workspace_mgr.status()
    raw_dir = Path(st["folders"]["raw_footage"])
    files = []
    if raw_dir.exists():
        for f in raw_dir.iterdir():
            if f.is_file() and f.suffix.lower() in [".mp4", ".mov", ".mkv", ".webm"]:
                files.append({
                    "name": f.name,
                    "path": str(f.resolve()),
                    "size_mb": round(f.stat().st_size / (1024 * 1024), 2),
                })
    return files

@app.post("/api/raw/upload")
async def upload_raw_footage(file: UploadFile = File(...)):
    st = state.workspace_mgr.status()
    raw_dir = Path(st["folders"]["raw_footage"])
    dest = raw_dir / file.filename
    with open(dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"ok": True, "filename": file.filename, "path": str(dest.resolve())}

# 5. STYLE SHEET AGGREGATION & REVISION
@app.post("/api/style/build")
def build_style_sheet():
    analyses = state.ingestion_queue.get_analyzed_reels()
    if not analyses:
        raise HTTPException(status_code=400, detail="No analyzed reference reels found. Ingest reels first.")
    
    style = aggregate_styles(analyses)
    state.current_style = style
    # Save to workspace
    styles_dir = state.workspace_mgr.dot_dir / "styles"
    styles_dir.mkdir(parents=True, exist_ok=True)
    (styles_dir / f"style_v{style.version}.json").write_text(style.model_dump_json(indent=2), encoding="utf-8")
    return style

@app.get("/api/style/current")
def get_current_style():
    if not state.current_style:
        # Check if saved in styles dir
        styles_dir = state.workspace_mgr.dot_dir / "styles"
        if styles_dir.exists():
            files = sorted(styles_dir.glob("style_v*.json"), reverse=True)
            if files:
                import json
                state.current_style = StyleSheet(**json.loads(files[0].read_text(encoding="utf-8")))

    if not state.current_style:
        # Generate default
        state.current_style = StyleSheet()
    return state.current_style

@app.post("/api/style/approve")
def approve_style():
    style = get_current_style()
    return {"ok": True, "approved_version": style.version}

@app.post("/api/style/revise")
def revise_current_style(req: StyleReviseRequest):
    style = get_current_style()
    new_style, diff = revise_style(style, req.feedback)
    state.current_style = new_style
    styles_dir = state.workspace_mgr.dot_dir / "styles"
    styles_dir.mkdir(parents=True, exist_ok=True)
    (styles_dir / f"style_v{new_style.version}.json").write_text(new_style.model_dump_json(indent=2), encoding="utf-8")
    return {"style": new_style, "diff": diff}

# 6. STORYBOARD GENERATION & REVISIONS
@app.post("/api/storyboard/generate")
def generate_new_storyboard(req: StoryboardGenerateRequest):
    style = get_current_style()
    raw_path = req.raw_video_path
    if not raw_path:
        # Pick the first raw file in Raw Footage
        raws = list_raw_footage()
        if not raws:
            raise HTTPException(status_code=400, detail="No raw footage uploaded yet. Please drop a video into Raw Footage.")
        raw_path = raws[0]["path"]

    plan = generate_storyboard(
        raw_video_path=raw_path,
        style_sheet=style,
        target_duration=req.target_duration,
        user_instruction=req.instruction
    )
    state.storyboard_history = StoryboardHistory(plan)
    return plan

@app.get("/api/storyboard/current")
def get_current_storyboard():
    if not state.storyboard_history:
        return None
    return state.storyboard_history.current

@app.post("/api/storyboard/revise")
def revise_current_storyboard(req: StoryboardReviseRequest):
    if not state.storyboard_history:
        raise HTTPException(status_code=400, detail="No active storyboard. Generate one first.")
    
    current = state.storyboard_history.current
    updated, diff = revise_storyboard(current, req.feedback)
    state.storyboard_history.push(updated)
    return {"storyboard": updated, "diff": diff}

@app.post("/api/storyboard/approve")
def approve_storyboard():
    if not state.storyboard_history:
        raise HTTPException(status_code=400, detail="No active storyboard.")
    state.storyboard_history.current.approved = True
    return {"ok": True, "approved": True}

@app.post("/api/storyboard/undo")
def undo_storyboard():
    if not state.storyboard_history or not state.storyboard_history.can_undo:
        raise HTTPException(status_code=400, detail="Nothing to undo.")
    return state.storyboard_history.undo()

@app.post("/api/storyboard/redo")
def redo_storyboard():
    if not state.storyboard_history or not state.storyboard_history.can_redo:
        raise HTTPException(status_code=400, detail="Nothing to redo.")
    return state.storyboard_history.redo()

# 7. RENDERING
def _run_render_task(job_id: str, quality: str):
    try:
        storyboard = state.storyboard_history.current
        style = get_current_style()
        st = state.workspace_mgr.status()
        out_dir = Path(st["folders"]["output"])
        out_dir.mkdir(parents=True, exist_ok=True)
        filename = f"reel_{job_id}_{quality}.mp4"
        out_file = out_dir / filename

        state.active_render_job[job_id] = {
            "status": "rendering",
            "progress": 30,
            "filename": filename,
            "output_path": str(out_file),
            "quality": quality,
        }

        res = state.renderer.render(
            storyboard=storyboard,
            style_sheet=style,
            output_path=str(out_file),
            quality=quality
        )

        if res.success:
            state.active_render_job[job_id]["status"] = "completed"
            state.active_render_job[job_id]["progress"] = 100
            state.active_render_job[job_id]["duration"] = res.duration
            state.active_render_job[job_id]["render_time"] = res.render_time_seconds
        else:
            state.active_render_job[job_id]["status"] = "failed"
            state.active_render_job[job_id]["error"] = res.error
    except Exception as e:
        log.error("Render job %s failed: %s", job_id, e)
        state.active_render_job[job_id] = {
            "status": "failed",
            "error": str(e)
        }

@app.post("/api/render/start")
def start_render(req: RenderRequest, bg_tasks: BackgroundTasks):
    if not state.storyboard_history:
        raise HTTPException(status_code=400, detail="No storyboard created yet.")
    
    import uuid
    job_id = uuid.uuid4().hex[:8]
    state.active_render_job[job_id] = {
        "status": "starting",
        "progress": 5,
        "quality": req.quality
    }
    bg_tasks.add_task(_run_render_task, job_id, req.quality)
    return {"job_id": job_id, "status": "started"}

@app.get("/api/render/status/{job_id}")
def get_render_status(job_id: str):
    job = state.active_render_job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.get("/api/render/download/{filename}")
def download_rendered_file(filename: str):
    st = state.workspace_mgr.status()
    out_file = Path(st["folders"]["output"]) / filename
    if not out_file.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=str(out_file), media_type="video/mp4", filename=filename)

# 8. CONVERSATIONAL ROUTER
@app.post("/api/chat")
def handle_chat_message(req: ChatRequest):
    msg = req.message.strip()
    lower = msg.lower()

    # Route 1: Install tools
    if "install" in lower and ("tool" in lower or "setup" in lower or "hyperframes" in lower or "ffmpeg" in lower):
        plan = ToolInstaller.plan()
        return {
            "type": "action_required",
            "action": "install_tools",
            "reply": "I'm ready to install and configure all 4 core video tools (FFmpeg, yt-dlp, faster-whisper, HyperFrames) in your local workspace. Shall I proceed?",
            "needs_confirmation": True,
            "commands": plan["commands"]
        }

    # Route 2: Check health / doctor
    if "doctor" in lower or "check tool" in lower or "health" in lower:
        doc = run_doctor()
        return {
            "type": "doctor_report",
            "reply": f"System Doctor check complete: {doc['summary']}",
            "data": doc
        }

    # Route 3: Reference Reel URLs or Study
    import re
    urls = re.findall(r"https?://[^\s]+", msg)
    if urls or "study" in lower or "reference" in lower or "learn" in lower:
        if urls:
            items = state.ingestion_queue.add_bulk(urls)
            return {
                "type": "reference_queued",
                "reply": f"Added {len(urls)} reference reel(s) to the ingestion queue. Processing frames, Whisper transcription, cuts, and palette extraction...",
                "items": [i.model_dump() for i in items]
            }
        else:
            return {
                "type": "info",
                "reply": "Please paste one or more reference reel URLs (Instagram, YouTube, TikTok) or drop video files into the Reference folder so I can learn your editing style."
            }

    # Route 4: Build or revise Style Sheet
    if "style" in lower or "style sheet" in lower or "font" in lower or "color" in lower:
        if "make" in lower or "change" in lower or "faster" in lower or "bigger" in lower or "yellow" in lower:
            style = get_current_style()
            new_style, diff = revise_style(style, msg)
            state.current_style = new_style
            return {
                "type": "style_revised",
                "reply": f"Updated your style sheet to v{new_style.version} per your request ({diff.get('change_reason')}).",
                "style": new_style,
                "diff": diff
            }
        else:
            # Build from ingested reels
            analyses = state.ingestion_queue.get_analyzed_reels()
            if analyses:
                style = aggregate_styles(analyses)
                state.current_style = style
                return {
                    "type": "style_created",
                    "reply": f"Built Style Sheet v{style.version} from {len(analyses)} reference reels using hierarchical map-reduce. Review and approve below.",
                    "style": style
                }
            else:
                return {
                    "type": "info",
                    "reply": "No reference reels analyzed yet. Paste some URLs first, or I can generate a default Creator Style Sheet for you."
                }

    # Route 5: Storyboard Revision or Generation
    is_storyboard_revision = state.storyboard_history and any(
        kw in lower for kw in ["shorten", "longer", "zoom", "scene", "intro", "outro", "caption", "cut to", "remove scene"]
    )
    if is_storyboard_revision or "storyboard" in lower or "script" in lower or "draft" in lower:
        if state.storyboard_history and (is_storyboard_revision or "change" in lower or "make" in lower):
            updated, diff = revise_storyboard(state.storyboard_history.current, msg)
            state.storyboard_history.push(updated)
            return {
                "type": "storyboard_revised",
                "reply": f"Updated storyboard: {diff.get('reason')}. Review the scene cards below before rendering.",
                "storyboard": updated,
                "diff": diff
            }
        else:
            raws = list_raw_footage()
            if not raws:
                return {
                    "type": "info",
                    "reply": "I need some raw footage to draft a storyboard! Drop a video file into your 'Raw Footage' folder or drag it right here into the chat."
                }
            plan = generate_storyboard(raws[0]["path"], get_current_style(), user_instruction=msg)
            state.storyboard_history = StoryboardHistory(plan)
            return {
                "type": "storyboard_created",
                "reply": f"Drafted a {len(plan.scenes)}-scene storyboard from '{raws[0]['name']}' ({plan.target_duration}s total). Nothing will render until you click 'Generate video'.",
                "storyboard": plan
            }


    # Route 6: Render / Generate video
    if "render" in lower or "generate video" in lower or "export" in lower:
        if not state.storyboard_history:
            return {
                "type": "info",
                "reply": "Please create and approve a storyboard before rendering."
            }
        quality = "final" if "final" in lower or "1080" in lower else "draft"
        return {
            "type": "render_ready",
            "reply": f"Storyboard approved! Ready to render in {quality} mode (1080x1920 9:16). Click 'Generate video' or confirm to start.",
            "quality": quality
        }

    # Default friendly creator assistant reply
    return {
        "type": "message",
        "reply": f"I'm ReelForge, your local AI video editor. I can install your tools, study reference reels to learn a style, draft a storyboard from raw footage, and render finished 9:16 videos. What would you like to do?"
    }

# Static file serving for Frontend UI
static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")

