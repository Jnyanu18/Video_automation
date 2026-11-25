"""Tests for deterministic highlight scoring."""

from footage.schema import (
    FootageIndex,
    IndexStats,
    Moment,
    MomentAngle,
    Shot,
)
from footage.score import ScoreConfig, highlight_score


def _make_dummy_index() -> FootageIndex:
    stats = IndexStats(
        total_source_seconds=60.0,
        media_count=1,
        shots=2,
        moments=2,
        kept_seconds=20.0,
        keep_ratio=0.33,
        proxy_seconds=5.0,
        index_wall_seconds=10.0,
        realtime_factor=6.0,
    )
    shots = [
        Shot(
            shot_id="s0001",
            media_id="m001",
            start=0.0,
            end=5.0,
            motion=0.2,
            focus=0.8,
            exposure=0.5,
            audio_class="speech",
            faces=1,
            face_area=0.15,
            keep_score=0.9,
        ),
        Shot(
            shot_id="s0002",
            media_id="m001",
            start=5.0,
            end=7.0,
            motion=0.05,
            focus=0.4,
            exposure=0.5,
            audio_class="silence",
            faces=0,
            face_area=0.0,
            keep_score=0.3,
        ),
    ]
    moments = [
        Moment(
            moment_id="mo0001",
            t_start=0.0,
            t_end=5.0,
            angles=[MomentAngle(shot_id="s0001", camera_id="CAM_A", quality=0.9)],
            keep_score=0.9,
        ),
        Moment(
            moment_id="mo0002",
            t_start=5.0,
            t_end=7.0,
            angles=[MomentAngle(shot_id="s0002", camera_id="CAM_A", quality=0.3)],
            keep_score=0.3,
        ),
    ]
    return FootageIndex(
        index_version=2,
        project_id="test",
        created_at="2026-11-20T00:00:00Z",
        source_dirs=["/test"],
        shots=shots,
        moments=moments,
        stats=stats,
    )


def test_highlight_score_deterministic_and_bounds():
    index = _make_dummy_index()
    m1 = index.moments[0]
    m2 = index.moments[1]

    score1 = highlight_score(m1, index)
    score2 = highlight_score(m2, index)

    assert 0.0 <= score1 <= 1.0
    assert 0.0 <= score2 <= 1.0
    assert score1 > score2
    # Determinism: same call returns identical value
    assert highlight_score(m1, index) == score1


def test_highlight_score_config_override():
    index = _make_dummy_index()
    m1 = index.moments[0]
    cfg = ScoreConfig(weight_keep_score=1.0, weight_face_area=0.0, weight_audio_class=0.0, weight_duration=0.0)
    score = highlight_score(m1, index, cfg)
    assert abs(score - m1.keep_score) < 1e-4
