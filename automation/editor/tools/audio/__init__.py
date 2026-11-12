"""Audio tools (music, ducking, loudness, mute). Exposes TOOLS: dict[str, ToolSpec]."""
from .tools import (GENERATED, add_music, add_sfx, duck_music_under_speech, list_sfx, mute_segments,
                    normalize_loudness, remove_sfx)

_NUM = {"type": "number"}

TOOLS = {
    "add_music": {
        "fn": add_music,
        "description": "Add a background music bed from a local royalty-free file (`path`) or a simple synthesized "
                       "pad (`generate`: calm|ambient|upbeat). Loops to the video length with fades. Pair with "
                       "duck_music_under_speech so it never covers the voice. `start` is OUTPUT seconds. "
                       "Only use files the user has the rights to; never invent a path.",
        "input_schema": {"type": "object", "properties": {
            "path": {"type": "string"}, "generate": {"type": "string", "enum": sorted(GENERATED)},
            "volume_db": {"type": "number", "default": -18}, "start": {"type": "number", "default": 0},
            "fade_in": {"type": "number", "default": 1.0}, "fade_out": {"type": "number", "default": 2.0},
            "loop": {"type": "boolean", "default": True}, "workdir": {"type": "string"}}},
    },
    "duck_music_under_speech": {
        "fn": duck_music_under_speech,
        "description": "Make the music quieter while someone speaks (sidechain compression keyed on the voice). "
                       "amount_db is roughly how many dB the music drops during speech.",
        "input_schema": {"type": "object", "properties": {
            "amount_db": {"type": "number", "default": 12}, "attack_ms": {"type": "number", "default": 30},
            "release_ms": {"type": "number", "default": 400}, "enabled": {"type": "boolean", "default": True}}},
    },
    "normalize_loudness": {
        "fn": normalize_loudness,
        "description": "Normalize the final mix to a loudness target in LUFS (default -16, good for social video; "
                       "-14 streaming, -23 broadcast). Runs last, after music and ducking.",
        "input_schema": {"type": "object", "properties": {
            "target_lufs": {"type": "number", "default": -16}, "true_peak_db": {"type": "number", "default": -1.5},
            "lra": {"type": "number", "default": 11}, "enabled": {"type": "boolean", "default": True}}},
    },
    "mute_segments": {
        "fn": mute_segments,
        "description": "Silence the audio (picture stays) over SOURCE time ranges, e.g. a cough or a word to bleep.",
        "input_schema": {"type": "object", "properties": {
            "ranges": {"type": "array", "items": {"type": "object", "properties": {"start": _NUM, "end": _NUM},
                                                  "required": ["start", "end"]}},
            "mode": {"type": "string", "enum": ["append", "replace", "clear"], "default": "append"}},
            "required": ["ranges"]},
    },
}

TOOLS.update({
    "list_sfx": {
        "fn": list_sfx,
        "description": "List the studio's CC0 sound effects (whoosh, riser, drop, pop, ...) with category and length. "
                       "Call this before add_sfx; never invent an effect name.",
        "input_schema": {"type": "object", "properties": {
            "category": {"type": "string", "enum": ["impact", "transition", "ui", "fx"]}}},
    },
    "add_sfx": {
        "fn": add_sfx,
        "description": "Place one sound effect at a SOURCE time in seconds (e.g. a whoosh on the hook's first word, a riser "
                       "before a reveal, a pop on a caption). It plays over the voice. Only use names from list_sfx.",
        "input_schema": {"type": "object", "properties": {
            "name": {"type": "string"}, "at": {"type": "number"}, "volume_db": {"type": "number", "default": -8}},
            "required": ["name", "at"]},
    },
    "remove_sfx": {
        "fn": remove_sfx,
        "description": "Remove placed sound effects by id; omit ids to clear all of them.",
        "input_schema": {"type": "object", "properties": {"ids": {"type": "array", "items": {"type": "string"}}}},
    },
})

__all__ = ["TOOLS"]
