"""analyze_video: one-shot probe + silences + scenes (+ transcript if requested). Fills plan.source."""
from __future__ import annotations

from ._common import new_plan, out, probe, resolve_video, workdir_path, write_json
from .scenes import detect_scenes
from .silences import detect_silences
from .transcribe import transcribe


def analyze_video(plan: dict, video: str | None = None, workdir: str | None = None, with_transcript: bool = True,
                  with_scenes: bool = True, with_silences: bool = True, **opts) -> dict:
    path = resolve_video(plan, video)
    info = probe(path)
    p2 = new_plan(plan)
    src = dict(p2.get("source") or {})
    src["path"] = src.get("path") or str(path)
    src["duration"] = info["duration"]
    for k in ("width", "height", "fps"):
        if info[k]:
            src[k] = info[k]
    p2["source"] = src
    p2.setdefault("keep", [{"id": "k1", "start": 0.0, "end": info["duration"]}])
    warnings, result = [], {"video": str(path), "probe": info}
    for flag, key, fn, kw in (
        (with_silences, "silences", detect_silences,
         {k: opts[k] for k in ("noise_db", "min_len") if k in opts}),
        (with_scenes, "scenes", detect_scenes,
         {k: opts[k] for k in ("threshold", "min_scene_len") if k in opts}),
        (with_transcript, "transcript", transcribe,
         {k: v for k, v in opts.items() if k in ("backend", "model_size", "language", "transcript_fixture")}),
    ):
        if not flag:
            continue
        if key == "silences" and not info["has_audio"]:
            warnings.append("no audio stream: skipping silences/transcript")
        if key in ("silences", "transcript") and not info["has_audio"]:
            continue
        r = fn(p2, video=str(path), workdir=workdir, **kw)
        result[key] = r["result"]
        warnings += r["warnings"]
    result["file"] = write_json(workdir_path(workdir, "analysis.json"), result)
    return out(p2, result, warnings)
