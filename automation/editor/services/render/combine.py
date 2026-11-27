"""Combined reel: title card + edited cut + end card -> one mp4 with one loudness-normalised audio track.

    parts = [{"kind": "title", "path": title.mp4}, {"kind": "cut", "path": cut.mp4}, {"kind": "end", "path": end.mp4}]
    out, info = combine_reel(parts, "reel.mp4", 1080, 1920, 30)

Cards come from render_cards(), which calls packages/motion-kit/render.mjs on the reel-frame Remotion project.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
from fractions import Fraction
from pathlib import Path

def _find_repo() -> Path:
    """Walk up from this file until packages/motion-kit exists. This workspace reaches automation/ through a junction,
    so a fixed parents[] index can land in a tree with no packages/ folder."""
    for start in (Path(os.path.abspath(__file__)), Path(os.path.realpath(__file__))):
        for parent in start.parents:
            if (parent / "packages" / "motion-kit" / "render.mjs").is_file():
                return parent
    return Path(os.path.abspath(__file__)).parents[4]


REPO = _find_repo()
MOTION_KIT = REPO / "packages" / "motion-kit"
REEL_FRAME = MOTION_KIT / "projects" / "reel-frame"
RENDER_MJS = MOTION_KIT / "render.mjs"

KINDS = ("title", "cut", "end")
TARGET_LUFS = -14.0    # same spec as motion-kit gate.py (-14 LUFS, true peak <= -1.5 dBTP)
TARGET_TP = -1.5
TARGET_LRA = 11.0
AUDIO_RATE = 48000
AUDIO_CHANNELS = 2
ENCODE_ARGS = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-profile:v", "high", "-pix_fmt", "yuv420p",
               "-c:a", "aac", "-b:a", "192k", "-ar", str(AUDIO_RATE), "-ac", str(AUDIO_CHANNELS)]


class CombineError(RuntimeError):
    pass


from .revideo import CardRenderError, render_cards  # noqa: E402  (title/end cards are rendered by Revideo)

def _run(cmd: list[str], what: str, timeout: int = 3600) -> subprocess.CompletedProcess:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout)
    except subprocess.TimeoutExpired as e:
        raise CombineError(f"{what} timed out after {timeout}s") from e
    if r.returncode != 0:
        raise CombineError(f"{what} failed ({r.returncode}): {(r.stderr or '')[-800:]}")
    return r


def probe_media(path: str | Path) -> dict:
    """Duration, video geometry/fps and audio format of a media file (ffprobe)."""
    r = _run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)], f"probe {path}")
    data = json.loads(r.stdout or "{}")
    streams = data.get("streams", [])
    v = next((s for s in streams if s.get("codec_type") == "video"), None)
    a = next((s for s in streams if s.get("codec_type") == "audio"), None)
    if v is None:
        raise CombineError(f"no video stream in {path}")
    fps = float(Fraction(v.get("avg_frame_rate") or v.get("r_frame_rate") or "0/1"))
    duration = float(data.get("format", {}).get("duration") or v.get("duration") or 0.0)
    return {
        "duration": duration,
        "width": int(v["width"]),
        "height": int(v["height"]),
        "fps": fps,
        "vcodec": v.get("codec_name"),
        "pix_fmt": v.get("pix_fmt"),
        "has_audio": a is not None,
        "acodec": a.get("codec_name") if a else None,
        "sample_rate": int(a["sample_rate"]) if a and a.get("sample_rate") else None,
        "channels": int(a["channels"]) if a and a.get("channels") else None,
    }


def _matches_target(info: dict, w: int, h: int, fps: float) -> bool:
    return (info["vcodec"] == "h264" and info["pix_fmt"] == "yuv420p"
            and info["width"] == w and info["height"] == h and abs(info["fps"] - fps) < 1e-3
            and info["has_audio"] and info["acodec"] == "aac"
            and info["sample_rate"] == AUDIO_RATE and info["channels"] == AUDIO_CHANNELS)


def _validate_parts(parts: list[dict], w: int, h: int, fps: float) -> None:
    if not parts:
        raise CombineError("parts is empty")
    for p in parts:
        if p.get("kind") not in KINDS:
            raise CombineError(f"part kind must be one of {KINDS}, got {p.get('kind')!r}")
        path = Path(str(p.get("path", "")))
        if not path.is_file() or path.stat().st_size == 0:
            raise CombineError(f"{p.get('kind')} part missing or empty: {path}")
    if not any(p["kind"] == "cut" for p in parts):
        raise CombineError("parts must include at least one kind='cut'")
    if w <= 0 or h <= 0 or w % 2 or h % 2:
        raise CombineError(f"width and height must be positive even numbers, got {w}x{h}")
    if not fps or fps <= 0:
        raise CombineError(f"fps must be positive, got {fps}")


def _normalise(src: str, dst: Path, w: int, h: int, fps: float, has_audio: bool) -> None:
    """Re-encode one part to the target geometry, fps, pixel format, audio rate and channel layout.
    Parts without audio (Remotion cards are silent) get a silent track so every part has the same streams."""
    vf = (f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=black,"
          f"setsar=1,fps={fps:g},format=yuv420p")
    af = f"aformat=sample_fmts=fltp:sample_rates={AUDIO_RATE}:channel_layouts=stereo"
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", src]
    if has_audio:
        cmd += ["-map", "0:v:0", "-map", "0:a:0", "-vf", vf, "-af", af]
    else:
        cmd += ["-f", "lavfi", "-i", f"anullsrc=r={AUDIO_RATE}:cl=stereo", "-map", "0:v:0", "-map", "1:a:0",
                "-vf", vf, "-af", af, "-shortest"]
    cmd += ENCODE_ARGS + ["-movflags", "+faststart", str(dst)]
    _run(cmd, f"normalise {Path(src).name}")


def _concat_list(files: list[Path], path: Path) -> None:
    lines = ["file '" + f.resolve().as_posix().replace("'", "'\\''") + "'" for f in files]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


_LOUDNORM_JSON = re.compile(r'\{[^{}]*"input_i"[^{}]*\}', re.S)


def _measure_loudness(path: str | Path) -> dict:
    r = subprocess.run(["ffmpeg", "-nostats", "-hide_banner", "-i", str(path), "-map", "0:a:0",
                        "-af", f"loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA={TARGET_LRA}:print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    blocks = _LOUDNORM_JSON.findall(r.stderr or "")
    if r.returncode != 0 or not blocks:
        raise CombineError(f"loudness measurement failed for {path}: {(r.stderr or '')[-400:]}")
    d = json.loads(blocks[-1])
    if "inf" in str(d["input_i"]).lower():
        raise CombineError(f"{path} has no audible audio (loudness is {d['input_i']})")
    return d


def combine_reel(parts: list[dict], out_path: str | Path, width: int, height: int, fps: float,
                 *, workdir: str | Path | None = None, verify: bool = True) -> tuple[str, dict]:
    """Join ordered parts into one mp4 at width x height and fps, with loudness-normalised audio.

    parts: [{"kind": "title"|"cut"|"end", "path": ...}, ...] in playback order.
    Video: if every part already matches the target (h264 yuv420p, size, fps, AAC 48 kHz stereo) the parts are
    joined with the concat demuxer and no video is re-encoded. Otherwise every part is normalised once to the
    same encoder settings, then joined losslessly with stream copy. The audio track is always re-encoded once
    for loudness (two-pass loudnorm to -14 LUFS / -1.5 dBTP).

    Returns (out_path, info) with info = {path, duration, width, height, fps, video, lufs, true_peak, parts}.
    lufs/true_peak are measured on the delivered file when verify=True (None otherwise).
    """
    fps = float(fps)
    _validate_parts(parts, width, height, fps)
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    own_work = workdir is None
    work = Path(workdir) if workdir else Path(tempfile.mkdtemp(prefix="combine_"))
    work.mkdir(parents=True, exist_ok=True)
    try:
        infos = [probe_media(p["path"]) for p in parts]
        passthrough = all(_matches_target(i, width, height, fps) for i in infos)
        if passthrough:
            files = [Path(p["path"]) for p in parts]
            video_mode = "copy"
        else:
            files = []
            for k, (p, i) in enumerate(zip(parts, infos)):
                dst = work / f"part{k:02d}_{p['kind']}.mp4"
                _normalise(p["path"], dst, width, height, fps, i["has_audio"])
                files.append(dst)
            video_mode = "reencoded-parts"

        lst = work / "concat.txt"
        _concat_list(files, lst)
        joined = work / "joined.mp4"
        _run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst),
              "-c", "copy", "-avoid_negative_ts", "make_zero", "-movflags", "+faststart", str(joined)], "concat")

        m = _measure_loudness(joined)
        loud = (f"loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA={TARGET_LRA}:measured_I={m['input_i']}"
                f":measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}"
                f":offset={m['target_offset']}:linear=true:print_format=summary")
        tmp_out = work / "final.mp4"
        _run(["ffmpeg", "-y", "-v", "error", "-i", str(joined), "-map", "0:v:0", "-map", "0:a:0",
              "-c:v", "copy", "-af", loud, "-c:a", "aac", "-b:a", "256k", "-ar", str(AUDIO_RATE),
              "-ac", str(AUDIO_CHANNELS), "-movflags", "+faststart", str(tmp_out)], "loudness normalise")
        shutil.move(str(tmp_out), str(out))

        got = probe_media(out)
        info = {
            "path": str(out), "duration": got["duration"], "width": got["width"], "height": got["height"],
            "fps": round(got["fps"], 3), "video": video_mode, "audio_rate": AUDIO_RATE,
            "lufs": None, "true_peak": None,
            "parts": [{"kind": p["kind"], "duration": round(i["duration"], 3), "width": i["width"],
                       "height": i["height"], "fps": round(i["fps"], 3)} for p, i in zip(parts, infos)],
        }
        if verify:
            after = _measure_loudness(out)
            info["lufs"] = round(float(after["input_i"]), 2)
            info["true_peak"] = round(float(after["input_tp"]), 2)
        return str(out), info
    finally:
        if own_work:
            shutil.rmtree(work, ignore_errors=True)


