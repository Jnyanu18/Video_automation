"""Audio pass: mute ranges, music bed, ducking, loudness normalization. Runs on the finished video (video stream copied).

Stages (all FFmpeg):  voice -> mute -> [+ music (looped, faded, ducked by the voice)] -> mix.wav
                      -> loudnorm two-pass (measure, then linear apply) -> mux with the untouched video stream.
`plan` must be the OUTPUT-time plan (tools.edit.timeline.remap_to_output): audio.mute is then in output seconds,
audio.music.start is always output seconds.
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path


def has_audio_effects(plan: dict) -> bool:
    a = plan.get("audio") or {}
    return bool(a.get("mute") or a.get("music") or a.get("loudness") or a.get("sfx"))


def _run(cmd: list[str]) -> subprocess.CompletedProcess:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg failed ({r.returncode}): {r.stderr[-1500:]}")
    return r


def _has_audio_stream(path: Path) -> bool:
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0",
                        str(path)], capture_output=True, text=True)
    return bool(r.stdout.strip())


def _peak_db(path: Path) -> float | None:
    """Loudest sample of the file's audio in dBFS (volumedetect), or None if unreadable."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vn", "-af", "volumedetect", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.search(r"max_volume: (-?[\d.]+) dB", r.stderr)
    return float(m.group(1)) if m else None


OVER_DB = 10.0  # speech is assumed to sit about this far above the compressor threshold


def _duck_params(duck: dict, voice_peak_db: float | None = None) -> str:
    """sidechaincompress settings. The threshold follows the voice (peak - 16 dB, so quiet recordings still duck);
    speech then sits roughly OVER_DB above it and a ratio r pulls the music down by about OVER_DB * (1 - 1/r) dB:
    invert that for the requested amount."""
    amount = float(duck.get("amount_db", 12))
    thr_db = min(max((voice_peak_db if voice_peak_db is not None else -18.0) - 16.0, -60.0), -12.0)
    ratio = 20.0 if amount >= OVER_DB * 0.95 else min(20.0, max(1.5, 1.0 / (1.0 - amount / OVER_DB)))
    return (f"sidechaincompress=threshold={10 ** (thr_db / 20):.5f}:ratio={ratio:.2f}:attack={float(duck.get('attack_ms', 30)):.0f}:"
            f"release={float(duck.get('release_ms', 400)):.0f}:makeup=1")


def _build_base_graph(plan: dict, duration: float, has_voice: bool, voice_peak_db: float | None = None) -> tuple[str, list[str], str]:
    """Voice + music (+ducking). Input 0 = the video file (voice), input 1 = music when present."""
    a = plan.get("audio") or {}
    parts: list[str] = []
    voice = None
    if has_voice:
        chain = ["aresample=48000", "aformat=channel_layouts=stereo"]
        for m in a.get("mute") or []:
            chain.append(f"volume=enable='between(t,{float(m['start']):.3f},{float(m['end']):.3f})':volume=0")
        parts.append(f"[0:a]{','.join(chain)}[voice]")
        voice = "[voice]"
    music = a.get("music")
    extra: list[str] = []
    if not music:
        return ";".join(parts), extra, voice or ""
    if music.get("loop", True):
        extra += ["-stream_loop", "-1"]
    extra += ["-i", music["path"]]
    start = max(float(music.get("start", 0.0)), 0.0)
    length = max(duration - start, 0.1)
    fi, fo = float(music.get("fade_in", 0)), float(music.get("fade_out", 0))
    m = [f"atrim=0:{length:.3f}", "asetpts=PTS-STARTPTS", "aresample=48000", "aformat=channel_layouts=stereo",
         f"volume={float(music.get('volume_db', -18)):.2f}dB"]
    if fi > 0:
        m.append(f"afade=t=in:st=0:d={fi:.3f}")
    if fo > 0:
        m.append(f"afade=t=out:st={max(length - fo, 0):.3f}:d={fo:.3f}")
    if start > 0:
        m.append(f"adelay={int(start * 1000)}|{int(start * 1000)}")
    parts.append(f"[1:a]{','.join(m)}[music]")
    if not voice:
        return ";".join(parts), extra, "[music]"
    duck = a.get("duck") or {}
    if duck.get("enabled"):
        parts.append(f"{voice}asplit=2[vmix][vsc]")
        parts.append(f"[music][vsc]{_duck_params(duck, voice_peak_db)}[ducked]")
        parts.append("[vmix][ducked]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[mix]")
    else:
        parts.append(f"{voice}[music]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[mix]")
    return ";".join(parts), extra, "[mix]"


def build_mix_graph(plan: dict, duration: float, has_voice: bool, voice_peak_db: float | None = None) -> tuple[str, list[str], str]:
    """Returns (filter_complex, extra_input_args, output_label). Input 0 = the video file (voice), then music (if any),
    then one input per sound effect. Effects are delayed to their OUTPUT time and mixed on top (never ducked)."""
    graph, extra, label = _build_base_graph(plan, duration, has_voice, voice_peak_db)
    a = plan.get("audio") or {}
    fx = [x for x in a.get("sfx") or [] if x.get("path") and 0 <= float(x.get("at", 0)) < duration]
    if not fx:
        return graph, extra, label
    first = 1 + (1 if a.get("music") else 0)
    parts = [graph] if graph else []
    labels = [label] if label else []
    for i, x in enumerate(fx):
        ms = int(round(float(x["at"]) * 1000))
        extra += ["-i", x["path"]]
        parts.append(f"[{first + i}:a]aresample=48000,aformat=channel_layouts=stereo,"
                     f"volume={float(x.get('volume_db', -8)):.2f}dB,adelay={ms}|{ms}[sfx{i}]")
        labels.append(f"[sfx{i}]")
    parts.append("".join(labels) + f"amix=inputs={len(labels)}:duration=longest:normalize=0,"
                 f"atrim=0:{duration:.3f},alimiter=limit=0.95[mixfx]")
    return ";".join(parts), extra, "[mixfx]"


def measure_loudness(path: str | Path) -> dict:
    """Integrated loudness (LUFS), true peak (dBTP) and LRA of a file's audio, via loudnorm's analysis pass."""
    r = _run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af",
              "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"])
    j = json.loads(re.search(r"\{[^{}]*\}", r.stderr[r.stderr.rindex("{"):], re.S).group(0))
    return {"lufs": float(j["input_i"]), "true_peak": float(j["input_tp"]), "lra": float(j["input_lra"]),
            "threshold": float(j["input_thresh"]), "offset": float(j["target_offset"])}


def apply_audio(plan: dict, video_in: Path, video_out: Path, workdir: Path, duration: float) -> dict:
    """Run the audio pass on `video_in`, write `video_out`. Returns info (levels, steps)."""
    workdir.mkdir(parents=True, exist_ok=True)
    a = plan.get("audio") or {}
    has_voice = _has_audio_stream(video_in)
    steps = []
    mix = workdir / "mix.wav"
    graph, extra, label = build_mix_graph(plan, duration, has_voice, _peak_db(video_in) if has_voice else None)
    if not label:  # no voice and no music: nothing to do
        video_out.write_bytes(video_in.read_bytes())
        return {"steps": [], "note": "source has no audio and no music was added"}
    _run(["ffmpeg", "-y", "-v", "error", "-i", str(video_in), *extra, "-filter_complex", graph, "-map", label,
          "-t", f"{duration:.3f}", "-ar", "48000", "-c:a", "pcm_s16le", str(mix)])
    steps.append("mix")
    info: dict = {}
    final_wav = mix
    ln = a.get("loudness")
    if ln:
        target, tp, lra = float(ln["target_lufs"]), float(ln["true_peak_db"]), float(ln["lra"])
        first = _run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mix), "-af",
                      f"loudnorm=I={target}:TP={tp}:LRA={lra}:print_format=json", "-f", "null", "-"])
        j = json.loads(re.search(r"\{[^{}]*\}", first.stderr[first.stderr.rindex("{"):], re.S).group(0))
        info["before_lufs"] = float(j["input_i"])
        final_wav = workdir / "norm.wav"
        _run(["ffmpeg", "-y", "-v", "error", "-i", str(mix), "-af",
              f"loudnorm=I={target}:TP={tp}:LRA={lra}:measured_I={j['input_i']}:measured_TP={j['input_tp']}:"
              f"measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:"
              "linear=true:print_format=summary", "-ar", "48000", "-c:a", "pcm_s16le", str(final_wav)])
        steps.append("loudnorm")
    _run(["ffmpeg", "-y", "-v", "error", "-i", str(video_in), "-i", str(final_wav), "-map", "0:v", "-map", "1:a",
          "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", f"{duration:.3f}", "-movflags", "+faststart",
          str(video_out)])
    steps.append("mux")
    return {"steps": steps, **info}
