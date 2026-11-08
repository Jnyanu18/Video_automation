"""Reference reel downloader supporting yt-dlp, bulk URLs, playlists, and local files."""
from __future__ import annotations

import logging
import re
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Dict, Any, Optional

log = logging.getLogger("reelforge.downloader")

def sanitize_name(name: str) -> str:
    cleaned = re.sub(r'[\\/*?:"<>| ]', "_", name)
    return cleaned[:40].strip("_") or "reel"

class ReelDownloader:
    def __init__(self, reference_dir: Path | str):
        self.ref_dir = Path(reference_dir)
        self.ref_dir.mkdir(parents=True, exist_ok=True)

    def ingest(self, source: str, name: Optional[str] = None) -> Dict[str, Any]:
        """Ingest a reference reel from a URL or an existing local video file."""
        src_str = str(source).strip()
        uid = uuid.uuid4().hex[:8]

        # Case 1: Source is an existing local file
        local_candidate = Path(src_str)
        if local_candidate.is_file():
            base = sanitize_name(name or local_candidate.stem)
            target_folder = self.ref_dir / f"{base}_{uid}"
            target_folder.mkdir(parents=True, exist_ok=True)
            dest_file = target_folder / f"source{local_candidate.suffix}"
            shutil.copy2(local_candidate, dest_file)
            return {
                "ok": True,
                "source_type": "local_file",
                "folder": str(target_folder),
                "local_path": str(dest_file),
                "title": local_candidate.stem,
            }

        # Case 2: Source is a web URL
        if not re.match(r"^https?://", src_str, re.IGNORECASE):
            return {"ok": False, "error": f"Invalid URL or non-existent file path: {src_str}"}

        base = sanitize_name(name or "web_reel")
        target_folder = self.ref_dir / f"{base}_{uid}"
        target_folder.mkdir(parents=True, exist_ok=True)
        out_template = str(target_folder / "source.%(ext)s")

        # Try Python yt_dlp module first
        try:
            import yt_dlp
            ydl_opts = {
                "outtmpl": out_template,
                "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                "quiet": True,
                "no_warnings": True,
                "ignoreerrors": False,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(src_str, download=True)
                title = info.get("title", base)
                duration = info.get("duration", 0.0)

            # Locate downloaded file
            downloaded = list(target_folder.glob("source.*"))
            if not downloaded:
                return {"ok": False, "error": "yt-dlp finished but no output file was created"}

            return {
                "ok": True,
                "source_type": "url",
                "folder": str(target_folder),
                "local_path": str(downloaded[0]),
                "title": title,
                "duration": duration,
            }
        except ImportError:
            # Fall back to yt-dlp CLI if module not installed
            cli = shutil.which("yt-dlp")
            if not cli:
                return {"ok": False, "error": "yt-dlp is not installed. Run `reelforge install` or `pip install yt-dlp`."}

            cmd = [cli, "-f", "mp4/best", "-o", out_template, "--no-warnings", src_str]
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if r.returncode != 0:
                return {"ok": False, "error": f"yt-dlp download failed ({r.returncode}): {r.stderr[:200]}"}

            downloaded = list(target_folder.glob("source.*"))
            if not downloaded:
                return {"ok": False, "error": "yt-dlp CLI succeeded but output file not found"}

            return {
                "ok": True,
                "source_type": "url",
                "folder": str(target_folder),
                "local_path": str(downloaded[0]),
                "title": base,
            }
        except Exception as e:
            log.error("Failed to download reel from %s: %s", src_str, e)
            return {"ok": False, "error": str(e)}
