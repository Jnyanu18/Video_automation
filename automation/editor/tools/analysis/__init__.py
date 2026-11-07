"""tools.analysis: video analysis tools. Exposes TOOLS per docs/CONTRACT.md."""
from __future__ import annotations

from .analyze_video import analyze_video
from .faces import track_faces
from .scenes import detect_scenes
from .silences import detect_silences
from .transcribe import register_backend, transcribe

_VIDEO = {"type": "string", "description": "Path to the video. Defaults to plan.source.path."}
_WORKDIR = {"type": "string", "description": "Directory where JSON outputs are written."}


def _schema(props: dict, required: list[str] | None = None) -> dict:
    return {"type": "object", "properties": props, "required": required or []}


TOOLS = {
    "analyze_video": {
        "fn": analyze_video,
        "description": "Probe the source video (duration, size, fps) and run silence, scene and transcript "
                       "analysis in one call. Fills plan.source. Run this first on a new upload.",
        "input_schema": _schema({
            "video": _VIDEO, "workdir": _WORKDIR,
            "with_transcript": {"type": "boolean", "default": True},
            "with_scenes": {"type": "boolean", "default": True},
            "with_silences": {"type": "boolean", "default": True},
        }),
    },
    "transcribe": {
        "fn": transcribe,
        "description": "Word-level speech transcript with timestamps (seconds, source time) plus caption-sized "
                       "segments. If status is 'unavailable' the words are empty because the speech model failed, "
                       "not because there is no speech.",
        "input_schema": _schema({
            "video": _VIDEO, "workdir": _WORKDIR,
            "backend": {"type": "string", "enum": ["auto", "faster-whisper", "fixture"], "default": "auto"},
            "model_size": {"type": "string", "default": "base"},
            "language": {"type": "string", "description": "ISO code, e.g. 'en'; omit to auto-detect."},
            "transcript_fixture": {"type": "string", "description": "JSON transcript file (fixture backend)."},
        }),
    },
    "detect_silences": {
        "fn": detect_silences,
        "description": "Find silent intervals (and the complementary speech intervals) in the audio, in source seconds.",
        "input_schema": _schema({
            "video": _VIDEO, "workdir": _WORKDIR,
            "noise_db": {"type": "number", "default": -35, "description": "Silence threshold in dB."},
            "min_len": {"type": "number", "default": 0.5, "description": "Minimum silence length in seconds."},
        }),
    },
    "detect_scenes": {
        "fn": detect_scenes,
        "description": "Detect shot changes; returns cut times and contiguous scenes in source seconds.",
        "input_schema": _schema({
            "video": _VIDEO, "workdir": _WORKDIR,
            "threshold": {"type": "number", "default": 0.3, "description": "Scene score 0-1; lower = more cuts."},
            "min_scene_len": {"type": "number", "default": 0.5},
        }),
    },
    "track_faces": {
        "fn": track_faces,
        "description": "Track the main face over time and set plan.reframe to a smoothed normalized "
                       "{t,cx,cy} track (mode face-follow; falls back to center if no face is found).",
        "input_schema": _schema({
            "video": _VIDEO, "workdir": _WORKDIR,
            "sample_fps": {"type": "number", "default": 5},
            "start": {"type": "number", "default": 0}, "end": {"type": "number"},
            "smooth": {"type": "number", "default": 0.35, "description": "EMA factor 0-1; higher = snappier."},
            "set_reframe": {"type": "boolean", "default": True},
        }),
    },
}

__all__ = ["TOOLS", "analyze_video", "transcribe", "detect_silences", "detect_scenes", "track_faces",
           "register_backend"]
