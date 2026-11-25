"""Motion-graphics lane: a written prompt becomes a motion reel storyboard.

A prompt is composed into a motion_reel spec (studio/motion_reel.py), built into a HyperFrames project and
rendered once to an mp4. That mp4 becomes the `source` of an ordinary EditPlan, so the motion storyboard is an
ordinary storyboard record: the SAME approve endpoint, the SAME approval gate and the SAME render endpoint act on
it unchanged. There is no second approval flow and no second render endpoint here.

Every path comes from the arguments of register_motion_routes (store, work_dir, renders_dir, render_lock, roots)
so one app instance per user stays isolated; nothing here builds a path of its own or reads a directory from the
environment.

INVARIANT, read this before adding a route that edits a reel: a stored motion spec must never be mutated after
creation unless the mutating route re-runs check_media(spec, roots) on the new spec. motion_reel copies and runs
FFmpeg on whatever `src` a spec names, so check_media is the only thing standing between a client-supplied spec
and any readable file on the machine. A "revise this motion reel" endpoint that stores an edited spec without
that call silently disables the control. _run_motion_job re-checks at the point of use for the same reason.
"""
from __future__ import annotations

import logging
import re
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from pydantic import BaseModel, Field

from . import analytics, motion_reel
from .presets import probe_video_file

log = logging.getLogger("ai_editor_server.motion")

LANE = "motion"
STYLE_REF = "motion_graphics"
MOTION_FPS = 30.0
STOP = {"the", "a", "an", "and", "or", "of", "to", "for", "with", "your", "our", "it", "is", "are", "in", "on",
        "that", "this", "you", "we", "they", "be", "by", "at", "as", "from", "into", "no", "not"}


# ------------------------------------------------------------------ text helpers
def clean(text: str) -> str:
    """On-screen text: no em dashes (motion_reel refuses them), no stray accent markers, no runaway whitespace."""
    return re.sub(r"\s+", " ", str(text or "").replace("—", ",").replace("–", ",").replace("*", "")).strip()


def sentences(prompt: str) -> List[str]:
    parts = [clean(p) for p in re.split(r"(?<=[.!?])\s+|\n+|;", prompt or "")]
    return [t for t in (p.strip(" .,:;!?") for p in parts) if t]


def _lines(text: str, per: int = 3, maximum: int = 3) -> List[str]:
    """Split a hook into at most `maximum` lines of about `per` words, accenting the last line."""
    words = text.split(" ")[: per * maximum]
    out = [" ".join(words[i:i + per]) for i in range(0, len(words), per)] or ["Watch this"]
    out[-1] = "*" + out[-1] + "*"
    return out


def _short(text: str, words: int = 4) -> str:
    return " ".join(text.split(" ")[:words]).rstrip(",.")


STAT = re.compile(r"(\d[\d.,]*\s*(?:%|x|hrs?|hours?|mins?|minutes?|days?|k|m|\+)?)", re.I)


def _stat(sentence: str) -> Optional[Dict[str, str]]:
    m = STAT.search(sentence)
    if not m or not re.search(r"\d", m.group(1)):
        return None
    label = clean(sentence.replace(m.group(1), " ")).strip(" ,.")
    return {"value": clean(m.group(1)), "label": _short(label, 6) or "result"} if label else None


# ------------------------------------------------------------------ prompt -> spec
def compose_spec(prompt: str, title: str = "", button: str = "", url: str = "", brand: Optional[dict] = None,
                 music: Optional[str] = None, tagline: str = "") -> dict:
    """Turn a written brief into a motion_reel spec. Deterministic: no model call, so the lane works offline."""
    sents = sentences(prompt)
    if not sents:
        raise motion_reel.ReelError("write a prompt: the first line becomes the hook on screen")
    hook, rest = sents[0], sents[1:]
    if not rest and "," in hook:
        hook, rest = clean(hook.split(",")[0]), [clean(x) for x in hook.split(",")[1:]]
    stats = [s for s in (_stat(x) for x in rest) if s][:4]
    used = {s["value"] for s in stats}
    bullets: List[str] = []
    for line in rest:  # a comma list ("cutting, captions, sound") is a list of beats, not one beat
        if any(v in line for v in used):
            continue
        for part in (line.split(",") if "," in line else [line]):
            part = _short(clean(part), 3)
            if part:
                bullets.append(part)
    bullets = bullets[:5]

    scenes: List[Dict[str, Any]] = [{"kind": "headline", "theme": "dark", "duration": 3.5, "lines": _lines(hook)}]
    if title:
        scenes[0]["sub"] = clean(title)
    if len(bullets) >= 2:
        scenes.append({"kind": "pills", "theme": "light", "duration": 4.5, "title": clean(title) or "*Everything* in one pass",
                       "items": bullets, "typed": clean(tagline) or "One prompt. Done."})
    else:
        scenes.append({"kind": "orb", "theme": "light", "duration": 4.0, "lines": ["*" + (_short(rest[0], 4) if rest else "Built for you") + "*"],
                       "sub": clean(title) or (clean(rest[0]) if rest else "")})
    if stats:
        scenes.append({"kind": "stats", "theme": "dark", "duration": 4.5, "title": "Real *results*", "items": stats,
                       "sub": clean(title)})
    scenes.append({"kind": "cta", "theme": "light" if len(scenes) % 2 else "dark", "duration": 5.0,
                   "lines": _lines(clean(tagline) or clean(title) or "Start today", per=3, maximum=2),
                   "button": clean(button) or "Learn more", "url": clean(url) or clean(title) or "Get in touch"})
    spec: Dict[str, Any] = {"name": clean(title) or _short(hook, 6), "scenes": scenes, "sfx": []}
    if brand:
        spec["brand"] = brand
    if music:
        spec["music"] = {"style": clean(music)}
    motion_reel.validate(spec)
    return spec


# ------------------------------------------------------------------ media containment
# motion_reel._resolve / _cut_clips take a `src` straight from the spec, check only that the file exists, and then
# copy it into the project (photos) or run FFmpeg on it (clips). The photos copy keeps the ORIGINAL extension
# (`img_0_0{src.suffix}`), so without a check a spec could land a byte-identical copy of any readable file inside
# the caller's own project directory, whether or not the render then succeeds. Every `src` in a spec is therefore
# checked here, against the per-tenant roots handed to register_motion_routes, before motion_reel sees the spec:
# the file must resolve INSIDE one of those roots and carry an extension this lane actually renders.
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".mkv", ".webm"}
MEDIA_EXT = IMAGE_EXT | VIDEO_EXT


def _srcs(node: Any, allowed: set, out: List[tuple]) -> None:
    """Collect every (src, allowed extensions) in the spec. A photos scene may only name an image, a clips scene
    only a video; a `src` anywhere else is still checked, against both sets."""
    if isinstance(node, dict):
        here = IMAGE_EXT if node.get("kind") == "photos" else VIDEO_EXT if node.get("kind") == "clips" else allowed
        for k, v in node.items():
            if k == "src":
                out.append((v, here))
            else:
                _srcs(v, here, out)
    elif isinstance(node, list):
        for v in node:
            _srcs(v, allowed, out)


def check_media(spec: dict, roots: List[Path]) -> None:
    """Refuse any image/clip that is not a renderable file inside one of this tenant's media roots. Raises ReelError."""
    resolved = [Path(r).resolve() for r in (roots or [])]
    found: List[tuple] = []
    _srcs(spec, MEDIA_EXT, found)
    for value, allowed in found:
        if not isinstance(value, str) or not value.strip():
            raise motion_reel.ReelError("a scene media `src` must be a file path")
        p = Path(value).expanduser()
        try:
            rp = p.resolve()  # resolve first: `..`, a junction or a short name must not be able to walk out of a root
        except OSError:
            raise motion_reel.ReelError(f"media file not found: {value}")
        if not rp.is_file():
            raise motion_reel.ReelError(f"media file not found: {value}")
        if rp.suffix.lower() not in allowed:
            raise motion_reel.ReelError(f"unsupported media type '{rp.suffix}' for {p.name}; "
                                        f"this scene renders {', '.join(sorted(allowed))}")
        if not any(rp == r or r in rp.parents for r in resolved):
            raise motion_reel.ReelError("that file is outside your media folders (uploads, raw footage): " + p.name)


# ------------------------------------------------------------------ storyboard card
def _scene_text(s: dict) -> str:
    bits: List[str] = []
    for k in ("lines", "items", "words", "steps"):
        for v in s.get(k) or []:
            bits.append(clean(v.get("value", "") + " " + v.get("label", "")) if isinstance(v, dict) else clean(v))
    for k in ("title", "sub", "typed", "button", "url", "card_title", "input"):
        if s.get(k):
            bits.append(clean(s[k]))
    return " | ".join(b for b in bits if b)


def card_from_spec(spec: dict, prompt: str) -> dict:
    """A reviewable storyboard card with the same shape the footage lane produces (title/duration/scenes/scorecard)."""
    scenes_in = spec["scenes"]
    total = round(sum(float(s["duration"]) for s in scenes_in), 2)
    scenes, t = [], 0.0
    for i, s in enumerate(scenes_in, 1):
        d = float(s["duration"])
        scenes.append({
            "scene_number": i,
            "type": "Hook (first 3 seconds)" if i == 1 else ("Closing beat" if i == len(scenes_in) else f"Beat {i}"),
            "timestamp_output": f"{t:.1f}s - {t + d:.1f}s ({d:.1f}s)", "source_range": "motion graphics (no footage)",
            "duration": round(d, 2), "action": f"{s['kind']} scene on a {s['theme']} background",
            "framing": "Vertical 9:16 motion graphics", "camera_motion": "Brand wipe on the cut",
            "caption": _scene_text(s) or "(no on-screen text)", "caption_style": STYLE_REF,
            "sfx": [{"name": c.get("name"), "at": round(t + float(c.get("at", 0)), 2), "volume_db": None} for c in (s.get("sfx") or [])],
        })
        t += d
    failed: List[str] = []
    warnings: List[str] = []
    if scenes_in[0]["kind"] not in ("headline", "pills", "kinetic"):
        failed.append("three_second_hook")
    if not any(s["kind"] == "cta" for s in scenes_in):
        warnings.append("sendability_signal")
    checks = [
        {"name": "three_second_hook", "status": "fail" if failed else "pass", "score": 0.0 if failed else 1.0,
         "detail": "The first scene carries the hook as bold text." if not failed else "The first scene is not a text hook."},
        {"name": "sendability_signal", "status": "warn" if warnings else "pass", "score": 0.5 if warnings else 1.0,
         "detail": "A call to action closes the reel." if not warnings else "No call-to-action scene closes the reel."},
        {"name": "length", "status": "pass", "score": 1.0, "detail": f"{total:.1f}s, inside the 12 to 60 second band."},
    ]
    return {
        "title": (clean(spec.get("name")) or clean(prompt))[:90] or "Motion reel",
        "duration": {"original_seconds": total, "output_seconds": total, "removed_seconds": 0.0, "reduction_percent": 0.0},
        "scenes_count": len(scenes), "scenes": scenes,
        "sound_design": {"ducking_enabled": False, "target_lufs": None, "music": bool(spec.get("music")),
                         "sfx_count": len(spec.get("sfx") or []),
                         "sfx": [{"name": c.get("name"), "at": c.get("at"), "id": None} for c in (spec.get("sfx") or [])]},
        "growth_signals": {"three_second_hook": {"status": checks[0]["status"], "detail": checks[0]["detail"], "score": checks[0]["score"]},
                           "sendability": {"status": checks[1]["status"], "detail": checks[1]["detail"], "score": checks[1]["score"]}},
        "scorecard": {"available": True, "reason": None, "status": "FAIL" if failed else ("WARN" if warnings else "PASS"),
                      "score": round(sum(c["score"] for c in checks) / len(checks), 3),
                      "failed_checks": failed, "warnings": warnings, "checks": checks},
    }


# ------------------------------------------------------------------ build + render
def render_motion_project(project_dir: Path, out_mp4: Path, fps: float = MOTION_FPS, quality: str = "looks") -> None:
    """Render the HyperFrames project to an mp4. Patched out in tests; needs Chrome + the hyperframes CLI."""
    from services.render.render import hyperframes_render
    hyperframes_render(Path(project_dir), Path(out_mp4), quality, fps)


def plan_for_motion(mp4: Path, prompt: str, spec: dict) -> dict:
    """An ordinary EditPlan whose source is the rendered motion mp4, so the existing render path handles it."""
    info = probe_video_file(Path(mp4))
    return {
        "version": 1, "source": {"path": str(Path(mp4)), **info},
        "output": {"width": info["width"], "height": info["height"], "fps": info["fps"]},
        "keep": [{"id": "k1", "start": 0.0, "end": info["duration"]}],
        "captions": [], "reframe": {"mode": "center", "track": []}, "zooms": [], "transitions": [], "overlays": [],
        "style_ref": STYLE_REF, "notes": f"Prompt: {clean(prompt)}\nMotion reel: {len(spec['scenes'])} scenes",
    }


# ------------------------------------------------------------------ request models
class MotionReelRequest(BaseModel):
    prompt: str = Field(..., min_length=3)
    title: Optional[str] = ""
    button: Optional[str] = ""
    url: Optional[str] = ""
    tagline: Optional[str] = ""
    music: Optional[str] = None
    brand: Optional[Dict[str, str]] = None
    spec: Optional[Dict[str, Any]] = None


# ------------------------------------------------------------------ routes
def register_motion_routes(app, store, work_dir, renders_dir, render_lock, roots) -> None:
    """Mount the motion-graphics lane. Call at the END of create_app; everything is read from these arguments.

    `roots` is this tenant's allowed media roots (the list safe_video_path validates against): every image or clip
    named in a spec must resolve inside one of them. Nothing here falls back to the module-level media_roots()."""
    if getattr(app.state, "motion_routes", False):
        return
    app.state.motion_routes = True
    work_dir, renders_dir = Path(work_dir), Path(renders_dir)

    def public(sb: dict) -> dict:
        out = {k: v for k, v in sb.items() if k != "plan"}
        out["stage"] = analytics.stage_of(sb)
        return out

    def _run_motion_job(sb_id: str, spec: dict, prompt: str) -> None:
        sb = store.snapshot("storyboards", sb_id)
        if sb is None:
            return
        work = Path(sb["workdir"])
        try:
            project = work / "motion"
            check_media(spec, roots)  # again at the point of use: the file is read HERE, whatever route stored it
            motion_reel.build(spec, project)
            mp4 = work / "motion.mp4"
            with render_lock:  # the browser render is heavy: one at a time, like the footage lane
                render_motion_project(project, mp4)
            if not mp4.is_file():
                raise motion_reel.ReelError(f"the motion render produced no file: {mp4}")
            plan = plan_for_motion(mp4, prompt, spec)
            card = card_from_spec(spec, prompt)
            store.update("storyboards", sb_id, lambda r: r.update(
                status="ready", error=None, plan=plan, storyboard=card, motion={"spec": spec, "project": str(project)},
                agent_reply=f"Built a {card['duration']['output_seconds']:.1f}s motion reel in {card['scenes_count']} scenes. "
                            "Approve it to allow the final render."))
            store.log("storyboard", f"Built motion reel “{card['title']}”", id=sb_id,
                      output_seconds=card["duration"]["output_seconds"])
        except Exception as e:
            log.exception("[%s] motion job failed", sb_id)
            msg = str(e) if isinstance(e, motion_reel.ReelError) else f"{type(e).__name__}: {e}"
            store.update("storyboards", sb_id, lambda r: r.update(status="failed", error=msg[:600]))
            store.log("storyboard", f"Motion reel failed: {msg[:200]}", id=sb_id)

    @app.post("/api/editor/motion/reel", status_code=202)
    def create_motion_reel(req: MotionReelRequest):
        """Prompt in, motion storyboard out. Approve and render it with the ordinary storyboard endpoints."""
        try:
            spec = req.spec if req.spec else compose_spec(req.prompt, req.title or "", req.button or "", req.url or "",
                                                          req.brand, req.music, req.tagline or "")
            if req.spec:
                motion_reel.validate(spec)
            check_media(spec, roots)
        except motion_reel.ReelError as e:
            raise HTTPException(400, str(e))
        sb_id = store.new_id("sb")
        work = work_dir / sb_id
        work.mkdir(parents=True, exist_ok=True)
        card = card_from_spec(spec, req.prompt)
        sb = {"id": sb_id, "status": "processing", "error": None, "lane": LANE, "video_path": None, "style": STYLE_REF,
              "prompt": clean(req.prompt), "series": None,
              "plan": {"version": 1, "source": {}, "keep": [], "notes": f"Prompt: {clean(req.prompt)}"},
              "storyboard": None, "workdir": str(work), "agent_reply": "", "events": [], "messages": [],
              "approved": False, "approved_at": None, "latest_render": None, "latest_preview": None,
              "renders": [], "render_job": None, "motion": {"spec": spec, "preview_card": card}}
        store.put("storyboards", sb_id, sb)
        store.log("storyboard", f"Motion reel started “{card['title']}”", id=sb_id)
        threading.Thread(target=_run_motion_job, args=(sb_id, spec, req.prompt), daemon=True, name=f"motion-{sb_id}").start()
        return {"ok": True, "storyboard_id": sb_id, "data": public(sb)}

    @app.post("/api/editor/motion/preview")
    def preview_motion_spec(req: MotionReelRequest):
        """What the prompt would become, without building anything: the scene cards and the spec."""
        try:
            spec = req.spec or compose_spec(req.prompt, req.title or "", req.button or "", req.url or "", req.brand,
                                            req.music, req.tagline or "")
            motion_reel.validate(spec)
            check_media(spec, roots)
        except motion_reel.ReelError as e:
            raise HTTPException(400, str(e))
        return {"ok": True, "spec": spec, "storyboard": card_from_spec(spec, req.prompt)}

    @app.get("/api/editor/motion/reels")
    def list_motion_reels():
        items = [sb for sb in store.all("storyboards") if analytics.lane_of(sb) == LANE]
        return {"ok": True, "storyboards": [public(sb) for sb in sorted(items, key=lambda s: -(s.get("created_at") or 0))]}

    @app.get("/api/editor/motion/kinds")
    def motion_kinds():
        return {"ok": True, "kinds": list(motion_reel.KINDS)}
