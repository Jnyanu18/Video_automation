"""Tests for moment grouping across multi-camera setups."""

from footage.moments import build_moments
from footage.schema import MediaFile, Shot, SpeechSegment, SyncGroup, WordTimestamp


def test_moment_grouping_overlapping_cameras():
    """Shots from two cameras overlapping in wall-clock time are merged into one Moment."""
    m_a = MediaFile(
        media_id="m1",
        path="/a.mp4",
        camera_id="CAM_A",
        duration=60.0,
        fps=25.0,
        width=1920,
        height=1080,
        codec="h264",
        has_audio=True,
    )
    m_b = MediaFile(
        media_id="m2",
        path="/b.mp4",
        camera_id="CAM_B",
        duration=60.0,
        fps=25.0,
        width=1920,
        height=1080,
        codec="h264",
        has_audio=True,
    )

    # CAM_B is offset by +10.0 seconds relative to CAM_A
    sync = SyncGroup(
        group_id="g1",
        media_ids=["m1", "m2"],
        offsets={"m1": 0.0, "m2": 10.0},
        method="audio_xcorr",
        confidence=0.9,
    )

    # Shot on CAM_A: 10.0 to 18.0 (t_wall: 10.0 to 18.0)
    shot_a = Shot(
        shot_id="s_a",
        media_id="m1",
        start=10.0,
        end=18.0,
        keep_score=0.75,
    )
    # Shot on CAM_B: 2.0 to 7.0 (t_wall: 12.0 to 17.0)
    shot_b = Shot(
        shot_id="s_b",
        media_id="m2",
        start=2.0,
        end=7.0,
        keep_score=0.88,
    )

    moments = build_moments([shot_a, shot_b], [m_a, m_b], [sync])

    assert len(moments) == 1
    m = moments[0]
    assert len(m.angles) == 2
    # Best angle first by keep_score: shot_b has 0.88, shot_a has 0.75
    assert m.angles[0].shot_id == "s_b"
    assert m.angles[0].camera_id == "CAM_B"
    assert m.angles[1].shot_id == "s_a"
    assert m.angles[1].camera_id == "CAM_A"
    assert m.keep_score == 0.88
    assert m.t_start == 10.0
    assert m.t_end == 18.0


def test_moments_non_overlapping_separate():
    """Non-overlapping shots produce separate distinct Moments."""
    m = MediaFile(
        media_id="m1",
        path="/a.mp4",
        camera_id="CAM_A",
        duration=60.0,
        fps=25.0,
        width=1920,
        height=1080,
        codec="h264",
        has_audio=True,
    )
    sync = SyncGroup(group_id="g1", media_ids=["m1"], offsets={"m1": 0.0})

    shot1 = Shot(shot_id="s1", media_id="m1", start=0.0, end=5.0, keep_score=0.8)
    shot2 = Shot(shot_id="s2", media_id="m1", start=20.0, end=25.0, keep_score=0.7)

    moments = build_moments([shot1, shot2], [m], [sync])
    assert len(moments) == 2
    assert moments[0].moment_id == "mo0001"
    assert moments[1].moment_id == "mo0002"
    assert moments[0].t_start == 0.0
    assert moments[1].t_start == 20.0


def test_moments_speech_attachment():
    """Speech segment overlapping a moment is correctly attached."""
    m = MediaFile(
        media_id="m1",
        path="/a.mp4",
        camera_id="CAM_A",
        duration=60.0,
        fps=25.0,
        width=1920,
        height=1080,
        codec="h264",
        has_audio=True,
    )
    sync = SyncGroup(group_id="g1", media_ids=["m1"], offsets={"m1": 0.0})

    shot = Shot(shot_id="s1", media_id="m1", start=5.0, end=15.0, keep_score=0.8)
    speech = SpeechSegment(
        media_id="m1",
        start=6.0,
        end=10.0,
        speaker="S1",
        text="I take thee to be my wedded wife",
        words=[WordTimestamp(word="I", start=6.0, end=6.5)],
    )

    moments = build_moments([shot], [m], [sync], speech_segments=[speech])
    assert len(moments) == 1
    assert moments[0].speech is not None
    assert moments[0].speech.text == "I take thee to be my wedded wife"
