"""Effect tools (speed, zoom, transitions, colour grade). Exposes TOOLS: dict[str, ToolSpec]."""
from .ffmpeg import GRADE_PRESETS, XFADE
from .tools import add_transition, add_zoom, clear_effects, set_color_grade, set_speed

_NUM = {"type": "number"}

TOOLS = {
    "set_speed": {
        "fn": set_speed,
        "description": "Change playback speed of a SOURCE time range (video and audio together, pitch preserved). "
                       "factor 2 = twice as fast, 0.5 = slow motion, 1 = back to normal. This changes the output "
                       "duration; captions and overlays follow automatically.",
        "input_schema": {"type": "object", "properties": {
            "start": _NUM, "end": _NUM, "factor": {"type": "number", "minimum": 0.1, "maximum": 16}},
            "required": ["start", "end", "factor"]},
    },
    "add_zoom": {
        "fn": add_zoom,
        "description": "Punch-in zoom over a SOURCE time range: eases in to `scale`, holds, eases out. cx/cy (0..1) "
                       "pick the zoom centre (e.g. 0.5/0.35 for a face). Good for emphasis on a key sentence.",
        "input_schema": {"type": "object", "properties": {
            "start": _NUM, "end": _NUM, "scale": {"type": "number", "default": 1.25, "minimum": 1.01, "maximum": 4},
            "cx": {"type": "number", "default": 0.5}, "cy": {"type": "number", "default": 0.5},
            "ramp": {"type": "number", "default": 0.4, "description": "seconds to ease in and out"},
            "ease": {"type": "string", "enum": ["smooth", "linear"], "default": "smooth"}},
            "required": ["start", "end"]},
    },
    "add_transition": {
        "fn": add_transition,
        "description": "Add a transition (xfade) at a cut between two kept segments; each transition shortens the "
                       "output by its duration. Pick the cut with `boundary` (0 = first cut), `at` (source time) "
                       "or all=true. Needs at least two kept segments.",
        "input_schema": {"type": "object", "properties": {
            "kind": {"type": "string", "enum": sorted(XFADE), "default": "crossfade"},
            "duration": {"type": "number", "default": 0.5},
            "boundary": {"type": "integer"}, "at": _NUM, "all": {"type": "boolean"}}},
    },
    "set_color_grade": {
        "fn": set_color_grade,
        "description": "Colour grade the whole video: a preset, an optional LUT file (.cube/.3dl), and manual "
                       "exposure (EV), contrast, saturation, brightness. Unset fields keep their value; reset=true clears.",
        "input_schema": {"type": "object", "properties": {
            "preset": {"type": "string", "enum": sorted(GRADE_PRESETS)},
            "lut": {"type": "string", "description": "path to a .cube or .3dl file"},
            "exposure": {"type": "number", "minimum": -3, "maximum": 3},
            "contrast": {"type": "number", "minimum": 0.5, "maximum": 2},
            "saturation": {"type": "number", "minimum": 0, "maximum": 3},
            "brightness": {"type": "number", "minimum": -0.5, "maximum": 0.5},
            "reset": {"type": "boolean"}}},
    },
    "clear_effects": {
        "fn": clear_effects,
        "description": "Remove speed changes, zooms, transitions or the colour grade (kind = speed|zooms|transitions|"
                       "color_grade|all), optionally only the given ids.",
        "input_schema": {"type": "object", "properties": {
            "kind": {"type": "string", "enum": ["speed", "zooms", "transitions", "color_grade", "all"]},
            "ids": {"type": "array", "items": {"type": "string"}}}, "required": ["kind"]},
    },
}

__all__ = ["TOOLS"]
