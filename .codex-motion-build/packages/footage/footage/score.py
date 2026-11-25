"""Deterministic highlight scoring for moments."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

from footage.schema import FootageIndex, Moment, Shot


@dataclass
class ScoreConfig:
    """Weights and thresholds for deterministic highlight scoring.
    
    All weights are documented and normalized to sum to 1.0.
    """
    weight_keep_score: float = 0.35
    weight_face_area: float = 0.25
    weight_audio_class: float = 0.20
    weight_duration: float = 0.20
    ideal_duration: float = 5.0
    duration_tolerance: float = 5.0


def highlight_score(
    moment: Moment,
    index: FootageIndex,
    cfg: "ScoreConfig | None" = None,
) -> float:
    """0.0-1.0. Deterministic. Must work with no API key and no descriptions."""
    config = cfg or ScoreConfig()

    # Build or lookup shot map
    shot_map: Dict[str, Shot] = {s.shot_id: s for s in index.shots}

    # 1. Keep score contribution
    keep_val = float(moment.keep_score)

    # 2. Face area contribution
    max_face_area = 0.0
    for angle in moment.angles:
        s = shot_map.get(angle.shot_id)
        if s and s.face_area > max_face_area:
            max_face_area = s.face_area
    face_score = min(1.0, max_face_area * 5.0)

    # 3. Audio class contribution
    audio_score = 0.2
    for angle in moment.angles:
        s = shot_map.get(angle.shot_id)
        if s:
            if s.audio_class in ("speech", "music", "applause"):
                audio_score = max(audio_score, 1.0)
            elif s.audio_class == "noise":
                audio_score = max(audio_score, 0.5)

    # 4. Duration contribution (bell-shaped preference around ideal_duration)
    dur = moment.duration
    diff = abs(dur - config.ideal_duration)
    dur_score = max(0.0, 1.0 - (diff / max(config.duration_tolerance, 0.1)))

    total = (
        config.weight_keep_score * keep_val
        + config.weight_face_area * face_score
        + config.weight_audio_class * audio_score
        + config.weight_duration * dur_score
    )

    return round(float(min(1.0, max(0.0, total))), 4)
