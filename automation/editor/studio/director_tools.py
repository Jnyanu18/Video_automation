"""The creative director's hands: every tool it can call while building one job, bound to that job's folder.

A job folder (studio/agent_bridge.py) gets a `build/` project:
    build/video.html          the composition the director writes (givemotion: HTML in, MP4 out)
    build/media/clip01.mp4    the client's clips and files, staged so the page can use relative paths
    build/media/music.wav     the licensed track, cut on bar lines (prepare_music)
    build/sfx/<name>.wav      recorded effects it chose (sound_effects)
    build/looks/<n>/sheet.png contact sheets it looked at
    build/out/video.mp4       the render it delivers

Every path a tool accepts is resolved inside build/; nothing reads or writes outside the job folder except the
read-only skill files, the read-only sound library and the music catalogue.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Union

from studio import agent_bridge as ab
from studio import director_skills as skills
from studio import givemotion

ToolOutput = Union[str, List[dict]]

VIDEO_EXT = {".mp4", ".mov", ".m4v", ".webm", ".mkv"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
AUDIO_EXT = {".mp3", ".wav", ".m4a", ".aac"}
WRITABLE_EXT = {".html", ".css", ".js", ".json", ".md", ".svg", ".txt"}
MAX_FILE_BYTES = 600_000
MAX_LOOKS = 10
MAX_RENDERS = 3
MAX_FRAMES_PER_CALL = 8
FRAME_WIDTH = 480
STAGES = {1: "reviewing", 2: "storyboard", 3: "cutting and music", 4: "motion and captions", 5: "rendering"}


class ToolError(ValueError):
    """A problem the director can fix (bad path, missing file, failed check). Returned to it as an error result."""


# ------------------------------------------------------------------ helpers
def _run(cmd: List[str], timeout: int = 600) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=False)
    except subprocess.TimeoutExpired as exc:
        raise ToolError(f"{Path(cmd[0]).name} timed out after {timeout}s") from exc
    except OSError as exc:
        raise ToolError(f"could not start {cmd[0]}: {exc}") from exc


def probe(path: Path) -> Dict[str, Any]:
    """Duration, size, fps and audio presence of a media file (ffprobe)."""
    proc = _run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration",
                 "-of", "json", str(path)], timeout=60)
    try:
        d = json.loads(proc.stdout or "{}")
    except ValueError:
        d = {}
    streams = d.get("streams") or []
    video = next((s for s in streams if s.get("codec_type") == "video"), {})
    fps = None
    if video.get("r_frame_rate") and "/" in video["r_frame_rate"]:
        n, _, den = video["r_frame_rate"].partition("/")
        try:
            fps = round(float(n) / float(den), 3) if float(den) else None
        except ValueError:
            fps = None
    dur = (d.get("format") or {}).get("duration")
    return {"duration_s": round(float(dur), 2) if dur else None, "width": video.get("width"), "height": video.get("height"),
            "fps": fps, "has_audio": any(s.get("codec_type") == "audio" for s in streams)}


def image_block(path: Path) -> dict:
    from agent.review import image_block as _ib
    return _ib(str(path))


def _shrink(src: Path, dst: Path, long_edge: int = 1400) -> Path:
    """A JPEG copy no longer than long_edge px, so a contact sheet stays small in the request."""
    proc = _run(["ffmpeg", "-hide_banner", "-y", "-v", "error", "-i", str(src), "-vf",
                 f"scale='if(gt(iw,ih),min({long_edge},iw),-2)':'if(gt(iw,ih),-2,min({long_edge},ih))'",
                 "-q:v", "4", str(dst)], timeout=60)
    return dst if proc.returncode == 0 and dst.is_file() else src


# ------------------------------------------------------------------ the job context
@dataclass
class JobContext:
    job: dict
    job_dir: Path
    build: Path
    media: List[Dict[str, Any]] = field(default_factory=list)
    finished: Optional[Dict[str, Any]] = None
    looks: int = 0
    renders: int = 0
    rendered: Optional[Path] = None
    words: Dict[str, List[dict]] = field(default_factory=dict)  # staged clip name -> word list (source times)
    music: Optional[Dict[str, Any]] = None
    notes: List[str] = field(default_factory=list)

    @property
    def id(self) -> str:
        return self.job["id"]

    @property
    def composition(self) -> Path:
        return self.build / "video.html"

    def inside(self, rel: str) -> Path:
        rel = (rel or "").strip().replace("\\", "/").lstrip("/")
        if not rel or ".." in Path(rel).parts:
            raise ToolError(f"use a path inside the project, like video.html or media/clip01.mp4 (got {rel!r})")
        p = (self.build / rel).resolve()
        if self.build.resolve() not in p.parents:
            raise ToolError(f"path is outside the project: {rel}")
        return p

    def media_file(self, name: str) -> Path:
        p = self.inside(name)
        if not p.is_file():
            names = ", ".join(m["name"] for m in self.media) or "none"
            raise ToolError(f"no such media file: {name}. Staged files: {names}")
        return p


def _stage(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        return
    try:
        os.link(src, dst)  # same volume: instant, no extra disk
    except OSError:
        shutil.copy2(src, dst)


def prepare_context(job: dict) -> JobContext:
    """Create build/, copy a revision's parent project in, and stage every client file under media/."""
    job_dir = ab.job_dir(job["id"])
    build = job_dir / "build"
    parent = job.get("parent")
    if parent and not build.exists():
        parent_build = ab.job_dir(parent) / "build"
        if parent_build.is_dir():
            shutil.copytree(parent_build, build, ignore=shutil.ignore_patterns("out", "looks", "snapshots", "*.pre.wav"))
    (build / "media").mkdir(parents=True, exist_ok=True)
    ctx = JobContext(job=job, job_dir=job_dir, build=build)

    counters = {"clip": 0, "image": 0, "audio": 0, "file": 0}
    for src in [*(job.get("clips") or []), *(job.get("assets") or [])]:
        p = Path(src)
        if not p.is_file():
            ctx.notes.append(f"missing client file skipped: {p.name}")
            continue
        ext = p.suffix.lower()
        kind = "clip" if ext in VIDEO_EXT else "image" if ext in IMAGE_EXT else "audio" if ext in AUDIO_EXT else "file"
        counters[kind] += 1
        name = f"media/{kind}{counters[kind]:02d}{ext}"
        _stage(p, build / name)
        entry: Dict[str, Any] = {"name": name, "kind": kind, "original_name": p.name}
        if kind in ("clip", "audio"):
            entry.update(probe(build / name))
        ctx.media.append(entry)
    if job.get("audio_path") and Path(job["audio_path"]).is_file():
        ap = Path(job["audio_path"])
        name = f"media/client_music{ap.suffix.lower()}"
        _stage(ap, build / name)
        ctx.media.append({"name": name, "kind": "client_music", "original_name": ap.name, **probe(build / name)})
    if job.get("reference_video_path") and Path(job["reference_video_path"]).is_file():
        rp = Path(job["reference_video_path"])
        name = f"media/reference{rp.suffix.lower()}"
        _stage(rp, build / name)
        ctx.media.append({"name": name, "kind": "reference", "original_name": rp.name, **probe(build / name)})
    return ctx


# ------------------------------------------------------------------ tools: knowledge
def t_list_skills(ctx: JobContext, **_) -> ToolOutput:
    return "Skill files you can read with read_skill (path: purpose):\n" + skills.index_text()


def t_read_skill(ctx: JobContext, path: str, **_) -> ToolOutput:
    try:
        return skills.read(path)
    except skills.SkillError as exc:
        raise ToolError(str(exc)) from exc


def t_brand_kit(ctx: JobContext, **_) -> ToolOutput:
    from studio import givemotion_job
    try:
        kit = givemotion_job.kit_for_job(ctx.id)
    except givemotion_job.JobError as exc:
        kit = {"ok": True, "has_kit": False, "note": f"No brand kit could be read ({exc}). Derive colours and type from the brief."}
    if kit.get("logo_file"):
        logo = Path(kit["logo_file"])
        name = f"media/logo{logo.suffix.lower()}"
        _stage(logo, ctx.build / name)
        kit["logo_file"] = name
    return json.dumps(kit, ensure_ascii=False, indent=1)


# ------------------------------------------------------------------ tools: looking at the client's media
def t_view_frames(ctx: JobContext, name: str, times: Optional[List[float]] = None, count: int = 6, **_) -> ToolOutput:
    src = ctx.media_file(name)
    info = probe(src)
    dur = info.get("duration_s") or 0
    if src.suffix.lower() in IMAGE_EXT:
        return [{"type": "text", "text": f"{name}: still image"}, image_block(_shrink(src, ctx.build / "looks" / f"{src.stem}.jpg", 900))]
    if not times:
        n = max(1, min(int(count or 6), MAX_FRAMES_PER_CALL))
        times = [round(dur * (i + 0.5) / n, 2) for i in range(n)] if dur else [0.0]
    times = [max(0.0, min(float(t), max(0.0, dur - 0.05))) for t in times][:MAX_FRAMES_PER_CALL]
    out_dir = ctx.build / "looks" / "frames"
    out_dir.mkdir(parents=True, exist_ok=True)
    blocks: List[dict] = [{"type": "text", "text": f"{name} ({dur}s, {info.get('width')}x{info.get('height')}):"}]
    for t in times:
        f = out_dir / f"{src.stem}_{t:07.2f}.jpg"
        proc = _run(["ffmpeg", "-hide_banner", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", str(src), "-frames:v", "1",
                     "-vf", f"scale={FRAME_WIDTH}:-2", "-q:v", "5", str(f)], timeout=60)
        if proc.returncode == 0 and f.is_file():
            blocks.append({"type": "text", "text": f"t={t:.2f}s"})
            blocks.append(image_block(f))
    return blocks


_whisper_model = None


def _whisper():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        _whisper_model = WhisperModel(os.environ.get("DIRECTOR_WHISPER_MODEL", "base"), compute_type="int8")
    return _whisper_model


def t_transcribe(ctx: JobContext, name: str, **_) -> ToolOutput:
    src = ctx.media_file(name)
    if not probe(src).get("has_audio"):
        return f"{name} has no audio track, so there is nothing to transcribe."
    segments, info = _whisper().transcribe(str(src), word_timestamps=True, vad_filter=True)
    words, lines = [], []
    for seg in segments:
        for w in seg.words or []:
            words.append({"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)})
        lines.append(f"[{seg.start:6.2f}-{seg.end:6.2f}] {seg.text.strip()}")
    ctx.words[name] = words
    out = ctx.inside(f"media/{Path(name).stem}.words.json")
    out.write_text(json.dumps(words, ensure_ascii=False), encoding="utf-8")
    text = "\n".join(lines) or "(no speech found)"
    if len(text) > 12_000:
        text = text[:12_000] + "\n[transcript truncated]"
    return (f"Transcript of {name} (language {getattr(info, 'language', '?')}), source times in seconds. "
            f"Word timings saved to {out.relative_to(ctx.build).as_posix()} (times are the SOURCE clip's; use make_captions for "
            f"an edited timeline).\n{text}")


def t_make_captions(ctx: JobContext, segments: List[dict], **_) -> ToolOutput:
    """Captions for the edited timeline: words from each placed clip segment, moved to where that segment plays."""
    out_words: List[dict] = []
    for seg in segments or []:
        name = str(seg.get("name", ""))
        if name not in ctx.words:
            raise ToolError(f"transcribe {name} first")
        src_from, dur, at = float(seg.get("from", 0)), float(seg.get("duration", 0)), float(seg.get("at", 0))
        for w in ctx.words[name]:
            if w["start"] >= src_from and w["end"] <= src_from + dur + 0.05:
                out_words.append({"word": w["word"], "start": round(at + w["start"] - src_from, 3),
                                  "end": round(at + w["end"] - src_from, 3)})
    out_words.sort(key=lambda w: w["start"])
    path = ctx.inside("captions.json")
    path.write_text(json.dumps(out_words, ensure_ascii=False), encoding="utf-8")
    return (f"Wrote captions.json with {len(out_words)} words on the edited timeline (times relative to the video start). "
            f"Use it with <gm-include src=\"blocks/captions.html\" file=\"captions.json\"></gm-include> after "
            f"`add_block captions`, or as <html data-words=\"captions.json\"> to time cuts to words.")


def t_add_block(ctx: JobContext, block: str, **_) -> ToolOutput:
    if not re.fullmatch(r"[a-z0-9-]{2,40}", block or ""):
        raise ToolError("block names are lowercase words, like captions or code-window")
    proc = _run([*givemotion.cli(), "add", block, "--dir", str(ctx.build / "blocks")], timeout=120)
    if proc.returncode:
        listing = _run([*givemotion.cli(), "blocks"], timeout=60).stdout[-3000:]
        raise ToolError(f"could not add block {block}: {(proc.stderr or proc.stdout)[-400:]}\nAvailable:\n{listing}")
    return f"Added blocks/{block}.html to the project. {proc.stdout.strip()[-600:]}"


# ------------------------------------------------------------------ tools: sound
def t_find_music(ctx: JobContext, moods: List[str], energy: float = 0.6, shots: Optional[int] = None,
                 voiceover: bool = False, strong_hook: bool = True, **_) -> ToolOutput:
    from soundtrack import catalog
    from soundtrack.brief import Brief
    from soundtrack.match import shortlist
    tracks = [t for t in catalog.load() if t.analysis]
    if not tracks:
        raise ToolError("the music library is empty on this server (run `python -m soundtrack setup`)")
    duration = float(ctx.job.get("duration") or 30)
    brief = Brief(duration_s=duration, shots=int(shots or max(3, round(duration / 2.5))), voiceover=bool(voiceover),
                  moods=[str(m).lower() for m in moods or []], energy=float(energy), strong_hook=bool(strong_hook))
    sl = shortlist(tracks, brief, n=6)
    rows = [{k: c[k] for k in ("id", "score", "tags", "bpm", "mean_energy", "drop_bar", "duration_s", "reasons")}
            for c in sl["candidates"][:8]]
    return json.dumps({"target_bpm": round(brief.target_bpm), "candidates": rows,
                       "rejected": len(sl["rejected"]),
                       "note": "Scores are measurements, not taste. Pick by the brief; then prepare_music with the id."},
                      ensure_ascii=False, indent=1)


def t_prepare_music(ctx: JobContext, track: str, start_bar: int = 0, **_) -> ToolOutput:
    from soundtrack import catalog, mixkit
    from soundtrack.brief import Brief
    from soundtrack.checks import check_cut
    from soundtrack.cut import plan_cut, render_cut
    found = next((t for t in catalog.load() if t.key == track and t.analysis), None)
    if found is None:
        raise ToolError(f"unknown track {track!r}; use an id from find_music")
    if not found.path.is_file() and not mixkit.download(found):
        raise ToolError(f"could not download {track}; pick another")
    duration = float(ctx.job.get("duration") or 30)
    plan = plan_cut(found, Brief(duration_s=duration, shots=max(3, round(duration / 2.5))), start_bar=int(start_bar or 0))
    out = render_cut(found, plan, ctx.build / "media" / "music.wav")
    report = check_cut(out, plan["bar_len_s"], source=found.path, start_s=plan["start_s"])
    grid = _run([*givemotion.cli(), "audio", str(out), "--json"], timeout=180)
    try:
        g = json.loads(grid.stdout or "{}")
    except ValueError:
        g = {}
    drop = found.analysis.get("drop_bar")
    drop_at = round((drop - plan["start_bar"]) * plan["bar_len_s"], 2) if drop is not None and drop >= plan["start_bar"] else None
    if drop_at is not None and drop_at >= duration:
        drop_at = None  # the drop falls after the film ends; a later start_bar would bring it in
    ctx.music = {"track": track, "license": found.license, "plan": plan, "checks": report}
    attrs = ""
    if g.get("bpm"):
        bar_offset = (g.get("downbeats") or [g.get("firstBeat", 0)])[0]
        attrs = f'<html data-bpm="{g["bpm"]}" data-beat-offset="{g.get("firstBeat", 0)}" data-bar-offset="{bar_offset}">'
    return json.dumps({
        "file": "media/music.wav", "length_s": plan["length_s"], "bars": plan["bars"], "bar_len_s": plan["bar_len_s"],
        "bpm": g.get("bpm") or found.analysis["bpm"], "beat_s": g.get("beatSeconds"),
        "html_attributes": attrs, "downbeats": (g.get("downbeats") or [])[:24], "biggest_hits": g.get("biggestHits"),
        "quiet_gaps": g.get("quietGaps"),
        "drop_at_s": drop_at,
        "drop_bar_in_track": drop,
        "length_note": (f"The cut is {plan['length_s']}s (whole bars) for a {duration:g}s film: it fades out where the "
                        f"film ends. To start on the drop instead, call prepare_music again with start_bar={drop}."
                        if drop is not None else f"The cut is {plan['length_s']}s (whole bars) for a {duration:g}s film."),
        "gates": {"ok": report["ok"], "lufs": report["lufs"], "true_peak_dbtp": report["true_peak_dbtp"], "failures": report["failures"]},
        "use": '<audio id="music" src="media/music.wav" data-volume="0.9" data-fade-out="1.5"></audio> (lower to 0.3 with '
               'data-duck under a voice). It is already cut to whole bars and normalised to -14 LUFS.',
    }, ensure_ascii=False, indent=1)


def t_sound_effects(ctx: JobContext, names: Optional[List[str]] = None, **_) -> ToolOutput:
    from tools.audio.sfx import sfx_dir
    lib = sfx_dir()
    available = sorted(p.stem for p in lib.glob("*.wav"))
    if not names:
        return "Recorded effects (CC0): " + ", ".join(available) + ". Call again with names to add them to the project."
    added = []
    for n in names:
        if n not in available:
            raise ToolError(f"no effect named {n!r}; choose from: {', '.join(available)}")
        _stage(lib / f"{n}.wav", ctx.build / "sfx" / f"{n}.wav")
        added.append(f"sfx/{n}.wav")
    return "Added: " + ", ".join(added) + '. Use <audio src="sfx/NAME.wav" data-start="T" data-volume="0.5"></audio>.'


# ------------------------------------------------------------------ tools: the composition
def t_write_file(ctx: JobContext, path: str, content: str, append: bool = False, **_) -> ToolOutput:
    p = ctx.inside(path)
    if p.suffix.lower() not in WRITABLE_EXT:
        raise ToolError(f"you can write {', '.join(sorted(WRITABLE_EXT))} files")
    if p.parts and "media" in p.relative_to(ctx.build.resolve()).parts[:1]:
        raise ToolError("media/ holds the client's files; write your own files elsewhere")
    data = (p.read_text(encoding="utf-8") if append and p.is_file() else "") + (content or "")
    if len(data.encode("utf-8")) > MAX_FILE_BYTES:
        raise ToolError(f"file would exceed {MAX_FILE_BYTES // 1000} KB")
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(data, encoding="utf-8")
    return f"Wrote {p.relative_to(ctx.build.resolve()).as_posix()} ({len(data)} chars)."


def t_read_file(ctx: JobContext, path: str, **_) -> ToolOutput:
    p = ctx.inside(path)
    if not p.is_file():
        raise ToolError(f"no such file: {path}")
    if p.suffix.lower() not in WRITABLE_EXT:
        raise ToolError("only text files can be read; use view_frames for media")
    text = p.read_text(encoding="utf-8")
    return text if len(text) < 80_000 else text[:80_000] + "\n[truncated]"


def _summarise_check(result: Optional[dict], error: str) -> str:
    if not result:
        return f"check could not run: {error}"
    issues = result.get("issues") or []
    rows = []
    for i in issues[:30]:
        rows.append({k: i.get(k) for k in ("severity", "code", "time", "until", "selector", "text", "message", "fix") if i.get(k) is not None})
    return json.dumps({"ok": result.get("ok"), "errors": result.get("errors"), "warnings": result.get("warnings"),
                       "info": result.get("info"), "issues": rows,
                       "more": max(0, len(issues) - 30)}, ensure_ascii=False, indent=1)


def t_check(ctx: JobContext, at: Optional[float] = None, **_) -> ToolOutput:
    if not ctx.composition.is_file():
        raise ToolError("write video.html first")
    args = ["check", str(ctx.composition), "--json"]
    if at is not None:
        args += ["--at", str(float(at))]
    proc = _run([*givemotion.cli(), *args], timeout=600)
    try:
        result = json.loads(proc.stdout or "")
    except ValueError:
        result = None
    return _summarise_check(result, (proc.stderr or proc.stdout or "")[-1500:])


def t_look(ctx: JobContext, times: Optional[List[float]] = None, **_) -> ToolOutput:
    if not ctx.composition.is_file():
        raise ToolError("write video.html first")
    if ctx.looks >= MAX_LOOKS:
        raise ToolError(f"you have looked {MAX_LOOKS} times; fix what you saw, render and deliver")
    ctx.looks += 1
    out_dir = ctx.build / "looks" / f"{ctx.looks:02d}"
    args = ["snapshot", str(ctx.composition), "-o", str(out_dir), "--sheet-only", "--json"]
    if times:
        args += ["--times", ",".join(f"{float(t):.2f}" for t in times[:12])]
    proc = _run([*givemotion.cli(), *args], timeout=600)
    try:
        result = json.loads(proc.stdout or "{}")
    except ValueError:
        result = {}
    sheet = Path(result.get("sheet") or out_dir / "sheet.png")
    if proc.returncode or not sheet.is_file():
        raise ToolError(f"snapshot failed: {(proc.stderr or proc.stdout)[-1200:]}")
    small = _shrink(sheet, out_dir / "sheet.jpg")
    note = f"Contact sheet at {result.get('times')} s. Problems: {json.dumps(result.get('problems') or [])[:1500]}"
    return [{"type": "text", "text": note}, image_block(small)]


def t_render(ctx: JobContext, **_) -> ToolOutput:
    if not ctx.composition.is_file():
        raise ToolError("write video.html first")
    if ctx.renders >= MAX_RENDERS:
        raise ToolError(f"rendered {MAX_RENDERS} times already; deliver the last render")
    checked = givemotion.check_html(ctx.composition)
    if not checked["ok"]:
        raise ToolError("fix the check errors before rendering:\n" + _summarise_check(checked.get("result"), checked["error"]))
    ctx.renders += 1
    out = ctx.build / "out" / "video.mp4"
    rendered = givemotion.render_html(ctx.composition, out, timeout_s=int(os.environ.get("DIRECTOR_RENDER_TIMEOUT", "1800")))
    if not rendered["ok"]:
        raise ToolError("render failed: " + rendered["error"][-1500:])
    ctx.rendered = out
    info = probe(out)
    return json.dumps({"ok": True, "file": "out/video.mp4", **info,
                       "next": "look at it with view_frames('out/video.mp4') if unsure, then deliver"}, indent=1)


# ------------------------------------------------------------------ tools: talking to the client and finishing
def t_progress(ctx: JobContext, text: str, stage: Optional[int] = None, **_) -> ToolOutput:
    extra = {"stage": int(stage)} if stage in STAGES else {}
    ab.update_job(ctx.id, note=str(text)[:400], **extra)
    return "Shown to the client."


def _mix_client_music(video: Path, audio: Path) -> None:
    from scripts.agent_worker import mix_custom_audio  # the existing, tested mixer
    mix_custom_audio(video, audio)


def t_deliver(ctx: JobContext, note: str, scenes: Optional[List[dict]] = None, **_) -> ToolOutput:
    if not ctx.rendered or not ctx.rendered.is_file():
        raise ToolError("render the video before delivering it")
    dst = ctx.job_dir / "output.mp4"
    shutil.copyfile(ctx.rendered, dst)
    html = ctx.composition.read_text(encoding="utf-8") if ctx.composition.is_file() else ""
    if ctx.job.get("audio_path") and "client_music" not in html:  # the client's own track was not used in the page
        _mix_client_music(dst, Path(ctx.job["audio_path"]))
    if scenes:
        clean = [{k: s.get(k) for k in ("start", "end", "title", "action", "on_screen", "motion", "sfx") if s.get(k) is not None}
                 for s in scenes if isinstance(s, dict)]
        sb = {"scenes": clean}
        if ctx.music:
            sb["music"] = ctx.music["track"]
            sb["lufs"] = ctx.music["checks"].get("lufs")
        (ctx.job_dir / "storyboard.json").write_text(json.dumps(sb, indent=1, ensure_ascii=False), encoding="utf-8")
    info = probe(dst)
    info["size_mb"] = round(dst.stat().st_size / 1e6, 2)
    ab.update_job(ctx.id, status="done", finished_at=time.time(), output=info, stage=5,
                  note=str(note or f"Your film is ready: {info.get('duration_s')}s.")[:500])
    ctx.finished = {"status": "done", "output": info}
    return "Delivered. The client can watch and download it now. Stop here."


def t_fail(ctx: JobContext, reason: str, **_) -> ToolOutput:
    ab.update_job(ctx.id, status="failed", error=str(reason)[:500], note="Stopped: " + str(reason)[:400])
    ctx.finished = {"status": "failed", "reason": reason}
    return "Marked as failed. Stop here."


# ------------------------------------------------------------------ the tool table (schemas Claude sees)
def _schema(props: Dict[str, Any], required: List[str]) -> Dict[str, Any]:
    return {"type": "object", "properties": props, "required": required, "additionalProperties": False}


NUM_LIST = {"type": "array", "items": {"type": "number"}}
TOOLS: List[Dict[str, Any]] = [
    {"name": "list_skills", "description": "List every skill file (technique recipes, API reference, genre structures, director principles) with its purpose.",
     "input_schema": _schema({}, [])},
    {"name": "read_skill", "description": "Read one skill file by its path from list_skills (for example givemotion/references/techniques/kinetic-type.md). Read the 1-3 recipes this film needs before writing.",
     "input_schema": _schema({"path": {"type": "string"}}, ["path"])},
    {"name": "brand_kit", "description": "The client's saved brand kit: palette by role, heading font, CTAs, logo (staged under media/). Call once before designing.",
     "input_schema": _schema({}, [])},
    {"name": "view_frames", "description": "Look at a staged clip or image (or out/video.mp4 after a render). Give exact times in seconds, or a count of evenly spaced frames (max 8).",
     "input_schema": _schema({"name": {"type": "string"}, "times": NUM_LIST, "count": {"type": "integer"}}, ["name"])},
    {"name": "transcribe", "description": "Word-timed transcript of a staged clip's speech (source times). Needed before make_captions or quoting what someone says.",
     "input_schema": _schema({"name": {"type": "string"}}, ["name"])},
    {"name": "make_captions", "description": "Write captions.json for the EDITED timeline: one entry per placed segment {name, from (source in-point s), duration (s), at (video time s)}.",
     "input_schema": _schema({"segments": {"type": "array", "items": _schema({"name": {"type": "string"}, "from": {"type": "number"},
                                                                            "duration": {"type": "number"}, "at": {"type": "number"}},
                                                                           ["name", "from", "duration", "at"])}}, ["segments"])},
    {"name": "add_block", "description": "Copy a ready-made givemotion block (captions, code-window, cursor, browser-window, charts...) into blocks/.",
     "input_schema": _schema({"block": {"type": "string"}}, ["block"])},
    {"name": "find_music", "description": "Shortlist licensed, professionally produced tracks from the music library, measured against this film: tempo, energy, drop position, mood tags.",
     "input_schema": _schema({"moods": {"type": "array", "items": {"type": "string"}}, "energy": {"type": "number"},
                              "shots": {"type": "integer"}, "voiceover": {"type": "boolean"}, "strong_hook": {"type": "boolean"}}, ["moods"])},
    {"name": "prepare_music", "description": "Cut the chosen track to whole bars for this film's length, normalise it to -14 LUFS, and return its beat grid and the <html> attributes to paste.",
     "input_schema": _schema({"track": {"type": "string"}, "start_bar": {"type": "integer"}}, ["track"])},
    {"name": "sound_effects", "description": "List the recorded sound effects, or add the named ones to sfx/ in the project.",
     "input_schema": _schema({"names": {"type": "array", "items": {"type": "string"}}}, [])},
    {"name": "write_file", "description": "Write a text file in the project (video.html, brief.md, data.json, css/js). append=true adds to the end, for writing a long page in parts.",
     "input_schema": _schema({"path": {"type": "string"}, "content": {"type": "string"}, "append": {"type": "boolean"}}, ["path", "content"]),
     "eager_input_streaming": True},
    {"name": "read_file", "description": "Read a text file from the project (for a change request, read video.html first).",
     "input_schema": _schema({"path": {"type": "string"}}, ["path"])},
    {"name": "check", "description": "Run `givemotion check` on video.html: errors, text off screen or overlapping, tiny text, contrast, broken media. Fix every error. at= checks one moment.",
     "input_schema": _schema({"at": {"type": "number"}}, [])},
    {"name": "look", "description": "Render a contact sheet of video.html at the given times (or automatic key moments) and show it to you. Judge it as a viewer would.",
     "input_schema": _schema({"times": NUM_LIST}, [])},
    {"name": "render", "description": "Check, then render video.html to out/video.mp4. At most 3 renders per job.",
     "input_schema": _schema({}, [])},
    {"name": "progress", "description": "Tell the client what is happening, in one short friendly sentence. Stage: 1 reviewing, 2 storyboard, 3 cutting/music, 4 motion/captions, 5 rendering. Never mention AI, Claude or tools.",
     "input_schema": _schema({"text": {"type": "string"}, "stage": {"type": "integer"}}, ["text"])},
    {"name": "deliver", "description": "Hand the rendered film to the client with a short note, and the scene list for the storyboard: [{start, end, title, action, on_screen, motion}]. Ends the job.",
     "input_schema": _schema({"note": {"type": "string"},
                              "scenes": {"type": "array", "items": _schema({"start": {"type": "number"}, "end": {"type": "number"},
                                                                           "title": {"type": "string"}, "action": {"type": "string"},
                                                                           "on_screen": {"type": "string"}, "motion": {"type": "string"}},
                                                                          ["start", "end", "title"])}}, ["note", "scenes"])},
    {"name": "fail", "description": "Stop the job with a reason the client can read, only when it truly cannot be made (for example the clips are unreadable).",
     "input_schema": _schema({"reason": {"type": "string"}}, ["reason"])},
]

HANDLERS: Dict[str, Callable[..., ToolOutput]] = {
    "list_skills": t_list_skills, "read_skill": t_read_skill, "brand_kit": t_brand_kit, "view_frames": t_view_frames,
    "transcribe": t_transcribe, "make_captions": t_make_captions, "add_block": t_add_block, "find_music": t_find_music,
    "prepare_music": t_prepare_music, "sound_effects": t_sound_effects, "write_file": t_write_file, "read_file": t_read_file,
    "check": t_check, "look": t_look, "render": t_render, "progress": t_progress, "deliver": t_deliver, "fail": t_fail,
}

_TYPES = {"string": str, "number": (int, float), "integer": int, "boolean": bool, "array": list, "object": dict}


def validate(name: str, args: Any) -> Optional[str]:
    """None when the input matches the tool's schema, else what is wrong. Eager input streaming means the API no
    longer validates tool input, so the worker must (a truncated write arrives as missing or partial fields)."""
    tool = next((t for t in TOOLS if t["name"] == name), None)
    if tool is None:
        return f"unknown tool {name}"
    if not isinstance(args, dict):
        return "the input was not a JSON object"
    schema = tool["input_schema"]
    for req in schema.get("required", []):
        if req not in args:
            return f"missing required field {req!r}"
    for key, val in args.items():
        spec = schema["properties"].get(key)
        if spec is None:
            return f"unknown field {key!r}"
        want = _TYPES.get(spec.get("type"))
        if want and not isinstance(val, want) or (spec.get("type") in ("number", "integer") and isinstance(val, bool)):
            return f"field {key!r} should be {spec.get('type')}"
    return None


def run_tool(ctx: JobContext, name: str, args: dict) -> tuple[ToolOutput, bool]:
    """(output, is_error). Never raises: a ToolError or any crash comes back to the director as an error result."""
    problem = validate(name, args)
    if problem:
        return f"INVALID_INPUT: {problem}. Call {name} again with the full input.", True
    try:
        return HANDLERS[name](ctx, **args), False
    except ToolError as exc:
        return str(exc), True
    except Exception as exc:  # a crash in a tool must not kill the job; the director can route around it
        return f"{name} failed: {type(exc).__name__}: {str(exc)[:600]}", True
