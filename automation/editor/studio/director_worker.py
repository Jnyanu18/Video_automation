"""The headless creative director: claims each queued brief, makes the film with Claude, and delivers it.

The website's Motion and AI editing screens queue jobs (studio/agent_bridge.py). This worker runs inside the engine
process (or on its own) and turns every queued job into a finished video with no person in the loop:

    queued job -> claim -> stage the client's files -> Claude (Opus 5.5) runs a tool loop:
        read the brief and brand kit, look at and transcribe the clips, read the craft skills it needs (at runtime,
        from editor/skills/), pick and cut licensed music, write one givemotion composition, check it, look at it,
        fix it, render it -> deliver (output.mp4 + storyboard.json) -> the website shows it

Environment:
    ANTHROPIC_API_KEY      required (the worker does not start without it)
    DIRECTOR_WORKER        auto (default: start with the engine when a key is set) | on | off
    DIRECTOR_MODEL         default claude-opus-5-5
    DIRECTOR_EFFORT        default high (Opus 5.5 defaults to medium)
    DIRECTOR_MAX_TURNS     default 70 model turns per job
    DIRECTOR_MAX_USD       default 8.0: past 80% the director is told to render and deliver; at 100% the job stops
    DIRECTOR_FALLBACKS     default on: server-side refusal fallbacks (beta); off to disable

CLI (from automation/editor):
    python -m studio.director_worker run                         serve the queue in the foreground
    python -m studio.director_worker once <job_id>               make one queued job now
    python -m studio.director_worker make "<brief>" [--kind motion --format 9:16 --duration 15 --clip f.mp4 ...]
                                                                 queue a brief and make it (end-to-end test)
    python -m studio.director_worker status                      key, skills, queue
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from studio import agent_bridge as ab  # noqa: E402
from studio import director_skills as skills  # noqa: E402
from studio import director_tools as dt  # noqa: E402

log = logging.getLogger("studio.director_worker")

WORKER_NAME = "studio-director"
DEFAULT_MODEL = "claude-opus-5-5"
FALLBACK_BETA = "server-side-fallback-2026-07-01"
MAX_TOKENS = 64_000
PRICE = {"input": 4.0, "output": 20.0, "cache_write": 5.0, "cache_read": 0.20}  # USD per MTok, Opus 5.5
CLAIM_LOCK = "claim.lock"
MAX_ATTEMPTS = 2

FORMAT_SIZE = {"9:16": (1080, 1920), "16:9": (1920, 1080), "1:1": (1080, 1080)}


def _env(name: str, default: str) -> str:
    return (os.environ.get(name) or default).strip()


def model_name() -> str:
    return _env("DIRECTOR_MODEL", DEFAULT_MODEL)


# ------------------------------------------------------------------ the prompt
ROLE = """You are the creative director and editor of a video studio. A client sent a brief through the studio's website, and you make the finished film yourself, end to end, with your tools: you plan it, read the craft skills you need, write it as a givemotion composition (one HTML file: HTML in, MP4 out), check it, look at it, fix it, render it and deliver it. Nobody reviews your work before the client sees it, so hold it to a top studio's standard.

Job kinds
- motion (and givemotion): a motion-graphics film made from the brief alone. No reference is needed: invent the concept, look, type, motion and sound from the brief and the brand (director/automatic-direction.md).
- edit and event: an edit of the client's clips (media/clip*.*). Watch them (view_frames), transcribe the ones with speech, choose the strongest moments for the target length, and cut them together with <video data-from data-duration> clips on the music's bars, adding titles, captions and motion graphics where they help the story. Never pad with weak footage.
Any kind can come with images, a logo, or the client's own music (media/client_music.*): then use the client's music as the soundtrack instead of the library.

How you work, in this order
1. progress(stage 1). Read the brief; call brand_kit; for clips, view_frames and transcribe.
2. Direct: choose the concept, look, type system, motion language and a shot list with times. read_skill the 1-3 technique recipes the film needs (list_skills shows them all; genres/ has structures). Then progress(stage 2) with the idea in one client-friendly sentence.
3. Sound: find_music, choose one by the brief, prepare_music, and paste its html_attributes onto <html> so cuts land on bars (skip the library when the client sent music). Add a few sound_effects on the biggest hits. progress(stage 3).
4. Write video.html with the shot list as a comment at the top. check, and fix every error. look at the key moments and fix the worst problems you see; look again after big fixes. progress(stage 4) while you work.
5. render (progress stage 5 first). If unsure, view_frames on out/video.mp4. Then deliver with a short note for the client and the scene list.

Hard rules
- Facts: on-screen words come only from the brief, the brand kit, or what people say in the clips. Never invent numbers, prices, discounts, awards, reviews, quotes or claims. If a fact is missing, design around it.
- Size and length: exactly the requested format and duration at 30 fps: 9:16 is 1080x1920, 16:9 is 1920x1080, 1:1 is 1080x1080.
- Music: only a library track from find_music/prepare_music, or the client's own file. Never synthesise music in code.
- Client-facing text (progress, deliver, fail) is short, warm and plain, about the film. Never mention AI, Claude, models, tools, code, HTML or file names.
- Use only files inside the project (media/, sfx/, blocks/, your own files). No network URLs except Google Fonts.
- You have a limited number of turns. Write the complete composition early, then improve it; do not explore endlessly. Always finish with deliver (or fail, only if the film truly cannot be made)."""


def system_blocks() -> List[dict]:
    """Stable system prompt: role, the core skills (read at runtime from the skill files) and the index of the rest.
    One cache breakpoint at the end, so every turn of every job reuses it."""
    text = (ROLE + "\n\n<skills_always_loaded>\n" + skills.core_text() + "\n</skills_always_loaded>\n\n"
            "Other skill files (read the ones you need with read_skill):\n" + skills.index_text())
    return [{"type": "text", "text": text, "cache_control": {"type": "ephemeral"}}]


def brief_text(ctx: dt.JobContext) -> str:
    j = ctx.job
    w, h = FORMAT_SIZE.get(j.get("format") or "9:16", (1080, 1920))
    brief = {
        "kind": j.get("kind"), "format": j.get("format"), "size": f"{w}x{h}", "duration_s": j.get("duration"),
        "title": j.get("title"), "request": j.get("prompt"), "details": j.get("direction") or {},
        "client_files": ctx.media,
    }
    parts = ["Here is the brief. Make the film.", json.dumps(brief, ensure_ascii=False, indent=1)]
    if j.get("reference_url"):
        parts.append(f"The client also pasted a link ({j['reference_url']}). You cannot open it; follow the brief.")
    if j.get("parent"):
        parent = ab.read_job(j["parent"]) or {}
        parts.append("This is a CHANGE REQUEST on the previous version, whose project (video.html, media, music) is "
                     "already in place. read_file video.html first, change only what is asked, keep everything else, "
                     f"then check, look, render and deliver.\nOriginal brief: {parent.get('prompt')!r}\n"
                     f"Change requested: {j.get('prompt')!r}")
    if ctx.notes:
        parts.append("Notes: " + "; ".join(ctx.notes))
    return "\n\n".join(parts)


# ------------------------------------------------------------------ the API call
def make_client() -> Any:
    key = (os.environ.get("ANTHROPIC_API_KEY") or "").strip()
    if not key:
        return None
    import anthropic
    return anthropic.Anthropic(api_key=key, timeout=900.0, max_retries=3)


class _State:
    fallbacks = _env("DIRECTOR_FALLBACKS", "on").lower() not in ("0", "off", "false", "no")


def _call(client: Any, system: List[dict], messages: List[dict]) -> Any:
    kw = dict(model=model_name(), max_tokens=MAX_TOKENS, system=system, messages=messages, tools=dt.TOOLS,
              output_config={"effort": _env("DIRECTOR_EFFORT", "high")})
    beta = getattr(client, "beta", None)
    if _State.fallbacks and beta is not None and hasattr(beta, "messages"):
        try:
            with beta.messages.stream(betas=[FALLBACK_BETA], fallbacks="default", **kw) as stream:
                return stream.get_final_message()
        except Exception as exc:  # a 400 about the fallback parameter: run without it from now on
            if "fallback" not in str(exc).lower():
                raise
            log.warning("server-side fallbacks rejected, continuing without them: %s", str(exc)[:200])
            _State.fallbacks = False
    if hasattr(client.messages, "stream"):
        with client.messages.stream(**kw) as stream:
            return stream.get_final_message()
    return client.messages.create(**kw)


def _get(block: Any, key: str, default: Any = None) -> Any:
    return block.get(key, default) if isinstance(block, dict) else getattr(block, key, default)


def _usage(resp: Any) -> Dict[str, int]:
    u = _get(resp, "usage") or {}
    return {k: int(_get(u, k, 0) or 0) for k in ("input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens")}


def _cost(u: Dict[str, int]) -> float:
    return (u["input_tokens"] * PRICE["input"] + u["output_tokens"] * PRICE["output"]
            + u["cache_creation_input_tokens"] * PRICE["cache_write"] + u["cache_read_input_tokens"] * PRICE["cache_read"]) / 1e6


def _move_cache_breakpoint(messages: List[dict]) -> None:
    """Keep exactly one rolling breakpoint, on the last block of the newest user message, so each turn reads the
    whole conversation so far from cache. Older breakpoints are removed (the API allows four in total)."""
    for m in messages:
        if m["role"] == "user" and isinstance(m["content"], list):
            for b in m["content"]:
                if isinstance(b, dict):
                    b.pop("cache_control", None)
    last = messages[-1]
    if last["role"] == "user" and isinstance(last["content"], list) and last["content"]:
        if isinstance(last["content"][-1], dict):
            last["content"][-1]["cache_control"] = {"type": "ephemeral"}


def _result_block(tool_use_id: str, out: dt.ToolOutput, is_error: bool) -> dict:
    content = out if isinstance(out, list) else [{"type": "text", "text": str(out)}]
    block = {"type": "tool_result", "tool_use_id": tool_use_id, "content": content}
    if is_error:
        block["is_error"] = True
    return block


# ------------------------------------------------------------------ one job
def run_job(job_id: str, client: Any = None) -> Dict[str, Any]:
    """Make one claimed job. Always leaves the job done or failed, never stuck in 'working'."""
    client = client or make_client()
    job = ab.read_job(job_id)
    if job is None:
        raise KeyError(job_id)
    if client is None:
        ab.update_job(job_id, status="failed", error="director not configured",
                      note="Stopped: the studio is not set up to make films automatically yet.")
        return {"status": "failed", "reason": "no ANTHROPIC_API_KEY"}

    max_turns = int(_env("DIRECTOR_MAX_TURNS", "70"))
    max_usd = float(_env("DIRECTOR_MAX_USD", "8.0"))
    logbook: Dict[str, Any] = {"job": job_id, "model": model_name(), "started": time.time(), "turns": [], "cost_usd": 0.0}
    try:
        ctx = dt.prepare_context(job)
        system = system_blocks()
        messages: List[dict] = [{"role": "user", "content": [{"type": "text", "text": brief_text(ctx)}]}]
        nudges, warned = 0, False
        for turn in range(max_turns):
            _move_cache_breakpoint(messages)
            resp = _call(client, system, messages)
            u = _usage(resp)
            logbook["cost_usd"] = round(logbook["cost_usd"] + _cost(u), 4)
            content = list(_get(resp, "content") or [])
            stop = _get(resp, "stop_reason")
            uses = [b for b in content if _get(b, "type") == "tool_use"]
            logbook["turns"].append({"t": round(time.time() - logbook["started"], 1), "stop": stop, "usage": u,
                                     "tools": [_get(b, "name") for b in uses]})
            messages.append({"role": "assistant", "content": content})

            if stop == "refusal":
                dt.t_fail(ctx, "We could not make this film from the brief as written. Please rephrase it and try again.")
                break
            if not uses:
                if ctx.finished:
                    break
                nudges += 1
                if nudges > 2:
                    break
                messages.append({"role": "user", "content": [{"type": "text", "text":
                                 "The film is not delivered yet. Continue: render it and call deliver (or fail with a reason)."}]})
                continue

            results = []
            for i, b in enumerate(uses):
                name, args, tid = _get(b, "name"), _get(b, "input") or {}, _get(b, "id")
                if stop == "max_tokens" and i == len(uses) - 1:
                    results.append(_result_block(tid, "Your reply was cut off before this call was complete (output limit). "
                                                 "Write long files in parts: write_file, then write_file with append=true.", True))
                    continue
                out, is_err = dt.run_tool(ctx, name, args if isinstance(args, dict) else {})
                results.append(_result_block(tid, out, is_err))
                if ctx.finished:
                    break
            if ctx.finished:
                break

            spent = logbook["cost_usd"]
            if spent >= max_usd:
                dt.t_fail(ctx, "This film needed more work than one automatic pass allows. Our team will finish it.")
                break
            if not warned and (spent >= 0.8 * max_usd or turn >= max_turns - 8):
                warned = True
                results.append({"type": "text", "text": "Budget nearly used. Render now and deliver; no more exploring."})
            messages.append({"role": "user", "content": results})

        if not ctx.finished:
            dt.t_fail(ctx, "We could not finish this film automatically. Our team has been told and will pick it up.")
        logbook["result"] = ctx.finished
        return ctx.finished or {"status": "failed"}
    except Exception as exc:  # never leave the client's job hanging
        log.exception("director job %s crashed", job_id)
        logbook["crash"] = f"{type(exc).__name__}: {str(exc)[:500]}"
        try:
            ab.update_job(job_id, status="failed", error=logbook["crash"],
                          note="Stopped: something went wrong while making the film. Please try again.")
        except Exception:
            pass
        return {"status": "failed", "reason": logbook["crash"]}
    finally:
        logbook["finished"] = time.time()
        try:  # internal only: never part of job.json, which the website returns to the client
            (ab.job_dir(job_id) / "director_log.json").write_text(json.dumps(logbook, indent=1, default=str), encoding="utf-8")
        except Exception:
            pass


# ------------------------------------------------------------------ the queue
def heartbeat() -> None:
    ab.QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = ab.QUEUE_DIR / f"_worker.{uuid.uuid4().hex}.tmp"
    tmp.write_text(json.dumps({"t": time.time(), "worker": WORKER_NAME}), encoding="utf-8")
    os.replace(tmp, ab.QUEUE_DIR / "_worker.json")


def claim(job_id: str) -> Optional[dict]:
    """Atomically take a queued job (a lock file, so two workers never take the same one)."""
    d = ab.job_dir(job_id)
    try:
        with open(d / CLAIM_LOCK, "x", encoding="utf-8") as fh:
            fh.write(json.dumps({"worker": WORKER_NAME, "pid": os.getpid(), "t": time.time()}))
    except FileExistsError:
        return None
    except OSError:
        return None
    job = ab.read_job(job_id) or {}
    if job.get("status") != "queued":
        return None
    note = ("Your creative director is working on the change." if job.get("revision")
            else "Your creative director is reading the brief and planning the film.")
    return ab.update_job(job_id, status="working", started_at=time.time(), stage=1, claimed_by=WORKER_NAME,
                         attempts=int(job.get("attempts") or 0) + 1, note=note)


def next_queued() -> Optional[dict]:
    queued = [j for j in ab.all_jobs() if j.get("status") == "queued"]
    for j in sorted(queued, key=lambda j: j.get("created_at") or 0):
        got = claim(j["id"])
        if got:
            return got
    return None


def recover_orphans() -> int:
    """Jobs this worker was making when the engine stopped: queue them again (once), or fail them."""
    n = 0
    for j in ab.all_jobs():
        if j.get("status") == "working" and j.get("claimed_by") == WORKER_NAME:
            (ab.job_dir(j["id"]) / CLAIM_LOCK).unlink(missing_ok=True)
            if int(j.get("attempts") or 0) < MAX_ATTEMPTS:
                ab.update_job(j["id"], status="queued", note="Picking your film back up after a short interruption.")
            else:
                ab.update_job(j["id"], status="failed", error="interrupted twice",
                              note="Stopped: the film was interrupted twice. Please send the brief again.")
            n += 1
    return n


class Worker:
    def __init__(self, interval: float = 3.0) -> None:
        self.interval = interval
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def start(self) -> "Worker":
        self._thread = threading.Thread(target=self.loop, name="director-worker", daemon=True)
        self._thread.start()
        return self

    def stop(self) -> None:
        self._stop.set()

    def loop(self) -> None:
        recovered = recover_orphans()
        if recovered:
            log.info("director: re-queued %d interrupted job(s)", recovered)
        client = make_client()
        log.info("director worker started (model %s)", model_name())
        while not self._stop.is_set():
            try:
                heartbeat()
                job = next_queued()
                if job is None:
                    self._stop.wait(self.interval)
                    continue
                log.info("director: making %s (%s)", job["id"], job.get("kind"))
                beat = threading.Thread(target=self._beat_while, args=(job["id"],), daemon=True)
                beat.start()
                result = run_job(job["id"], client)
                log.info("director: %s -> %s", job["id"], result.get("status"))
            except Exception:  # the worker itself must survive anything
                log.exception("director worker loop error")
                self._stop.wait(10)

    def _beat_while(self, job_id: str) -> None:
        """Keep the 'online' heartbeat fresh while a long job runs."""
        while not self._stop.is_set():
            job = ab.read_job(job_id) or {}
            if job.get("status") != "working":
                return
            try:
                heartbeat()
            except OSError:
                pass
            time.sleep(20)


_started: Optional[Worker] = None
_lock = threading.Lock()


def why_not_ready() -> Optional[str]:
    if not (os.environ.get("ANTHROPIC_API_KEY") or "").strip():
        return "ANTHROPIC_API_KEY is not set"
    missing = skills.available()
    if missing:
        return missing
    try:
        import anthropic  # noqa: F401
    except ImportError:
        return "the anthropic package is not installed"
    return None


def start_background() -> Optional[Worker]:
    """Start the worker thread once per process, when DIRECTOR_WORKER allows it. Safe to call repeatedly."""
    global _started
    mode = _env("DIRECTOR_WORKER", "auto").lower()
    if mode in ("off", "0", "false", "no"):
        return None
    problem = why_not_ready()
    if problem:
        (log.error if mode == "on" else log.info)("director worker not started: %s", problem)
        return None
    with _lock:
        if _started is None:
            _started = Worker().start()
    return _started


# ------------------------------------------------------------------ CLI
def _queue_brief(prompt: str, kind: str, fmt: str, duration: int, clips: List[str], owner: str) -> str:
    job_id = "aj_" + uuid.uuid4().hex[:12]
    job = {"id": job_id, "user_id": owner, "status": "queued", "created_at": time.time(), "prompt": prompt.strip(),
           "kind": kind, "format": fmt, "duration": duration, "title": None,
           "clips": [str(Path(c).resolve()) for c in clips], "assets": [], "reference_url": None,
           "reference_video_id": None, "reference_video_path": None, "audio_path": None, "direction": {},
           "updates": [{"t": time.time(), "text": "Brief received. Your film is in the production queue."}],
           "output": None, "error": None}
    ab.write_job(job)
    return job_id


def _main(argv: Optional[List[str]] = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    from agent.openai_compat import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    p = argparse.ArgumentParser(prog="director_worker")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("run")
    o = sub.add_parser("once"); o.add_argument("job_id")
    m = sub.add_parser("make"); m.add_argument("prompt"); m.add_argument("--kind", default="motion")
    m.add_argument("--format", default="9:16"); m.add_argument("--duration", type=int, default=15)
    m.add_argument("--clip", action="append", default=[]); m.add_argument("--owner", default="local")
    sub.add_parser("status")
    a = p.parse_args(argv)

    if a.cmd == "status":
        print(json.dumps({"ready": why_not_ready() or "yes", "model": model_name(), "skills": len(skills.index()),
                          "queue": ab.QUEUE_DIR.as_posix(),
                          "queued": [j["id"] for j in ab.all_jobs() if j.get("status") == "queued"]}, indent=1))
        return 0
    problem = why_not_ready()
    if problem:
        print(f"cannot run the director: {problem}", file=sys.stderr)
        return 2
    if a.cmd == "run":
        w = Worker()
        try:
            w.loop()
        except KeyboardInterrupt:
            w.stop()
        return 0
    job_id = a.job_id if a.cmd == "once" else _queue_brief(a.prompt, a.kind, a.format, a.duration, a.clip, a.owner)
    if claim(job_id) is None:
        print(f"{job_id} is not queued (or another worker has it)", file=sys.stderr)
        return 1
    print("making", job_id, "->", ab.job_dir(job_id))
    result = run_job(job_id)
    print(json.dumps(result, indent=1, default=str))
    return 0 if result.get("status") == "done" else 1


if __name__ == "__main__":
    raise SystemExit(_main())
