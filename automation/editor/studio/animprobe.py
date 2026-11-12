"""Measure and screenshot a custom animation in headless Chrome, and turn the measurements into plain problems."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from services.render import custom, diagrams

HERE = Path(__file__).resolve().parent


def chrome_path() -> Optional[str]:
    env = os.environ.get("HYPERFRAMES_BROWSER_PATH")
    if env and Path(env).exists():
        return env
    for c in (shutil.which("chrome-headless-shell"), shutil.which("google-chrome"), shutil.which("chromium")):
        if c:
            return c
    if os.name == "nt":
        for var in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA"):
            cand = Path(os.environ.get(var, "")) / "Google" / "Chrome" / "Application" / "chrome.exe"
            if cand.exists():
                return str(cand)
    return None


def available() -> bool:
    return bool(shutil.which("node") and chrome_path() and (HERE.parent / "app" / "node_modules" / "puppeteer-core").is_dir())


def probe(scene: dict, duration: float, workdir: Optional[Path] = None, times: Optional[List[float]] = None,
          runner: Callable = subprocess.run) -> Dict[str, Any]:
    """Compile `scene` into a standalone page, load it in Chrome, seek to `times` and measure. Returns
    {frames:[paths], elements:[...], issues:[str]}; issues is empty when the animation looks sound."""
    px = lambda v: f"{v:.1f}px"  # noqa: E731
    scene = custom.validate(scene, duration)
    inner, js = diagrams.render({"template": "custom", "scene": scene}, "ov0", 0.0, duration, px)
    work = Path(workdir) if workdir else Path(tempfile.mkdtemp(prefix="anim_"))
    page = diagrams.standalone_page(inner, js, "ov0", duration, px, work / "page")
    times = times or [round(duration * f, 2) for f in (0.18, 0.4, 0.65, 0.93)]
    r = runner(["node", str(HERE / "anim_probe.cjs"), page, str(work / "frames"), chrome_path() or "", json.dumps(times), "#ov0"],
               capture_output=True, text=True, timeout=120)
    try:
        data = json.loads((r.stdout or "").strip().splitlines()[-1])
    except (ValueError, IndexError):
        raise RuntimeError(f"the browser check produced no result: {(r.stderr or r.stdout or '')[-300:]}")
    issues: List[str] = []
    for e in data.get("scriptErrors", []):
        issues.append(f"script error: {e}")
    for e in data.get("elements", []):
        if e["type"] in ("text", "badge", "box", "circle") and e.get("textLen") and e.get("text"):
            if e["type"] == "box" and e["textLen"] > e["w"] - 12:
                issues.append(f"{e['id']}: the text renders {e['textLen']:.0f} wide but its box is {e['w']:.0f}; it overflows")
        if e["x"] < -2 or e["y"] < -2 or e["x"] + e["w"] > custom.W + 2 or e["y"] + e["h"] > custom.H + 2:
            issues.append(f"{e['id']} renders outside the canvas")
        if e.get("size") and e["size"] * 0.55 < 10:
            issues.append(f"{e['id']}: text is too small to read on a phone")
    return {"frames": [f["file"] for f in data.get("frames", [])], "elements": data.get("elements", []), "issues": issues, "page": page}
