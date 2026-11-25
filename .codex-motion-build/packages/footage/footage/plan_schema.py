"""Pydantic schemas for Longform EditPlan v2 and Rundown Templates.

Agent B owns this file. Never modify schema.py.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union
from pydantic import BaseModel, Field


class DeliverableType(str, Enum):
    """Deliverable types produced from an EditPlan."""
    TEASER = "teaser"
    HIGHLIGHT = "highlight"
    FULL = "full"


class RundownBeat(BaseModel):
    """A single beat / scene within an event rundown template.
    
    Attributes:
        id: Unique identifier for the beat (e.g. 'arrival', 'vows').
        must_have: Tags or constraints required (e.g. ['speech', 'two_people']).
        duration: Target duration or [min_sec, max_sec] duration window.
        search: Query keywords/phrases to search for matching moments.
        prefer: Special preference, e.g. 'speech_whole' (never cut mid-sentence).
        camera: Optional camera preference.
        transition: Desired transition type into this beat.
        description: Human-readable description.
    """
    id: str
    must_have: List[str] = Field(default_factory=list)
    duration: Union[Tuple[float, float], List[float], float] = 15.0
    search: List[str] = Field(default_factory=list)
    prefer: Optional[str] = None  # e.g. "speech_whole"
    camera: Optional[str] = None
    transition: Optional[str] = "cut"
    description: Optional[str] = None

    @property
    def min_duration(self) -> float:
        if isinstance(self.duration, (list, tuple)):
            return float(self.duration[0])
        return float(self.duration)

    @property
    def max_duration(self) -> float:
        if isinstance(self.duration, (list, tuple)):
            return float(self.duration[1]) if len(self.duration) > 1 else float(self.duration[0])
        return float(self.duration)

    @property
    def target_duration(self) -> float:
        return (self.min_duration + self.max_duration) / 2.0


class RundownTemplate(BaseModel):
    """An event rundown template specifying an ordered list of beats."""
    name: str
    target_duration: float
    beats: List[RundownBeat] = Field(default_factory=list)
    description: Optional[str] = None


class MissingBeatReport(BaseModel):
    """Explicit, client-visible report when footage for a beat is missing."""
    beat_id: str
    reason: str
    searched_queries: List[str] = Field(default_factory=list)
    must_have_constraints: List[str] = Field(default_factory=list)


class EditPlanEntryV2(BaseModel):
    """A cut decision in the conform EditPlan.
    
    Timebases:
    - t_src_in, t_src_out: Source media file seconds (t_src) in the ORIGINAL media file.
    - t_wall_in, t_wall_out: Group-synced wall-clock seconds (t_wall).
    - duration: t_src_out - t_src_in (equal to t_wall_out - t_wall_in).
    """
    entry_id: str
    beat_id: Optional[str] = None
    moment_id: str
    shot_id: str
    media_id: str
    camera_id: str
    t_src_in: float
    t_src_out: float
    duration: float
    t_wall_in: float
    t_wall_out: float
    angle_chosen: str
    transition: str = "cut"
    transition_duration: float = 0.0
    speed: float = 1.0
    text_overlay: Optional[str] = None
    speech_whole: bool = False
    gain_db: float = 0.0


class GainPoint(BaseModel):
    """Volume automation point for audio tracks."""
    time: float  # timeline seconds
    gain_db: float


class MusicBed(BaseModel):
    """User-supplied background music bed configuration."""
    track_path: Optional[str] = None
    volume_db: float = -14.0
    ducking_db: float = -20.0
    fade_in_sec: float = 1.0
    fade_out_sec: float = 2.0
    gain_automation: List[GainPoint] = Field(default_factory=list)


class ChapterMarker(BaseModel):
    """Chapter metadata marker for full film navigation."""
    title: str
    start_time: float
    end_time: float


class DeliverableSpec(BaseModel):
    """Specification and entries for a specific deliverable cut."""
    deliverable_type: DeliverableType
    target_duration: float
    total_duration: float
    entries: List[EditPlanEntryV2] = Field(default_factory=list)
    chapters: List[ChapterMarker] = Field(default_factory=list)


class ReviewScoreCard(BaseModel):
    """Mechanical and qualitative review results."""
    passed: bool
    total_duration: float
    target_duration: float
    min_shot_duration: float
    repeated_moments: List[str] = Field(default_factory=list)
    sub_04_flashes: List[str] = Field(default_factory=list)
    consecutive_same_angles: List[str] = Field(default_factory=list)
    speech_cut_violations: List[str] = Field(default_factory=list)
    issues: List[str] = Field(default_factory=list)
    overall_score: float = 1.0
    feedback: str = "All mechanical checks passed."


class EditPlanV2(BaseModel):
    """System-of-record edit plan for long-form event film generation."""
    plan_id: str
    project_id: str
    template_name: str
    target_duration: float
    total_duration: float
    entries: List[EditPlanEntryV2] = Field(default_factory=list)
    missing_beats: List[MissingBeatReport] = Field(default_factory=list)
    music_bed: Optional[MusicBed] = None
    chapters: List[ChapterMarker] = Field(default_factory=list)
    title: Optional[str] = None
    approved: bool = False
    approved_at: Optional[str] = None
    must_include: List[str] = Field(default_factory=list)
    never_include: List[str] = Field(default_factory=list)
    deliverables: Dict[str, DeliverableSpec] = Field(default_factory=dict)
    review_card: Optional[ReviewScoreCard] = None
    created_at: str
