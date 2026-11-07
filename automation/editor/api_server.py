"""AI Video Editor API Service (FastAPI) on port 8793.
Implements the 'Claude/Gemini AI Video Editor' pipeline described in the reference reel:
1. Reference Reels -> Style Extraction (pacing, cuts, pauses, captions, color palette, loudness)
2. Raw Footage -> Gemini Analysis -> Structured Storyboard first
3. Human Review & Revision via Chat Gate
4. Approved Storyboard -> Automated High-Quality Render (FFmpeg + Hyperframes) -> MP4 in runtime/renders
"""
from __future__ import annotations

import asyncio
import copy
import json
import logging
import os
import shutil
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import Body, FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

# Internal editor engine imports
ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent
RUNTIME_RENDERS = REPO_ROOT / "runtime" / "renders"
RUNTIME_RENDERS.mkdir(parents=True, exist_ok=True)
WORK_DIR = ROOT / "work"
WORK_DIR.mkdir(parents=True, exist_ok=True)

from agent import run_agent
from agent.openai_compat import make_client_from_env, load_dotenv, OpenAICompatClient
from agent.review import run_scorecard
from styles.style_extract import extract_style as do_extract_style, load_style, save_style
from styles.apply import apply_style as do_apply_style
from tools.edit.timeline import segments as get_segments, output_duration, remap_to_output
from services.render import render_final, render_preview
from services.api.editor_api import adapters

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("ai_editor_server")

# Load environment
load_dotenv(ROOT / ".env")
load_dotenv(REPO_ROOT / ".env.local")

app = FastAPI(title="AI Video Editor Engine", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active storyboards
STORYBOARDS: Dict[str, Dict[str, Any]] = {}
JOBS: Dict[str, Dict[str, Any]] = {}

# ---------------------------------------------------------------- Presets
PRESET_STYLES = {
    "viral_hook_fast_pace": {
        "name": "viral_hook_fast_pace",
        "description": "Fast-paced TikTok/Reel pace: aggressive pause tightening (<0.22s), cuts every 1.5-2.0s, bold-pop karaoke captions, -14 LUFS.",
        "edit_params": {
            "max_pause": 0.22,
            "target_shot_length": 1.8,
            "caption_style": "karaoke",
            "caption_max_words": 3,
            "caption_position": "middle",
            "output_aspect": "9:16",
            "target_lufs": -14.0,
        },
        "pacing": {"avg_shot_length": 1.8, "cuts_per_minute": 33.3, "speech_wpm": 180},
    },
    "educational_talking_head": {
        "name": "educational_talking_head",
        "description": "Clear educational tempo: conversational pauses (<0.38s), clean-lower captions, balanced framing, -15 LUFS.",
        "edit_params": {
            "max_pause": 0.38,
            "target_shot_length": 3.2,
            "caption_style": "clean-lower",
            "caption_max_words": 5,
            "caption_position": "bottom",
            "output_aspect": "9:16",
            "target_lufs": -15.0,
        },
        "pacing": {"avg_shot_length": 3.2, "cuts_per_minute": 18.5, "speech_wpm": 150},
    },
    "cinematic_punch": {
        "name": "cinematic_punch",
        "description": "Dramatic pacing: dynamic punch-in zooms on key moments, bold highlights, cinematic loudness target.",
        "edit_params": {
            "max_pause": 0.28,
            "target_shot_length": 2.2,
            "caption_style": "bold-pop",
            "caption_max_words": 4,
            "caption_position": "middle",
            "output_aspect": "9:16",
            "target_lufs": -14.0,
        },
        "pacing": {"avg_shot_length": 2.2, "cuts_per_minute": 27.0, "speech_wpm": 165},
    },
}

def probe_video_file(path: str | Path) -> dict:
    p = str(path)
    cmd = ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", p]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    probe = json.loads(res.stdout)
    v = next((s for s in probe["streams"] if s["codec_type"] == "video"), None)
    if not v:
        raise ValueError(f"No video stream found in {path}")
    num, den = (v.get("r_frame_rate", "30/1").split("/") + ["1"])[:2]
    fps = round(float(num) / float(den), 3) if float(den) else 30.0
    dur = float(probe.get("format", {}).get("duration") or 0.0)
    return {"duration": dur, "width": int(v.get("width") or 1080), "height": int(v.get("height") or 1920), "fps": fps}

def format_storyboard(plan: dict, workdir: str) -> dict:
    """Format an EditPlan into human-readable visual Storyboard cards."""
    src = plan.get("source", {})
    dur_src = float(src.get("duration") or 0.0)
    dur_out = output_duration(plan)
    
    # Calculate kept & cut segments
    segs = get_segments(plan)
    scenes = []
    zooms = plan.get("zooms") or []
    captions = plan.get("captions") or []
    
    for i, seg in enumerate(segs, 1):
        s_src, e_src = seg["src_start"], seg["src_end"]
        s_out, e_out = seg["out_start"], seg["out_end"]
        seg_dur = e_out - s_out
        
        # Check active zoom
        z_match = next((z for z in zooms if z.get("start", 0) <= s_src and z.get("end", 0) >= s_src), None)
        zoom_text = f"Zoom {z_match.get('scale', 1.15)}x punch-in" if z_match else "Standard framing"
        
        # Check active captions
        cap_match = [c.get("text", "") for c in captions if s_src <= c.get("start", 0) <= e_src or s_src <= c.get("end", 0) <= e_src]
        caption_preview = " | ".join(cap_match) if cap_match else "(No speech overlay)"
        
        # Determine scene type
        if i == 1:
            stype = "Hook / Opening"
            action = f"Immediate hook delivery ({seg_dur:.1f}s). Dead air trimmed."
        elif i == len(segs):
            stype = "Call To Action"
            action = f"Closing takeaway / CTA ({seg_dur:.1f}s)."
        else:
            stype = f"Content Point {i-1}"
            action = f"Paced insight segment ({seg_dur:.1f}s)."
            
        scenes.append({
            "scene_number": i,
            "type": stype,
            "timestamp_output": f"{s_out:.1f}s - {e_out:.1f}s ({seg_dur:.1f}s)",
            "source_range": f"{s_src:.1f}s - {e_src:.1f}s",
            "duration": round(seg_dur, 2),
            "action": action,
            "framing": "Vertical 9:16 (Center)",
            "camera_motion": zoom_text,
            "caption": caption_preview,
            "caption_style": plan.get("style_ref") or "karaoke",
        })
        
    scorecard = run_scorecard(plan, workdir)
    return {
        "title": plan.get("notes") or "AI Storyboard",
        "duration": {
            "original_seconds": round(dur_src, 2),
            "output_seconds": round(dur_out, 2),
            "removed_seconds": round(max(0.0, dur_src - dur_out), 2),
            "reduction_percent": round(max(0.0, (dur_src - dur_out) / (dur_src or 1) * 100), 1),
        },
        "scenes_count": len(scenes),
        "scenes": scenes,
        "sound_design": {
            "ducking_enabled": True,
            "target_lufs": (plan.get("audio") or {}).get("loudness", {}).get("target_lufs", -14.0),
        },
        "scorecard": {
            "status": "PASS" if scorecard.get("overall") == "PASS" else "NEEDS_REVIEW",
            "score": scorecard.get("score", 1.0),
            "failed_checks": [f.get("name") for f in scorecard.get("failed") or []],
            "warnings": [w.get("name") for w in scorecard.get("warnings") or []],
        },
    }

# ---------------------------------------------------------------- Endpoints

@app.get("/health")
def health():
    return {"ok": True, "service": "ai-video-editor", "model": "gemini-3.5-flash", "time": time.time()}

@app.get("/api/editor/styles")
def list_styles():
    """List available style profiles (presets + user-extracted reference profiles)."""
    styles_dir = ROOT / "styles"
    custom_styles = {}
    if styles_dir.is_dir():
        for f in styles_dir.glob("*.json"):
            try:
                prof = json.loads(f.read_text(encoding="utf-8"))
                custom_styles[f.stem] = {
                    "name": prof.get("name", f.stem),
                    "description": f"Extracted from reference video ({prof.get('pacing', {}).get('avg_shot_length', 0):.1f}s avg cut).",
                    "edit_params": prof.get("edit_params", {}),
                    "pacing": prof.get("pacing", {}),
                    "palette": [c.get("hex") for c in (prof.get("palette") or {}).get("colors", [])[:4]],
                }
            except Exception:
                pass
    return {"ok": True, "presets": PRESET_STYLES, "custom": custom_styles}

class StyleExtractRequest(BaseModel):
    video_path: Optional[str] = None
    reference_url: Optional[str] = None
    name: Optional[str] = None

@app.post("/api/editor/styles/extract")
def extract_style_from_reference(req: StyleExtractRequest):
    """Extract an objective Style Sheet from a reference video or Instagram reel."""
    ref_path = None
    if req.video_path and Path(req.video_path).is_file():
        ref_path = Path(req.video_path)
    elif req.reference_url:
        # Check if URL is local or scrapeable
        log.info("Style extract requested for URL: %s", req.reference_url)
        raise HTTPException(400, "Reference URL download requires a local video file path currently.")
    else:
        raise HTTPException(400, "Must provide video_path for reference video")

    sname = req.name or f"style_{ref_path.stem}"
    target_json = ROOT / "styles" / f"{sname}.json"
    target_json.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        prof = do_extract_style(str(ref_path), name=sname)
        save_style(prof, str(target_json))
        return {
            "ok": True,
            "style_name": sname,
            "path": str(target_json),
            "edit_params": prof.get("edit_params"),
            "pacing": prof.get("pacing"),
            "palette": [c.get("hex") for c in (prof.get("palette") or {}).get("colors", [])],
        }
    except Exception as e:
        log.error("Style extraction failed: %s", e)
        raise HTTPException(500, f"Style extraction error: {e}")

class StoryboardCreateRequest(BaseModel):
    video_path: str
    style: Optional[str] = "viral_hook_fast_pace"
    prompt: Optional[str] = "Cut dead air and silences, keep speech fast and engaging, reframe to 9:16 vertical, add karaoke captions."

@app.post("/api/editor/storyboard/create")
async def create_storyboard(req: StoryboardCreateRequest):
    """Run Gemini tool-calling agent to write a structured Storyboard from raw footage."""
    vpath = Path(req.video_path)
    if not vpath.is_file():
        raise HTTPException(404, f"Raw video file not found: {req.video_path}")
    
    sb_id = f"sb_{uuid.uuid4().hex[:12]}"
    work = WORK_DIR / sb_id
    work.mkdir(parents=True, exist_ok=True)
    
    info = probe_video_file(vpath)
    base_plan = {
        "version": 1,
        "source": {"path": str(vpath), **info},
        "output": {"width": 1080, "height": 1920, "fps": info["fps"]},
        "keep": [{"id": "k1", "start": 0.0, "end": info["duration"]}],
        "captions": [],
        "reframe": {"mode": "center", "track": []},
        "zooms": [],
        "transitions": [],
        "overlays": [],
        "style_ref": req.style,
        "notes": f"Prompt: {req.prompt}",
    }
    
    # Load client (Gemini)
    client = make_client_from_env()
    if not client:
        raise HTTPException(500, "Gemini client could not be configured. Check GEMINI_API_KEY.")
    
    # Run agent in background thread to avoid blocking FastAPI
    def run_job():
        tools = adapters.collect_tools()
        log.info("[%s] Running Gemini agent with prompt: %s", sb_id, req.prompt)
        res = run_agent(sb_id, req.prompt, base_plan, tools, client, workdir=str(work), max_iterations=15)
        final_plan = res["plan"]
        storyboard = format_storyboard(final_plan, str(work))
        STORYBOARDS[sb_id] = {
            "id": sb_id,
            "status": "ready",
            "video_path": str(vpath),
            "style": req.style,
            "plan": final_plan,
            "storyboard": storyboard,
            "workdir": str(work),
            "agent_reply": res.get("reply", ""),
            "updated_at": time.time(),
        }
        log.info("[%s] Storyboard generated successfully. Output duration: %ss", sb_id, storyboard["duration"]["output_seconds"])
        return STORYBOARDS[sb_id]

    try:
        data = await asyncio.to_thread(run_job)
        return {"ok": True, "storyboard_id": sb_id, "data": data}
    except Exception as e:
        log.error("Storyboard creation failed: %s", e)
        raise HTTPException(500, f"Storyboard generation error: {e}")

@app.get("/api/editor/storyboard/{sb_id}")
def get_storyboard(sb_id: str):
    sb = STORYBOARDS.get(sb_id)
    if not sb:
        raise HTTPException(404, "Storyboard not found")
    return {"ok": True, "data": sb}

class StoryboardChatRequest(BaseModel):
    message: str

@app.post("/api/editor/storyboard/{sb_id}/chat")
async def chat_storyboard(sb_id: str, req: StoryboardChatRequest):
    """Refine an existing storyboard with conversational feedback."""
    sb = STORYBOARDS.get(sb_id)
    if not sb:
        raise HTTPException(404, "Storyboard not found")
    
    client = make_client_from_env()
    tools = adapters.collect_tools()
    work = Path(sb["workdir"])
    
    def run_chat():
        log.info("[%s] User revision chat: %s", sb_id, req.message)
        res = run_agent(sb_id, req.message, sb["plan"], tools, client, workdir=str(work), max_iterations=12)
        new_plan = res["plan"]
        new_storyboard = format_storyboard(new_plan, str(work))
        sb["plan"] = new_plan
        sb["storyboard"] = new_storyboard
        sb["agent_reply"] = res.get("reply", "")
        sb["updated_at"] = time.time()
        return sb

    try:
        updated = await asyncio.to_thread(run_chat)
        return {"ok": True, "storyboard_id": sb_id, "data": updated}
    except Exception as e:
        log.error("Storyboard chat failed: %s", e)
        raise HTTPException(500, f"Revision failed: {e}")

class RenderRequest(BaseModel):
    quality: str = Field(default="final", pattern="^(preview|final)$")

@app.post("/api/editor/storyboard/{sb_id}/render")
async def render_storyboard(sb_id: str, req: RenderRequest):
    """Render the approved Storyboard into a real MP4 video in runtime/renders."""
    sb = STORYBOARDS.get(sb_id)
    if not sb:
        raise HTTPException(404, "Storyboard not found")
    
    plan = sb["plan"]
    work = Path(sb["workdir"])
    quality = req.quality
    
    def do_render():
        log.info("[%s] Rendering %s video with FFmpeg + Hyperframes...", sb_id, quality)
        fn = render_final if quality == "final" else render_preview
        mp4_path, backend = fn(plan, work)
        p = Path(mp4_path)
        if not p.is_file():
            raise RuntimeError(f"Render failed to produce output file: {mp4_path}")
        
        # Copy to runtime/renders/<32-hex>.mp4
        render_hex = uuid.uuid4().hex
        dest_mp4 = RUNTIME_RENDERS / f"{render_hex}.mp4"
        shutil.copy2(p, dest_mp4)
        info = probe_video_file(dest_mp4)
        
        public_base = os.environ.get("PUBLIC_BASE_URL", "http://127.0.0.1:8792").rstrip("/")
        video_url = f"{public_base}/render/{render_hex}.mp4"
        
        log.info("[%s] Render completed -> %s (duration: %ss)", sb_id, dest_mp4, info["duration"])
        return {
            "render_id": render_hex,
            "video_url": video_url,
            "local_path": str(dest_mp4),
            "duration": info["duration"],
            "resolution": f"{info['width']}x{info['height']}",
            "quality": quality,
            "backend": backend,
        }

    try:
        result = await asyncio.to_thread(do_render)
        sb["latest_render"] = result
        return {"ok": True, "storyboard_id": sb_id, "render": result}
    except Exception as e:
        log.error("Render failed: %s", e)
        raise HTTPException(500, f"Render error: {e}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("EDITOR_PORT", 8793))
    log.info("Starting AI Video Editor Engine on http://127.0.0.1:%s", port)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
