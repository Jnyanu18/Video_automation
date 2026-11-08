"""System diagnostic tool and environment checker for ReelForge.
Exposes `doctor` check and actionable repair commands.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from typing import Dict, Any, List

class ToolStatus:
    def __init__(self, name: str, installed: bool, version: str = "", fix_command: str = "", notes: str = ""):
        self.name = name
        self.installed = installed
        self.version = version
        self.fix_command = fix_command
        self.notes = notes

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "installed": self.installed,
            "ok": self.installed,
            "version": self.version,
            "fix_command": self.fix_command,
            "notes": self.notes,
            "details": f"v{self.version} ({self.notes})" if self.version else self.notes,
        }


def check_ffmpeg() -> ToolStatus:
    ffmpeg_exe = shutil.which("ffmpeg")
    ffprobe_exe = shutil.which("ffprobe")
    if not ffmpeg_exe or not ffprobe_exe:
        fix = "winget install Gyan.FFmpeg" if os.name == "nt" else "brew install ffmpeg || sudo apt install ffmpeg"
        return ToolStatus("FFmpeg & FFprobe", False, fix_command=fix, notes="Required for audio extraction, scene detection, cutting, and rendering.")
    
    try:
        res = subprocess.run([ffmpeg_exe, "-version"], capture_output=True, text=True, timeout=5)
        first_line = res.stdout.splitlines()[0] if res.stdout else "unknown"
        v = first_line.split(" ")[2] if len(first_line.split(" ")) > 2 else first_line
        return ToolStatus("FFmpeg & FFprobe", True, version=v, notes=f"Path: {ffmpeg_exe}")
    except Exception as e:
        return ToolStatus("FFmpeg & FFprobe", False, notes=f"Error checking version: {e}")

def check_yt_dlp() -> ToolStatus:
    # Check CLI executable or python module
    has_cli = shutil.which("yt-dlp") is not None
    has_module = False
    v = ""
    try:
        import yt_dlp
        has_module = True
        v = getattr(yt_dlp, "__version__", "")
    except ImportError:
        pass

    if has_cli or has_module:
        return ToolStatus("yt-dlp", True, version=v or "installed", notes="Ready for downloading reference reels from URLs.")
    
    return ToolStatus("yt-dlp", False, fix_command=f"{sys.executable} -m pip install yt-dlp", notes="Used to download reference reels from Instagram, TikTok, YouTube.")

def check_whisper() -> ToolStatus:
    has_fw = False
    try:
        import faster_whisper
        has_fw = True
    except ImportError:
        pass

    if has_fw:
        return ToolStatus("Whisper (faster-whisper)", True, notes="Ready for word-level speech transcription and audio timing.")
    
    return ToolStatus("Whisper (faster-whisper)", False, fix_command=f"{sys.executable} -m pip install faster-whisper", notes="Required for transcribing speech with word-level timestamps.")

def check_hyperframes() -> ToolStatus:
    # Check if hyperframes executable exists or npx hyperframes works
    hf_cli = shutil.which("hyperframes")
    if not hf_cli and os.name == "nt":
        hf_cli = shutil.which("hyperframes.cmd")

    if hf_cli:
        return ToolStatus("HyperFrames", True, notes=f"CLI located at: {hf_cli}")

    # Check npx
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if npx:
        return ToolStatus("HyperFrames", True, notes="Available via npx execution. (FFmpeg ASS fallback is also active)")

    return ToolStatus("HyperFrames", False, fix_command="npm install -g @heygen/hyperframes", notes="Motion graphics & caption compositor. Fallback: FFmpeg + ASS subtitles.")

def check_llm() -> ToolStatus:
    key = os.environ.get("ANTHROPIC_API_KEY")
    model = os.environ.get("REELFORGE_MODEL", "claude-3-7-sonnet-20250219")
    if key and len(key.strip()) > 10:
        return ToolStatus("Anthropic API Key", True, version=model, notes="API key configured.")
    return ToolStatus("Anthropic API Key", False, fix_command="export ANTHROPIC_API_KEY='your-key-here'", notes="Required for AI style synthesis, storyboard planning, and revisions.")

def run_doctor() -> Dict[str, Any]:
    """Run full diagnostic check across all ReelForge subsystems."""
    tools = [
        check_ffmpeg(),
        check_yt_dlp(),
        check_whisper(),
        check_hyperframes(),
        check_llm(),
    ]
    all_ready = all(t.installed for t in tools[:4]) # Core video tools
    return {
        "ok": all_ready,
        "tools": [t.to_dict() for t in tools],
        "summary": "All 4 media tools are installed and ready." if all_ready else "Some required tools are missing. Run the suggested fix commands.",
    }
