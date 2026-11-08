"""Pydantic schemas for single-reel media analysis."""
from __future__ import annotations

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SceneCut(BaseModel):
    start: float
    end: float
    duration: float

class PaletteColor(BaseModel):
    hex: str
    rgb: List[int]
    percentage: float

class WordTiming(BaseModel):
    word: str
    start: float
    end: float
    probability: float

class AudioMetrics(BaseModel):
    target_lufs: float = -14.0
    measured_lufs: Optional[float] = None
    speech_wpm: float = 160.0
    avg_pause_seconds: float = 0.25
    max_pause_seconds: float = 0.40

class VisionStyleMetrics(BaseModel):
    font_family_estimate: Optional[str] = "Inter"
    font_weight: str = "bold"
    font_color_hex: str = "#FFFFFF"
    highlight_color_hex: str = "#FFDD00"
    caption_position: str = "middle" # "top", "middle", "bottom"
    transition_types: List[str] = Field(default_factory=lambda: ["hard_cut"])
    camera_motions: List[str] = Field(default_factory=lambda: ["punch_zoom"])
    visual_effects: List[str] = Field(default_factory=list)

class ReelAnalysis(BaseModel):
    reel_id: str
    duration: float
    width: int = 1080
    height: int = 1920
    fps: float = 30.0
    cuts: List[SceneCut] = Field(default_factory=list)
    avg_cut_interval: float = 2.0
    palette: List[PaletteColor] = Field(default_factory=list)
    audio: AudioMetrics = Field(default_factory=AudioMetrics)
    transcript: List[WordTiming] = Field(default_factory=list)
    full_transcript_text: str = ""
    vision_style: VisionStyleMetrics = Field(default_factory=VisionStyleMetrics)
    analyzed_at: float = 0.0
