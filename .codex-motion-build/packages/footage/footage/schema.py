"""Pydantic schemas for FootageIndex v2."""

from __future__ import annotations

from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, model_validator


class RejectReason(str, Enum):
    """Fixed vocabulary for shot triage rejections."""
    TOO_SHORT = "too_short"
    OUT_OF_FOCUS = "out_of_focus"
    OVER_EXPOSED = "over_exposed"
    UNDER_EXPOSED = "under_exposed"
    STATIC_DEAD = "static_dead"
    SILENT_DEAD = "silent_dead"
    DUPLICATE = "duplicate"
    NO_PEOPLE = "no_people"


class MediaFile(BaseModel):
    """Metadata for a single source video or audio file.
    
    Timebases:
    - duration: source seconds (t_src)
    - start_wallclock: ISO timestamp or None
    """
    media_id: str
    path: str
    camera_id: str
    duration: float
    fps: float
    width: int
    height: int
    codec: str
    has_audio: bool
    start_wallclock: Optional[str] = None
    proxy_path: Optional[str] = None
    checksum: Optional[str] = None
    error: Optional[str] = None


class SyncGroup(BaseModel):
    """Synchronization group associating files that overlap in time.
    
    Offsets: mapping of media_id -> offset in seconds relative to group origin (t_wall).
    method: 'audio_xcorr' or 'mtime'
    confidence: score in [0.0, 1.0]
    """
    group_id: str
    media_ids: List[str]
    offsets: Dict[str, float]
    method: str = "audio_xcorr"
    confidence: float = 1.0


class Shot(BaseModel):
    """A contiguous segment within a single media file.
    
    Timebases:
    - start: source/proxy seconds (t_src / t_proxy)
    - end: source/proxy seconds (t_src / t_proxy)
    """
    shot_id: str
    media_id: str
    start: float
    end: float
    motion: float = 0.0
    focus: float = 0.0
    exposure: float = 0.5
    audio_rms: float = 0.0
    audio_class: str = "silence"  # speech, music, applause, noise, silence
    faces: int = 0
    face_area: float = 0.0
    keep_score: float = 0.0
    reject_reason: Optional[RejectReason] = None

    @property
    def duration(self) -> float:
        """Duration in source seconds (t_src)."""
        return max(0.0, self.end - self.start)


class MomentAngle(BaseModel):
    """A camera angle contributing to a multi-camera moment."""
    shot_id: str
    camera_id: str
    quality: float


class MomentSpeech(BaseModel):
    """Speech excerpt associated with a moment."""
    text: str
    speaker: Optional[str] = "S1"


class Moment(BaseModel):
    """A real-world event covered by one or more camera angles.
    
    Timebases:
    - t_start: synced wall-clock seconds (t_wall)
    - t_end: synced wall-clock seconds (t_wall)
    """
    moment_id: str
    t_start: float
    t_end: float
    angles: List[MomentAngle] = Field(default_factory=list)
    keep_score: float = 0.0
    tags: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    speech: Optional[MomentSpeech] = None
    energy: int = 0                       # 1-5, 0 = unset
    people: List[str] = Field(default_factory=list) # person_id values, see Person
    highlight_score: float = 0.0
    novelty: float = 0.0                  # 1.0 = unlike anything else kept
    describe_source: str = "local"        # "local" | "model"

    @property
    def duration(self) -> float:
        """Duration in synced wall-clock seconds (t_wall)."""
        return max(0.0, self.t_end - self.t_start)


class Person(BaseModel):
    """A person cluster discovered across footage."""
    person_id: str
    name: Optional[str] = None        # set by a human, never guessed
    moment_ids: List[str] = Field(default_factory=list)
    thumb_path: Optional[str] = None
    cluster_size: int = 0


class WordTimestamp(BaseModel):
    """Word-level alignment for speech transcription.
    
    Timebases:
    - start: media file seconds (t_src)
    - end: media file seconds (t_src)
    """
    word: str
    start: float
    end: float


class SpeechSegment(BaseModel):
    """A transcribed speech utterance within a media file.
    
    Timebases:
    - start: media file seconds (t_src)
    - end: media file seconds (t_src)
    """
    media_id: str
    start: float
    end: float
    speaker: Optional[str] = "S1"
    text: str
    words: List[WordTimestamp] = Field(default_factory=list)


class IndexStats(BaseModel):
    """Acceptance and performance statistics for a FootageIndex."""
    total_source_seconds: float
    media_count: int
    shots: int
    moments: int
    kept_seconds: float
    keep_ratio: float
    proxy_seconds: float
    index_wall_seconds: float
    realtime_factor: float
    model_calls: int = 0


class FootageIndex(BaseModel):
    """FootageIndex v2 system of record."""
    index_version: int = 2
    project_id: str
    created_at: str
    source_dirs: List[str]
    media: List[MediaFile] = Field(default_factory=list)
    sync_groups: List[SyncGroup] = Field(default_factory=list)
    shots: List[Shot] = Field(default_factory=list)
    moments: List[Moment] = Field(default_factory=list)
    speech: List[SpeechSegment] = Field(default_factory=list)
    people: List[Person] = Field(default_factory=list)
    stats: IndexStats
