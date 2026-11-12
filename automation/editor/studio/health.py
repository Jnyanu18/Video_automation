"""Real health probes for every studio subsystem. Nothing here reports ONLINE without having checked."""
from __future__ import annotations

import importlib.util
import json
import os
import shutil
import socket
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT = Path(__file__).resolve().parents[1]          # automation/editor
APP = ROOT / "app"                                  # hyperframes CLI lives here
_cache: Dict[str, Any] = {}


def port_open(port: int, host: str = "127.0.0.1", timeout: float = 0.4) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def http_get(url: str, timeout: float = 2.0, headers: Optional[dict] = None) -> tuple[int, str]:
    """(status, body[:2000]); status 0 when the host cannot be reached."""
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read(2000).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception:
        return 0, ""


def cli_version(cmd: str) -> Optional[str]:
    exe = shutil.which(cmd)
    if not exe:
        return None
    try:
        r = subprocess.run([exe, "-version"], capture_output=True, text=True, timeout=4)
        first = (r.stdout or r.stderr).splitlines()[0] if (r.stdout or r.stderr) else ""
        return first[:80] or "installed"
    except Exception:
        return "installed"


def gemini_probe() -> dict:
    """Validate the configured LLM key with a cheap authenticated call (cached 60 s)."""
    now = time.time()
    hit = _cache.get("llm")
    if hit and now - hit[0] < 60:
        return hit[1]
    provider = os.environ.get("EDITOR_LLM", "gemini").lower()
    key_env = {"gemini": "GEMINI_API_KEY", "openrouter": "OPENROUTER_API_KEY", "anthropic": "ANTHROPIC_API_KEY"}.get(provider)
    key = os.environ.get(key_env or "") if key_env else None
    if provider == "ollama":
        status, _ = http_get("http://localhost:11434/api/tags", 1.5)
        out = {"status": "ONLINE" if status == 200 else "OFFLINE", "detail": "ollama at localhost:11434"}
    elif not key:
        out = {"status": "CONFIG_REQUIRED", "detail": f"set {key_env or 'the provider key'} in automation/editor/.env"}
    else:
        url = {"gemini": "https://generativelanguage.googleapis.com/v1beta/openai/models",
               "openrouter": "https://openrouter.ai/api/v1/auth/key",
               "anthropic": "https://api.anthropic.com/v1/models"}[provider]
        hdr = {"x-api-key": key, "anthropic-version": "2023-06-01"} if provider == "anthropic" else {"Authorization": f"Bearer {key}"}
        status, _ = http_get(url, 4.0, hdr)
        if status == 200:
            out = {"status": "ONLINE", "detail": f"{provider} key accepted"}
        elif status in (400, 401, 403):
            out = {"status": "ERROR", "detail": f"{provider} rejected the API key (HTTP {status})"}
        elif status == 0:
            out = {"status": "OFFLINE", "detail": f"cannot reach {provider}"}
        else:
            out = {"status": "ERROR", "detail": f"{provider} answered HTTP {status}"}
    out["provider"] = provider
    _cache["llm"] = (now, out)
    return out


def hyperframes_probe() -> dict:
    exe = APP / "node_modules" / ".bin" / ("hyperframes.cmd" if os.name == "nt" else "hyperframes")
    if not exe.exists():
        return {"status": "NOT_FOUND", "detail": "hyperframes CLI not installed (npm install in automation/editor/app)"}
    browser = os.environ.get("HYPERFRAMES_BROWSER_PATH") or shutil.which("chrome-headless-shell") or shutil.which("google-chrome")
    if not browser and os.name == "nt":
        for var in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA"):
            cand = Path(os.environ.get(var, "")) / "Google" / "Chrome" / "Application" / "chrome.exe"
            if cand.exists():
                browser = str(cand)
                break
    if not browser:
        return {"status": "CONFIG_REQUIRED", "detail": "CLI installed but no Chrome found; captions use the FFmpeg fallback"}
    return {"status": "ONLINE", "detail": "CLI + browser available"}


def probe_all(self_port: int = 8793) -> List[dict]:
    from tools.audio import sfx as sfxlib

    def svc(id_, name, type_, port, endpoint, status, detail="", **extra):
        return {"id": id_, "name": name, "type": type_, "port": port, "endpoint": endpoint, "status": status, "detail": detail, **extra}

    out: List[dict] = []
    dash = int(os.environ.get("DASHBOARD_PORT") or os.environ.get("PORT") or 8787)
    out.append(svc("dashboard", "Dashboard & Client Server", "Frontend/BFF", dash, f"http://127.0.0.1:{dash}",
                   "ONLINE" if port_open(dash) else "OFFLINE", "serves the web app and proxies this API"))
    out.append(svc("editor_api", "AI Video Editor Engine (FastAPI)", "Core AI Pipeline", self_port, f"http://127.0.0.1:{self_port}",
                   "ONLINE", "answering this request"))

    st, _ = http_get("http://127.0.0.1:8792/healthz", 1.0)
    out.append(svc("media_server", "Public Media Server", "Asset Delivery", 8792, "http://127.0.0.1:8792",
                   "ONLINE" if (st == 200 or port_open(8792)) else "OFFLINE", "serves /render and /media files"))

    for id_, name, type_, port, cfg_vars in (
        ("mpt_server", "Multi-Platform Publisher Adapter (MPT)", "Publishing", 8791, ("MPT_API_KEY",)),
        ("postiz", "Postiz Social Publisher Bridge", "Social Publishing", 8790, ("POSTIZ_API_URL", "POSTIZ_API_KEY")),
    ):
        st, _ = http_get(f"http://127.0.0.1:{port}/healthz", 1.0)
        configured = all(os.environ.get(v) for v in cfg_vars)
        if st == 200:
            status, detail = "ONLINE", "adapter answering /healthz"
        elif not configured:
            status, detail = "STANDBY", "not configured: set " + ", ".join(cfg_vars) + " in automation/.env.local"
        else:
            status, detail = "OFFLINE", "configured but the adapter is not running"
        out.append(svc(id_, name, type_, port, f"http://127.0.0.1:{port}", status, detail))

    st, _ = http_get("http://127.0.0.1:5678/healthz", 1.5)
    out.append(svc("n8n", "n8n Workflow Automation Engine", "Orchestration", 5678, "http://127.0.0.1:5678",
                   "ONLINE" if st == 200 else ("ONLINE" if port_open(5678) else "STANDBY"),
                   "workflow engine answering" if (st == 200 or port_open(5678)) else "not running (npm run n8n:install, then start-all)"))

    g = gemini_probe()
    out.append(svc("gemini", f"LLM Director Copilot ({g['provider']})", "Foundation Model", None, g["provider"], g["status"], g["detail"]))

    ff, fp = cli_version("ffmpeg"), cli_version("ffprobe")
    out.append(svc("ffmpeg", "FFmpeg Native Video Renderer", "Video Transcoding", None, "system PATH",
                   "ONLINE" if (ff and fp) else "NOT_FOUND", ff or "ffmpeg not on PATH"))
    hf = hyperframes_probe()
    out.append(svc("hyperframes", "HyperFrames Motion Engine", "Motion Graphics", None, "automation/editor/app", hf["status"], hf["detail"]))

    yt = shutil.which("yt-dlp")
    yt_ver = None
    if yt:
        try:
            yt_ver = subprocess.run([yt, "--version"], capture_output=True, text=True, timeout=6).stdout.strip() or "installed"
        except Exception:
            yt_ver = "installed"
    out.append(svc("ytdlp", "Link downloader (yt-dlp)", "Video Ingest", None, "system PATH", "ONLINE" if yt else "NOT_FOUND",
                   f"yt-dlp {yt_ver}" if yt else "pip install yt-dlp, to paste links; uploading a file works without it"))

    whisper = importlib.util.find_spec("faster_whisper") is not None
    out.append(svc("whisper", "faster-whisper Transcription", "Speech-to-Text", None, "python module",
                   "ONLINE" if whisper else "NOT_FOUND", "installed" if whisper else "pip install faster-whisper"))
    try:
        n = len(sfxlib.catalog())
        out.append(svc("sfx", "CC0 Sound Effects Library", "Audio Assets", None, str(sfxlib.sfx_dir()),
                       "ONLINE" if n else "NOT_FOUND", f"{n} effects"))
    except FileNotFoundError as e:
        out.append(svc("sfx", "CC0 Sound Effects Library", "Audio Assets", None, "", "NOT_FOUND", str(e)))
    return out


def summarize(services: List[dict]) -> dict:
    core = [s for s in services if s["id"] in ("editor_api", "ffmpeg", "gemini", "hyperframes", "whisper")]
    bad = [s["name"] for s in core if s["status"] not in ("ONLINE",)]
    return {"online": sum(1 for s in services if s["status"] == "ONLINE"), "total": len(services),
            "core_ready": not bad, "core_issues": bad}
