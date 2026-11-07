"""Thin adapters over agent.run_agent (owner G) and services/render (owner C).

Both import lazily and fall back to fakes so the API runs/tests before they exist.
Modes via env: EDITOR_AGENT / EDITOR_RENDER = auto | fake | real.
"""
import copy
import importlib
import logging
import os
import shutil
import sys
from pathlib import Path

from . import config

log = logging.getLogger("editor_api.adapters")


def _ensure_repo_on_path():
    r = str(config.REPO_ROOT)
    if r not in sys.path:
        sys.path.append(r)


# ---------------- agent ----------------
def collect_tools() -> dict:
    """Merge TOOLS dicts from tools.* packages that exist."""
    _ensure_repo_on_path()
    tools: dict = {}
    for pkg in ("tools.analysis", "tools.edit", "tools.effects", "tools.audio", "styles", "tools.visuals", "services.render"):
        try:
            tools.update(importlib.import_module(pkg).TOOLS)
        except Exception as e:  # missing or broken package: skip, agent works with what exists
            log.info("tools package %s unavailable: %s", pkg, e)
    return tools


def _make_client():
    _ensure_repo_on_path()
    from agent.openai_compat import make_client_from_env  # EDITOR_LLM=groq|gemini|openrouter|ollama|custom
    llm = make_client_from_env()
    if llm is not None:
        return llm
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None
    try:
        import anthropic
        return anthropic.Anthropic()
    except Exception:
        return None


def _scripted_client(user_message: str):
    """Mode `scripted`: the REAL agent loop and REAL tools, with Claude's decisions replayed from a JSON file
    (EDITOR_AGENT_SCRIPT). For full-stack tests and demos without an API key; it proves the plumbing, not Claude's judgement.

    File: {"turns": [{"match": "caption", "steps": [{"tool": "set_captions", "input": {...}}, {"say": "Done."}]}]}
    The first turn whose `match` is a case-insensitive substring of the user message ("*" = anything) is used. Each step is
    one model response; a `say` right after `review_plan` is the visual reviewer's verdict ('{"pass": true, "issues": []}').
    """
    import json
    _ensure_repo_on_path()
    from agent import FakeClient, response, tool_use
    path = os.environ.get("EDITOR_AGENT_SCRIPT")
    if not path or not Path(path).is_file():
        raise RuntimeError("EDITOR_AGENT=scripted needs EDITOR_AGENT_SCRIPT=<path to a script json>")
    turns = json.loads(Path(path).read_text(encoding="utf-8"))["turns"]
    turn = next((t for t in turns if t.get("match", "*") == "*" or t["match"].lower() in user_message.lower()), None)
    if turn is None:
        raise RuntimeError(f"no scripted turn matches the message {user_message!r}")
    steps = [response(tool_use(st["tool"], st.get("input"))) if "tool" in st else response(st["say"]) for st in turn["steps"]]
    return FakeClient(steps)


def fake_run_agent(project_id, user_message, plan, tools=None, client=None) -> dict:
    new = copy.deepcopy(plan) if plan else {}
    new["notes"] = (new.get("notes", "") + f"\n[fake-agent] {user_message}").strip()
    return {
        "plan": new,
        "reply": f"(fake agent) Got it: {user_message!r}. No real edit applied.",
        "events": [{"type": "agent.thinking", "text": "fake agent running"},
                   {"type": "agent.done", "text": "fake agent finished"}],
    }


def run_agent(project_id, user_message, plan, tools=None, history=None, workdir=None) -> dict:
    """Returns {"plan","reply","events","backend"}; backend is 'real' (also for `scripted`) or 'fake'."""
    mode = config.agent_mode()
    tools = tools if tools is not None else collect_tools()
    if mode != "fake":
        _ensure_repo_on_path()
        client = None if mode == "scripted" else _make_client()
        try:
            if mode == "scripted":  # outside the ImportError fallback: a bad script must fail the job, not silently go fake
                client = _scripted_client(user_message)
            fn = importlib.import_module("agent").run_agent
            if mode in ("real", "scripted") or client is not None:
                extra = {}
                if history:
                    extra["history"] = history
                if workdir:
                    extra["workdir"] = str(workdir)
                out = fn(project_id, user_message, plan, tools, client, **extra)
                out.setdefault("events", [])
                out["backend"] = "real"
                return out
            log.info("agent importable but no ANTHROPIC_API_KEY: using fake")
        except ImportError as e:
            if mode == "real":
                raise
            log.info("agent module unavailable (%s): using fake", e)
    out = fake_run_agent(project_id, user_message, plan, tools, None)
    out["backend"] = "fake"
    return out


# ---------------- render ----------------
def _fake_render(plan, workdir, name) -> str:
    wd = Path(workdir)
    wd.mkdir(parents=True, exist_ok=True)
    out = wd / name
    src = (plan or {}).get("source", {}).get("path")
    if src and Path(src).is_file():
        shutil.copyfile(src, out)  # stand-in: "render" = copy of source
    else:
        out.write_bytes(b"FAKE-MP4")
    return str(out)


def _call_render(fn_name, plan, workdir, fake_name) -> tuple[str, str]:
    mode = config.render_mode()
    if mode != "fake":
        _ensure_repo_on_path()
        try:
            mod = importlib.import_module("services.render")
            return str(getattr(mod, fn_name)(plan, str(workdir))), "real"
        except ImportError as e:
            if mode == "real":
                raise
            log.info("services.render unavailable (%s): using fake", e)
    return _fake_render(plan, workdir, fake_name), "fake"


def render_preview(plan, workdir):
    return _call_render("render_preview", plan, workdir, "preview.mp4")


def render_final(plan, workdir):
    return _call_render("render_final", plan, workdir, "final.mp4")
