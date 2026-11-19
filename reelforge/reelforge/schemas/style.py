"""Pydantic schemas for versioned Style Sheets and patches."""
from __future__ import annotations

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class FontRule(BaseModel):
    family: str = "Inter"
    weight: str = "bold"
    color_hex: str = "#FFFFFF"
    stroke_color_hex: Optional[str] = "#000000"
    stroke_width: int = 2
    casing: str = "title" # "uppercase", "lowercase", "title"

class CaptionRule(BaseModel):
    style: str = "karaoke" # "karaoke", "clean_box", "pop_in"
    words_per_chunk: int = 3
    highlight_color_hex: str = "#FFDD00"
    position_y: float = 0.5 # 0.0 to 1.0 (0.5 is middle)
    animation: str = "bounce"

class PacingRule(BaseModel):
    avg_cut_interval_seconds: float = 1.8
    max_pause_seconds: float = 0.25
    speech_wpm_median: float = 175.0

class SoundRule(BaseModel):
    music_duck_db: float = -16.0 # Music level under speech
    sfx_intensity: str = "punchy" # "subtle", "energetic", "punchy"
    target_lufs: float = -14.0

class StyleSheet(BaseModel):
    version: int = 1
    name: str = "Default Creator Style"
    fonts: FontRule = Field(default_factory=FontRule)
    colors: List[str] = Field(default_factory=lambda: ["#000000", "#FFFFFF", "#FFDD00"])
    captions: CaptionRule = Field(default_factory=CaptionRule)
    pacing: PacingRule = Field(default_factory=PacingRule)
    sound: SoundRule = Field(default_factory=SoundRule)
    summary: str = "Fast-paced creator style with high cut frequency and bold karaoke subtitles."
    reels_analyzed_count: int = 1
    outliers_noted: List[str] = Field(default_factory=list)
    confidence_scores: Dict[str, float] = Field(default_factory=dict)

class StyleSheetPatch(BaseModel):
    fonts: Optional[Dict[str, Any]] = None
    colors: Optional[List[str]] = None
    captions: Optional[Dict[str, Any]] = None
    pacing: Optional[Dict[str, Any]] = None
    sound: Optional[Dict[str, Any]] = None
    change_reason: str = ""
