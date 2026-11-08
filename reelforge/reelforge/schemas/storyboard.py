"""Pydantic schemas for Storyboard plans, scenes, and patches."""
from __future__ import annotations

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class StoryboardScene(BaseModel):
    scene_number: int
    src_start: float
    src_end: float
    out_duration: float
    caption_text: str
    camera_motion: str = "center" # "center", "punch_zoom_1.15x", "slow_push"
    transition: str = "hard_cut"  # "hard_cut", "whip_pan", "flash"
    visual_notes: str = ""
    rationale: str = ""

class StoryboardPlan(BaseModel):
    title: str = "New Reel"
    raw_video_path: str
    style_sheet_version: int = 1
    original_duration: float
    target_duration: float
    scenes: List[StoryboardScene]
    approved: bool = False

class ScenePatch(BaseModel):
    scene_number: int
    src_start: Optional[float] = None
    src_end: Optional[float] = None
    caption_text: Optional[str] = None
    camera_motion: Optional[str] = None
    transition: Optional[str] = None
    visual_notes: Optional[str] = None

class StoryboardPatch(BaseModel):
    title: Optional[str] = None
    target_duration: Optional[float] = None
    scene_updates: List[ScenePatch] = Field(default_factory=list)
    added_scenes: List[StoryboardScene] = Field(default_factory=list)
    removed_scene_numbers: List[int] = Field(default_factory=list)
    reason: str = ""
