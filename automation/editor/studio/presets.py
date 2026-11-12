"""Built-in style presets and ffprobe helper for the editor API."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

PRESET_STYLES = {
    "viral_hook_fast_pace": {
        "name": "viral_hook_fast_pace",
        "description": "Fast-paced TikTok/Reel pace: aggressive pause tightening (<0.22s), cuts every 1.5-2.0s, bold-pop karaoke captions, -14 LUFS.",
        "edit_params": {
            "max_pause": 0.22,
            "target_shot_length": 1.8,
            "caption_style": "karaoke",
            "caption_max_words": 3,
            "caption_position": "middle",
            "output_aspect": "9:16",
            "target_lufs": -14.0,
        },
        "pacing": {"avg_shot_length": 1.8, "cuts_per_minute": 33.3, "speech_wpm": 180},
    },
    "educational_talking_head": {
        "name": "educational_talking_head",
        "description": "Clear educational tempo: conversational pauses (<0.38s), clean-lower captions, balanced framing, -15 LUFS.",
        "edit_params": {
            "max_pause": 0.38,
            "target_shot_length": 3.2,
            "caption_style": "clean-lower",
            "caption_max_words": 5,
            "caption_position": "bottom",
            "output_aspect": "9:16",
            "target_lufs": -15.0,
        },
        "pacing": {"avg_shot_length": 3.2, "cuts_per_minute": 18.5, "speech_wpm": 150},
    },
    "cinematic_punch": {
        "name": "cinematic_punch",
        "description": "Dramatic pacing: dynamic punch-in zooms on key moments, bold highlights, cinematic loudness target.",
        "edit_params": {
            "max_pause": 0.28,
            "target_shot_length": 2.2,
            "caption_style": "bold-pop",
            "caption_max_words": 4,
            "caption_position": "middle",
            "output_aspect": "9:16",
            "target_lufs": -14.0,
        },
        "pacing": {"avg_shot_length": 2.2, "cuts_per_minute": 27.0, "speech_wpm": 165},
    },
    "event_aftermovie": {
        "name": "event_aftermovie",
        "description": "High-energy festival & aftermovie style: rapid cuts (1.2-1.8s), speed ramps, punch-in zooms, bass drops and flash transitions on musical beats, -13 LUFS.",
        "edit_params": {
            "max_pause": 0.20,
            "target_shot_length": 1.5,
            "caption_style": "bold-pop",
            "caption_max_words": 3,
            "caption_position": "middle",
            "output_aspect": "9:16",
            "target_lufs": -13.0,
        },
        "pacing": {"avg_shot_length": 1.5, "cuts_per_minute": 40.0, "speech_wpm": 185},
    },
    "math_aptitude_masterclass": {
        "name": "math_aptitude_masterclass",
        "description": "Engaging math/aptitude explainer: visual counting grids, animated formulas, synchronized step-by-step reveals, clean bottom typography, -15 LUFS.",
        "edit_params": {
            "max_pause": 0.35,
            "target_shot_length": 3.0,
            "caption_style": "clean-lower",
            "caption_max_words": 5,
            "caption_position": "bottom",
            "output_aspect": "9:16",
            "target_lufs": -15.0,
        },
        "pacing": {"avg_shot_length": 3.0, "cuts_per_minute": 20.0, "speech_wpm": 155},
    },
    "fashion_luxury_editorial": {
        "name": "fashion_luxury_editorial",
        "description": "Luxury fashion & product showcase: elegant pacing (2.5-3.5s), subtle slow-motion, aesthetic serif typography, rich color grade, -16 LUFS.",
        "edit_params": {
            "max_pause": 0.40,
            "target_shot_length": 2.8,
            "caption_style": "clean-lower",
            "caption_max_words": 4,
            "caption_position": "bottom",
            "output_aspect": "9:16",
            "target_lufs": -16.0,
        },
        "pacing": {"avg_shot_length": 2.8, "cuts_per_minute": 21.4, "speech_wpm": 140},
    },
    "yc_product_presentation": {
        "name": "yc_product_presentation",
        "description": "Silicon Valley pitch style: dynamic split-screen (45% animated product UI/charts, 55% founder footage), context-aware transitions, keyword emphasis, -14 LUFS.",
        "edit_params": {
            "max_pause": 0.26,
            "target_shot_length": 2.4,
            "caption_style": "karaoke",
            "caption_max_words": 4,
            "caption_position": "bottom",
            "output_aspect": "9:16",
            "target_lufs": -14.0,
        },
        "pacing": {"avg_shot_length": 2.4, "cuts_per_minute": 25.0, "speech_wpm": 160},
    },
}


def probe_video_file(path: str | Path) -> dict:
    p = str(path)
    cmd = ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", p]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    probe = json.loads(res.stdout)
    v = next((s for s in probe["streams"] if s["codec_type"] == "video"), None)
    if not v:
        raise ValueError(f"No video stream found in {path}")
    num, den = (v.get("r_frame_rate", "30/1").split("/") + ["1"])[:2]
    fps = round(float(num) / float(den), 3) if float(den) else 30.0
    dur = float(probe.get("format", {}).get("duration") or 0.0)
    return {"duration": dur, "width": int(v.get("width") or 1080), "height": int(v.get("height") or 1920), "fps": fps}
