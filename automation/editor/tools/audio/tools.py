"""Audio tools: add_music, duck_music_under_speech, normalize_loudness, mute_segments.

They only edit `plan["audio"]`; services/render/audio.py does the mixing after the picture is rendered.
  audio = {"music": {"path","volume_db","start","fade_in","fade_out","loop"},   # start is OUTPUT time
           "duck":  {"enabled","amount_db","attack_ms","release_ms"},
           "loudness": {"target_lufs","true_peak_db","lra"},
           "mute": [{"id","start","end"}]}                                         # SOURCE time
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from tools.edit._common import clone, out
from tools.edit.timeline import EPS, normalize_keep, output_duration, source_to_output

from . import sfx as sfxlib

AUDIO_EXT = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".opus"}

# Procedural, royalty-free, license-free "generated" tracks (ffmpeg synthesis, no model or network needed).
GENERATED = {
    "calm": "sine=f=110:d={d},sine=f=220:d={d},sine=f=261.63:d={d},sine=f=329.63:d={d}",
    "ambient": "sine=f=82.41:d={d},sine=f=164.81:d={d},sine=f=246.94:d={d},sine=f=392:d={d}",
    "upbeat": "sine=f=130.81:d={d},sine=f=196:d={d},sine=f=261.63:d={d},sine=f=329.63:d={d}",
}


def _probe_audio(path: Path) -> float:
    """Duration in seconds of the first audio stream; raises ValueError if there is none."""
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=duration:"
                            "format=duration", "-of", "json", str(path)], capture_output=True, text=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        raise ValueError(f"cannot read audio file {path}: {getattr(e, 'stderr', e)}") from e
    d = json.loads(r.stdout)
    if not d.get("streams"):
        raise ValueError(f"{path} has no audio stream")
    return float(d["streams"][0].get("duration") or d["format"]["duration"])


def _generate(kind: str, workdir: Path, seconds: float = 40.0) -> Path:
    """Synthesize a soft pad: chord tones, slow tremolo, echo. Deterministic, loops cleanly with fades."""
    if kind not in GENERATED:
        raise ValueError(f"unknown generated track '{kind}'. Choose from: {', '.join(sorted(GENERATED))}")
    workdir.mkdir(parents=True, exist_ok=True)
    path = workdir / f"music_{kind}.wav"
    srcs = GENERATED[kind].format(d=seconds).split(",")
    cmd = ["ffmpeg", "-y", "-v", "error"]
    for s in srcs:
        cmd += ["-f", "lavfi", "-i", s]
    trem = "tremolo=f=2:d=0.5," if kind == "upbeat" else "tremolo=f=0.25:d=0.3,"
    fc = (f"amix=inputs={len(srcs)}:normalize=0,{trem}aecho=0.7:0.6:300|600:0.3|0.2,"
          "lowpass=f=2400,volume=0.6,afade=t=in:d=2,aformat=channel_layouts=stereo")
    cmd += ["-filter_complex", fc, "-ar", "48000", "-c:a", "pcm_s16le", str(path)]
    subprocess.run(cmd, check=True, capture_output=True)
    return path


def add_music(plan: dict, path: str | None = None, generate: str | None = None, volume_db: float = -18.0,
              start: float = 0.0, fade_in: float = 1.0, fade_out: float = 2.0, loop: bool = True,
              workdir: str | None = None, **_) -> dict:
    """Add a background music bed. Give `path` (a local royalty-free file you have the rights to) or
    `generate` ("calm" | "ambient" | "upbeat": a simple synthesized pad). `start` is OUTPUT-time seconds.
    volume_db is the level relative to full scale before ducking/normalizing (-18 sits well under speech)."""
    if bool(path) == bool(generate):
        raise ValueError("give exactly one of `path` or `generate`")
    if not -60 <= float(volume_db) <= 0:
        raise ValueError("volume_db must be between -60 and 0")
    if float(start) < 0 or float(fade_in) < 0 or float(fade_out) < 0:
        raise ValueError("start, fade_in and fade_out must be >= 0")
    warnings: list[str] = []
    if generate:
        if not workdir:
            raise ValueError("`generate` needs a workdir to write the track into")
        p = _generate(generate, Path(workdir) / "music")
        warnings.append("generated music is a simple synthesized pad; for real music pass a licensed file as `path`")
    else:
        p = Path(path).expanduser()
        if p.suffix.lower() not in AUDIO_EXT:
            raise ValueError(f"unsupported audio file type '{p.suffix}'")
        if not p.is_file():
            raise ValueError(f"music file not found: {path}")
    dur = _probe_audio(p)
    total = output_duration(plan)
    if total and float(start) >= total:
        warnings.append("music start is after the end of the video; it will not be heard")
    if not loop and total and dur < total - float(start):
        warnings.append(f"music ({dur:.1f}s) is shorter than the video and loop is off: it will end early")
    new = clone(plan)
    audio = new.setdefault("audio", {})
    audio["music"] = {"path": str(p.resolve()), "volume_db": float(volume_db), "start": float(start),
                      "fade_in": float(fade_in), "fade_out": float(fade_out), "loop": bool(loop)}
    return out(new, {"music": audio["music"], "music_duration": round(dur, 2)}, warnings)


def duck_music_under_speech(plan: dict, amount_db: float = 12.0, attack_ms: float = 30.0, release_ms: float = 400.0,
                            enabled: bool = True, **_) -> dict:
    """Lower the music while someone is speaking (sidechain compression keyed on the voice track).
    amount_db ~ how many dB quieter the music gets during speech (about 6-18 is sensible)."""
    if not 1 <= float(amount_db) <= 30:
        raise ValueError("amount_db must be between 1 and 30")
    if not (1 <= float(attack_ms) <= 500 and 10 <= float(release_ms) <= 5000):
        raise ValueError("attack_ms must be 1..500 and release_ms 10..5000")
    warnings = []
    if not (plan.get("audio") or {}).get("music"):
        warnings.append("there is no music yet; ducking only applies once add_music has been called")
    new = clone(plan)
    new.setdefault("audio", {})["duck"] = {"enabled": bool(enabled), "amount_db": float(amount_db),
                                           "attack_ms": float(attack_ms), "release_ms": float(release_ms)}
    return out(new, {"duck": new["audio"]["duck"]}, warnings)


def normalize_loudness(plan: dict, target_lufs: float = -16.0, true_peak_db: float = -1.5, lra: float = 11.0,
                       enabled: bool = True, **_) -> dict:
    """Normalize the final mix to a loudness target (EBU R128 loudnorm, two-pass). -16 LUFS suits social video
    and podcasts; -14 for streaming platforms; -23 for broadcast."""
    if not -35 <= float(target_lufs) <= -5:
        raise ValueError("target_lufs must be between -35 and -5")
    if not -9 <= float(true_peak_db) <= 0:
        raise ValueError("true_peak_db must be between -9 and 0")
    if not 1 <= float(lra) <= 20:
        raise ValueError("lra must be between 1 and 20")
    new = clone(plan)
    if enabled:
        new.setdefault("audio", {})["loudness"] = {"target_lufs": float(target_lufs),
                                                   "true_peak_db": float(true_peak_db), "lra": float(lra)}
    else:
        (new.get("audio") or {}).pop("loudness", None)
    return out(new, {"loudness": (new.get("audio") or {}).get("loudness")})


def mute_segments(plan: dict, ranges: list, mode: str = "append", **_) -> dict:
    """Silence the audio (not the picture) of SOURCE time ranges, e.g. a cough or a bleeped word.
    mode: append (default) | replace | clear."""
    if mode not in ("append", "replace", "clear"):
        raise ValueError("mode must be append, replace or clear")
    new_ranges: list[tuple[float, float]] = []
    for r in ranges or []:
        try:
            s, e = (float(r["start"]), float(r["end"])) if isinstance(r, dict) else (float(r[0]), float(r[1]))
        except (KeyError, IndexError, TypeError, ValueError) as ex:
            raise ValueError(f"bad mute range {r!r}") from ex
        if s < 0 or e - s <= EPS:
            raise ValueError(f"bad mute range [{s}, {e}]")
        new_ranges.append((s, e))
    if mode != "clear" and not new_ranges:
        raise ValueError("give at least one range")
    new = clone(plan)
    audio = new.setdefault("audio", {})
    old = [] if mode in ("replace", "clear") else [(float(m["start"]), float(m["end"])) for m in audio.get("mute") or []]
    merged = normalize_keep([{"start": a, "end": b} for a, b in old + new_ranges])
    warnings = []
    kept = normalize_keep(plan.get("keep"), plan.get("source", {}).get("duration"))
    if new_ranges and not any(min(e, ke) - max(s, ks) > EPS for s, e in new_ranges for ks, ke in kept):
        warnings.append("the muted range is outside the kept footage; it has no audible effect")
    if merged:
        audio["mute"] = [{"id": f"m{i + 1}", "start": round(a, 6), "end": round(b, 6)} for i, (a, b) in enumerate(merged)]
    else:
        audio.pop("mute", None)
    if not audio:
        new.pop("audio")
    return out(new, {"muted_ranges": len(merged), "muted_seconds": round(sum(b - a for a, b in merged), 3)}, warnings)


def list_sfx(plan: dict, category: str | None = None, **_) -> dict:
    """List the studio's CC0 sound effects (name, category, length). Does not change the plan."""
    items = sfxlib.catalog(with_duration=True)
    if category:
        items = [i for i in items if i["category"] == category]
    placed = (plan.get("audio") or {}).get("sfx") or []
    return out(clone(plan), {"count": len(items), "sfx": [{k: i[k] for k in ("name", "category", "duration")} for i in items],
                             "placed": placed})


def add_sfx(plan: dict, name: str, at: float, volume_db: float = -8.0, **_) -> dict:
    """Place a sound effect at a SOURCE time (seconds). It plays over the voice (not ducked) and follows the edit:
    if the moment is cut away the effect is dropped at render time, so only place it inside kept footage."""
    p = sfxlib.resolve(name)
    if float(at) < 0:
        raise ValueError("at must be >= 0")
    if not -40 <= float(volume_db) <= 6:
        raise ValueError("volume_db must be between -40 and 6")
    dur = (plan.get("source") or {}).get("duration")
    if dur and float(at) > float(dur):
        raise ValueError(f"at={at} is past the end of the source ({float(dur):.2f}s)")
    warnings: list[str] = []
    if plan.get("keep") and source_to_output(plan, float(at)) is None:
        warnings.append(f"{float(at):.2f}s lies in a cut region; this effect will not be heard until that footage is kept")
    new = clone(plan)
    lst = new.setdefault("audio", {}).setdefault("sfx", [])
    n = 1 + max((int(str(x.get("id", "s0"))[1:] or 0) for x in lst if str(x.get("id", "")).startswith("s")), default=0)
    item = {"id": f"s{n}", "name": p.stem, "path": str(p), "at": round(float(at), 3), "volume_db": float(volume_db)}
    lst.append(item)
    lst.sort(key=lambda x: x["at"])
    return out(new, {"sfx": item, "total": len(lst)}, warnings)


def remove_sfx(plan: dict, ids: list | None = None, **_) -> dict:
    """Remove placed sound effects by id (omit ids to clear them all)."""
    new = clone(plan)
    audio = new.get("audio") or {}
    cur = audio.get("sfx") or []
    keep = [] if not ids else [x for x in cur if x.get("id") not in set(ids)]
    removed = len(cur) - len(keep)
    if keep:
        audio["sfx"] = keep
    else:
        audio.pop("sfx", None)
    if not audio:
        new.pop("audio", None)
    warnings = [] if removed else ["no matching sound effects were placed"]
    return out(new, {"removed": removed, "remaining": len(keep)}, warnings)
