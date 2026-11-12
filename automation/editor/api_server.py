"""AI Video Editor API Service (FastAPI) on port 8793.

Pipeline: raw footage -> LLM tool-calling agent -> structured storyboard -> human approval -> render (FFmpeg + HyperFrames)
-> schedule / publish. All state is durable (studio/store.py), long work runs in background jobs the dashboard polls,
and every number the dashboard shows is derived from real records (studio/analytics.py), never from constants.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import shutil
import threading
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent

from agent import run_agent  # noqa: E402
from agent.loop import _call_tool, _normalize  # noqa: E402
from agent.openai_compat import load_dotenv  # noqa: E402
from agent.review import run_scorecard  # noqa: E402
from services.api.editor_api import adapters  # noqa: E402
from services.render import render_final_info, render_preview_info  # noqa: E402
from studio import analytics, animator, carousel as carousel_mod, director, health, ingest as ingest_mod, posts as posts_mod, recipes as recipes_mod, series as series_mod, vstudio as vstudio_mod, workflows  # noqa: E402
from studio.presets import PRESET_STYLES, probe_video_file  # noqa: E402
from studio.publishing import PLATFORMS, Publisher  # noqa: E402
from studio.store import Store  # noqa: E402
from styles.aggregate import aggregate as aggregate_styles  # noqa: E402
from styles.style_extract import extract_style as do_extract_style, save_style  # noqa: E402
from tools.audio import sfx as sfxlib  # noqa: E402
from tools.edit.timeline import output_duration, segments as get_segments, source_to_output  # noqa: E402

# Director 2.0 Engine Imports
from tools.edit.edit_plan import EditPlanManager, validate_edit_plan, plan_diff  # noqa: E402
from tools.analysis.footage_intelligence import build_footage_index, search_footage  # noqa: E402
from agent.director_engine import DirectorEngine, EditorialPatch  # noqa: E402
from services.render.render_qa import inspect_rendered_mp4, AutomatedRepairEngine  # noqa: E402
from styles.style_dna import STYLE_PRESETS, get_style_dna, apply_style_dna_to_plan  # noqa: E402
from styles.versions import generate_multi_versions  # noqa: E402
from agent.editing_memory import EditingMemoryStore, PerformanceRecord  # noqa: E402

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("ai_editor_server")

load_dotenv(ROOT / ".env")
load_dotenv(REPO_ROOT / ".env.local")

DEFAULT_PROMPT = "Cut dead air and silences, keep speech fast and engaging, reframe to 9:16 vertical, add karaoke captions."
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".mkv", ".webm"}


# ====================================================================== helpers
def _find_up(name: str, start: Path) -> Optional[Path]:
    for p in [start, *start.parents]:
        if (p / name).is_dir():
            return p / name
    return None


def media_roots(work_dir: Path) -> List[Path]:
    """Folders a video_path may live in (the API is local, but the path still comes from a request)."""
    roots = [REPO_ROOT / "server" / "storage", work_dir, ROOT / "work"]
    raw = _find_up("raw footage", REPO_ROOT)
    if raw:
        roots.append(raw)
    for extra in filter(None, (os.environ.get("EDITOR_MEDIA_ROOTS") or "").split(os.pathsep)):
        roots.append(Path(extra))
    return [r.resolve() for r in roots]


def safe_video_path(value: str, roots: List[Path]) -> Path:
    p = Path(value).expanduser()
    if not p.is_file():
        raise HTTPException(404, f"Raw video file not found: {value}")
    rp = p.resolve()
    if rp.suffix.lower() not in VIDEO_EXT:
        raise HTTPException(400, f"Unsupported video type '{rp.suffix}'")
    if not any(rp == r or r in rp.parents for r in roots):
        raise HTTPException(400, "That file is outside the allowed media folders (uploads, raw footage). Upload it or set EDITOR_MEDIA_ROOTS.")
    return rp


def stage_of(sb: dict) -> str:
    return analytics.stage_of(sb)


def public(sb: dict, include_plan: bool = False) -> dict:
    out = {k: v for k, v in sb.items() if k != "plan" or include_plan}
    out["stage"] = stage_of(sb)
    return out


def format_storyboard(plan: dict, workdir: str) -> dict:
    """Turn an EditPlan into reviewable scene cards. Everything shown is read from the plan or the scorecard."""
    src = plan.get("source", {})
    dur_src = float(src.get("duration") or 0.0)
    dur_out = output_duration(plan)
    segs = get_segments(plan)
    zooms = plan.get("zooms") or []
    captions = plan.get("captions") or []
    sfx = (plan.get("audio") or {}).get("sfx") or []
    scenes = []
    for i, seg in enumerate(segs, 1):
        s_src, e_src = seg["src_start"], seg["src_end"]
        s_out, e_out = seg["out_start"], seg["out_end"]
        seg_dur = e_out - s_out
        zs = [z for z in zooms if float(z.get("start", 0)) < e_src and float(z.get("end", 0)) > s_src]
        caps = [str(c.get("text", "")) for c in captions if float(c.get("start", 0)) < e_src and float(c.get("end", 0)) > s_src]
        fx = [x for x in sfx if s_src <= float(x.get("at", -1)) <= e_src]
        if i == 1:
            stype = "Hook (first 3 seconds)"
        elif i == len(segs) and len(segs) > 1:
            stype = "Closing beat"
        else:
            stype = f"Beat {i}"
        bits = [f"{seg_dur:.1f}s of footage from {s_src:.1f}s to {e_src:.1f}s of the source"]
        if seg.get("transition"):
            bits.append(f"{seg['transition']['kind']} transition in")
        if any(abs(p["factor"] - 1.0) > 1e-9 for p in seg["pieces"]):
            bits.append("speed change " + ", ".join(f"{p['factor']:g}x" for p in seg["pieces"] if abs(p["factor"] - 1.0) > 1e-9))
        scenes.append({
            "scene_number": i, "type": stype,
            "timestamp_output": f"{s_out:.1f}s - {e_out:.1f}s ({seg_dur:.1f}s)",
            "source_range": f"{s_src:.1f}s - {e_src:.1f}s", "duration": round(seg_dur, 2),
            "action": "; ".join(bits),
            "framing": ("Vertical 9:16 face-follow" if (plan.get("reframe") or {}).get("mode") == "face-follow"
                        else "Vertical 9:16 center crop" if (plan.get("reframe") or {}).get("mode") == "center" else "Source framing"),
            "camera_motion": ", ".join(f"{float(z.get('scale', 1.15)):g}x punch-in" for z in zs) or "Static",
            "caption": " | ".join(caps) if caps else "(no speech overlay)",
            "caption_style": next((c.get("style") for c in captions if str(c.get("text", "")) in caps), None) or plan.get("style_ref") or "none",
            "sfx": [{"name": x.get("name"), "at": source_to_output(plan, float(x["at"])), "volume_db": x.get("volume_db")} for x in fx],
        })
    card = run_scorecard(plan, workdir)
    checks = card.get("checks", []) if card.get("available") else []
    by_name = {c["name"]: c for c in checks}

    def signal(name: str) -> dict:
        c = by_name.get(name)
        return {"status": c["status"], "detail": c["detail"], "score": c["score"]} if c else {"status": "unavailable", "detail": card.get("reason", "not evaluated"), "score": None}

    audio = plan.get("audio") or {}
    return {
        "title": (plan.get("notes") or "").split("\n")[0].replace("Prompt: ", "")[:90] or "Storyboard",
        "duration": {
            "original_seconds": round(dur_src, 2), "output_seconds": round(dur_out, 2),
            "removed_seconds": round(max(0.0, dur_src - dur_out), 2),
            "reduction_percent": round(max(0.0, (dur_src - dur_out) / (dur_src or 1) * 100), 1),
        },
        "scenes_count": len(scenes), "scenes": scenes,
        "sound_design": {
            "ducking_enabled": bool((audio.get("duck") or {}).get("enabled")),
            "target_lufs": (audio.get("loudness") or {}).get("target_lufs"),
            "music": bool(audio.get("music")), "sfx_count": len(sfx),
            "sfx": [{"name": x.get("name"), "at": source_to_output(plan, float(x["at"])), "id": x.get("id")} for x in sfx],
        },
        "growth_signals": {"three_second_hook": signal("three_second_hook"), "sendability": signal("sendability_signal")},
        "scorecard": {
            "available": bool(card.get("available")), "reason": card.get("reason"),
            "status": card.get("overall") if card.get("available") else "UNAVAILABLE",
            "score": card.get("score"),
            "failed_checks": [f["name"] for f in card.get("failed") or []],
            "warnings": [w["name"] for w in card.get("warnings") or []],
            "checks": checks,
        },
    }


# ====================================================================== request models
class StyleExtractRequest(BaseModel):
    video_path: Optional[str] = None
    reference_url: Optional[str] = None
    name: Optional[str] = None


class StoryboardCreateRequest(BaseModel):
    video_path: str
    style: Optional[str] = "viral_hook_fast_pace"
    prompt: Optional[str] = DEFAULT_PROMPT
    series_mode: Optional[bool] = False
    episode: Optional[int] = 1
    total_episodes: Optional[int] = 3
    sendability_focus: Optional[bool] = True
    series_id: Optional[str] = None


class RecipeCreateRequest(BaseModel):
    video_path: str
    style: Optional[str] = "viral_hook_fast_pace"
    recipe: Any = Field(description="a saved recipe name, or a list of {tool, input} steps")
    title: Optional[str] = None


class IngestRequest(BaseModel):
    url: str


class StyleLearnRequest(BaseModel):
    name: str = Field(min_length=2, max_length=40)
    urls: List[str] = []
    video_paths: List[str] = []


class CarouselRequest(BaseModel):
    storyboard_id: Optional[str] = None
    text: Optional[str] = Field(default=None, max_length=12000)
    title: Optional[str] = Field(default=None, max_length=120)
    instruction: Optional[str] = Field(default="", max_length=600)


class GateRequest(BaseModel):
    stage: str = Field(min_length=1, max_length=60)
    done: bool = True


class MusicRequest(BaseModel):
    track_id: Optional[str] = None
    volume_db: float = Field(default=-20.0, ge=-40, le=-6)


class AutoEditRequest(BaseModel):
    url: Optional[str] = None
    video_path: Optional[str] = None
    style: Optional[str] = "viral_hook_fast_pace"
    instruction: Optional[str] = Field(default="", max_length=1500)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class RenderRequest(BaseModel):
    quality: str = Field(default="final", pattern="^(preview|final)$")


class SeriesCreateRequest(BaseModel):
    title: str
    niche: str
    episodes_count: int = 3
    hook_angle: Optional[str] = "Counter-intuitive truth"


class EpisodePatch(BaseModel):
    title: Optional[str] = None
    hook: Optional[str] = None
    cliffhanger: Optional[str] = None
    continuity: Optional[str] = None


class EpisodeStoryboardRequest(BaseModel):
    video_path: str
    style: Optional[str] = "viral_hook_fast_pace"


class PublishScheduleRequest(BaseModel):
    title: str
    caption: str
    platforms: List[str] = ["instagram"]
    scheduled_at: Optional[str] = None
    storyboard_id: Optional[str] = None
    render_id: Optional[str] = None


class MetricsRequest(BaseModel):
    views: Optional[float] = None
    likes: Optional[float] = None
    comments: Optional[float] = None
    sends: Optional[float] = None
    saves: Optional[float] = None
    avg_watch_seconds: Optional[float] = None
    completion_pct: Optional[float] = None


class SettingsRequest(BaseModel):
    default_style: Optional[str] = None
    default_prompt: Optional[str] = Field(default=None, max_length=1500)


class CopilotMessage(BaseModel):
    role: str = "user"
    content: str


class CopilotChatRequest(BaseModel):
    message: str
    history: Optional[List[CopilotMessage]] = []
    storyboard_id: Optional[str] = None
    style: Optional[str] = None


class SearchFootageRequest(BaseModel):
    query: str
    video_path: Optional[str] = None
    media_id: Optional[str] = None


class NarrativeCutRequest(BaseModel):
    video_path: str
    style: Optional[str] = "viral_hook_fast_pace"
    target_duration: Optional[float] = None
    platform: Optional[str] = "instagram_reels"
    custom_instructions: Optional[str] = ""


class PatchRequest(BaseModel):
    action: str
    instruction: Optional[str] = ""
    patch_id: Optional[str] = None
    media_id: Optional[str] = None


class MemoryImportReq(BaseModel):
    csv_data: str


DIRECTOR_SYSTEM_PROMPT = """You are the Creative Director copilot of a short-form video studio (9:16 reels for Instagram, TikTok, YouTube Shorts).
Give concrete, short, actionable direction: hook rewrites, pacing, caption wording, sound-effect placement with timestamps, share triggers, series open loops.
Ground your advice in the active storyboard context when it is provided and say so when you lack the facts to judge. Do not claim to have changed the video: edits are made through the storyboard chat, which applies tool calls to the plan.
Available CC0 sound effects: whoosh, swoosh, riser, drop, bass, hit, thud, pop, click, glitch, sweep, swipe, chime, ding (and more via the library).
Platform facts you may rely on: the first seconds decide distribution to non-followers; sends (DM shares) and saves are strong signals; loops that pay off in the next episode bring viewers back."""


# ====================================================================== app factory
def create_app(state_file: Optional[Path] = None, renders_dir: Optional[Path] = None, work_dir: Optional[Path] = None,
               start_scheduler: bool = True) -> FastAPI:
    work_dir = Path(work_dir or os.environ.get("EDITOR_WORK_DIR") or ROOT / "work")
    work_dir.mkdir(parents=True, exist_ok=True)
    renders_dir = Path(renders_dir or os.environ.get("EDITOR_RENDERS_DIR") or REPO_ROOT / "runtime" / "renders")
    renders_dir.mkdir(parents=True, exist_ok=True)
    store = Store(state_file or os.environ.get("EDITOR_STATE_FILE") or work_dir / "studio_state.json")
    publisher = Publisher(store, renders_dir)
    roots = media_roots(work_dir)
    render_lock = threading.Semaphore(1)
    raw_root = _find_up("raw footage", REPO_ROOT)
    ingest_dir = (raw_root / "ingested") if raw_root else (work_dir / "ingested")
    ingest_jobs = ingest_mod.IngestJobs(ingest_dir)
    vs = vstudio_mod.VStudio(vstudio_mod.find_studio(REPO_ROOT))
    max_iter = int(os.environ.get("EDITOR_MAX_ITERATIONS", "10"))

    @asynccontextmanager
    async def lifespan(_app):
        if start_scheduler:
            publisher.start()
        yield
        publisher.stop()

    app = FastAPI(title="AI Video Editor Engine", version="2.0.0", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=["http://127.0.0.1:8787", "http://localhost:8787"],
                       allow_methods=["*"], allow_headers=["*"])
    app.state.store, app.state.publisher, app.state.vstudio = store, publisher, vs

    @app.exception_handler(RequestValidationError)
    async def _invalid(_request, exc: RequestValidationError):
        first = (exc.errors() or [{}])[0]
        where = ".".join(str(x) for x in first.get("loc", []) if x != "body")
        return JSONResponse(status_code=422, content={"ok": False, "error": "INVALID",
                                                      "message": f"{where}: {first.get('msg', 'invalid value')}".strip(": ")})

    @app.exception_handler(HTTPException)
    async def _http_error(_request, exc: HTTPException):
        """One error shape for the dashboard: {ok:false, error:CODE, message}."""
        d = exc.detail
        if isinstance(d, dict):
            body = {"ok": False, "error": d.get("error", "ERROR"), "message": d.get("message", "Request failed")}
        else:
            code = {400: "BAD_REQUEST", 404: "NOT_FOUND", 409: "CONFLICT", 422: "INVALID", 503: "UNAVAILABLE"}.get(exc.status_code, "ERROR")
            body = {"ok": False, "error": code, "message": str(d)}
        return JSONResponse(status_code=exc.status_code, content=body)

    # ------------------------------------------------------------ agent jobs
    def _llm():
        client = adapters._make_client()
        if client is None:
            raise RuntimeError("No LLM is configured. In automation/editor/.env set EDITOR_LLM=gemini with GEMINI_API_KEY, or EDITOR_LLM=anthropic with ANTHROPIC_API_KEY")
        return client

    def _compact(e: dict) -> Optional[dict]:
        t = e.get("type")
        if t == "message":
            return {"ts": e["ts"], "type": "message", "text": (e.get("text") or "")[:400]}
        if t == "tool_started":
            return {"ts": e["ts"], "type": "tool", "name": e.get("name"), "state": "running"}
        if t == "tool_finished":
            return {"ts": e["ts"], "type": "tool", "name": e.get("name"), "state": "ok" if e.get("ok") else "error",
                    "text": (e.get("summary") or "")[:200], "warnings": e.get("warnings") or []}
        if t == "scorecard":
            return {"ts": e["ts"], "type": "scorecard", "text": f"scorecard {e.get('overall')} ({e.get('score')})"}
        if t == "claim_check":
            return {"ts": e["ts"], "type": "claim_check", "text": "unverified claim corrected: " + ", ".join(e.get("problems") or [])}
        return None

    def _run_agent_job(sb_id: str, message: str, creating: bool, client: Any) -> None:
        sb = store.snapshot("storyboards", sb_id)
        if sb is None:
            return

        def on_event(e: dict) -> None:
            c = _compact(e)
            if c:
                def add(r, c=c):
                    ev = r.setdefault("events", [])
                    ev.append(c)
                    del ev[:-80]
                store.update("storyboards", sb_id, add)

        try:
            history = [{"role": m["role"], "content": m["content"]} for m in (sb.get("messages") or [])[-8:]]
            res = run_agent(sb_id, message, sb["plan"], adapters.collect_tools(), client, workdir=sb["workdir"],
                            max_iterations=max_iter, on_event=on_event, history=history,
                            model=getattr(client, "model", None) or "claude-sonnet-5-5")
            plan = res["plan"]
            card = format_storyboard(plan, sb["workdir"])
            changed = len(res.get("versions") or []) > 1
            sc = card["scorecard"]
            verdict = (f"Scorecard {sc['status']}" + (f" ({round(sc['score'] * 100)}%)" if sc.get("score") is not None else "")
                       + (f". Failing: {', '.join(sc['failed_checks'])}" if sc["failed_checks"] else "")
                       + (f". Warnings: {', '.join(sc['warnings'])}" if sc["warnings"] else "") + ".")
            res["reply"] = (res.get("reply") or "").rstrip() + "\n\n[Measured result] " + verdict

            def done(r):
                r.update(status="ready", error=None, plan=plan, storyboard=card, agent_reply=res.get("reply", ""),
                         usage=res.get("usage"), reviews=res.get("reviews"))
                r.setdefault("messages", []).extend([{"role": "user", "content": message},
                                                     {"role": "assistant", "content": res.get("reply", "")}])
                if changed and r.get("approved"):
                    r["approved"], r["approved_at"] = False, None  # the approved version no longer exists
                    r["approval_reset"] = True
            store.update("storyboards", sb_id, done)
            store.log("storyboard", f"{'Generated' if creating else 'Revised'} storyboard “{card['title']}”", id=sb_id,
                      output_seconds=card["duration"]["output_seconds"])
        except Exception as e:
            log.exception("[%s] agent job failed", sb_id)
            msg = f"{type(e).__name__}: {e}"
            store.update("storyboards", sb_id, lambda r: r.update(status="failed" if creating else "ready", error=msg))
            store.log("storyboard", f"Storyboard job failed: {msg}", id=sb_id)

    def _run_recipe_job(sb_id: str, steps: list, label: str) -> None:
        sb = store.snapshot("storyboards", sb_id)
        if sb is None:
            return

        def on_step(e: dict) -> None:
            def add(r, e=e):
                ev = r.setdefault("events", [])
                ev.append({"ts": time.time(), "type": "tool", "name": e["tool"], "state": "ok" if e["ok"] else "error",
                           "text": e.get("error") or e.get("summary", ""), "warnings": e.get("warnings", [])})
            store.update("storyboards", sb_id, add)

        try:
            tools = adapters.collect_tools()
            plan, steps_log = recipes_mod.run(sb["plan"], steps, tools, sb["workdir"], _call_tool, _normalize, on_step)
            card = format_storyboard(plan, sb["workdir"])
            sc = card["scorecard"]
            reply = (f"Ran the recipe “{label}” ({len(steps_log)} steps). Scorecard {sc['status']}"
                     + (f" ({round(sc['score'] * 100)}%)" if sc.get("score") is not None else "")
                     + (f". Failing: {', '.join(sc['failed_checks'])}" if sc["failed_checks"] else "")
                     + (f". Warnings: {', '.join(sc['warnings'])}" if sc["warnings"] else "") + ".")
            store.update("storyboards", sb_id, lambda r: r.update(status="ready", error=None, plan=plan, storyboard=card, agent_reply=reply))
            store.log("storyboard", f"Recipe “{label}” produced storyboard “{card['title']}”", id=sb_id)
        except Exception as e:
            msg = f"{type(e).__name__}: {e}"
            store.update("storyboards", sb_id, lambda r: r.update(status="failed", error=msg))
            store.log("storyboard", f"Recipe failed: {msg}", id=sb_id)

    def _start_storyboard(vpath: Path, style: str, prompt: str, client: Any, series_ref: Optional[dict] = None,
                          recipe_steps: Optional[list] = None, label: str = "") -> dict:
        info = probe_video_file(vpath)
        sb_id = store.new_id("sb")
        work = work_dir / sb_id
        work.mkdir(parents=True, exist_ok=True)
        base_plan = {
            "version": 1, "source": {"path": str(vpath), **info},
            "output": {"width": 1080, "height": 1920, "fps": info["fps"]},
            "keep": [{"id": "k1", "start": 0.0, "end": info["duration"]}],
            "captions": [], "reframe": {"mode": "center", "track": []}, "zooms": [], "transitions": [], "overlays": [],
            "style_ref": style, "notes": f"Prompt: {prompt}",
        }
        sb = {"id": sb_id, "status": "processing", "error": None, "video_path": str(vpath), "style": style, "prompt": prompt,
              "series": series_ref, "plan": base_plan, "storyboard": None, "workdir": str(work), "agent_reply": "",
              "events": [], "messages": [], "approved": False, "approved_at": None, "latest_render": None,
              "latest_preview": None, "renders": [], "render_job": None}
        store.put("storyboards", sb_id, sb)
        store.log("storyboard", f"Started storyboard for {vpath.name}", id=sb_id)
        if recipe_steps is not None:
            threading.Thread(target=_run_recipe_job, args=(sb_id, recipe_steps, label), daemon=True, name=f"recipe-{sb_id}").start()
        else:
            threading.Thread(target=_run_agent_job, args=(sb_id, prompt, True, client), daemon=True, name=f"agent-{sb_id}").start()
        return sb

    def _compose_prompt(req_prompt: str, series_mode: bool, episode: int, total: int, sendability: bool) -> str:
        full = req_prompt or DEFAULT_PROMPT
        if series_mode:
            full += f" [SERIES: episode {episode} of {total}. End on an open loop that the next episode pays off.]"
        if sendability:
            full += " [GROWTH: speech must start within ~0.5s of the first kept frame, and a share/save/part-2 trigger belongs in the closing seconds.]"
        return full

    # ------------------------------------------------------------ basics
    @app.get("/health")
    def health_route():
        c = {k: len(store.data[k]) for k in ("storyboards", "series", "publishing")}
        return {"ok": True, "service": "ai-video-editor", "version": app.version, "time": time.time(),
                "llm": health.gemini_probe(), "counts": c}

    @app.get("/api/editor/overview")
    def overview_route():
        return analytics.overview(store)

    @app.get("/api/editor/analytics")
    def analytics_route():
        return analytics.analytics(store)

    @app.get("/api/editor/integrations/health")
    async def integrations_health():
        services = await asyncio.to_thread(health.probe_all, int(os.environ.get("EDITOR_PORT", 8793)))
        return {"ok": True, "services": services, "summary": health.summarize(services)}

    @app.get("/api/editor/automation/workflows")
    async def automation_workflows():
        return await asyncio.to_thread(workflows.hub, store)

    @app.get("/api/editor/activity")
    def activity(limit: int = Query(30, ge=1, le=200)):
        return {"ok": True, "events": store.events(limit)}

    # ------------------------------------------------------------ settings
    def _settings() -> dict:
        saved = store.get("settings", "studio") or {}
        return {"default_style": saved.get("default_style", "viral_hook_fast_pace"),
                "default_prompt": saved.get("default_prompt", DEFAULT_PROMPT)}

    @app.get("/api/editor/settings")
    def get_settings():
        from evals.checks import DEFAULTS as CHECKS
        return {"ok": True, "settings": _settings(),
                "llm": health.gemini_probe(),
                "thresholds": {
                    "hook_warn_seconds": 0.6, "hook_fail_seconds": 1.5, "min_segment_seconds": CHECKS["min_segment"],
                    "max_caption_chars": CHECKS["max_caption_chars"], "caption_cps_warn": CHECKS["warn_cps"], "caption_cps_fail": CHECKS["fail_cps"],
                    "loudness_jump_warn_db": CHECKS["jump_warn_db"], "loudness_jump_fail_db": CHECKS["jump_fail_db"],
                },
                "limits": {"hyperframes_timeout_s": int(os.environ.get("HYPERFRAMES_TIMEOUT", "900")), "agent_max_iterations": max_iter},
                "publishing": {"adapter": publisher.adapter, "public_base_url": os.environ.get("PUBLIC_BASE_URL") or None}}

    @app.put("/api/editor/settings")
    def put_settings(req: SettingsRequest):
        cur = _settings()
        if req.default_style is not None:
            if req.default_style not in PRESET_STYLES and not (ROOT / "styles" / f"{req.default_style}.json").is_file():
                raise HTTPException(400, f"Unknown style '{req.default_style}'")
            cur["default_style"] = req.default_style
        if req.default_prompt is not None:
            if not req.default_prompt.strip():
                raise HTTPException(400, "The default prompt cannot be empty")
            cur["default_prompt"] = req.default_prompt.strip()
        store.put("settings", "studio", {**(store.get("settings", "studio") or {}), **cur})
        return {"ok": True, "settings": _settings()}

    # ------------------------------------------------------------ styles + media
    @app.get("/api/editor/styles")
    def list_styles():
        styles_dir = ROOT / "styles"
        custom: Dict[str, Any] = {}
        for f in styles_dir.glob("*.json"):
            try:
                prof = json.loads(f.read_text(encoding="utf-8"))
                custom[f.stem] = {
                    "name": prof.get("name", f.stem),
                    "description": f"Extracted from a reference video ({(prof.get('pacing') or {}).get('avg_shot_length') or 0:.1f}s avg shot).",
                    "edit_params": prof.get("edit_params", {}), "pacing": prof.get("pacing", {}),
                    "palette": [c.get("hex") for c in (prof.get("palette") or {}).get("colors", [])[:4]],
                }
            except Exception:
                continue
        return {"ok": True, "presets": PRESET_STYLES, "custom": custom}

    @app.post("/api/editor/styles/extract")
    async def extract_style_from_reference(req: StyleExtractRequest):
        if not req.video_path:
            raise HTTPException(400, "Provide video_path of a reference video (URL download is not supported yet)")
        ref = safe_video_path(req.video_path, roots)
        name = "".join(ch if ch.isalnum() or ch in "_-" else "_" for ch in (req.name or f"style_{ref.stem}"))[:60]
        target = ROOT / "styles" / f"{name}.json"
        try:
            prof = await asyncio.to_thread(do_extract_style, str(ref), name)
            save_style(prof, str(target))
        except Exception as e:
            log.exception("style extraction failed")
            raise HTTPException(500, f"Style extraction error: {e}")
        store.log("style", f"Extracted style “{name}” from {ref.name}")
        return {"ok": True, "style_name": name, "edit_params": prof.get("edit_params"), "pacing": prof.get("pacing"),
                "palette": [c.get("hex") for c in (prof.get("palette") or {}).get("colors", [])]}

    # ------------------------------------------------------------ learn a style from several reference reels
    style_jobs: Dict[str, dict] = {}
    style_lock = threading.Lock()

    def _run_style_job(jid: str, name: str, urls: List[str], paths: List[Path]) -> None:
        def upd(**kw):
            with style_lock:
                style_jobs[jid].update(kw)
        try:
            files: List[Path] = list(paths)
            for i, u in enumerate(urls, 1):
                upd(message=f"Downloading reference {i} of {len(urls)}")
                files.append(safe_video_path(str(ingest_mod.download(u, ingest_dir)), roots))
            profiles = []
            for i, f in enumerate(files, 1):
                upd(message=f"Measuring reference {i} of {len(files)}: {f.name}")
                profiles.append(do_extract_style(str(f), name=name))
            upd(message="Combining the references")
            prof = aggregate_styles(profiles, name)
            save_style(prof, str(ROOT / "styles" / f"{name}.json"))
            store.log("style", f"Learned style “{name}” from {len(profiles)} reference video(s)")
            upd(status="done", message="Done", style=name, edit_params=prof["edit_params"], pacing=prof["pacing"], learned_from=len(profiles))
        except Exception as e:
            upd(status="failed", message="Failed", error=str(e) or type(e).__name__)

    @app.post("/api/editor/styles/learn", status_code=202)
    async def learn_style(req: StyleLearnRequest):
        """Measure pacing, pauses, captions and loudness of 1 to 5 reference reels (links or local files) and save the combined style."""
        name = "".join(ch if ch.isalnum() or ch in "_-" else "_" for ch in req.name.strip())[:40]
        if name in PRESET_STYLES:
            raise HTTPException(400, f"'{name}' is a built-in preset name; choose another")
        n = len(req.urls) + len(req.video_paths)
        if not 1 <= n <= 5:
            raise HTTPException(400, "Give between 1 and 5 reference videos (links or files)")
        try:
            urls = [ingest_mod.validate_url(u) for u in req.urls]
        except ingest_mod.IngestError as e:
            raise HTTPException(400, str(e))
        if urls and ingest_mod.ytdlp_path() is None:
            raise HTTPException(503, "yt-dlp is not installed, so links cannot be downloaded. Use files, or run: pip install yt-dlp")
        paths = [safe_video_path(p, roots) for p in req.video_paths]
        jid = "stl_" + uuid.uuid4().hex[:10]
        with style_lock:
            style_jobs[jid] = {"id": jid, "name": name, "status": "running", "message": "Starting", "error": None}
        threading.Thread(target=_run_style_job, args=(jid, name, urls, paths), daemon=True, name=jid).start()
        return {"ok": True, "job": dict(style_jobs[jid])}

    @app.get("/api/editor/styles/learn/{jid}")
    def get_style_job(jid: str):
        with style_lock:
            j = style_jobs.get(jid)
            if not j:
                raise HTTPException(404, "Style job not found")
            return {"ok": True, "job": dict(j)}

    @app.get("/api/editor/sfx")
    def list_sound_effects():
        try:
            items = sfxlib.catalog(with_duration=True)
        except FileNotFoundError as e:
            raise HTTPException(404, str(e))
        for i in items:
            i["url"] = f"/api/editor/sfx/{i['name']}.wav"
            i.pop("path", None)
        return {"ok": True, "count": len(items), "sfx": items}

    @app.get("/api/editor/sfx/{name}")
    def get_sound_effect(name: str):
        try:
            p = sfxlib.resolve(name)
        except (ValueError, FileNotFoundError):
            raise HTTPException(404, f"Sound effect '{name}' not found")
        return FileResponse(p, media_type="audio/wav")

    @app.get("/api/editor/media")
    def list_media():
        renders = []
        by_file = {}
        for sb in store.all("storyboards"):
            for r in sb.get("renders") or []:
                by_file[r["render_id"]] = (sb, r)
        for f in renders_dir.glob("*.mp4"):
            st = f.stat()
            sb, r = by_file.get(f.stem, (None, None))
            renders.append({"id": f.stem, "filename": f.name, "url": f"/render/{f.name}", "size_mb": round(st.st_size / 1048576, 2),
                            "modified": st.st_mtime, "type": "video", "quality": (r or {}).get("quality"),
                            "storyboard_id": (sb or {}).get("id"), "title": ((sb or {}).get("storyboard") or {}).get("title"),
                            "duration": (r or {}).get("duration")})
        renders.sort(key=lambda x: x["modified"], reverse=True)
        sfx = []
        try:
            for i in sfxlib.catalog(with_duration=True):
                sfx.append({"id": i["name"], "name": i["name"].replace("_", " ").title(), "filename": i["file"], "category": i["category"],
                            "license": "CC0 Public Domain", "url": f"/api/editor/sfx/{i['name']}.wav", "duration": i.get("duration")})
        except FileNotFoundError:
            pass
        return {"ok": True, "renders": renders, "sfx": sfx, "total_renders": len(renders), "total_sfx": len(sfx)}

    @app.get("/api/editor/footage")
    def list_footage():
        """Videos the studio may edit: the raw-footage folder (staged uploads are chosen by the dashboard's uploader)."""
        out = []
        raw = _find_up("raw footage", REPO_ROOT)
        if raw:
            for f in sorted(raw.rglob("*")):
                if f.is_file() and f.suffix.lower() in VIDEO_EXT and len(f.relative_to(raw).parts) <= 3:
                    out.append({"path": str(f), "name": str(f.relative_to(raw)), "size_mb": round(f.stat().st_size / 1048576, 1)})
        return {"ok": True, "files": out[:200]}

    # ------------------------------------------------------------ storyboards
    @app.post("/api/editor/storyboard/create", status_code=202)
    async def create_storyboard(req: StoryboardCreateRequest):
        vpath = safe_video_path(req.video_path, roots)
        if req.style not in PRESET_STYLES and not (ROOT / "styles" / f"{req.style}.json").is_file():
            raise HTTPException(400, f"Unknown style '{req.style}'")
        prompt = _compose_prompt(req.prompt or DEFAULT_PROMPT, bool(req.series_mode), req.episode or 1, req.total_episodes or 3,
                                 bool(req.sendability_focus))
        try:
            client = _llm()
        except RuntimeError as e:
            raise HTTPException(503, str(e))
        sb = _start_storyboard(vpath, req.style or "viral_hook_fast_pace", prompt, client,
                               {"id": req.series_id, "episode": req.episode} if req.series_id else None)
        return {"ok": True, "storyboard_id": sb["id"], "data": public(sb)}

    # ------------------------------------------------------------ one-shot auto edit (link or file -> storyboard)
    def _stage(sb_id: str, text: str) -> None:
        def add(r, text=text):
            ev = r.setdefault("events", [])
            ev.append({"ts": time.time(), "type": "message", "text": text})
            del ev[:-80]
            r["stage_text"] = text
        store.update("storyboards", sb_id, add)

    def _run_auto_job(sb_id: str, url: Optional[str], video_path: Optional[Path], style: str, instruction: str, client: Any) -> None:
        try:
            if url:
                _stage(sb_id, "Downloading the video from the link")
                job = ingest_jobs.start(url)
                while True:
                    j = ingest_jobs.get(job["id"])
                    if j["status"] != "running":
                        break
                    time.sleep(1.0)
                if j["status"] != "done":
                    raise RuntimeError(j.get("error") or "download failed")
                video_path = safe_video_path(j["path"], roots)
            assert video_path is not None
            info = probe_video_file(video_path)
            sb = store.snapshot("storyboards", sb_id)
            plan = {"version": 1, "source": {"path": str(video_path), **info}, "output": {"width": 1080, "height": 1920, "fps": info["fps"]},
                    "keep": [{"id": "k1", "start": 0.0, "end": info["duration"]}], "captions": [], "reframe": {"mode": "center", "track": []},
                    "zooms": [], "transitions": [], "overlays": [], "style_ref": style, "notes": f"Auto edit: {video_path.stem}"}
            store.update("storyboards", sb_id, lambda r: r.update(video_path=str(video_path), plan=plan))
            tools = adapters.collect_tools()

            def on_step(e: dict) -> None:
                def add(r, e=e):
                    ev = r.setdefault("events", [])
                    ev.append({"ts": time.time(), "type": "tool", "name": e["tool"], "state": "ok" if e["ok"] else "error",
                               "text": e.get("error") or e.get("summary", ""), "warnings": e.get("warnings", [])})
                    del ev[:-80]
                store.update("storyboards", sb_id, add)

            _stage(sb_id, "Transcribing the speech and tightening the cut")
            plan, _ = recipes_mod.run(plan, director.base_steps(), tools, sb["workdir"], _call_tool, _normalize, on_step)
            tfile = Path(sb["workdir"]) / "transcript.json"
            transcript = json.loads(tfile.read_text(encoding="utf-8")) if tfile.is_file() else {}
            if not (transcript.get("words") or transcript.get("segments")):
                raise RuntimeError("No speech was found in this video, so the director has nothing to work from. Silent footage needs a hand-written recipe.")

            _stage(sb_id, "The director is planning the visuals" + ("" if client else " (no LLM configured: using the plainer built-in planner)"))
            sfx_names = [i["name"] for i in sfxlib.catalog()]
            dplan, source, warns = director.make_plan(client, transcript, float(info["duration"]), style, instruction, sfx_names)
            if any(b.get("template") == "custom" for b in dplan["beats"]):
                dplan["beats"], cwarns = animator.fill_custom(client, dplan["beats"], lambda m: _stage(sb_id, m))
                warns = list(warns) + cwarns
            steps = director.to_steps(dplan) + [{"tool": "normalize_loudness", "input": {"target_lufs": -14}}]
            recipes_mod.validate(steps, tools)
            _stage(sb_id, f"Building the edit: {len(dplan['beats'])} diagrams, {len(dplan['zooms'])} zooms, {len(dplan['sfx'])} sound effects")
            plan, _ = recipes_mod.run(plan, steps, tools, sb["workdir"], _call_tool, _normalize, on_step)

            card = format_storyboard(plan, sb["workdir"])
            if dplan.get("hook"):
                card["title"] = dplan["hook"]["text"]  # a real title for lists, carousels and posts (not the file name)
            sc = card["scorecard"]
            reply = (f"Auto-edited {video_path.name}: {len(dplan['beats'])} diagrams, {len(dplan['zooms'])} zooms, {len(dplan['sfx'])} sound effects. "
                     f"Planned by the {'LLM director' if source == 'llm' else 'built-in heuristic planner'}. Scorecard {sc['status']}"
                     + (f" ({round(sc['score'] * 100)}%)" if sc.get("score") is not None else "")
                     + (f". Failing: {', '.join(sc['failed_checks'])}" if sc["failed_checks"] else "")
                     + (f". Warnings: {', '.join(sc['warnings'])}" if sc["warnings"] else "") + ".")
            store.update("storyboards", sb_id, lambda r: r.update(
                status="ready", error=None, plan=plan, storyboard=card, agent_reply=reply, video_path=str(video_path),
                director={"source": source, "plan": dplan, "warnings": warns}))
            store.log("storyboard", f"Auto-edited “{card['title']}” ({source} director)", id=sb_id)
        except Exception as e:
            log.exception("[%s] auto edit failed", sb_id)
            msg = f"{type(e).__name__}: {e}" if not isinstance(e, (RuntimeError, ingest_mod.IngestError, recipes_mod.RecipeError, ValueError)) else str(e)
            store.update("storyboards", sb_id, lambda r: r.update(status="failed", error=msg))
            store.log("storyboard", f"Auto edit failed: {msg[:200]}", id=sb_id)

    @app.post("/api/editor/ingest", status_code=202)
    async def start_ingest(req: IngestRequest):
        try:
            job = ingest_jobs.start(req.url)
        except ingest_mod.IngestError as e:
            raise HTTPException(400, str(e))
        return {"ok": True, "job": job}

    @app.get("/api/editor/ingest/{jid}")
    def get_ingest(jid: str):
        j = ingest_jobs.get(jid)
        if not j:
            raise HTTPException(404, "Download job not found")
        return {"ok": True, "job": j}

    @app.post("/api/editor/reel/auto", status_code=202)
    async def auto_edit(req: AutoEditRequest):
        """Paste a link or pick a file: download, transcribe, direct, build the storyboard. Approval and render come next."""
        if bool(req.url) == bool(req.video_path):
            raise HTTPException(400, "Give exactly one of `url` or `video_path`")
        style = req.style or "viral_hook_fast_pace"
        if style not in PRESET_STYLES and not (ROOT / "styles" / f"{style}.json").is_file():
            raise HTTPException(400, f"Unknown style '{style}'")
        vpath = None
        if req.url:
            try:
                ingest_mod.validate_url(req.url)
            except ingest_mod.IngestError as e:
                raise HTTPException(400, str(e))
            if ingest_mod.ytdlp_path() is None:
                raise HTTPException(503, "yt-dlp is not installed, so links cannot be downloaded. Upload the file or run: pip install yt-dlp")
        else:
            vpath = safe_video_path(req.video_path, roots)
        try:
            client = adapters._make_client()
        except Exception:
            client = None
        sb_id = store.new_id("sb")
        work = work_dir / sb_id
        work.mkdir(parents=True, exist_ok=True)
        sb = {"id": sb_id, "status": "processing", "error": None, "video_path": req.url or str(vpath), "source_url": req.url, "style": style,
              "prompt": f"Auto edit{(': ' + req.instruction) if req.instruction else ''}", "series": None,
              "plan": {"version": 1, "source": {}, "keep": [], "notes": ""}, "storyboard": None, "workdir": str(work), "agent_reply": "",
              "events": [], "messages": [], "approved": False, "approved_at": None, "latest_render": None, "latest_preview": None,
              "renders": [], "render_job": None, "director": None, "posts": None}
        store.put("storyboards", sb_id, sb)
        store.log("storyboard", f"Auto edit started ({'link' if req.url else Path(vpath).name})", id=sb_id)
        threading.Thread(target=_run_auto_job, args=(sb_id, req.url, vpath, style, req.instruction or "", client), daemon=True, name=f"auto-{sb_id}").start()
        return {"ok": True, "storyboard_id": sb_id, "data": public(sb)}

    @app.post("/api/editor/storyboard/{sb_id}/posts")
    async def make_posts(sb_id: str):
        """Write Instagram / YouTube Short / X post text from what the video says (needs a finished storyboard)."""
        sb = store.snapshot("storyboards", sb_id)
        if not sb:
            raise HTTPException(404, "Storyboard not found")
        if sb["status"] != "ready" or not sb.get("storyboard"):
            raise HTTPException(409, "The storyboard is not ready yet")
        tfile = Path(sb["workdir"]) / "transcript.json"
        sents = []
        if tfile.is_file():
            sents = [s["text"] for s in director.sentences(json.loads(tfile.read_text(encoding="utf-8")))]
        hook = (((sb.get("director") or {}).get("plan") or {}).get("hook") or {}).get("text") or sb["storyboard"]["title"]
        try:
            client = adapters._make_client()
        except Exception:
            client = None
        out = await asyncio.to_thread(posts_mod.generate, client, hook, sents, sb["storyboard"]["title"], "")
        store.update("storyboards", sb_id, lambda r: r.update(posts=out))
        return {"ok": True, "posts": out}

    # ------------------------------------------------------------ Vishnu studio bridge (Remotion carousel lane, library, gates, music)
    def _sentences_of(sb: Optional[dict], text: Optional[str]) -> List[str]:
        if sb is not None:
            tf = Path(sb["workdir"]) / "transcript.json"
            if tf.is_file():
                return [x["text"] for x in director.sentences(json.loads(tf.read_text(encoding="utf-8")))]
        return [x.strip() for x in re.split(r"(?<=[.!?])\s+|\n+", text or "") if x.strip()]

    def _run_carousel(cid: str, title: str, sentences: List[str], instruction: str, client: Any) -> None:
        try:
            out = carousel_mod.generate(client, title, sentences, instruction)
            slug = carousel_mod.slugify(title, cid[-6:])
            d = vs.root / "videos" / slug
            d.mkdir(parents=True, exist_ok=True)
            note = "Written by the editor from a transcript. Check every line against what was actually said before posting."
            (d / "slides.md").write_text(carousel_mod.to_markdown(out["slides"], note), encoding="utf-8", newline="\n")
            (d / "CHECKS.md").write_text(f"# Checks: {title}\n\nOne check, a person's.\n\n- [ ] Slides: out/contact-sheet.png reviewed\n", encoding="utf-8", newline="\n")
            store.update("carousels", cid, lambda r: r.update(status="rendering", slug=slug, slides=out["slides"], generated_by=out["generated_by"]))
            vs.ensure_carousel_entry()
            job = vs.start_job("carousel", vs.carousel_argv(slug), timeout=1500, extra_env=vs.carousel_env(slug))
            while True:
                j = vs.job(job["id"])
                if j["status"] != "running":
                    break
                time.sleep(1.0)
            if j["status"] != "done":
                tail = " | ".join(ln for ln in (j.get("log") or [])[-6:])
                raise RuntimeError((j.get("error") or "the render failed") + (f" :: {tail}" if tail and tail not in (j.get("error") or "") else ""))
            files = sorted(p.name for p in (d / "out").glob("slide-*.png")) + (["contact-sheet.png"] if (d / "out" / "contact-sheet.png").is_file() else [])
            if not files:
                raise RuntimeError("the render finished but produced no slides")
            store.update("carousels", cid, lambda r: r.update(status="ready", error=None, files=files))
            store.log("carousel", f"Carousel “{title}” rendered ({len(files) - 1} slides)", id=cid)
        except Exception as e:
            msg = str(e) or type(e).__name__
            store.update("carousels", cid, lambda r: r.update(status="failed", error=msg[:400]))
            store.log("carousel", f"Carousel failed: {msg[:160]}", id=cid)

    @app.get("/api/editor/vstudio/status")
    def vstudio_status():
        r = vs.readiness()
        return {"ok": True, **r, "videos": len(vs.videos()), "music_tracks": len(vs.music())}

    @app.post("/api/editor/vstudio/install", status_code=202)
    def vstudio_install():
        try:
            job = vs.start_job("install", vs.install_argv(), timeout=1800)
        except vstudio_mod.StudioError as e:
            raise HTTPException(400, str(e))
        return {"ok": True, "job": job}

    @app.get("/api/editor/vstudio/jobs/{jid}")
    def vstudio_job(jid: str):
        j = vs.job(jid)
        if not j:
            raise HTTPException(404, "Job not found")
        return {"ok": True, "job": j}

    @app.get("/api/editor/vstudio/videos")
    def vstudio_videos():
        return {"ok": True, "videos": vs.videos()}

    @app.post("/api/editor/vstudio/videos/{slug}/gate")
    def vstudio_gate(slug: str, req: GateRequest):
        """A person's sign-off in the studio's CHECKS.md (the dashboard button is the human check)."""
        try:
            checks = vs.tick(slug, req.stage, req.done)
        except vstudio_mod.StudioError as e:
            raise HTTPException(404, str(e))
        store.log("vstudio", f"{'Signed off' if req.done else 'Reopened'} “{req.stage}” on {slug}")
        return {"ok": True, "checks": checks}

    @app.get("/api/editor/vstudio/music")
    def vstudio_music():
        tracks = vs.music()
        return {"ok": True, "tracks": [{k: v for k, v in t.items() if k != "path"} for t in tracks],
                "note": None if tracks else "No music tracks were found in the studio (videos/_music or videos/*/music). Add tracks you have the rights to, and they appear here."}

    @app.get("/api/editor/vstudio/file/{slug}/{name}")
    def vstudio_file(slug: str, name: str):
        try:
            p = vs.file_path(slug, name)
        except vstudio_mod.StudioError:
            raise HTTPException(404, "File not found")
        return FileResponse(p)

    @app.post("/api/editor/vstudio/carousel", status_code=202)
    async def make_carousel(req: CarouselRequest):
        """Turn a storyboard's transcript (or pasted text) into a Remotion-rendered Instagram carousel."""
        ready = vs.readiness()
        if not ready["carousel_ready"]:
            missing = [f"{i['label']}: {i['fix'] or i['detail']}" for i in ready["items"] if not i["ok"] and i["id"] in ("folder", "node", "remotion", "py_pil")]
            raise HTTPException(409, detail={"error": "STUDIO_NOT_READY", "message": "The Vishnu studio is not ready to render slides. " + "; ".join(missing)})
        sb = store.snapshot("storyboards", req.storyboard_id) if req.storyboard_id else None
        if req.storyboard_id and not sb:
            raise HTTPException(404, "Storyboard not found")
        sentences = _sentences_of(sb, req.text)
        if len(sentences) < 3:
            raise HTTPException(400, "Give a ready storyboard with speech, or paste at least a few sentences of text")
        title = (req.title or ((sb or {}).get("storyboard") or {}).get("title") or sentences[0])[:80]
        try:
            client = adapters._make_client()
        except Exception:
            client = None
        cid = store.new_id("car")
        store.put("carousels", cid, {"id": cid, "title": title, "status": "writing", "error": None, "slug": None, "slides": [], "files": [],
                                     "storyboard_id": req.storyboard_id, "generated_by": None})
        store.log("carousel", f"Making a carousel from “{title}”", id=cid)
        threading.Thread(target=_run_carousel, args=(cid, title, sentences, req.instruction or "", client), daemon=True, name=f"car-{cid}").start()
        return {"ok": True, "carousel": store.snapshot("carousels", cid)}

    @app.get("/api/editor/vstudio/carousels")
    def list_carousels():
        return {"ok": True, "carousels": sorted(store.all("carousels"), key=lambda c: -c.get("created_at", 0))}

    @app.post("/api/editor/storyboard/{sb_id}/music")
    async def set_music(sb_id: str, req: MusicRequest):
        """Put a track from the studio's music library under the voice (ducked, loudness-normalised), or remove the bed."""
        sb = store.snapshot("storyboards", sb_id)
        if not sb:
            raise HTTPException(404, "Storyboard not found")
        if sb["status"] != "ready":
            raise HTTPException(409, "The storyboard is not ready")
        plan = sb["plan"]
        if req.track_id is None:
            audio = plan.get("audio") or {}
            audio.pop("music", None)
            audio.pop("duck", None)
            plan["audio"] = audio
        else:
            try:
                path = vs.music_path(req.track_id)
            except vstudio_mod.StudioError as e:
                raise HTTPException(404, str(e))
            try:
                plan, _ = recipes_mod.run(plan, [{"tool": "add_music", "input": {"path": str(path), "volume_db": req.volume_db}},
                                                  {"tool": "duck_music_under_speech", "input": {"amount_db": 12}}],
                                          adapters.collect_tools(), sb["workdir"], _call_tool, _normalize)
            except recipes_mod.RecipeError as e:
                raise HTTPException(400, str(e))
        card = await asyncio.to_thread(format_storyboard, plan, sb["workdir"])
        store.update("storyboards", sb_id, lambda r: r.update(plan=plan, storyboard=card, approved=False, approved_at=None, approval_reset=bool(sb.get("approved"))))
        store.log("storyboard", "Music bed " + ("removed" if req.track_id is None else "added from the studio library"), id=sb_id)
        return {"ok": True, "data": public(store.snapshot("storyboards", sb_id))}

    @app.get("/api/editor/recipes")
    def list_recipes():
        return {"ok": True, "recipes": recipes_mod.list_saved()}

    @app.post("/api/editor/storyboard/create-from-recipe", status_code=202)
    async def create_from_recipe(req: RecipeCreateRequest):
        """Build a storyboard by running fixed tool steps (no LLM). Deterministic and repeatable."""
        vpath = safe_video_path(req.video_path, roots)
        if req.style not in PRESET_STYLES and not (ROOT / "styles" / f"{req.style}.json").is_file():
            raise HTTPException(400, f"Unknown style '{req.style}'")
        try:
            saved = recipes_mod.load_saved(req.recipe) if isinstance(req.recipe, str) else None
            steps = recipes_mod.validate(saved["steps"] if saved else req.recipe, adapters.collect_tools())
        except recipes_mod.RecipeError as e:
            raise HTTPException(400, str(e))
        label = req.title or (saved or {}).get("title") or "custom recipe"
        sb = _start_storyboard(vpath, req.style or "viral_hook_fast_pace", f"Recipe: {label}", None, None, steps, label)
        return {"ok": True, "storyboard_id": sb["id"], "data": public(sb)}

    @app.get("/api/editor/storyboards")
    def list_storyboards():
        items = sorted(store.all("storyboards"), key=lambda s: -s.get("updated_at", 0))
        return {"ok": True, "storyboards": [public(s) for s in items]}

    @app.get("/api/editor/storyboard/{sb_id}")
    def get_storyboard(sb_id: str, include_plan: bool = False):
        sb = store.snapshot("storyboards", sb_id)
        if not sb:
            raise HTTPException(404, "Storyboard not found")
        return {"ok": True, "data": public(sb, include_plan)}

    @app.delete("/api/editor/storyboard/{sb_id}")
    def delete_storyboard(sb_id: str):
        sb = store.get("storyboards", sb_id)
        if not sb:
            raise HTTPException(404, "Storyboard not found")
        if sb.get("status") == "processing" or (sb.get("render_job") or {}).get("status") == "running":
            raise HTTPException(409, "A job is running for this storyboard; wait for it to finish")
        if any(p.get("storyboard_id") == sb_id and p.get("status") in ("SCHEDULED", "PUBLISHING") for p in store.all("publishing")):
            raise HTTPException(409, "This storyboard has a scheduled post; cancel it first")
        store.delete("storyboards", sb_id)
        shutil.rmtree(sb.get("workdir", ""), ignore_errors=True)
        store.log("storyboard", "Deleted a storyboard", id=sb_id)
        return {"ok": True}

    @app.post("/api/editor/storyboard/{sb_id}/chat", status_code=202)
    async def chat_storyboard(sb_id: str, req: ChatRequest):
        sb = store.snapshot("storyboards", sb_id)
        if not sb:
            raise HTTPException(404, "Storyboard not found")
        if sb["status"] == "processing":
            raise HTTPException(409, "This storyboard is still being generated")
        if (sb.get("render_job") or {}).get("status") == "running":
            raise HTTPException(409, "A render is running; revise after it finishes")
        try:
            client = _llm()
        except RuntimeError as e:
            raise HTTPException(503, str(e))
        store.update("storyboards", sb_id, lambda r: r.update(status="processing", error=None, events=[]))
        threading.Thread(target=_run_agent_job, args=(sb_id, req.message, False, client), daemon=True, name=f"agent-{sb_id}").start()
        return {"ok": True, "storyboard_id": sb_id, "data": public(store.snapshot("storyboards", sb_id))}

    @app.post("/api/editor/storyboard/{sb_id}/approve")
    def approve_storyboard(sb_id: str):
        sb = store.snapshot("storyboards", sb_id)
        if not sb:
            raise HTTPException(404, "Storyboard not found")
        if sb["status"] != "ready":
            raise HTTPException(409, "Only a finished storyboard can be approved")
        card = (sb.get("storyboard") or {}).get("scorecard") or {}
        if card.get("status") == "FAIL":
            raise HTTPException(409, "The scorecard has failing checks: " + ", ".join(card.get("failed_checks") or []) + ". Revise the storyboard first.")
        store.update("storyboards", sb_id, lambda r: r.update(approved=True, approved_at=time.time(), approval_reset=False))
        store.log("storyboard", f"Approved storyboard “{(sb.get('storyboard') or {}).get('title')}”", id=sb_id)
        return {"ok": True, "data": public(store.snapshot("storyboards", sb_id))}

    @app.post("/api/editor/storyboard/{sb_id}/unapprove")
    def unapprove_storyboard(sb_id: str):
        if store.update("storyboards", sb_id, lambda r: r.update(approved=False, approved_at=None)) is None:
            raise HTTPException(404, "Storyboard not found")
        return {"ok": True, "data": public(store.snapshot("storyboards", sb_id))}

    @app.get("/api/editor/storyboard/{sb_id}/scorecard")
    async def storyboard_scorecard(sb_id: str):
        sb = store.snapshot("storyboards", sb_id)
        if not sb:
            raise HTTPException(404, "Storyboard not found")
        card = await asyncio.to_thread(run_scorecard, sb["plan"], sb["workdir"])
        return {"ok": True, "storyboard_id": sb_id, "scorecard": card}

    # ------------------------------------------------------------ rendering
    def _run_render(sb_id: str, quality: str) -> None:
        with render_lock:
            sb = store.snapshot("storyboards", sb_id)
            if sb is None:
                return
            store.update("storyboards", sb_id, lambda r: r.update(render_job={"status": "running", "quality": quality, "started_at": time.time(), "error": None}))
            try:
                fn = render_final_info if quality == "final" else render_preview_info
                info = fn(sb["plan"], Path(sb["workdir"]))
                src = Path(info["path"])
                if not src.is_file():
                    raise RuntimeError(f"render produced no file: {src}")
                rid = uuid.uuid4().hex
                shutil.copy2(src, renders_dir / f"{rid}.mp4")
                probed = probe_video_file(renders_dir / f"{rid}.mp4")
                rec = {"render_id": rid, "video_url": f"/render/{rid}.mp4", "quality": quality, "duration": round(probed["duration"], 2),
                       "resolution": f"{probed['width']}x{probed['height']}", "backend": info.get("stage"),
                       "warnings": info.get("warnings") or [], "seconds": info.get("seconds"), "created_at": time.time()}

                def done(r):
                    r.setdefault("renders", []).append(rec)
                    r["latest_render" if quality == "final" else "latest_preview"] = rec
                    r["render_job"] = {"status": "done", "quality": quality, "finished_at": time.time(), "render_id": rid, "error": None}
                store.update("storyboards", sb_id, done)
                store.log("render", f"Rendered {quality} ({rec['duration']}s, {rec['backend']})", id=sb_id, render_id=rid)
            except Exception as e:
                log.exception("[%s] render failed", sb_id)
                msg = f"{type(e).__name__}: {e}"
                store.update("storyboards", sb_id, lambda r: r.update(render_job={"status": "failed", "quality": quality, "error": msg[:600]}))
                store.log("render", f"Render failed: {msg[:200]}", id=sb_id)

    @app.post("/api/editor/storyboard/{sb_id}/render", status_code=202)
    async def render_storyboard(sb_id: str, req: RenderRequest):
        sb = store.snapshot("storyboards", sb_id)
        if not sb:
            raise HTTPException(404, "Storyboard not found")
        if sb["status"] != "ready":
            raise HTTPException(409, "The storyboard is not ready")
        if req.quality == "final" and not sb.get("approved"):
            raise HTTPException(409, detail={"error": "NOT_APPROVED", "message": "Approve the storyboard before a final render. Previews are allowed for review."})
        if (sb.get("render_job") or {}).get("status") == "running":
            raise HTTPException(409, "A render is already running for this storyboard")
        store.update("storyboards", sb_id, lambda r: r.update(render_job={"status": "queued", "quality": req.quality, "error": None}))
        threading.Thread(target=_run_render, args=(sb_id, req.quality), daemon=True, name=f"render-{sb_id}").start()
        return {"ok": True, "storyboard_id": sb_id, "render_job": store.snapshot("storyboards", sb_id)["render_job"]}

    # ------------------------------------------------------------ series
    @app.get("/api/editor/series")
    def list_series():
        items = sorted(store.all("series"), key=lambda s: -s.get("created_at", 0))
        return {"ok": True, "series": [series_mod.with_progress(store, s) for s in items]}

    @app.post("/api/editor/series/generate")
    async def generate_series(req: SeriesCreateRequest):
        try:
            client = adapters._make_client()
        except Exception:
            client = None
        try:
            s = await asyncio.to_thread(series_mod.create_series, store, req.title, req.niche, req.episodes_count, req.hook_angle or "", client)
        except ValueError as e:
            raise HTTPException(400, str(e))
        return {"ok": True, "series": series_mod.with_progress(store, s)}

    @app.patch("/api/editor/series/{sid}/episodes/{number}")
    def patch_episode(sid: str, number: int, req: EpisodePatch):
        try:
            s = series_mod.update_episode(store, sid, number, req.model_dump())
        except KeyError:
            raise HTTPException(404, "Series or episode not found")
        except ValueError as e:
            raise HTTPException(400, str(e))
        return {"ok": True, "series": series_mod.with_progress(store, s)}

    @app.post("/api/editor/series/{sid}/episodes/{number}/storyboard", status_code=202)
    async def episode_storyboard(sid: str, number: int, req: EpisodeStoryboardRequest):
        s = store.snapshot("series", sid)
        if not s or not any(e["episode_number"] == number for e in s["episodes"]):
            raise HTTPException(404, "Series or episode not found")
        vpath = safe_video_path(req.video_path, roots)
        try:
            client = _llm()
        except RuntimeError as e:
            raise HTTPException(503, str(e))
        prompt = _compose_prompt(series_mod.episode_prompt(s, number) + " " + DEFAULT_PROMPT, True, number, len(s["episodes"]), True)
        sb = _start_storyboard(vpath, req.style or "viral_hook_fast_pace", prompt, client, {"id": sid, "episode": number})
        series_mod.link_storyboard(store, sid, number, sb["id"])
        return {"ok": True, "storyboard_id": sb["id"], "series": series_mod.with_progress(store, store.snapshot("series", sid))}

    @app.delete("/api/editor/series/{sid}")
    def delete_series(sid: str):
        if not store.delete("series", sid):
            raise HTTPException(404, "Series not found")
        return {"ok": True}

    # ------------------------------------------------------------ publishing
    @app.get("/api/editor/publishing/queue")
    def publishing_queue():
        items = sorted(store.all("publishing"), key=lambda p: (p.get("scheduled_at") is None, p.get("scheduled_at") or p.get("created_at", 0)))
        return {"ok": True, "queue": items}

    @app.get("/api/editor/publishing/accounts")
    async def publishing_accounts():
        acc = await asyncio.to_thread(publisher.accounts)
        return {"ok": True, "accounts": list(acc.values()), "public_url_configured": publisher.public_url("x") is not None}

    @app.post("/api/editor/publishing/schedule")
    async def schedule_publish(req: PublishScheduleRequest):
        try:
            item = await asyncio.to_thread(publisher.schedule, req.model_dump())
        except ValueError as e:
            raise HTTPException(400, str(e))
        return {"ok": True, "item": item}

    def _pub_action(fn, pid: str):
        try:
            return {"ok": True, "item": fn(pid)}
        except KeyError:
            raise HTTPException(404, "Post not found")
        except ValueError as e:
            raise HTTPException(409, str(e))

    @app.post("/api/editor/publishing/{pid}/cancel")
    def pub_cancel(pid: str):
        return _pub_action(publisher.cancel, pid)

    @app.post("/api/editor/publishing/{pid}/retry")
    def pub_retry(pid: str):
        return _pub_action(publisher.retry, pid)

    @app.post("/api/editor/publishing/{pid}/confirm-retry")
    def pub_confirm_retry(pid: str):
        return _pub_action(publisher.retry_confirmed, pid)

    @app.put("/api/editor/publishing/{pid}/metrics")
    def pub_metrics(pid: str, req: MetricsRequest):
        try:
            m = analytics.clean_metrics(req.model_dump())
        except ValueError as e:
            raise HTTPException(400, str(e))
        rec = store.update("publishing", pid, lambda r: r.update(metrics=m or None))
        if rec is None:
            raise HTTPException(404, "Post not found")
        return {"ok": True, "item": store.snapshot("publishing", pid)}

    # ------------------------------------------------------------ copilot
    @app.post("/api/editor/copilot/chat")
    async def copilot_chat(req: CopilotChatRequest):
        try:
            client = adapters._make_client()
        except Exception:
            client = None
        if client is None or not getattr(client, "api_key", None):
            return {"ok": False, "error": "LLM_NOT_CONFIGURED", "configured": False,
                    "message": "No LLM key is configured, so the copilot cannot answer. Add GEMINI_API_KEY to automation/editor/.env."}
        ctx = ""
        sb = store.snapshot("storyboards", req.storyboard_id) if req.storyboard_id else None
        if sb and sb.get("storyboard"):
            card = sb["storyboard"]
            scenes = "\n".join(f"  {s['scene_number']}. {s['timestamp_output']} — “{s['caption']}” [{s['camera_motion']}]" for s in card["scenes"][:12])
            hook, send = card["growth_signals"]["three_second_hook"], card["growth_signals"]["sendability"]
            ctx = (f"[ACTIVE STORYBOARD {sb['id']}: “{card['title']}”, {card['duration']['output_seconds']}s from "
                   f"{card['duration']['original_seconds']}s, approved={sb.get('approved')}, scorecard={card['scorecard']['status']}, "
                   f"hook={hook['status']} ({hook['detail']}), sendability={send['status']} ({send['detail']})]\n{scenes}\n")
        msgs = [{"role": h.role, "content": h.content} for h in (req.history or [])[-8:] if h.role in ("user", "assistant")]
        if msgs and msgs[-1]["role"] == "user" and msgs[-1]["content"] == req.message:
            msgs.pop()
        msgs.append({"role": "user", "content": (ctx + "\n" if ctx else "") + req.message})

        def call() -> str:
            resp = client.messages.create(model=getattr(client, "model", None) or "claude-sonnet-5-5", system=DIRECTOR_SYSTEM_PROMPT,
                                          messages=msgs, max_tokens=900)
            blocks = resp.get("content", []) if isinstance(resp, dict) else getattr(resp, "content", [])
            return "\n".join((b.get("text", "") if isinstance(b, dict) else getattr(b, "text", "")) for b in blocks).strip()

        try:
            reply = await asyncio.to_thread(call)
        except Exception as e:
            log.warning("copilot call failed: %s", e)
            return {"ok": False, "error": "LLM_ERROR", "configured": True, "message": f"The LLM request failed: {type(e).__name__}: {str(e)[:200]}"}
        return {"ok": True, "reply": reply or "(the model returned an empty answer)", "storyboard_id": req.storyboard_id,
                "platforms": {k: v["label"] for k, v in PLATFORMS.items()}}

    # ======================================================================
    # DIRECTOR 2.0 ADVANCED INTELLIGENCE ENDPOINTS
    # ======================================================================
    memory_store = EditingMemoryStore(str(work_dir / "editing_memory.json"))
    footage_indices: Dict[str, Dict[str, Any]] = {}
    active_directors: Dict[str, DirectorEngine] = {}

    def resolve_media(p: str) -> Path:
        if not p:
            return Path("")
        try:
            return safe_video_path(p, roots)
        except Exception:
            cand = Path(p)
            if cand.is_file():
                return cand
            for r in roots:
                check = (r / p).resolve()
                if check.is_file():
                    return check
            return cand

    @app.get("/api/editor/media/index")
    async def get_media_index(video_path: str = Query(...)):
        resolved = resolve_media(video_path)
        if not resolved.is_file():
            raise HTTPException(404, f"Video not found: {video_path}")
        mid = resolved.stem
        if mid in footage_indices:
            return {"ok": True, "index": footage_indices[mid]}
        
        def run_index():
            wdir = work_dir / f"index_{mid}"
            return build_footage_index(str(resolved), str(wdir))

        try:
            idx = await asyncio.to_thread(run_index)
            footage_indices[mid] = idx
            return {"ok": True, "index": idx}
        except Exception as e:
            log.error("Footage indexing failed: %s", e)
            raise HTTPException(500, f"Indexing error: {e}")

    @app.post("/api/editor/media/search")
    def post_media_search(req: SearchFootageRequest):
        target_idx = None
        if req.media_id and req.media_id in footage_indices:
            target_idx = footage_indices[req.media_id]
        elif footage_indices:
            target_idx = next(iter(footage_indices.values()))
        else:
            # Fallback mock index if no footage indexed yet
            target_idx = {
                "media_id": "demo",
                "scenes": [
                    {"scene_id": "sc_01", "start": 0.0, "end": 3.2, "transcript": "Never build features nobody asked for", "visual_tags": ["hook", "core_problem"], "camera": {"framing": "Close-Up / Talking Head"}},
                    {"scene_id": "sc_02", "start": 3.2, "end": 14.0, "transcript": "Here is our product dashboard demo showing retention", "visual_tags": ["product_demo"], "camera": {"framing": "Medium Action Shot"}},
                    {"scene_id": "sc_03", "start": 14.0, "end": 22.0, "transcript": "Our pricing model starts at 29 dollars per month", "visual_tags": ["pricing"], "camera": {"framing": "Close-Up"}},
                    {"scene_id": "sc_04", "start": 22.0, "end": 29.4, "transcript": "Send this to your cofounder before sprint planning", "visual_tags": ["cta"], "camera": {"framing": "Close-Up"}},
                ]
            }
        results = search_footage(target_idx, req.query)
        return {"ok": True, "query": req.query, "results": [r.to_dict() for r in results]}

    @app.post("/api/editor/director/narrative-cut")
    def post_narrative_cut(req: NarrativeCutRequest):
        resolved = resolve_media(req.video_path)
        info = probe_video_file(resolved) if resolved.is_file() else {"duration": 30.0, "width": 1080, "height": 1920, "fps": 30.0}
        base_plan = {
            "version": 1,
            "source": {"path": str(resolved), **info},
            "output": {"width": 1080, "height": 1920, "fps": 30.0},
            "keep": [{"id": "k1", "start": 0.0, "end": info["duration"]}],
        }
        mgr = EditPlanManager(base_plan)
        director = DirectorEngine(mgr, footage_indices.get(resolved.stem))
        cut_res = director.plan_narrative_cut(
            style=req.style or "viral_hook_fast_pace",
            target_duration=req.target_duration,
            platform=req.platform or "instagram_reels",
            custom_instructions=req.custom_instructions or "",
        )
        active_directors[resolved.stem] = director
        return cut_res

    @app.post("/api/editor/director/patch")
    def post_director_patch(req: PatchRequest):
        mid = req.media_id or "default"
        director = active_directors.get(mid)
        if not director:
            dummy_plan = {
                "version": 1,
                "source": {"path": "assets/sample.mp4", "duration": 30.0},
                "output": {"width": 1080, "height": 1920, "fps": 30.0},
                "keep": [{"id": "k1", "start": 0.0, "end": 30.0}],
            }
            director = DirectorEngine(EditPlanManager(dummy_plan))
            active_directors[mid] = director

        if req.action == "propose":
            patch = director.propose_conversational_patch(req.instruction or "tighten pacing")
            return {"ok": True, "patch": patch.to_dict()}
        elif req.action == "apply":
            if not req.patch_id:
                raise HTTPException(400, "patch_id required for apply")
            return director.apply_patch(req.patch_id)
        elif req.action == "reject":
            if not req.patch_id:
                raise HTTPException(400, "patch_id required for reject")
            return director.reject_patch(req.patch_id)
        else:
            raise HTTPException(400, f"Unknown action: {req.action}")

    @app.get("/api/editor/qa/inspect")
    def get_qa_inspect(video_path: Optional[str] = None, render_id: Optional[str] = None):
        vpath = None
        if video_path:
            vpath = resolve_media(video_path)
        elif render_id:
            vpath = renders_dir / f"{render_id}.mp4"
        else:
            # Check latest render in runtime/renders
            renders = list(renders_dir.glob("*.mp4"))
            if renders:
                vpath = sorted(renders, key=lambda f: f.stat().st_mtime, reverse=True)[0]
        
        if not vpath or not vpath.is_file():
            raise HTTPException(404, "No rendered video found to inspect. Run a render first, or provide video_path or render_id.")
        
        rep = inspect_rendered_mp4(str(vpath))
        return {"ok": True, "report": rep.to_dict()}

    @app.get("/api/editor/styles/dna")
    def get_styles_dna():
        return {
            "ok": True,
            "styles": {k: v.to_dict() for k, v in STYLE_PRESETS.items()},
        }

    @app.get("/api/editor/versions")
    def get_video_versions(storyboard_id: Optional[str] = None, video_path: Optional[str] = None):
        target_sb = None
        if storyboard_id:
            target_sb = store.get("storyboards", storyboard_id)
            if not target_sb:
                raise HTTPException(404, f"Storyboard '{storyboard_id}' not found")
        elif not video_path:
            all_sbs = store.all("storyboards")
            valid_sbs = [s for s in all_sbs if s.get("plan") and s.get("status") in ("ready", "approved", "rendered")]
            if valid_sbs:
                target_sb = sorted(valid_sbs, key=lambda s: s.get("created_at") or "", reverse=True)[0]

        if target_sb:
            base_plan = target_sb.get("plan")
            if not base_plan or not base_plan.get("source"):
                raise HTTPException(400, "Storyboard has no valid EditPlan source")

            sb_wdir = ROOT / "work" / target_sb["id"]
            index_files = list(sb_wdir.glob("index_*.json")) if sb_wdir.exists() else []
            footage_index = None
            if index_files:
                try:
                    footage_index = json.loads(index_files[0].read_text(encoding="utf-8"))
                except Exception:
                    footage_index = None

            if not footage_index or not footage_index.get("scenes"):
                card_scenes = (target_sb.get("storyboard") or {}).get("scenes", [])
                parsed_scenes = []
                for idx, cs in enumerate(card_scenes):
                    s_range = cs.get("source_range", "")
                    s_start = 0.0
                    s_end = 5.0
                    if "-" in s_range:
                        try:
                            parts = s_range.replace("s", "").split("-")
                            s_start = float(parts[0].strip())
                            s_end = float(parts[1].strip())
                        except Exception:
                            pass
                    parsed_scenes.append({
                        "scene_id": f"sc_{idx+1}",
                        "start": s_start,
                        "end": s_end,
                        "transcript": cs.get("caption", ""),
                    })
                if not parsed_scenes:
                    for idx, k in enumerate(base_plan.get("keep", [])):
                        parsed_scenes.append({
                            "scene_id": f"sc_{idx+1}",
                            "start": float(k.get("start", 0.0)),
                            "end": float(k.get("end", 5.0)),
                            "transcript": "",
                        })
                if not parsed_scenes:
                    src_dur = float(base_plan.get("source", {}).get("duration", 30.0))
                    parsed_scenes.append({"scene_id": "sc_01", "start": 0.0, "end": src_dur, "transcript": ""})
                footage_index = {"scenes": parsed_scenes}

            versions = generate_multi_versions(base_plan, footage_index)
            return {"ok": True, "versions": [v.to_dict() for v in versions]}

        if video_path:
            vpath = resolve_media(video_path)
            if not vpath.is_file():
                raise HTTPException(404, f"Video not found: {video_path}")
            mid = vpath.stem
            idx = footage_indices.get(mid)
            if not idx:
                idx_path = work_dir / f"index_{mid}" / "index.json"
                if idx_path.is_file():
                    idx = json.loads(idx_path.read_text(encoding="utf-8"))
            if not idx:
                raise HTTPException(400, f"Footage '{video_path}' has not been indexed yet. Call /api/editor/media/index first.")
            from tools.edit.timeline import ffprobe_meta
            meta = ffprobe_meta(str(vpath))
            dur = meta.get("duration", 30.0) if meta else 30.0
            base_plan = {
                "version": 1,
                "source": {"path": str(vpath), "duration": dur, "width": 1080, "height": 1920, "fps": 30.0},
                "output": {"width": 1080, "height": 1920, "fps": 30.0},
                "keep": [{"id": "k1", "start": 0.0, "end": dur}],
            }
            versions = generate_multi_versions(base_plan, idx)
            return {"ok": True, "versions": [v.to_dict() for v in versions]}

        raise HTTPException(404, "No storyboard or indexed footage found. Generate a storyboard or index footage first.")

    @app.get("/api/editor/editing-memory")
    def get_editing_memory():
        return {
            "ok": True,
            "records": [r.to_dict() for r in memory_store.records],
            "recommendations": memory_store.generate_recommendations(),
            "total_records": len(memory_store.records),
        }

    @app.post("/api/editor/editing-memory/import")
    def post_editing_memory_import(req: MemoryImportReq):
        cnt = memory_store.import_from_csv(req.csv_data)
        return {"ok": True, "imported_count": cnt, "total_records": len(memory_store.records)}

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("EDITOR_PORT", 8793))
    log.info("Starting AI Video Editor Engine on http://127.0.0.1:%s", port)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
