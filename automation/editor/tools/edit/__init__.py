"""Edit tools (agent E). Exposes TOOLS: dict[str, ToolSpec]."""
from .captions import set_captions, style_captions
from .cut import cut_segments, cut_silences
from .reframe import preview_frame, reframe_vertical
from .styles import CAPTION_STYLES
from .timeline import remap_to_output

_RANGE = {"type": "object", "properties": {"start": {"type": "number"}, "end": {"type": "number"}},
          "required": ["start", "end"]}
_STYLES = sorted(CAPTION_STYLES)

TOOLS = {
    "cut_silences": {
        "fn": cut_silences,
        "description": "Remove silent ranges (source seconds, e.g. from detect_silences) from the kept footage. "
                       "Only silences >= min_silence are cut; padding keeps a little air around speech.",
        "input_schema": {"type": "object", "properties": {
            "silences": {"type": "array", "items": _RANGE},
            "min_silence": {"type": "number", "default": 0.5},
            "padding": {"type": "number", "default": 0.08},
            "keep_gap": {"type": "number", "default": 0.0, "description": "seconds of each silence to leave as a breath"}},
            "required": ["silences"]},
    },
    "cut_segments": {
        "fn": cut_segments,
        "description": "Cut footage by SOURCE time: `remove` ranges are deleted from the edit; `keep` replaces the kept ranges.",
        "input_schema": {"type": "object", "properties": {
            "remove": {"type": "array", "items": _RANGE}, "keep": {"type": "array", "items": _RANGE}}},
    },
    "set_captions": {
        "fn": set_captions,
        "description": "Set captions from explicit {text,start,end} items or from word timings {word,start,end} "
                       "(grouped into short lines). Times are SOURCE seconds.",
        "input_schema": {"type": "object", "properties": {
            "captions": {"type": "array", "items": {"type": "object", "properties": {
                "text": {"type": "string"}, "start": {"type": "number"}, "end": {"type": "number"}},
                "required": ["text", "start", "end"]}},
            "words": {"type": "array", "items": {"type": "object", "properties": {
                "word": {"type": "string"}, "start": {"type": "number"}, "end": {"type": "number"}},
                "required": ["word", "start", "end"]}},
            "style": {"type": "string", "enum": _STYLES},
            "mode": {"type": "string", "enum": ["replace", "append"], "default": "replace"},
            "max_words": {"type": "integer"},
            "from_transcript": {"type": "boolean", "description": "use the saved transcript from transcribe instead of passing words (use this for anything longer than a minute)"}}},
    },
    "style_captions": {
        "fn": style_captions,
        "description": "Apply a caption style (" + ", ".join(_STYLES) + ") to all or some captions; "
                       "call with list_styles=true to see descriptions.",
        "input_schema": {"type": "object", "properties": {
            "style": {"type": "string", "enum": _STYLES},
            "caption_ids": {"type": "array", "items": {"type": "string"}},
            "list_styles": {"type": "boolean"}}},
    },
    "reframe_vertical": {
        "fn": reframe_vertical,
        "description": "Make the output vertical (default 1080x1920) using face-follow (needs a track from track_faces), "
                       "center crop, or none (restore source framing).",
        "input_schema": {"type": "object", "properties": {
            "mode": {"type": "string", "enum": ["face-follow", "center", "none"], "default": "face-follow"},
            "track": {"type": "array", "items": {"type": "object", "properties": {
                "t": {"type": "number"}, "cx": {"type": "number"}, "cy": {"type": "number"}},
                "required": ["t", "cx", "cy"]}},
            "width": {"type": "integer", "default": 1080}, "height": {"type": "integer", "default": 1920},
            "smoothing": {"type": "number", "default": 0.3}}},
    },
    "preview_frame": {
        "fn": preview_frame,
        "description": "Extract one JPEG frame at a time (output time by default) with the vertical crop applied; "
                       "returns its path for visual inspection. Does not modify the plan.",
        "input_schema": {"type": "object", "properties": {
            "time": {"type": "number"}, "workdir": {"type": "string"},
            "time_base": {"type": "string", "enum": ["output", "source"], "default": "output"}},
            "required": ["time", "workdir"]},
    },
}

__all__ = ["TOOLS", "remap_to_output", "CAPTION_STYLES"]
