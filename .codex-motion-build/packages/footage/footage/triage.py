"""L1 triage ladder: keep score, rejection vocabulary, and deduplication."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import List, Optional

from footage.schema import RejectReason, Shot

logger = logging.getLogger("footage.triage")


@dataclass
class TriageConfig:
    """Documented thresholds for the L1 triage ladder.
    
    All thresholds are centralized here — no magic numbers elsewhere.
    """
    # Minimum shot duration in seconds (t_src)
    min_duration: float = 1.2

    # Focus threshold in [0.0, 1.0] (Laplacian variance normalized)
    min_focus: float = 0.55

    # Exposure bounds in [0.0, 1.0] (mean luma)
    min_exposure: float = 0.15
    max_exposure: float = 0.85

    # Motion bounds in [0.0, 1.0] (frame difference normalized)
    min_motion: float = 0.015
    max_motion: float = 0.80

    # Audio threshold
    min_audio_rms: float = 0.005

    # People filtering (optional gate)
    require_people: bool = False

    # Keep ratio targets for sanity warnings
    target_keep_min: float = 0.05
    target_keep_max: float = 0.25

    # Quality weights for keep_score calculation
    weight_focus: float = 0.40
    weight_exposure: float = 0.20
    weight_motion: float = 0.15
    weight_faces: float = 0.15
    weight_audio: float = 0.10


def calculate_raw_quality(shot: Shot, config: TriageConfig) -> float:
    """Calculate raw technical quality score in [0.0, 1.0]."""
    # Focus contribution
    f_score = min(1.0, shot.focus)

    # Exposure contribution (ideal centered around 0.50)
    exp_dist = abs(shot.exposure - 0.50)
    exp_score = max(0.0, 1.0 - (exp_dist * 2.0))

    # Motion contribution (sweet spot is 0.08 - 0.35)
    if shot.motion < config.min_motion:
        mot_score = 0.1
    elif shot.motion > 0.60:
        mot_score = max(0.1, 1.0 - (shot.motion - 0.60) * 2.5)
    else:
        mot_score = 0.9

    # Faces contribution
    face_score = min(1.0, shot.faces * 0.4 + shot.face_area * 2.5)

    # Audio contribution
    if shot.audio_class in ("speech", "music", "applause"):
        audio_score = 1.0
    elif shot.audio_class == "silence":
        audio_score = 0.2
    else:
        audio_score = 0.5

    quality = (
        f_score * config.weight_focus
        + exp_score * config.weight_exposure
        + mot_score * config.weight_motion
        + face_score * config.weight_faces
        + audio_score * config.weight_audio
    )
    return round(float(min(1.0, max(0.0, quality))), 4)


def triage_shots(
    shots: List[Shot],
    config: Optional[TriageConfig] = None,
) -> List[Shot]:
    """Apply the L1 triage ladder to evaluate and score shots.
    
    Assigns:
    - keep_score: score in [0.0, 1.0]
    - reject_reason: one of RejectReason enum or None if kept.
    
    Returns:
        Updated list of Shot objects.
    """
    cfg = config or TriageConfig()

    for i, shot in enumerate(shots):
        raw_quality = calculate_raw_quality(shot, cfg)
        reason: Optional[RejectReason] = None

        # Triage evaluation ladder
        if shot.duration < cfg.min_duration:
            reason = RejectReason.TOO_SHORT
        elif shot.focus < cfg.min_focus:
            reason = RejectReason.OUT_OF_FOCUS
        elif shot.exposure < cfg.min_exposure:
            reason = RejectReason.UNDER_EXPOSED
        elif shot.exposure > cfg.max_exposure:
            reason = RejectReason.OVER_EXPOSED
        elif shot.motion < cfg.min_motion and shot.faces == 0 and shot.audio_class in ("silence", "noise"):
            reason = RejectReason.STATIC_DEAD
        elif shot.audio_rms < cfg.min_audio_rms and shot.motion < cfg.min_motion * 1.5 and shot.faces == 0:
            reason = RejectReason.SILENT_DEAD
        elif cfg.require_people and shot.faces == 0:
            reason = RejectReason.NO_PEOPLE

        # Check for near-duplicate of immediately preceding shot in same media
        if reason is None and i > 0 and shots[i - 1].media_id == shot.media_id:
            prev = shots[i - 1]
            if (
                abs(prev.motion - shot.motion) < 0.03
                and abs(prev.focus - shot.focus) < 0.04
                and abs(prev.exposure - shot.exposure) < 0.04
            ):
                reason = RejectReason.DUPLICATE

        shot.reject_reason = reason
        if reason is not None:
            # Scaled down keep score for rejected shots
            shot.keep_score = round(raw_quality * 0.35, 4)
        else:
            # Kept shot score
            shot.keep_score = round(max(0.50, raw_quality), 4)

    return shots
