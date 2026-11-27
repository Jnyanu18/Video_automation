"""Captions drawn with Revideo (MIT), composited over the cut with FFmpeg.

The Revideo project lives in packages/revideo-kit. For each job this module:
  1. copies the project's source into a scratch folder (the repo is never written to),
  2. writes src/props.json with the captions and style,
  3. renders the caption layer over solid green with the kit's render.mjs,
  4. keys the green out with FFmpeg and places the captions over the cut, keeping the cut's audio.

build_composition has the same signature and return value as the Remotion version it replaces, so the render path
only changes its import. Title and lower-third overlays are not drawn yet: they are reported in the warnings.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

KEY_GREEN = "#00FF00"
POSITIONS = {"top": -0.28, "center": 0.0, "bottom": 0.28}
_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


class CaptionsRenderError(RuntimeError):
    """Raised when the Revideo caption layer cannot be rendered or composited."""


def _find_kit() -> Path:
    here = Path(os.path.abspath(__file__))
    for parent in [here, *here.parents]:
        cand = parent / "packages" / "revideo-kit"
        if (cand / "render.mjs").is_file():
            return cand
    return here.parents[4] / "packages" / "revideo-kit"


KIT_DIR = _find_kit()
SOURCE_ITEMS = ("src", "render.mjs", "package.json", "tsconfig.json")
TEXT_OVERLAYS = ("title", "lower-third")


def renderer_ready() -> tuple[bool, str]:
    if not shutil.which("node"):
        return False, "node is not on PATH"
    if not (KIT_DIR / "node_modules" / "@revideo" / "renderer").is_dir():
        return False, f"run `npm install` in {KIT_DIR}"
    if not shutil.which("ffmpeg"):
        return False, "ffmpeg is not on PATH"
    return True, ""


def _link_node_modules(proj: Path) -> None:
    """The project needs the kit's packages. A directory junction (Windows) or symlink avoids copying them."""
    target = KIT_DIR / "node_modules"
    link = proj / "node_modules"
    if link.exists():
        return
    if os.name == "nt":
        subprocess.run(["cmd", "/c", "mklink", "/J", str(link), str(target)], check=True,
                       capture_output=True)
    else:
        os.symlink(target, link, target_is_directory=True)


def _style(style: dict | None, warnings: list[str]) -> dict[str, Any]:
    out: dict[str, Any] = {"textColor": "#FFFFFF", "position": "bottom", "size": 78}
    for k, v in (style or {}).items():
        if k == "textColor":
            if isinstance(v, str) and _HEX.match(v):
                out["textColor"] = v.upper()
            else:
                warnings.append(f"caption text colour {v!r} is not #rrggbb; using #FFFFFF")
        elif k == "position":
            if v in POSITIONS:
                out["position"] = v
            else:
                warnings.append(f"caption position {v!r} unknown; using bottom")
        elif k == "size":
            try:
                out["size"] = max(24, min(200, int(v)))
            except (TypeError, ValueError):
                warnings.append(f"caption size {v!r} is not a number; using 78")
    return out


def _clamp(items: list[dict], duration: float) -> list[dict]:
    res = []
    for it in items or []:
        s, e = max(0.0, float(it["start"])), min(duration, float(it["end"]))
        if e - s >= 0.04 and str(it.get("text", "")).strip():
            res.append({"text": str(it["text"]).strip(), "start": round(s, 3), "end": round(e, 3)})
    return res


def _props(captions: list[dict], duration: float, w: int, h: int, fps: float, style: dict) -> dict:
    return {
        "mode": "captions",
        "width": w,
        "height": h,
        "fps": float(fps),
        "duration": round(duration, 3),
        "captions": _clamp(captions, duration),
        "captionY": POSITIONS[style["position"]],
        "captionSize": style["size"],
        "colors": {"bg": KEY_GREEN, "ink": style["textColor"], "accent": style["textColor"], "muted": style["textColor"]},
        "fontFamily": "Geist",
    }


def _render_layer(proj: Path, props: dict, out_layer: Path, timeout: int) -> None:
    src = proj / "src"
    if src.exists():
        shutil.rmtree(src)
    for item in ("src",):
        shutil.copytree(KIT_DIR / item, src)
    (src / "props.json").write_text(json.dumps(props, indent=2), encoding="utf-8")
    _link_node_modules(proj)
    cmd = ["node", str(KIT_DIR / "render.mjs"), str(proj), str(out_layer)]
    try:
        r = subprocess.run(cmd, cwd=str(KIT_DIR), capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=timeout)
    except subprocess.TimeoutExpired as e:
        raise CaptionsRenderError(f"caption render timed out after {timeout}s") from e
    payload = _parse_last_json(r.stdout)
    if r.returncode != 0 or not payload.get("ok") or not out_layer.is_file():
        reason = payload.get("error") or (r.stderr or "").strip().splitlines()[-1:] or ["no output"]
        raise CaptionsRenderError(f"Revideo caption render failed: {reason if isinstance(reason, str) else reason[0]}")


def _parse_last_json(stdout: str) -> dict:
    for line in reversed((stdout or "").strip().splitlines()):
        line = line.strip()
        if line.startswith("{"):
            try:
                return json.loads(line)
            except ValueError:
                continue
    return {}


def _composite(cut: Path, layer: Path, out_mp4: Path, w: int, h: int, fps: float) -> None:
    graph = (
        f"[0:v]scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,"
        f"fps={fps:g},setsar=1[base];"
        f"[1:v]chromakey={KEY_GREEN.lower().replace('#', '0x')}:0.22:0.08,scale={w}:{h},format=yuva420p[ov];"
        f"[base][ov]overlay=shortest=1:format=auto,format=yuv420p[v]"
    )
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(cut), "-i", str(layer), "-filter_complex", graph,
           "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out_mp4)]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0 or not out_mp4.is_file():
        raise CaptionsRenderError(f"caption compositing failed: {(r.stderr or '').strip()[-300:]}")


def build_composition(proj: Path, cut_video: Path, duration: float, captions: list[dict],
                      overlays: list[dict], w: int, h: int, fps: float, *, out_mp4: Path,
                      style: dict | None = None, timeout: int = 900) -> tuple[Path, list[str]]:
    """Caption the cut and write out_mp4. Returns (out_mp4, warnings). Raises CaptionsRenderError.

    proj is a scratch directory for this render. The kit's source is copied into it and never written in the repo.
    """
    ok, why = renderer_ready()
    if not ok:
        raise CaptionsRenderError(why)
    warnings: list[str] = []
    proj, out_mp4, cut_video = Path(proj), Path(out_mp4), Path(cut_video)
    proj.mkdir(parents=True, exist_ok=True)
    dropped = [o for o in overlays or [] if o.get("kind") in TEXT_OVERLAYS]
    if dropped:
        warnings.append(f"{len(dropped)} title/lower-third overlay(s) were NOT drawn: not yet ported to Revideo")
    for o in overlays or []:
        if o.get("kind") not in TEXT_OVERLAYS:
            warnings.append(f"overlay kind {o.get('kind')!r} is not drawn by the captions renderer")
    st = _style(style, warnings)
    props = _props(captions or [], duration, w, h, fps, st)
    layer = proj / "captions-layer.mp4"
    _render_layer(proj, props, layer, timeout)
    _composite(cut_video, layer, out_mp4, w, h, fps)
    return out_mp4, warnings


class CardRenderError(RuntimeError):
    """Raised when a title or end card cannot be rendered."""


def _card_props(kind: str, text: str, sub: str | None, tokens: dict, w: int, h: int, fps: float, seconds: float,
                warnings: list[str]) -> dict:
    colors = tokens.get("colors") or {}
    fonts = tokens.get("fonts") or {}
    family = str((fonts.get("display") or {}).get("family") or "Geist")
    if family.strip().casefold() != "geist":
        warnings.append(f"brand font {family!r} has no font file in the Revideo kit; the card uses Geist")
    if (w, h) != (1080, 1920):
        warnings.append(f"cards are rendered at 1080x1920 (asked for {w}x{h})")
    if float(fps) != 30:
        warnings.append(f"cards are rendered at 30 fps (asked for {fps:g})")
    return {
        "mode": "card",
        "width": 1080,
        "height": 1920,
        "fps": 30.0,
        "duration": round(float(seconds), 3),
        "card": {"kind": kind, "text": text, "sub": sub or ""},
        "colors": {
            "bg": str(colors.get("bg") or "#000000"),
            "ink": str(colors.get("ink") or "#FFFFFF"),
            "accent": str(colors.get("accent") or "#FF8A4C"),
            "muted": str(colors.get("muted") or "#FFD4B8"),
        },
        "fontFamily": "Geist",
    }


def _render_card(kind: str, props: dict, out_mp4: Path, timeout: int) -> None:
    scratch = Path(tempfile.mkdtemp(prefix=f"reelcard-{kind}-"))
    try:
        proj = scratch / "project"
        proj.mkdir()
        shutil.copytree(KIT_DIR / "src", proj / "src")
        (proj / "src" / "props.json").write_text(json.dumps(props, indent=2), encoding="utf-8")
        _link_node_modules(proj)
        try:
            r = subprocess.run(["node", str(KIT_DIR / "render.mjs"), str(proj), str(out_mp4)], cwd=str(KIT_DIR),
                               capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout)
        except subprocess.TimeoutExpired as e:
            raise CardRenderError(f"{kind} card render timed out after {timeout}s") from e
        payload = _parse_last_json(r.stdout)
        if r.returncode != 0 or not payload.get("ok") or not out_mp4.is_file():
            raise CardRenderError(f"{kind} card render failed ({r.returncode}): {payload.get('error') or (r.stderr or '')[-600:]}")
    finally:
        shutil.rmtree(scratch, ignore_errors=True)


def render_cards(*, tokens: dict | str | Path, title_text: str, end_text: str, width: int, height: int,
                 fps: float, out_dir: str | Path, title_sub: str | None = None, end_sub: str | None = None,
                 title_seconds: float = 2.5, end_seconds: float = 3.0, logo: str | Path | None = None,
                 timeout: int = 900) -> dict[str, str]:
    """Render the title and end cards with Revideo. Returns {"title": mp4, "end": mp4}.

    tokens: brand tokens as a dict or a path to a JSON file ({brandName, colors{bg,ink,accent,muted},
    fonts{display{family}}}). Cards are silent. A logo file is not drawn yet (reported in a warning).
    Raises CardRenderError when node or the kit is missing, or a card fails to render.
    """
    if isinstance(tokens, (str, Path)):
        tokens = json.loads(Path(tokens).read_text(encoding="utf-8"))
    if shutil.which("node") is None:
        raise CardRenderError("node is not on PATH; cannot render title/end cards")
    if not (KIT_DIR / "node_modules" / "@revideo" / "renderer").is_dir():
        raise CardRenderError(f"the Revideo kit is not installed in {KIT_DIR} (run npm install there)")
    if not (KIT_DIR / "render.mjs").is_file():
        raise CardRenderError("packages/revideo-kit/render.mjs is missing")
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    warnings: list[str] = []
    if logo:
        warnings.append("the logo is not drawn on the cards yet (Revideo image support is not ported)")
    result: dict[str, str] = {}
    for kind, text, sub, secs in (("title", title_text, title_sub, title_seconds), ("end", end_text, end_sub, end_seconds)):
        props = _card_props(kind, text, sub, tokens, width, height, fps, secs, warnings)
        dst = out_dir / f"{kind}.mp4"
        _render_card(kind, props, dst, timeout)
        result[kind] = str(dst)
    return result
