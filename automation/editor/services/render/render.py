"""render_preview / render_final: EditPlan -> mp4.

FFmpeg cuts and reframes the source. Captions are drawn by Revideo (packages/revideo-kit) and composited with FFmpeg. If Revideo fails, captions are burned in
with FFmpeg/libass and the warnings say what was lost.
"""
from __future__ import annotations

import copy
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

from .ass_fallback import burn_captions
from .audio import apply_audio, has_audio_effects, measure_loudness
from .revideo import build_composition
from .cut import cut_and_reframe, probe
from .timeline import remap_to_output


class RenderError(RuntimeError):
    pass


def _captions_timeout(preview: bool) -> int:
    """Seconds the caption render may take. Override with REMOTION_TIMEOUT / REMOTION_PREVIEW_TIMEOUT."""
    key, default = ("REMOTION_PREVIEW_TIMEOUT", "600") if preview else ("REMOTION_TIMEOUT", "900")
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


LUFS_TARGET, LUFS_TOLERANCE = -14.0, 1.0


def output_scorecard(final: Path, plan: dict, w: int, h: int, fps: float) -> dict:
    """Checks on the FINAL mp4 itself: size, frame rate, duration and loudness.

    Size, fps and duration are FAIL-level (the file is wrong). Loudness is WARN-level, because a plan with no
    audio effects keeps the source's loudness. Never raises: a check that cannot run is reported as skipped.
    """
    from tools.edit.timeline import segments as timeline_segments  # cut.py put the repo root on sys.path

    checks: list[dict] = []

    def add(name: str, status: str, detail: str) -> None:
        checks.append({"name": name, "status": status, "detail": detail})

    try:
        info = probe(final)
        r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                            "stream=r_frame_rate", "-of", "default=nk=1:nw=1", str(final)],
                           capture_output=True, text=True, check=True)
        num, _, den = r.stdout.strip().partition("/")
        out_fps = float(num) / float(den or 1)
        add("size", "PASS" if (info["width"], info["height"]) == (w, h) else "FAIL",
            f"{info['width']}x{info['height']} (target {w}x{h})")
        add("fps", "PASS" if abs(out_fps - fps) <= 0.5 else "FAIL", f"{out_fps:.2f} fps (target {fps:g})")
        # expected length: kept source time, speed-adjusted, minus the overlap of every crossfade
        expected = 0.0
        for sg in timeline_segments(plan):
            expected += sum((pc["src_end"] - pc["src_start"]) / (pc.get("factor") or 1.0) for pc in sg["pieces"])
            if sg.get("transition"):
                expected -= float(sg["transition"]["duration"])
        diff = abs(info["duration"] - expected)
        add("duration", "PASS" if diff <= 0.5 else "FAIL",
            f"{info['duration']:.2f}s (expected {expected:.2f}s)")
        if info["has_audio"]:
            lufs = measure_loudness(final)["lufs"]
            off = abs(lufs - LUFS_TARGET)
            add("loudness", "PASS" if off <= LUFS_TOLERANCE else "WARN",
                f"{lufs:.1f} LUFS (target {LUFS_TARGET:g} +/- {LUFS_TOLERANCE:g})")
        else:
            add("loudness", "PASS", "no audio stream")
    except Exception as e:  # a broken check must not fail a render that has already been written
        add("scorecard", "skipped", f"{type(e).__name__}: {str(e)[:200]}")

    statuses = {c["status"] for c in checks}
    status = "FAIL" if "FAIL" in statuses else "WARN" if "WARN" in statuses else "PASS"
    return {"status": status, "checks": checks}


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
        shutil.move(cut_path, final)  # nothing to composite: skip the caption renderer entirely
        stage = "ffmpeg-only"
    else:
        scratch = Path(tempfile.mkdtemp(prefix=f"{name}_captions_", dir=workdir))
        try:
            final, warnings = build_composition(scratch / "project", cut_path, dur, captions, overlays, w, h, fps,
                                                out_mp4=final, style=plan.get("caption_style"),
                                                timeout=_captions_timeout(preview))
            stage = "revideo"
        except Exception as e:
            reason = str(e).strip().splitlines()[-1][:300] if str(e).strip() else type(e).__name__
            if captions:
                try:  # never drop captions silently: burn them in with FFmpeg and say what could not be drawn
                    burn_captions(cut_path, captions, w, h, final, workdir / f"{name}_ass",
                                  preset="ultrafast" if preview else "veryfast", crf=28 if preview else 18)
                    stage = "ffmpeg-ass-fallback"
                    warnings.append(f"caption render failed ({reason}); captions were burned in with the FFmpeg fallback"
                                    + ("; title/lower-third overlays were NOT drawn" if overlays else ""))
                except Exception as e2:
                    shutil.copy2(cut_path, final)
                    stage = "ffmpeg-fallback"
                    warnings.append(f"caption render failed ({reason}) and the caption fallback failed ({e2}); "
                                    "the video has NO captions or overlays")
            else:
                shutil.copy2(cut_path, final)
                stage = "ffmpeg-fallback"
                warnings.append(f"caption render failed ({reason}); overlays were NOT drawn")
        finally:
            shutil.rmtree(scratch, ignore_errors=True)
    audio_info: dict = {}
    if has_audio_effects(remapped):
        mixed = workdir / f"{name}_audio.mp4"
        audio_info = apply_audio(remapped, final, mixed, workdir / f"{name}_audio_work", probe(final)["duration"])
        shutil.move(mixed, final)
        stage += "+audio"
    result = {"audio": audio_info, "path": str(final), "duration": probe(final)["duration"], "width": w, "height": h, "fps": fps,
              "stage": stage, "warnings": warnings, "seconds": round(time.time() - t0, 1)}
    if not preview:  # the scorecard judges the final file, after audio has been applied
        result["scorecard"] = output_scorecard(final, remapped, w, h, fps)
    return result


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
