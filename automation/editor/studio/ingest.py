"""Download a video from a link into the studio's media folder (yt-dlp), as a background job.

The studio edits only files inside its allowed media folders, so a link is first fetched into `raw footage/ingested/`.
Use it for videos you own or have permission to edit; the dashboard says so next to the input.
"""
from __future__ import annotations

import re
import shutil
import subprocess
import threading
import time
import uuid
from pathlib import Path
from typing import Callable, Dict, Optional
from urllib.parse import urlparse

ALLOWED_HOSTS = ("instagram.com", "youtube.com", "youtu.be", "tiktok.com", "x.com", "twitter.com", "facebook.com", "fb.watch", "vimeo.com", "linkedin.com")
MAX_MB = 600
TIMEOUT_S = 1800  # Instagram can throttle to ~10 KB/s: a short reel still finishes inside this


class IngestError(Exception):
    pass


def validate_url(url: str) -> str:
    u = str(url or "").strip()
    p = urlparse(u)
    if p.scheme != "https" or not p.hostname:
        raise IngestError("The link must start with https://")
    host = p.hostname.lower()
    if not any(host == h or host.endswith("." + h) for h in ALLOWED_HOSTS):
        raise IngestError(f"Links from {host} are not supported. Supported: {', '.join(ALLOWED_HOSTS)}")
    if len(u) > 500:
        raise IngestError("The link is too long")
    return u


def ytdlp_path() -> Optional[str]:
    return shutil.which("yt-dlp")


def download(url: str, out_dir: Path, on_progress: Optional[Callable[[str], None]] = None, runner=subprocess.run) -> Path:
    """Blocking download. Returns the merged mp4 path. `runner` is injectable for tests."""
    url = validate_url(url)
    exe = ytdlp_path()
    if not exe and runner is subprocess.run:
        raise IngestError("yt-dlp is not installed (pip install yt-dlp), so links cannot be downloaded. Upload the file instead.")
    out_dir.mkdir(parents=True, exist_ok=True)
    tmpl = str(out_dir / "%(extractor)s_%(id)s.%(ext)s")
    cmd = [exe or "yt-dlp", "--no-playlist", "--no-progress", "-c", "--max-filesize", f"{MAX_MB}M", "-f", "bv*+ba/b",
           "--merge-output-format", "mp4", "--print", "after_move:filepath", "-o", tmpl, url]
    if on_progress:
        on_progress("Downloading from the link (this can be slow when the site throttles)")
    try:
        r = runner(cmd, capture_output=True, text=True, timeout=TIMEOUT_S)
    except subprocess.TimeoutExpired:
        raise IngestError(f"The download did not finish within {TIMEOUT_S // 60} minutes. Try again or upload the file.")
    if r.returncode != 0:
        tail = [ln for ln in (r.stderr or "").splitlines() if ln.strip()][-1:] or ["unknown error"]
        hint = " The site may need a login; download the video yourself and upload it." if re.search(r"login|private|sign in|rate", tail[0], re.I) else ""
        raise IngestError(f"Download failed: {tail[0][:200]}.{hint}")
    paths = [ln.strip() for ln in (r.stdout or "").splitlines() if ln.strip().lower().endswith((".mp4", ".mkv", ".webm", ".mov"))]
    if not paths or not Path(paths[-1]).is_file():
        raise IngestError("The download finished but no video file was produced")
    return Path(paths[-1])


class IngestJobs:
    """In-memory status of link downloads (the finished file lives on disk; a restart just forgets finished jobs)."""

    def __init__(self, out_dir: Path, runner=subprocess.run):
        self.out_dir, self.runner = Path(out_dir), runner
        self.jobs: Dict[str, dict] = {}
        self.lock = threading.Lock()

    def start(self, url: str) -> dict:
        url = validate_url(url)
        jid = "ing_" + uuid.uuid4().hex[:10]
        job = {"id": jid, "url": url, "status": "running", "message": "Starting", "path": None, "error": None, "started_at": time.time()}
        with self.lock:
            self.jobs[jid] = job

        def run():
            def msg(m):
                with self.lock:
                    job["message"] = m
            try:
                p = download(url, self.out_dir, msg, self.runner)
                with self.lock:
                    job.update(status="done", path=str(p), message="Downloaded", finished_at=time.time())
            except Exception as e:  # report, never crash the thread silently
                with self.lock:
                    job.update(status="failed", error=str(e), message="Failed", finished_at=time.time())
        threading.Thread(target=run, daemon=True, name=jid).start()
        return dict(job)

    def get(self, jid: str) -> Optional[dict]:
        with self.lock:
            j = self.jobs.get(jid)
            return dict(j) if j else None
