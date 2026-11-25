"""Tests for the L1 triage ladder and rejection vocabulary."""

from footage.schema import RejectReason, Shot
from footage.triage import TriageConfig, triage_shots


def test_triage_too_short():
    """Shot shorter than min_duration is rejected as too_short."""
    cfg = TriageConfig(min_duration=1.5)
    shot = Shot(
        shot_id="s1",
        media_id="m1",
        start=0.0,
        end=0.8,
        focus=0.7,
        exposure=0.5,
        motion=0.2,
    )
    triaged = triage_shots([shot], cfg)
    assert triaged[0].reject_reason == RejectReason.TOO_SHORT
    assert triaged[0].keep_score < 0.4


def test_triage_out_of_focus():
    """Blurry shot with low Laplacian variance is rejected as out_of_focus."""
    cfg = TriageConfig(min_focus=0.35)
    shot = Shot(
        shot_id="s1",
        media_id="m1",
        start=0.0,
        end=3.0,
        focus=0.10,
        exposure=0.5,
        motion=0.2,
    )
    triaged = triage_shots([shot], cfg)
    assert triaged[0].reject_reason == RejectReason.OUT_OF_FOCUS


def test_triage_under_exposed():
    """Black or near-black shot is rejected as under_exposed."""
    cfg = TriageConfig(min_exposure=0.15)
    shot = Shot(
        shot_id="s1",
        media_id="m1",
        start=0.0,
        end=3.0,
        focus=0.7,
        exposure=0.08,
        motion=0.2,
    )
    triaged = triage_shots([shot], cfg)
    assert triaged[0].reject_reason == RejectReason.UNDER_EXPOSED


def test_triage_over_exposed():
    """Blown-out shot is rejected as over_exposed."""
    cfg = TriageConfig(max_exposure=0.85)
    shot = Shot(
        shot_id="s1",
        media_id="m1",
        start=0.0,
        end=3.0,
        focus=0.7,
        exposure=0.92,
        motion=0.2,
    )
    triaged = triage_shots([shot], cfg)
    assert triaged[0].reject_reason == RejectReason.OVER_EXPOSED


def test_triage_static_dead():
    """Locked-off tripod footage with no people or audio energy is rejected as static_dead."""
    cfg = TriageConfig(min_motion=0.02)
    shot = Shot(
        shot_id="s1",
        media_id="m1",
        start=0.0,
        end=5.0,
        focus=0.8,
        exposure=0.5,
        motion=0.005,
        faces=0,
        audio_class="silence",
    )
    triaged = triage_shots([shot], cfg)
    assert triaged[0].reject_reason == RejectReason.STATIC_DEAD


def test_triage_silent_dead():
    """Silent static clip is rejected as silent_dead."""
    cfg = TriageConfig(min_audio_rms=0.01, min_motion=0.02)
    shot = Shot(
        shot_id="s1",
        media_id="m1",
        start=0.0,
        end=5.0,
        focus=0.8,
        exposure=0.5,
        motion=0.025,
        audio_rms=0.001,
        faces=0,
    )
    triaged = triage_shots([shot], cfg)
    assert triaged[0].reject_reason == RejectReason.SILENT_DEAD


def test_triage_no_people():
    """When require_people is enabled, shots with no faces are rejected."""
    cfg = TriageConfig(require_people=True)
    shot = Shot(
        shot_id="s1",
        media_id="m1",
        start=0.0,
        end=3.0,
        focus=0.8,
        exposure=0.5,
        motion=0.2,
        faces=0,
    )
    triaged = triage_shots([shot], cfg)
    assert triaged[0].reject_reason == RejectReason.NO_PEOPLE


def test_triage_duplicate():
    """Adjacent shots in same media with identical metrics are flagged duplicate."""
    cfg = TriageConfig()
    shot1 = Shot(
        shot_id="s1",
        media_id="m1",
        start=0.0,
        end=3.0,
        focus=0.75,
        exposure=0.50,
        motion=0.20,
    )
    shot2 = Shot(
        shot_id="s2",
        media_id="m1",
        start=3.0,
        end=6.0,
        focus=0.75,
        exposure=0.50,
        motion=0.20,
    )
    triaged = triage_shots([shot1, shot2], cfg)
    assert triaged[0].reject_reason is None
    assert triaged[1].reject_reason == RejectReason.DUPLICATE


def test_triage_keep_healthy():
    """High quality shot with face, good focus, exposure, and motion is kept."""
    cfg = TriageConfig()
    shot = Shot(
        shot_id="s1",
        media_id="m1",
        start=0.0,
        end=4.0,
        focus=0.85,
        exposure=0.52,
        motion=0.22,
        faces=2,
        face_area=0.15,
        audio_class="speech",
    )
    triaged = triage_shots([shot], cfg)
    assert triaged[0].reject_reason is None
    assert triaged[0].keep_score >= 0.70
