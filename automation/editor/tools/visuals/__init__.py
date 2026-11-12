"""tools/visuals: B-roll slot suggestions, overlays, Hyperframes overlay snippets."""
from .broll import suggest_broll_slots, heuristic_scorer, make_llm_scorer, keyword_query
from .overlays import add_overlay, add_title, add_lower_third, add_diagram
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
            "kind": {"type": "string", "enum": list(("broll", "lower-third", "title", "graphic", "diagram"))},
            "start": _T, "end": _T, "asset": {"type": "string"}, "params": {"type": "object"}},
            "required": ["kind", "start", "end"]},
    },
    "add_title": {
        "fn": add_title,
        "description": "Add an animated title card overlay.",
        "input_schema": {"type": "object", "properties": {
            "text": {"type": "string"}, "start": _T, "end": _T, "subtitle": {"type": "string"},
            "style": {"type": "string", "enum": ["clean", "light", "bold"]},
            "position": {"type": "string", "enum": ["center", "top", "bottom"]},
            "y": {"type": "number", "description": "vertical centre of the card, 0 (top) to 1 (bottom); keep it off the speaker's face (about 0.3 for a talking head)"},
            "size": {"type": "number", "description": "font size in px on a 1080-wide frame (default 72)"},
            "box": {"type": "boolean", "description": "dark box behind the text for legibility"}}, "required": ["text"]},
    },
    "add_diagram": {
        "fn": add_diagram,
        "description": "Add an ANIMATED explainer diagram (not a text box) for a spoken idea, over SOURCE seconds start..end "
                       "(3 to 8 s). It is drawn below the speaker's face. Templates: flow (steps), versus (left/right cards "
                       "with meters), counter (number counting up), brands (big names vs us), shift (before -> after). Use one "
                       "per key idea instead of a plain text card.",
        "input_schema": {"type": "object", "properties": {
            "template": {"type": "string", "enum": ["flow", "versus", "counter", "brands", "shift", "custom"]}, "start": _T, "end": _T,
            "scene": {"type": "object", "description": "for template=custom: {elements:[...], motion:[...]} on a 1000x400 canvas (see studio/animator.py for the toolkit)"},
            "steps": {"type": "array", "items": {"type": "string"}},
            "left": {"type": "object", "description": "{tag, text, value 0..1, tone good|bad}"},
            "right": {"type": "object", "description": "{tag, text, value 0..1, tone good|bad}"},
            "value": {"type": "number"}, "suffix": {"type": "string"}, "caption": {"type": "string"},
            "top": {"type": "array", "items": {"type": "string"}}, "top_caption": {"type": "string"},
            "bottom": {"type": "string"}, "bottom_caption": {"type": "string"},
            "from": {"type": "string"}, "to": {"type": "string"}}, "required": ["template", "start", "end"]},
    },
    "add_lower_third": {
        "fn": add_lower_third,
        "description": "Add an animated lower-third (name + optional role/subtitle).",
        "input_schema": {"type": "object", "properties": {
            "name": {"type": "string"}, "subtitle": {"type": "string"}, "start": _T, "end": _T,
            "style": {"type": "string", "enum": ["clean", "light", "bold"]}}, "required": ["name", "start"]},
    },
}
