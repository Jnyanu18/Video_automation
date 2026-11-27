"""Captions and title/lower-third overlays on the cut video, drawn by Remotion (packages/motion-kit/projects/captions).

build_composition() copies the captions project to a scratch dir, writes this render's props to src/captions.json,
copies the cut video into public/, and runs motion-kit's render.mjs (--final, --json). The repo is never written to.
captions and overlays must already be in OUTPUT time (timeline.remap_to_output).
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from pathlib import Path

from .combine import MOTION_KIT, RENDER_MJS

CAPTIONS_PROJECT = MOTION_KIT / "projects" / "captions"
IGNORE = shutil.ignore_patterns("out", ".bundle", "node_modules", "*.log")
TEXT_OVERLAYS = ("title", "lower-third")  # the kinds the Remotion captions project draws
DEFAULT_STYLE = {"fontFamily": "Geist", "fontFile": None, "textColor": "#FFFFFF", "highlightColor": "#FFD400",
                 "position": "bottom", "uppercase": False}
POSITIONS = ("top", "middle", "bottom")
_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
# Graphic-only helpers kept for studio/diagrams.py (standalone_page). Not used by the Remotion render.
GSAP_CANDIDATES = [
    Path(__file__).resolve().parent / "vendor" / "gsap.min.js",
    Path(__file__).resolve().parents[2] / "app" / "test-video" / "vendor" / "gsap.min.js",
]


class CaptionsRenderError(RuntimeError):
    pass


def find_gsap() -> Path:
    for c in GSAP_CANDIDATES:
        if c.exists():
            return c
    raise FileNotFoundError("gsap.min.js not found; place it at services/render/vendor/gsap.min.js")


def chrome_path() -> str | None:
    """A Chrome/Chromium binary for Remotion: CHROME_PATH if set, else the first one found. None lets Remotion decide."""
    if os.environ.get("CHROME_PATH"):
        return os.environ["CHROME_PATH"]
    win = [os.path.join(os.environ.get(v, ""), "Google", "Chrome", "Application", "chrome.exe")
           for v in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA")] if os.name == "nt" else []
    for cand in (shutil.which("chrome-headless-shell"), shutil.which("chromium"), shutil.which("google-chrome"),
                 "/usr/bin/chrome-headless-shell", "/usr/bin/chromium", "/usr/bin/google-chrome", *win):
        if cand and Path(cand).is_file():
            return cand
    return None


def renderer_ready() -> tuple[bool, str]:
    """(True, "") when node, motion-kit's render.mjs, its node_modules and a Chrome are all present; else (False, why)."""
    if shutil.which("node") is None:
        return False, "node is not on PATH"
    if not RENDER_MJS.is_file() or not CAPTIONS_PROJECT.is_dir():
        return False, f"motion-kit render.mjs or projects/captions missing under {MOTION_KIT}"
    if not (MOTION_KIT / "node_modules" / "remotion").is_dir():
        return False, f"remotion is not installed in {MOTION_KIT} (run npm install there)"
    if chrome_path() is None:
        return False, "no Chrome or Chromium found (set CHROME_PATH)"
    return True, ""


def _clamp(items: list[dict], duration: float) -> list[dict]:
    res = []
    for it in items or []:
        s, e = max(0.0, float(it["start"])), min(duration, float(it["end"]))
        if e - s >= 0.04:
            res.append({**it, "start": round(s, 3), "end": round(e, 3)})
    return res


def _style(brand: dict | None, warnings: list[str]) -> tuple[dict, Path | None]:
    """Merge a caption style over the defaults. Returns (style, font file to copy into public/ or None)."""
    st = dict(DEFAULT_STYLE)
    font_src = None
    for k, v in (brand or {}).items():
        if k in ("textColor", "highlightColor") and not (isinstance(v, str) and _HEX.match(v)):
            warnings.append(f"caption style {k}={v!r} is not a #rrggbb colour; using {DEFAULT_STYLE[k]}")
            continue
        if k == "position" and v not in POSITIONS:
            warnings.append(f"caption position {v!r} unknown; using bottom")
            continue
        if k == "fontFile":
            p = Path(str(v))
            if p.is_file() and p.suffix.lower() in (".ttf", ".otf", ".woff", ".woff2"):
                font_src = p
            else:
                warnings.append(f"caption font file not found or unsupported: {v}; using Geist")
            continue
        if k in st:
            st[k] = v
    if font_src is None:
        st["fontFile"] = None
    else:
        st["fontFile"] = f"brand-font{font_src.suffix.lower()}"
    return st, font_src


def _props(captions: list[dict], overlays: list[dict], duration: float, w: int, h: int, fps: float,
           style: dict, video_name: str, warnings: list[str]) -> dict:
    caps = []
    for c in _clamp(captions, duration):
        words = [{"word": str(x.get("word", "")).strip(), "start": round(float(x["start"]), 3),
                  "end": round(float(x["end"]), 3)}
                 for x in (c.get("words") or []) if str(x.get("word", "")).strip()]
        words = [x for x in words if x["end"] > x["start"] and x["start"] < c["end"] and x["end"] > c["start"]]
        item = {"text": str(c.get("text", "")), "start": c["start"], "end": c["end"]}
        if words:
            item["words"] = words
        if item["text"].strip() or words:
            caps.append(item)
    ovs = []
    for o in _clamp(overlays, duration):
        kind = o.get("kind")
        if kind not in TEXT_OVERLAYS:
            warnings.append(f"overlay {o.get('id')}: kind {kind!r} is not drawn by the captions renderer "
                            "(only title and lower-third are)")
            continue
        prm = o.get("params") or {}
        ovs.append({"kind": kind, "text": o.get("text") or prm.get("text") or o.get("asset") or "",
                    "start": o["start"], "end": o["end"], "params": prm})
    return {"video": video_name, "width": w, "height": h, "fps": float(fps), "duration": round(duration, 3),
            "captions": caps, "overlays": ovs, "style": style}


def _parse_last_json(stdout: str) -> dict:
    lines = [ln for ln in (stdout or "").splitlines() if ln.strip()]
    try:
        return json.loads(lines[-1]) if lines else {}
    except json.JSONDecodeError:
        return {}


def build_composition(proj: Path, cut_video: Path, duration: float, captions: list[dict],
                      overlays: list[dict], w: int, h: int, fps: float, *, out_mp4: Path,
                      style: dict | None = None, timeout: int = 900) -> tuple[Path, list[str]]:
    """Render captions + title/lower-third overlays over cut_video into out_mp4. Returns (out_mp4, warnings).

    proj is a scratch directory for this render (the captions project is copied into it). Raises CaptionsRenderError.
    """
    ok, why = renderer_ready()
    if not ok:
        raise CaptionsRenderError(why)
    warnings: list[str] = []
    proj, out_mp4 = Path(proj), Path(out_mp4)
    if proj.exists():
        shutil.rmtree(proj)
    shutil.copytree(CAPTIONS_PROJECT, proj, ignore=IGNORE)
    st, font_src = _style(style, warnings)
    (proj / "public").mkdir(exist_ok=True)
    shutil.copy2(cut_video, proj / "public" / "cut.mp4")
    if font_src is not None:
        shutil.copy2(font_src, proj / "public" / st["fontFile"])
    props = _props(captions, overlays, duration, w, h, fps, st, "cut.mp4", warnings)
    (proj / "src" / "captions.json").write_text(json.dumps(props, indent=2), encoding="utf-8")

    env = dict(os.environ)
    cp = chrome_path()
    if cp and not env.get("CHROME_PATH"):
        env["CHROME_PATH"] = cp
    cmd = ["node", str(RENDER_MJS), "--final", "--project", str(proj), "--name", out_mp4.name, "--json"]
    try:
        r = subprocess.run(cmd, cwd=str(MOTION_KIT), env=env, capture_output=True, text=True,
                           encoding="utf-8", errors="replace", timeout=timeout)
    except subprocess.TimeoutExpired as e:
        raise CaptionsRenderError(f"captions render timed out after {timeout}s") from e
    payload = _parse_last_json(r.stdout)
    rendered = payload.get("path")
    err = str(payload.get("error") or "")
    # Captions over silent footage make the kit's loudness gate report an error. That is expected while the file exists.
    audio_only = any(x in err.lower() for x in ("loudnorm", "loudness", "silent", "unmeasurable"))
    if r.returncode != 0 or not rendered or (err and not audio_only):
        raise CaptionsRenderError(f"remotion render failed ({r.returncode}): {err or (r.stderr or '')[-800:]}")
    if not Path(rendered).is_file():
        raise CaptionsRenderError(f"remotion reported {rendered} but the file is missing")
    out_mp4.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(rendered, out_mp4)
    return out_mp4, warnings
