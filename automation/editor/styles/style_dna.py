"""Style DNA Engine (Director 2.0 Layer C).
Extracts, saves, and applies signature editing styles:
pacing, cut frequency, caption typography, SFX density, zoom patterns, and color treatment.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

@dataclass
class StyleDNA:
    style_id: str
    name: str
    description: str
    avg_shot_duration: float
    cuts_per_minute: float
    caption_style: str  # "karaoke", "clean-lower", "bold-pop"
    caption_max_words: int
    zoom_frequency: float  # zooms per 30s
    sfx_density: str  # "dense", "moderate", "minimal"
    target_lufs: float  # -14.0 or -15.0
    color_grade: str  # "cinematic_contrast", "clean_vibrant", "warm_founder"
    palette: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "style_id": self.style_id,
            "name": self.name,
            "description": self.description,
            "pacing": {
                "avg_shot_duration": round(self.avg_shot_duration, 2),
                "cuts_per_minute": round(self.cuts_per_minute, 1),
            },
            "typography": {
                "caption_style": self.caption_style,
                "caption_max_words": self.caption_max_words,
            },
            "visual_motion": {
                "zoom_frequency": self.zoom_frequency,
                "color_grade": self.color_grade,
                "palette": self.palette,
            },
            "audio": {
                "sfx_density": self.sfx_density,
                "target_lufs": self.target_lufs,
            },
        }

STYLE_PRESETS: Dict[str, StyleDNA] = {
    "viral_hook_fast_pace": StyleDNA(
        style_id="viral_hook_fast_pace",
        name="Viral Hook (Fast Paced)",
        description="Fast-paced TikTok/Reel pace: cuts every 1.8s, aggressive silence tightening (<0.22s), bold karaoke captions, high SFX density.",
        avg_shot_duration=1.8,
        cuts_per_minute=33.3,
        caption_style="karaoke",
        caption_max_words=3,
        zoom_frequency=3.0,
        sfx_density="dense",
        target_lufs=-14.0,
        color_grade="cinematic_contrast",
        palette=["#FF5A1F", "#090A0C", "#FFFFFF", "#70D6A1"],
    ),
    "educational_masterclass": StyleDNA(
        style_id="educational_masterclass",
        name="Educational Masterclass",
        description="Structured educational tempo: conversational pauses (<0.38s), clean lower thirds, balanced framing, clear visual hierarchy.",
        avg_shot_duration=3.2,
        cuts_per_minute=18.5,
        caption_style="clean-lower",
        caption_max_words=5,
        zoom_frequency=1.5,
        sfx_density="moderate",
        target_lufs=-15.0,
        color_grade="clean_vibrant",
        palette=["#00B2FF", "#111317", "#F3F4F5", "#F2C36B"],
    ),
    "cinematic_event": StyleDNA(
        style_id="cinematic_event",
        name="Cinematic Event / Aftermovie",
        description="Dramatic pacing: dynamic punch-in zooms on beat, heavy transition effects, atmospheric risers and sub drops.",
        avg_shot_duration=1.4,
        cuts_per_minute=42.0,
        caption_style="bold-pop",
        caption_max_words=2,
        zoom_frequency=4.5,
        sfx_density="dense",
        target_lufs=-13.5,
        color_grade="cinematic_contrast",
        palette=["#FF3B30", "#000000", "#FFCC00", "#FFFFFF"],
    ),
    "yc_presentation": StyleDNA(
        style_id="yc_presentation",
        name="YC Pitch & Product Demo",
        description="Founder-led demo: camera split-screen, UI screen zooms, zero gimmicks, clean speech emphasis.",
        avg_shot_duration=4.0,
        cuts_per_minute=15.0,
        caption_style="clean-lower",
        caption_max_words=6,
        zoom_frequency=1.0,
        sfx_density="minimal",
        target_lufs=-14.0,
        color_grade="warm_founder",
        palette=["#FF6600", "#222222", "#F6F6EF", "#4A90E2"],
    ),
    "luxury_editorial": StyleDNA(
        style_id="luxury_editorial",
        name="Luxury Editorial / Aesthetic",
        description="High-end editorial fashion pace: smooth slow-drift moves, minimalist typography, subtle ambient soundscapes.",
        avg_shot_duration=2.8,
        cuts_per_minute=21.4,
        caption_style="clean-lower",
        caption_max_words=4,
        zoom_frequency=0.8,
        sfx_density="minimal",
        target_lufs=-16.0,
        color_grade="warm_founder",
        palette=["#D4AF37", "#1A1A1A", "#EAEAEA", "#A67C52"],
    ),
}

def get_style_dna(style_id: str) -> StyleDNA:
    return STYLE_PRESETS.get(style_id, STYLE_PRESETS["viral_hook_fast_pace"])

def apply_style_dna_to_plan(plan: Dict[str, Any], style: StyleDNA) -> Dict[str, Any]:
    """Apply style DNA parameters to an EditPlan."""
    plan["style_ref"] = style.style_id
    plan.setdefault("output", {})
    plan.setdefault("audio", {})
    plan["audio"]["target_lufs"] = style.target_lufs

    # Update caption styling
    for c in plan.get("captions", []):
        c["style"] = style.caption_style

    plan.setdefault("edit_params", {})
    plan["edit_params"]["target_shot_length"] = style.avg_shot_duration
    plan["edit_params"]["caption_style"] = style.caption_style
    plan["edit_params"]["color_grade"] = style.color_grade
    return plan
