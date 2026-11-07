"""Audio tools (music, ducking, loudness, mute). Exposes TOOLS: dict[str, ToolSpec]."""
from .tools import GENERATED, add_music, duck_music_under_speech, mute_segments, normalize_loudness

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

__all__ = ["TOOLS"]
