"""render_preview / render_final: EditPlan -> mp4."""
from __future__ import annotations

import copy
import os
import shutil
import subprocess
import time
from pathlib import Path

from .ass_fallback import burn_captions
from .audio import apply_audio, has_audio_effects
from .composition import build_composition
from .cut import cut_and_reframe, probe
from .timeline import remap_to_output

APP = Path(__file__).resolve().parents[2] / "app"  # where the hyperframes CLI is installed


class RenderError(RuntimeError):
    pass


def _hf_timeout(preview: bool) -> int:
    """Seconds the browser render may take. A real 30s reel needs minutes, so the default is generous
    (override with HYPERFRAMES_TIMEOUT / HYPERFRAMES_PREVIEW_TIMEOUT)."""
    key, default = ("HYPERFRAMES_PREVIEW_TIMEOUT", "600") if preview else ("HYPERFRAMES_TIMEOUT", "900")
    try:
        return max(10, int(os.environ.get(key, default)))
    except ValueError:
        return int(default)


def _validate(plan: dict) -> None:
    for k in ("source", "keep"):
        if k not in plan:
            raise RenderError(f"plan missing '{k}'")
    if not plan["keep"]:
        raise RenderError("plan.keep is empty: nothing to render")
    for s in plan["keep"]:
        if s["end"] <= s["start"]:
            raise RenderError(f"bad keep segment {s}")
    if not Path(plan["source"]["path"]).is_file():
        raise RenderError(f"source video not found: {plan['source']['path']}")


def _browser_env() -> dict:
    env = dict(os.environ)
    if not env.get("HYPERFRAMES_BROWSER_PATH"):
        # Prefer chrome-headless-shell (BeginFrame fast path), else system Chrome (screenshot path).
        win = [os.path.join(os.environ.get(v, ""), "Google", "Chrome", "Application", "chrome.exe")
               for v in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA")] if os.name == "nt" else []
        for cand in (shutil.which("chrome-headless-shell"), "/usr/bin/chrome-headless-shell", "/usr/bin/google-chrome", *win):
            if cand and Path(cand).exists():
                env["HYPERFRAMES_BROWSER_PATH"] = cand
                break
    env.setdefault("HYPERFRAMES_NO_TELEMETRY", "1")
    env.setdefault("HYPERFRAMES_NO_UPDATE_CHECK", "1")
    return env


def hyperframes_render(proj: Path, out: Path, quality: str, fps: float, workers: int = 2, timeout: int = 1800) -> None:
    exe = APP / "node_modules" / ".bin" / ("hyperframes.cmd" if os.name == "nt" else "hyperframes")
    cmd = [str(exe)] if exe.exists() else [shutil.which("npx") or "npx", "hyperframes"]
    cmd += ["render", str(proj), "-q", quality, "-f", f"{fps:g}", "-w", str(workers), "--quiet", "-o", str(out)]
    r = subprocess.run(cmd, cwd=APP, env=_browser_env(), capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0 or not out.exists():
        raise RenderError(f"hyperframes render failed ({r.returncode}): {(r.stderr or r.stdout)[-1500:]}")


def _render(plan: dict, workdir, name: str, *, preview: bool, quality: str | None = None) -> dict:
    _validate(plan)
    t0 = time.time()
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    src = plan["source"]
    outp = plan.get("output") or {}
    w = int(outp.get("width") or src["width"])
    h = int(outp.get("height") or src["height"])
    fps = float(outp.get("fps") or src.get("fps") or 30)
    if preview:  # low-res draft: short side 360, <=24 fps
        k = min(1.0, 360 / min(w, h))
        w, h, fps = int(w * k), int(h * k), min(fps, 24.0)

    remapped = remap_to_output(copy.deepcopy(plan))
    captions = remapped.get("captions") or []
    overlays = remapped.get("overlays") or []

    cut_path = workdir / f"{name}_cut.mp4"
    cut_and_reframe(plan, workdir / f"{name}_work", cut_path, w, h, fps,
                    preset="ultrafast" if preview else "veryfast", crf=28 if preview else 16)
    shutil.rmtree(workdir / f"{name}_work" / "_segs", ignore_errors=True)
    dur = probe(cut_path)["duration"]

    final = workdir / f"{name}.mp4"
    warnings: list[str] = []
    if not captions and not overlays:
        shutil.move(cut_path, final)  # nothing to composite: skip the browser entirely
        stage = "ffmpeg-only"
    else:
        proj = workdir / f"{name}_hf"
        if proj.exists():
            shutil.rmtree(proj)
        try:
            warnings = build_composition(proj, cut_path, dur, captions, overlays, w, h, fps)
            hyperframes_render(proj, final, quality or ("draft" if preview else "looks"), fps, timeout=_hf_timeout(preview))
            stage = "hyperframes"
        except Exception as e:
            reason = str(e).strip().splitlines()[-1][:300] if str(e).strip() else type(e).__name__
            if captions:
                try:  # never drop captions silently: burn them in with FFmpeg and say what could not be drawn
                    burn_captions(cut_path, captions, w, h, final, workdir / f"{name}_ass",
                                  preset="ultrafast" if preview else "veryfast", crf=28 if preview else 18)
                    stage = "ffmpeg-ass-fallback"
                    warnings.append(f"HyperFrames render failed ({reason}); captions were burned in with the FFmpeg fallback"
                                    + ("; title/lower-third/b-roll overlays were NOT drawn" if overlays else ""))
                except Exception as e2:
                    shutil.copy2(cut_path, final)
                    stage = "ffmpeg-fallback"
                    warnings.append(f"HyperFrames render failed ({reason}) and the caption fallback failed ({e2}); "
                                    "the video has NO captions or overlays")
            else:
                shutil.copy2(cut_path, final)
                stage = "ffmpeg-fallback"
                warnings.append(f"HyperFrames render failed ({reason}); overlays were NOT drawn")
    audio_info: dict = {}
    if has_audio_effects(remapped):
        mixed = workdir / f"{name}_audio.mp4"
        audio_info = apply_audio(remapped, final, mixed, workdir / f"{name}_audio_work", probe(final)["duration"])
        shutil.move(mixed, final)
        stage += "+audio"
    return {"audio": audio_info, "path": str(final), "duration": probe(final)["duration"], "width": w, "height": h, "fps": fps,
            "stage": stage, "warnings": warnings, "seconds": round(time.time() - t0, 1)}


def render_preview(plan: dict, workdir) -> str:
    """Low-res, draft-quality mp4 of the plan. Returns the mp4 path."""
    return _render(plan, workdir, "preview", preview=True)["path"]


def render_final(plan: dict, workdir) -> str:
    """Full-size mp4 at the plan's output size/fps. Returns the mp4 path."""
    return _render(plan, workdir, "final", preview=False)["path"]


def render_preview_info(plan: dict, workdir) -> dict:
    return _render(plan, workdir, "preview", preview=True)


def render_final_info(plan: dict, workdir) -> dict:
    return _render(plan, workdir, "final", preview=False)
