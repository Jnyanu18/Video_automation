"""Tests for schema models and serialization."""

import json
from footage.schema import (
    FootageIndex,
    IndexStats,
    MediaFile,
    Moment,
    MomentAngle,
    MomentSpeech,
    RejectReason,
    Shot,
    SpeechSegment,
    SyncGroup,
    WordTimestamp,
)


def test_reject_reason_vocabulary():
    """Verify all 8 fixed reject reasons are present."""
    expected = {
        "too_short",
        "out_of_focus",
        "over_exposed",
        "under_exposed",
        "static_dead",
        "silent_dead",
        "duplicate",
        "no_people",
    }
    actual = {r.value for r in RejectReason}
    assert actual == expected


def test_shot_duration_property():
    """Verify shot duration calculation."""
    s = Shot(
        shot_id="s0001",
        media_id="m001",
        start=2.5,
        end=7.0,
        motion=0.2,
        focus=0.8,
        exposure=0.5,
        audio_rms=0.1,
    )
    assert abs(s.duration - 4.5) < 1e-5


def test_moment_duration_property():
    """Verify moment duration calculation."""
    m = Moment(
        moment_id="mo0001",
        t_start=10.0,
        t_end=15.5,
        angles=[MomentAngle(shot_id="s0001", camera_id="CAM_A", quality=0.85)],
        keep_score=0.85,
    )
    assert abs(m.duration - 5.5) < 1e-5


def test_schema_round_trip():
    """Verify complete FootageIndex v2 serialization and deserialization."""
    stats = IndexStats(
        total_source_seconds=120.0,
        media_count=2,
        shots=10,
        moments=5,
        kept_seconds=30.0,
        keep_ratio=0.25,
        proxy_seconds=12.0,
        index_wall_seconds=20.0,
        realtime_factor=6.0,
        model_calls=0,
    )
    index = FootageIndex(
        index_version=2,
        project_id="test-proj",
        created_at="2026-11-20T10:00:00Z",
        source_dirs=["/test/raw"],
        media=[
            MediaFile(
                media_id="m001",
                path="/test/raw/cam_a.mp4",
                camera_id="CAM_A",
                duration=60.0,
                fps=25.0,
                width=1920,
                height=1080,
                codec="h264",
                has_audio=True,
            )
        ],
        sync_groups=[
            SyncGroup(
                group_id="g1",
                media_ids=["m001"],
                offsets={"m001": 0.0},
                method="audio_xcorr",
                confidence=0.95,
            )
        ],
        shots=[
            Shot(
                shot_id="s0001",
                media_id="m001",
                start=0.0,
                end=4.5,
                motion=0.2,
                focus=0.7,
                exposure=0.5,
                audio_rms=0.05,
                audio_class="speech",
                faces=1,
                face_area=0.08,
                keep_score=0.8,
                reject_reason=None,
            )
        ],
        moments=[
            Moment(
                moment_id="mo0001",
                t_start=0.0,
                t_end=4.5,
                angles=[MomentAngle(shot_id="s0001", camera_id="CAM_A", quality=0.8)],
                keep_score=0.8,
                speech=MomentSpeech(text="Welcome everyone", speaker="S1"),
            )
        ],
        speech=[
            SpeechSegment(
                media_id="m001",
                start=0.5,
                end=4.0,
                speaker="S1",
                text="Welcome everyone",
                words=[WordTimestamp(word="Welcome", start=0.5, end=1.0)],
            )
        ],
        stats=stats,
    )

    json_str = index.model_dump_json()
    data = json.loads(json_str)
    assert data["index_version"] == 2
    assert data["stats"]["model_calls"] == 0

    reconstructed = FootageIndex.model_validate_json(json_str)
    assert reconstructed.project_id == index.project_id
    assert len(reconstructed.shots) == 1
    assert reconstructed.shots[0].shot_id == "s0001"
    assert reconstructed.stats.realtime_factor == 6.0
