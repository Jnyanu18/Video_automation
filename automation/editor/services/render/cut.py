"""FFmpeg stage: frame-accurate cut of keep segments + reframe + scale to output size/fps."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[2]
if str(_REPO) not in sys.path:
    sys.path.append(str(_REPO))

from tools.edit.timeline import segments as timeline_segments  # noqa: E402
from tools.effects.ffmpeg import XFADE, atempo_chain, grade_filters, zoom_filters  # noqa: E402


_FILTER_SCRIPT_OK: bool | None = None


def _filter_file_args(path) -> list[str]:
    """Read a video filtergraph from a file: `-filter_script:v` (ffmpeg < 7) or `-/filter:v` (ffmpeg >= 7, where
    -filter_script was removed). Probed once per process."""
    global _FILTER_SCRIPT_OK
    if _FILTER_SCRIPT_OK is None:
        r = subprocess.run(["ffmpeg", "-hide_banner", "-h", "full"], capture_output=True, text=True)
        _FILTER_SCRIPT_OK = "-filter_script" in (r.stdout + r.stderr)
    return ["-filter_script:v" if _FILTER_SCRIPT_OK else "-/filter:v", str(path)]


def probe(path: str | Path) -> dict:
    import json
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height",
                        "-show_entries", "format=duration", "-of", "json", str(path)],
                       capture_output=True, text=True, check=True)
    d = json.loads(r.stdout)
    v = next((s for s in d["streams"] if s["codec_type"] == "video"), {})
    return {"width": v.get("width"), "height": v.get("height"),
            "has_audio": any(s["codec_type"] == "audio" for s in d["streams"]),
            "duration": float(d["format"]["duration"])}


def _even(n: float) -> int:
    n = int(round(n))
    return max(2, n - (n % 2))


def _track_expr(track: list[dict], key: str, seg_start: float, seg_end: float) -> str:
    """ffmpeg expression of segment-local time `t` linearly interpolating track[key] (0..1)."""
    pts = sorted(({"t": p["t"], "v": float(p[key])} for p in track or []), key=lambda p: p["t"])
    if not pts:
        return "0.5"
    # points inside the segment plus the bracketing neighbours so interpolation is correct at the edges
    before = [p for p in pts if p["t"] <= seg_start]
    after = [p for p in pts if p["t"] >= seg_end]
    mid = [p for p in pts if seg_start < p["t"] < seg_end]
    inside = ([before[-1]] if before else []) + mid + ([after[0]] if after else [])
    if len(inside) > 40:
        step = len(inside) / 40.0
        inside = [inside[int(i * step)] for i in range(40)]
    loc = [(p["t"] - seg_start, p["v"]) for p in inside]
    if len(loc) == 1:
        return f"{loc[0][1]:.4f}"
    parts = []
    for (t0, v0), (t1, v1) in zip(loc, loc[1:]):
        if t1 - t0 < 1e-6:
            continue
        slope = (v1 - v0) / (t1 - t0)
        parts.append(f"between(t,{t0:.3f},{t1:.3f})*({v0:.4f}+({slope:.5f})*(t-{t0:.3f}))")
    first, last = loc[0], loc[-1]
    parts.append(f"lt(t,{first[0]:.3f})*{first[1]:.4f}")
    parts.append(f"gt(t,{last[0]:.3f})*{last[1]:.4f}")
    return "(" + "+".join(parts) + ")"


def build_video_filter(plan: dict, seg: dict, out_w: int, out_h: int, fps: float, factor: float = 1.0) -> str:
    src = plan["source"]
    sw, sh = src["width"], src["height"]
    mode = (plan.get("reframe") or {}).get("mode", "none")
    out_ar = out_w / out_h
    src_ar = sw / sh
    chain = []
    if mode in ("center", "face-follow") and abs(out_ar - src_ar) > 0.01:
        # largest crop of the target aspect ratio
        if out_ar < src_ar:
            cw, ch = _even(sh * out_ar), sh
        else:
            cw, ch = sw, _even(sw / out_ar)
        if mode == "face-follow" and (plan["reframe"].get("track")):
            tr = plan["reframe"]["track"]
            ex = _track_expr(tr, "cx", seg["start"], seg["end"])
            ey = _track_expr(tr, "cy", seg["start"], seg["end"])
            x = f"max(0,min({sw - cw},({ex})*{sw}-{cw}/2))"
            y = f"max(0,min({sh - ch},({ey})*{sh}-{ch}/2))"
        else:
            x, y = f"({sw}-{cw})/2", f"({sh}-{ch})/2"
        chain.append(f"crop={cw}:{ch}:x='{x}':y='{y}'")
        chain.append(f"scale={out_w}:{out_h}:flags=bicubic")
    else:
        # none: fit inside output with black bars (no content lost)
        chain.append(f"scale={out_w}:{out_h}:force_original_aspect_ratio=decrease:flags=bicubic")
        chain.append(f"pad={out_w}:{out_h}:(ow-iw)/2:(oh-ih)/2:black")
    # effects, in order: punch-in zoom (source-time keyframes; `t` is piece-local), colour grade, then speed
    chain += zoom_filters(plan.get("zooms") or [], seg["start"], seg["end"], out_w, out_h)
    chain += grade_filters(plan.get("color_grade"))
    if abs(factor - 1.0) > 1e-9:
        chain.append(f"setpts=PTS/{factor:.6f}")
    chain += ["setsar=1", f"fps={fps}", "format=yuv420p"]
    return ",".join(chain)


def _run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg failed ({r.returncode}): {' '.join(cmd[:6])} ... {r.stderr[-1200:]}")


def _concat_copy(files: list[Path], lst: Path, out: Path) -> None:
    lst.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in files))
    _run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst),
          "-c", "copy", "-movflags", "+faststart", str(out)])


def _join_with_transitions(files: list[Path], durs: list[float], trans: list[dict | None], out: Path, has_audio: bool,
                           preset: str, crf: int) -> None:
    """Join segment files: xfade/acrossfade where trans[i] (between file i-1 and i) is set, plain concat elsewhere."""
    cmd = ["ffmpeg", "-y", "-v", "error"]
    for f in files:
        cmd += ["-i", str(f)]
    parts, vcur, acur, total = [], "[0:v]", "[0:a]", durs[0]
    for i in range(1, len(files)):
        vn, an = f"[v{i}]", f"[a{i}]"
        tr = trans[i]
        if tr:
            d = tr["duration"]
            parts.append(f"{vcur}[{i}:v]xfade=transition={XFADE.get(tr['kind'], 'fade')}:duration={d:.4f}:"
                         f"offset={total - d:.4f}{vn}")
            if has_audio:
                parts.append(f"{acur}[{i}:a]acrossfade=d={d:.4f}:c1=tri:c2=tri{an}")
            total += durs[i] - d
        else:
            if has_audio:
                parts.append(f"{vcur}{acur}[{i}:v][{i}:a]concat=n=2:v=1:a=1{vn}{an}")
            else:
                parts.append(f"{vcur}[{i}:v]concat=n=2:v=1:a=0{vn}")
            total += durs[i]
        vcur, acur = vn, an
    cmd += ["-filter_complex", ";".join(parts), "-map", vcur]
    if has_audio:
        cmd += ["-map", acur, "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "128k"]
    cmd += ["-c:v", "libx264", "-preset", preset, "-crf", str(crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(out)]
    _run(cmd)


def cut_and_reframe(plan: dict, workdir: Path, out: Path, out_w: int, out_h: int, fps: float,
                    preset: str = "veryfast", crf: int = 18, source: str | None = None) -> float:
    """Cut every keep segment (re-encoded => frame accurate), reframe, apply zoom/grade/speed per piece, join the
    segments (concat, or xfade where the plan has transitions) into `out`. Returns the output duration.

    Segment layout comes from tools.edit.timeline.segments(plan) so the render and remap_to_output always agree.
    """
    out_w, out_h = _even(out_w), _even(out_h)
    source = source or plan["source"]["path"]
    info = probe(source)
    tmp = workdir / "_segs"
    tmp.mkdir(parents=True, exist_ok=True)
    segs = timeline_segments(plan)
    seg_files: list[Path] = []
    seg_durs: list[float] = []
    for si, sg in enumerate(segs):
        pfiles = []
        for pi, pc in enumerate(sg["pieces"]):
            p = tmp / f"seg{si:03d}_{pi:02d}.mp4"
            flt = tmp / f"seg{si:03d}_{pi:02d}.vf"
            piece = {"start": pc["src_start"], "end": pc["src_end"]}
            flt.write_text(build_video_filter(plan, piece, out_w, out_h, fps, pc["factor"]))
            cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{pc['src_start']:.4f}", "-t",
                   f"{pc['src_end'] - pc['src_start']:.4f}", "-i", str(source), *_filter_file_args(flt),
                   "-c:v", "libx264", "-preset", preset, "-crf", str(crf), "-pix_fmt", "yuv420p"]
            if info["has_audio"]:
                af = ([atempo_chain(pc["factor"])] if abs(pc["factor"] - 1.0) > 1e-9 else []) + [
                    "aresample=async=1:first_pts=0"]
                cmd += ["-af", ",".join(af), "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "128k"]
            else:
                cmd += ["-an"]
            cmd.append(str(p))
            _run(cmd)
            pfiles.append(p)
        if len(pfiles) == 1:
            seg_files.append(pfiles[0])
        else:
            f = tmp / f"seg{si:03d}.mp4"
            _concat_copy(pfiles, tmp / f"seg{si:03d}.txt", f)
            seg_files.append(f)
        seg_durs.append(probe(seg_files[-1])["duration"])
    if any(sg.get("transition") for sg in segs[1:]):
        _join_with_transitions(seg_files, seg_durs, [None] + [sg.get("transition") for sg in segs[1:]], out,
                               info["has_audio"], preset, crf)
    else:
        _concat_copy(seg_files, tmp / "list.txt", out)
    return probe(out)["duration"]
