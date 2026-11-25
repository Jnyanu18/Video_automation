"""Agent tools for style cloning: extract_style (measure a reference video), apply_style, list_styles.

"Copy this reference's style" = extract_style(video=<reference>) then apply_style(style=<name>). Profiles are saved as JSON under
<workdir>/styles/<name>.json (or read from the repo's styles/ folder). Same contract as every tool:
fn(plan, **args) -> {"plan", "result", "warnings"}.
"""
from __future__ import annotations

import copy
import re
from pathlib import Path

from .apply import apply_style as _apply_style
from .style_extract import extract_style as _extract_style, load_style, save_style

REPO_STYLES = Path(__file__).resolve().parent
# styles/ names its caption looks "clean"; the editor's canonical name is "clean-lower"
CANONICAL_CAPTION_STYLE = {"clean": "clean-lower"}
_SAFE = re.compile(r"[^A-Za-z0-9_.-]+")


def _ret(plan, result=None, warnings=None):
    return {"plan": plan, "result": result or {}, "warnings": warnings or []}


def _dirs(workdir) -> list[Path]:
    return ([Path(workdir) / "styles"] if workdir else []) + [REPO_STYLES]


def _resolve(style: str, workdir) -> Path:
    """A path to a .json profile, or a bare name looked up in <workdir>/styles then the repo's styles/ folder."""
    p = Path(style).expanduser()
    if p.suffix.lower() == ".json" and p.is_file():
        return p
    name = _SAFE.sub("_", Path(style).stem if p.suffix.lower() == ".json" else style)
    for d in _dirs(workdir):
        if (d / f"{name}.json").is_file():
            return d / f"{name}.json"
    known = sorted({f.stem for d in _dirs(workdir) if d.is_dir() for f in d.glob("*.json")})
    raise ValueError(f"style {style!r} not found. Known styles: {known or 'none yet, run extract_style on a reference video first'}")


def _summary(profile: dict) -> dict:
    ep = profile["edit_params"]
    pc, sp = profile.get("pacing") or {}, profile.get("speech") or {}
    return {"name": profile["name"], "edit_params": ep,
            "evidence": {"avg_shot_length_s": pc.get("avg_shot_length"), "cuts_per_minute": pc.get("cuts_per_minute"),
                         "pauses": pc.get("pause_count"), "p90_pause_s": pc.get("p90_pause"),
                         "words_per_minute": sp.get("words_per_minute"),
                         "caption_band_detected": (profile.get("captions") or {}).get("detected"),
                         "lufs": (profile.get("audio") or {}).get("integrated_lufs"),
                         "palette": [c["hex"] for c in (profile.get("palette") or {}).get("colors", [])[:5]]}}


def extract_style(plan: dict, video: str, name: str | None = None, transcript: list | None = None,
                  workdir: str | None = None, **_) -> dict:
    """Measure a REFERENCE video (pacing, pauses, speech rate, loudness, caption look, palette) and save a style profile.
    Does not change the plan; call apply_style afterwards. `video` must be a real file path the user gave you."""
    v = Path(video).expanduser()
    if not v.is_file():
        raise ValueError(f"reference video not found: {video}")
    if not workdir:
        raise ValueError("extract_style needs a workdir to save the profile")
    prof = _extract_style(str(v), name=_SAFE.sub("_", name) if name else None, transcript=transcript)
    path = save_style(prof, str(Path(workdir) / "styles" / f"{prof['name']}.json"))
    warnings = []
    if not transcript:
        warnings.append("no transcript given: speech pace is unknown, caption pacing falls back to shot length")
    if (prof.get("captions") or {}).get("detected") and (prof["captions"].get("confidence") or 1) < 0.6:
        warnings.append("burned-in captions were detected with low confidence")
    return _ret(copy.deepcopy(plan), {"style": prof["name"], "path": path, **_summary(prof)}, warnings)


def apply_style(plan: dict, style: str, silences: list | None = None, apply_loudness: bool = True,
                set_output_size: bool = True, workdir: str | None = None, **_) -> dict:
    """Push a saved style profile into the plan: caption look + line length (word timings kept), output aspect ratio,
    pause tightening (give `silences` from detect_silences, source seconds), and the loudness target. It does NOT change
    shot length or add zooms/B-roll: use set_speed/add_zoom/add_transition for that, guided by `target_shot_length`."""
    path = _resolve(style, workdir)
    prof = load_style(str(path))
    ep = prof["edit_params"]
    sil = [(float(s["start"]), float(s["end"])) if isinstance(s, dict) else (float(s[0]), float(s[1])) for s in silences or []]
    keep_before = sum(k["end"] - k["start"] for k in plan.get("keep") or [])
    new = _apply_style(plan, prof, style_path=str(path), silences=sil or None, set_output_size=set_output_size)
    applied, warnings = [f"caption style/length ({ep['caption_style']}, {ep['caption_max_words']} words)"], []
    if new.get("captions") is not None and plan.get("captions"):
        mapped = CANONICAL_CAPTION_STYLE.get(ep["caption_style"], ep["caption_style"])
        for c in new["captions"]:
            c["style"] = mapped
    if set_output_size:
        applied.append(f"output aspect {ep['output_aspect']}")
    if sil:
        removed = keep_before - sum(k["end"] - k["start"] for k in new["keep"])
        applied.append(f"pauses over {ep['max_pause']}s tightened ({removed:.1f}s removed)")
    else:
        warnings.append(f"pauses were not tightened: pass `silences` (from detect_silences) to apply max_pause={ep['max_pause']}s")
    if apply_loudness and ep.get("target_lufs") is not None:
        t = max(-35.0, min(-5.0, float(ep["target_lufs"])))
        new.setdefault("audio", {})["loudness"] = {"target_lufs": round(t, 1), "true_peak_db": -1.5, "lra": 11.0}
        applied.append(f"loudness target {t:.1f} LUFS")
    warnings.append(f"shot length not applied (reference averages {ep['target_shot_length']}s per shot): "
                    "add cuts, zooms or transitions yourself if you want to match it")
    return _ret(new, {"style": prof["name"], "applied": applied, "output": new.get("output"),
                      "captions": len(new.get("captions") or [])}, warnings)


def list_styles(plan: dict, workdir: str | None = None, **_) -> dict:
    """List the style profiles available to apply_style (extracted this session, plus any in the repo's styles/ folder)."""
    found = {}
    for d in reversed(_dirs(workdir)):
        for f in sorted(d.glob("*.json")) if d.is_dir() else []:
            try:
                found[f.stem] = {"path": str(f), **_summary(load_style(str(f)))["edit_params"]}
            except Exception:
                continue
    return _ret(copy.deepcopy(plan), {"styles": found})


TOOLS = {
    "extract_style": {
        "fn": extract_style,
        "description": "Measure a REFERENCE video (pacing, pauses, speech rate, loudness, burned-in caption look, palette) and save "
                       "it as a style profile. Use when the user says 'copy the style of this video'. Then call apply_style.",
        "input_schema": {"type": "object", "properties": {
            "video": {"type": "string", "description": "path to the reference video (given by the user)"},
            "name": {"type": "string"},
            "transcript": {"type": "array", "description": "optional [{word,start,end}] of the reference, enables speech pace",
                           "items": {"type": "object"}}}, "required": ["video"]},
    },
    "apply_style": {
        "fn": apply_style,
        "description": "Apply a saved style profile to the plan: caption look and line length, output aspect ratio, pause tightening "
                       "(pass `silences` from detect_silences) and loudness target. Shot length is reported, not applied.",
        "input_schema": {"type": "object", "properties": {
            "style": {"type": "string", "description": "profile name from extract_style/list_styles, or a .json path"},
            "silences": {"type": "array", "items": {"type": "object", "properties": {"start": {"type": "number"}, "end": {"type": "number"}}}},
            "apply_loudness": {"type": "boolean", "default": True}, "set_output_size": {"type": "boolean", "default": True}},
            "required": ["style"]},
    },
    "list_styles": {
        "fn": list_styles,
        "description": "List the style profiles available to apply_style.",
        "input_schema": {"type": "object", "properties": {}},
    },
}
