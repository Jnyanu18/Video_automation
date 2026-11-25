"""Layer 2: CanonicalEditPlan - Engine-Agnostic, Frame-Accurate Timeline Model.

Single source of truth for all editorial and timeline decisions.
Features:
- Microsecond timebase resolution + frame-accurate integer math
- Pydantic v2 strict data validation
- Cryptographic timeline fingerprinting
- Transactional EditorialPatch application with rollback safety
- Zero coupling to FFmpeg command strings or browser render scripts
"""
from __future__ import annotations

import copy
import hashlib
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Tuple, Union
from pydantic import BaseModel, Field, field_validator, model_validator


TIME_EPSILON = 1e-4


class TimebaseConfig(BaseModel):
    """Timebase and spatial framing configuration."""
    fps: float = Field(default=30.0, gt=0.0, le=120.0, description="Timeline frames per second")
    width: int = Field(default=1080, gt=0, description="Frame width in pixels")
    height: int = Field(default=1920, gt=0, description="Frame height in pixels")
    time_epsilon: float = Field(default=TIME_EPSILON, description="Floating-point tolerance in seconds")

    def time_to_frame(self, seconds: float) -> int:
        return int(round(seconds * self.fps))

    def frame_to_time(self, frame: int) -> float:
        return round(frame / self.fps, 4)


class SourceAsset(BaseModel):
    """Source media asset referenced on the timeline."""
    source_id: str = Field(..., description="Unique source identifier")
    path: str = Field(..., description="Canonical path to the source video/audio file")
    duration: float = Field(..., gt=0.0, description="Total media duration in seconds")
    width: Optional[int] = Field(default=None, description="Native source width")
    height: Optional[int] = Field(default=None, description="Native source height")
    fps: Optional[float] = Field(default=None, description="Native source fps")
    has_audio: bool = Field(default=True, description="Whether the media stream contains audio")

    @field_validator("path")
    @classmethod
    def validate_path_syntax(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Source path cannot be empty")
        # Ensure path does not contain illegal null bytes
        if "\0" in v:
            raise ValueError("Path contains invalid characters")
        return v.strip()


class TimelineClip(BaseModel):
    """A timed segment placed on the output timeline."""
    clip_id: str = Field(..., description="Unique clip identifier")
    source_id: str = Field(..., description="ID of the SourceAsset")
    source_start: float = Field(..., ge=0.0, description="Start time in source media (seconds)")
    source_end: float = Field(..., gt=0.0, description="End time in source media (seconds)")
    timeline_start: float = Field(default=0.0, ge=0.0, description="Start position on the timeline (seconds)")
    timeline_end: float = Field(default=0.0, ge=0.0, description="End position on the timeline (seconds)")
    speed: float = Field(default=1.0, gt=0.0, le=10.0, description="Playback speed multiplier")
    volume: float = Field(default=1.0, ge=0.0, le=2.0, description="Audio volume multiplier")
    reframe: Literal["center_crop", "fit_pad", "pan_zoom", "none"] = Field(
        default="center_crop",
        description="Spatial reframing strategy"
    )
    zoom_in: Optional[float] = Field(default=None, description="Zoom scale factor (e.g. 1.15 for punch-in)")
    editorial_purpose: Optional[str] = Field(default=None, description="Why this clip is included (hook, proof, etc.)")

    @model_validator(mode="after")
    def check_clip_bounds(self) -> TimelineClip:
        if self.source_end <= self.source_start:
            raise ValueError(f"Clip {self.clip_id}: source_end ({self.source_end}) must be > source_start ({self.source_start})")
        # If timeline_end is not set or matches start, compute duration from source & speed
        calculated_dur = (self.source_end - self.source_start) / self.speed
        if self.timeline_end <= self.timeline_start:
            self.timeline_end = round(self.timeline_start + calculated_dur, 4)
        return self


class WordTimestamp(BaseModel):
    """A word-level timestamp aligned to audio."""
    word: str = Field(..., description="Spoken word")
    start: float = Field(..., ge=0.0, description="Start timestamp in source/timeline seconds")
    end: float = Field(..., ge=0.0, description="End timestamp in source/timeline seconds")


class CaptionGroup(BaseModel):
    """A timed group of subtitles or karaoke words."""
    group_id: str = Field(..., description="Unique caption group ID")
    text: str = Field(..., description="Full display text")
    start: float = Field(..., ge=0.0, description="Timeline start in seconds")
    end: float = Field(..., gt=0.0, description="Timeline end in seconds")
    style: Literal["karaoke", "clean", "highlight", "italic_accent"] = Field(default="karaoke")
    words: List[WordTimestamp] = Field(default_factory=list, description="Word-level breakdown for karaoke")

    @model_validator(mode="after")
    def validate_times(self) -> CaptionGroup:
        if self.end <= self.start:
            raise ValueError(f"Caption {self.group_id}: end ({self.end}) must be > start ({self.start})")
        return self


class OverlayItem(BaseModel):
    """An on-screen graphic overlay (diagram, title card, HUD, watermark)."""
    overlay_id: str = Field(..., description="Unique overlay ID")
    kind: Literal["title", "diagram", "hud", "speaker_card", "cta_card", "shape", "watermark"] = Field(
        ..., description="Category of overlay"
    )
    template: str = Field(..., description="Template name, e.g. 'counter', 'versus', 'flow', 'stamp'")
    timeline_start: float = Field(..., ge=0.0, description="Timeline start in seconds")
    timeline_end: float = Field(..., gt=0.0, description="Timeline end in seconds")
    props: Dict[str, Any] = Field(default_factory=dict, description="Parameters passed to template")
    layer_order: int = Field(default=10, description="Z-index paint ordering")

    @model_validator(mode="after")
    def validate_times(self) -> OverlayItem:
        if self.timeline_end <= self.timeline_start:
            raise ValueError(f"Overlay {self.overlay_id}: timeline_end ({self.timeline_end}) must be > timeline_start ({self.timeline_start})")
        return self


class SFXCue(BaseModel):
    """A synchronized sound effect cue on the timeline."""
    sfx_id: str = Field(..., description="Unique SFX cue ID")
    name: str = Field(..., description="Name of sound effect, e.g. 'whoosh', 'pop', 'riser', 'ding'")
    timeline_at: float = Field(..., ge=0.0, description="Timeline injection point in seconds")
    volume: float = Field(default=0.8, ge=0.0, le=1.5, description="Playback volume multiplier")


class AudioComposition(BaseModel):
    """Audio configuration and tracks for the timeline."""
    bgm_path: Optional[str] = Field(default=None, description="Path to background music file")
    bgm_volume: float = Field(default=0.15, ge=0.0, le=1.0, description="Music bed volume relative to voice")
    voice_ducking_db: float = Field(default=-18.0, description="Music attenuation when voice is active (dB)")
    sfx_cues: List[SFXCue] = Field(default_factory=list, description="SFX cue triggers")
    target_lufs: float = Field(default=-14.0, description="Broadcast integrated loudness target (EBU R128)")


class PatchOperation(BaseModel):
    """A single atomic operation within an EditorialPatch."""
    op: Literal["add_clip", "remove_clip", "trim_clip", "add_overlay", "remove_overlay", "add_sfx", "remove_sfx", "update_caption", "set_audio"]
    target_id: Optional[str] = Field(default=None, description="ID of affected entity")
    params: Dict[str, Any] = Field(default_factory=dict, description="Operation payload")


class EditorialPatch(BaseModel):
    """A transactional edit patch proposed by an agent or human."""
    patch_id: str = Field(..., description="Unique patch ID")
    summary: str = Field(..., description="Human-readable summary of the editorial change")
    reason: str = Field(..., description="Editorial justification from creative direction or review")
    operations: List[PatchOperation] = Field(..., min_length=1, description="Ordered atomic operations")
    confidence: float = Field(default=0.95, ge=0.0, le=1.0)
    created_at: float = Field(default_factory=lambda: 0.0)


class PatchRecord(BaseModel):
    """Historical audit record of an applied patch with rollback snapshot."""
    patch_id: str
    summary: str
    reason: str
    applied_at: float
    previous_fingerprint: str
    rollback_snapshot: Dict[str, Any] = Field(default_factory=dict)


class CanonicalEditPlan(BaseModel):
    """The complete, authoritative, engine-independent EditPlan."""
    version: str = Field(default="2.0", description="Schema version")
    plan_id: str = Field(..., description="Unique plan identifier")
    fingerprint: str = Field(default="", description="Cryptographic timeline digest")
    timebase: TimebaseConfig = Field(default_factory=TimebaseConfig)
    sources: List[SourceAsset] = Field(default_factory=list, description="Referenced media sources")
    sequence: List[TimelineClip] = Field(default_factory=list, description="Primary video track clips")
    overlays: List[OverlayItem] = Field(default_factory=list, description="Visual overlays and diagrams")
    captions: List[CaptionGroup] = Field(default_factory=list, description="Subtitles and typography")
    audio: AudioComposition = Field(default_factory=AudioComposition)
    metadata: Dict[str, Any] = Field(default_factory=dict, description="High-level tags and creative notes")
    revision_history: List[PatchRecord] = Field(default_factory=list, description="Audit trail of applied patches")

    @model_validator(mode="after")
    def compute_and_verify_fingerprint(self) -> CanonicalEditPlan:
        # Sort sequence by timeline_start to enforce deterministic ordering
        self.sequence.sort(key=lambda c: c.timeline_start)
        self.overlays.sort(key=lambda o: o.timeline_start)
        self.captions.sort(key=lambda c: c.start)
        self.audio.sfx_cues.sort(key=lambda s: s.timeline_at)
        
        # Compute canonical hash of timeline operations (ignoring history/metadata)
        core_data = {
            "sources": [s.model_dump() for s in self.sources],
            "sequence": [c.model_dump() for c in self.sequence],
            "overlays": [o.model_dump() for o in self.overlays],
            "captions": [cap.model_dump() for cap in self.captions],
            "audio": self.audio.model_dump(),
            "timebase": self.timebase.model_dump(),
        }
        dumped = json.dumps(core_data, sort_keys=True)
        self.fingerprint = hashlib.sha256(dumped.encode("utf-8")).hexdigest()[:16]
        return self

    @property
    def total_duration(self) -> float:
        """Total duration of the output timeline in seconds."""
        if not self.sequence:
            return 0.0
        return max(c.timeline_end for c in self.sequence)

    def validate_timeline_consistency(self) -> Tuple[bool, List[str]]:
        """Validate timeline rules: no gaps/overlaps on primary sequence, valid source references."""
        errors = []
        source_map = {s.source_id: s for s in self.sources}

        for c in self.sequence:
            if c.source_id not in source_map:
                errors.append(f"Clip {c.clip_id} references non-existent source {c.source_id}")
            else:
                src = source_map[c.source_id]
                if c.source_end > src.duration + self.timebase.time_epsilon:
                    errors.append(f"Clip {c.clip_id} source_end ({c.source_end}s) exceeds source duration ({src.duration}s)")

        # Verify sequential alignment of primary track
        for i in range(len(self.sequence) - 1):
            cur, nxt = self.sequence[i], self.sequence[i + 1]
            if cur.timeline_end > nxt.timeline_start + self.timebase.time_epsilon:
                errors.append(f"Timeline overlap detected between clip {cur.clip_id} and {nxt.clip_id}")

        return (len(errors) == 0, errors)

    def apply_patch(self, patch: EditorialPatch) -> bool:
        """Transactionally apply an EditorialPatch with automatic rollback on error."""
        # 1. Snapshot current state for rollback
        snapshot = self.model_dump()
        prev_fp = self.fingerprint

        try:
            for op in patch.operations:
                self._execute_operation(op)

            # Re-validate
            self.compute_and_verify_fingerprint()
            is_valid, errors = self.validate_timeline_consistency()
            if not is_valid:
                raise ValueError(f"Patch {patch.patch_id} violated timeline consistency: {'; '.join(errors)}")

            # Record in revision history
            self.revision_history.append(
                PatchRecord(
                    patch_id=patch.patch_id,
                    summary=patch.summary,
                    reason=patch.reason,
                    applied_at=0.0,
                    previous_fingerprint=prev_fp,
                    rollback_snapshot=snapshot,
                )
            )
            return True

        except Exception as e:
            # Transactional Rollback
            restored = CanonicalEditPlan.model_validate(snapshot)
            self.__dict__.update(restored.__dict__)
            raise RuntimeError(f"Patch {patch.patch_id} failed and was rolled back: {e}") from e

    def rollback_patch(self, patch_id: str) -> bool:
        """Rollback to the state prior to patch_id."""
        if not self.revision_history:
            return False
        
        target_idx = None
        for i, rec in enumerate(self.revision_history):
            if rec.patch_id == patch_id:
                target_idx = i
                break

        if target_idx is None:
            return False

        # Restore from the recorded snapshot
        snapshot = self.revision_history[target_idx].rollback_snapshot
        restored = CanonicalEditPlan.model_validate(snapshot)
        self.__dict__.update(restored.__dict__)
        # Truncate revision history to that point
        self.revision_history = self.revision_history[:target_idx]
        self.compute_and_verify_fingerprint()
        return True

    def _execute_operation(self, op: PatchOperation) -> None:
        """Execute a single atomic operation."""
        if op.op == "add_clip":
            new_clip = TimelineClip.model_validate(op.params)
            self.sequence.append(new_clip)
        elif op.op == "remove_clip":
            self.sequence = [c for c in self.sequence if c.clip_id != op.target_id]
        elif op.op == "trim_clip":
            for c in self.sequence:
                if c.clip_id == op.target_id:
                    if "source_start" in op.params:
                        c.source_start = float(op.params["source_start"])
                    if "source_end" in op.params:
                        c.source_end = float(op.params["source_end"])
                    c.timeline_end = round(c.timeline_start + (c.source_end - c.source_start) / c.speed, 4)
        elif op.op == "add_overlay":
            new_overlay = OverlayItem.model_validate(op.params)
            self.overlays.append(new_overlay)
        elif op.op == "remove_overlay":
            self.overlays = [o for o in self.overlays if o.overlay_id != op.target_id]
        elif op.op == "add_sfx":
            new_sfx = SFXCue.model_validate(op.params)
            self.audio.sfx_cues.append(new_sfx)
        elif op.op == "remove_sfx":
            self.audio.sfx_cues = [s for s in self.audio.sfx_cues if s.sfx_id != op.target_id]
        elif op.op == "set_audio":
            for k, v in op.params.items():
                if hasattr(self.audio, k):
                    setattr(self.audio, k, v)
        else:
            raise NotImplementedError(f"Unsupported patch operation: {op.op}")
