"""tools/visuals: B-roll slot suggestions, overlays, Hyperframes overlay snippets."""
from .broll import suggest_broll_slots, heuristic_scorer, make_llm_scorer, keyword_query
from .overlays import add_overlay, add_title, add_lower_third
from .providers import AssetProvider, LocalFolderProvider, StockAPIProvider, ChainProvider
from . import snippets

_T = {"type": "number", "description": "seconds (source time)"}

TOOLS = {
    "suggest_broll_slots": {
        "fn": suggest_broll_slots,
        "description": "Find moments in the transcript where B-roll would help (scored; returns slots with start/end, "
                       "reason and a search query). Suggestions only: apply with add_overlay kind=broll.",
        "input_schema": {"type": "object", "properties": {
            "transcript": {"type": "object", "description": "{words:[{word,start,end}]} or {segments:[{text,start,end}]}"},
            "max_slots": {"type": "integer", "default": 5},
            "min_score": {"type": "number", "default": 0.3},
            "min_duration": {"type": "number", "default": 1.5},
            "max_duration": {"type": "number", "default": 4.0},
            "min_gap": {"type": "number", "default": 3.0}}},
    },
    "add_overlay": {
        "fn": add_overlay,
        "description": "Add an overlay (broll|lower-third|title|graphic) between start and end seconds. For broll, asset is a video/image path.",
        "input_schema": {"type": "object", "properties": {
            "kind": {"type": "string", "enum": list(("broll", "lower-third", "title", "graphic"))},
            "start": _T, "end": _T, "asset": {"type": "string"}, "params": {"type": "object"}},
            "required": ["kind", "start", "end"]},
    },
    "add_title": {
        "fn": add_title,
        "description": "Add an animated title card overlay.",
        "input_schema": {"type": "object", "properties": {
            "text": {"type": "string"}, "start": _T, "end": _T, "subtitle": {"type": "string"},
            "style": {"type": "string", "enum": ["clean", "light", "bold"]},
            "position": {"type": "string", "enum": ["center", "top", "bottom"]}}, "required": ["text"]},
    },
    "add_lower_third": {
        "fn": add_lower_third,
        "description": "Add an animated lower-third (name + optional role/subtitle).",
        "input_schema": {"type": "object", "properties": {
            "name": {"type": "string"}, "subtitle": {"type": "string"}, "start": _T, "end": _T,
            "style": {"type": "string", "enum": ["clean", "light", "bold"]}}, "required": ["name", "start"]},
    },
}
