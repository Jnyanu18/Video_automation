"""Layer 1: CreativePlan - Pure Creative Intent & Editorial Storytelling.

Decoupled entirely from rendering engines, filtergraphs, and low-level codecs.
Represents what the director wants to achieve: target audience, tonal palette,
narrative beats, dramatic tension, and style guidelines.
"""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class CreativeBrief(BaseModel):
    """The foundational creative brief provided by the user or agency."""
    product: str = Field(..., description="Product, brand, or subject name")
    audience: str = Field(default="general", description="Target audience demographic and persona")
    tone: str = Field(default="authoritative", description="Tone and voice: authentic, high-energy, sleek, humorous, etc.")
    target_duration: float = Field(default=30.0, ge=3.0, le=300.0, description="Target final duration in seconds")
    platform: Literal["instagram_reels", "tiktok", "youtube_shorts", "horizontal_explainer"] = Field(
        default="instagram_reels",
        description="Target distribution surface"
    )
    style_ref: Optional[str] = Field(default=None, description="Path or preset name for visual style reference")
    core_hook: Optional[str] = Field(default=None, description="Explicit hook sentence or angle proposed")
    custom_instructions: str = Field(default="", description="Additional creative boundaries or constraints")


class CreativeBeat(BaseModel):
    """A high-level story beat in the editorial progression."""
    beat_id: str = Field(..., description="Unique beat identifier, e.g. beat_01_hook")
    intention: Literal["hook", "problem", "solution", "mechanism", "social_proof", "climax", "cta"] = Field(
        ..., description="Narrative purpose of the beat"
    )
    target_start: float = Field(..., ge=0.0, description="Desired start time in timeline seconds")
    target_duration: float = Field(..., gt=0.0, description="Desired duration in timeline seconds")
    visual_type: Literal["talking_head", "product_broll", "ui_screen", "diagram", "hud", "reaction", "texture"] = Field(
        default="talking_head",
        description="Desired category of visual imagery"
    )
    spoken_intent: str = Field(default="", description="Core concept or spoken message communicating this beat")
    energy_level: float = Field(default=0.7, ge=0.0, le=1.0, description="Pacing and energy intensity (0=calm, 1=explosive)")
    motion_cue: Optional[str] = Field(default=None, description="Desired motion pattern (e.g. counter, easy_vs_hard, stamp)")


class StyleGuide(BaseModel):
    """Brand aesthetic and creative rules applied across the edit."""
    palette: Dict[str, str] = Field(
        default_factory=lambda: {
            "background": "#FFFFFF",
            "ink": "#0A0A0E",
            "accent": "#FF5A1F",
            "muted": "#666666",
        },
        description="Hex colors for typography, UI cards, and accents"
    )
    font_family: str = Field(default="Inter", description="Primary sans-serif font family")
    caption_style: Literal["karaoke", "phrase_reveal", "clean_subtitles", "minimal"] = Field(
        default="karaoke",
        description="Caption animation style"
    )
    music_mood: str = Field(default="upbeat_ambient", description="Mood descriptor for music bed")
    max_silence_gap: float = Field(default=0.4, ge=0.1, le=1.5, description="Maximum dead air permitted before cut")


class CreativePlan(BaseModel):
    """Unified Layer 1 Creative Plan."""
    version: str = Field(default="1.0", description="Creative plan schema version")
    plan_id: str = Field(..., description="Unique creative plan ID")
    brief: CreativeBrief
    style: StyleGuide = Field(default_factory=StyleGuide)
    narrative_arc: List[CreativeBeat] = Field(default_factory=list, description="Ordered narrative progression")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Custom creative annotations")

    @property
    def total_target_duration(self) -> float:
        if self.narrative_arc:
            return sum(b.target_duration for b in self.narrative_arc)
        return self.brief.target_duration
