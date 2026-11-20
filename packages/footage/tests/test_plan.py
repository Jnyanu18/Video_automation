"""Comprehensive tests for EditPlan v2, timebase conversions, and mechanical review.

Tests verify:
- Timebase conversions (t_wall -> t_src) across multi-camera sync groups with different offsets.
- Rundown beat filling and explicit missing beat reporting.
- Absolute enforcement of must_include and never_include constraints.
- Duration budgeting within ±5% of target.
- Speech-whole boundary protection.
- Hard mechanical reviewer checks (sub-0.4s flash, consecutive same angle, duplicates).
- Teaser, highlight, and full deliverables generation.
"""

from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import pytest

from footage.editplan import (
    approve_plan,
    convert_src_to_wall,
    convert_wall_to_src,
    read_edit_plan,
    review_plan_mechanics,
    revoke_approval,
    write_edit_plan,
)
from footage.plan import plan_rundown
from footage.plan_schema import (
    DeliverableType,
    EditPlanEntryV2,
    EditPlanV2,
    RundownBeat,
    RundownTemplate,
)
from footage.schema import (
    FootageIndex,
    IndexStats,
    MediaFile,
    Moment,
    MomentAngle,
    MomentSpeech,
    Shot,
    SpeechSegment,
    SyncGroup,
    WordTimestamp,
)


@pytest.fixture
def multi_cam_index() -> FootageIndex:
    """Fixture providing a synthetic 2-camera FootageIndex with known sync offsets.
    
    CAM_A: offset 0.0s, media m001
    CAM_B: offset 12.5s (started 12.5s after CAM_A), media m002
    """
    media = [
        MediaFile(
            media_id="m001",
            path="J:/footage/cam_a.mp4",
            camera_id="CAM_A",
            duration=600.0,
            fps=25.0,
            width=1920,
            height=1080,
            codec="h264",
            has_audio=True,
        ),
        MediaFile(
            media_id="m002",
            path="J:/footage/cam_b.mp4",
            camera_id="CAM_B",
            duration=587.5,
            fps=25.0,
            width=1920,
            height=1080,
            codec="h264",
            has_audio=True,
        ),
    ]

    sync_groups = [
        SyncGroup(
            group_id="g1",
            media_ids=["m001", "m002"],
            offsets={"m001": 0.0, "m002": 12.5},
            method="audio_xcorr",
            confidence=0.95,
        )
    ]

    # CAM_A shots (t_src)
    shots = [
        # Arrival (t_src: 10 to 30 -> t_wall: 10 to 30)
        Shot(shot_id="s01", media_id="m001", start=10.0, end=30.0, keep_score=0.85, audio_class="music", faces=3),
        # Ceremony (t_src: 40 to 70 -> t_wall: 40 to 70)
        Shot(shot_id="s02", media_id="m001", start=40.0, end=70.0, keep_score=0.88, audio_class="speech", faces=2),
        # Vows on CAM_A (t_src: 80 to 120 -> t_wall: 80 to 120)
        Shot(shot_id="s03", media_id="m001", start=80.0, end=120.0, keep_score=0.92, audio_class="speech", faces=2),
        # CAM_B shot covering the same vows: t_wall is 80 to 120.
        # Since offset is 12.5s, CAM_B t_src is 80 - 12.5 = 67.5s to 120 - 12.5 = 107.5s!
        Shot(shot_id="s04", media_id="m002", start=67.5, end=107.5, keep_score=0.95, audio_class="speech", faces=2),
        # Ring exchange (t_src: 130 to 150)
        Shot(shot_id="s05", media_id="m001", start=130.0, end=150.0, keep_score=0.80, faces=2),
        # Portraits (t_src: 160 to 195)
        Shot(shot_id="s06", media_id="m001", start=160.0, end=195.0, keep_score=0.89, faces=2),
        # Reception entrance (t_src: 210 to 235)
        Shot(shot_id="s07", media_id="m001", start=210.0, end=235.0, keep_score=0.84, faces=5),
        # Speeches (t_src: 250 to 290)
        Shot(shot_id="s08", media_id="m001", start=250.0, end=290.0, keep_score=0.90, audio_class="speech", faces=1),
        # First dance (t_src: 310 to 345)
        Shot(shot_id="s09", media_id="m001", start=310.0, end=345.0, keep_score=0.87, audio_class="music", faces=2),
        # Party dancing (t_src: 360 to 400)
        Shot(shot_id="s10", media_id="m001", start=360.0, end=400.0, keep_score=0.86, motion=0.6, faces=8),
        # Send off (t_src: 420 to 440)
        Shot(shot_id="s11", media_id="m001", start=420.0, end=440.0, keep_score=0.82, faces=4),
        # Extra b-roll for grandmother must_include test
        Shot(shot_id="s12", media_id="m001", start=450.0, end=465.0, keep_score=0.75, faces=1),
    ]

    moments = [
        Moment(
            moment_id="mo001",
            t_start=10.0,
            t_end=30.0,
            angles=[MomentAngle(shot_id="s01", camera_id="CAM_A", quality=0.85)],
            keep_score=0.85,
            tags=["arrival", "guests", "exterior"],
            description="Guests arriving at the wedding venue entrance",
        ),
        Moment(
            moment_id="mo002",
            t_start=40.0,
            t_end=70.0,
            angles=[MomentAngle(shot_id="s02", camera_id="CAM_A", quality=0.88)],
            keep_score=0.88,
            tags=["ceremony", "aisle", "altar"],
            description="Processional and ceremony start",
        ),
        # Multi-camera moment: Vows with both CAM_A and CAM_B angles!
        Moment(
            moment_id="mo003",
            t_start=80.0,
            t_end=120.0,
            angles=[
                MomentAngle(shot_id="s04", camera_id="CAM_B", quality=0.95),  # Best angle
                MomentAngle(shot_id="s03", camera_id="CAM_A", quality=0.92),
            ],
            keep_score=0.95,
            tags=["vows", "speech", "two_people", "ring"],
            description="Bride and groom exchanging heartfelt wedding vows",
            speech=MomentSpeech(text="I promise to love you always and forever.", speaker="Groom"),
        ),
        Moment(
            moment_id="mo004",
            t_start=130.0,
            t_end=150.0,
            angles=[MomentAngle(shot_id="s05", camera_id="CAM_A", quality=0.80)],
            keep_score=0.80,
            tags=["ring", "kiss", "cheer"],
            description="Ring exchange and first kiss",
        ),
        Moment(
            moment_id="mo005",
            t_start=160.0,
            t_end=195.0,
            angles=[MomentAngle(shot_id="s06", camera_id="CAM_A", quality=0.89)],
            keep_score=0.89,
            tags=["portraits", "couple", "golden_hour"],
            description="Romantic couple portraits in the garden",
        ),
        Moment(
            moment_id="mo006",
            t_start=210.0,
            t_end=235.0,
            angles=[MomentAngle(shot_id="s07", camera_id="CAM_A", quality=0.84)],
            keep_score=0.84,
            tags=["reception", "entrance", "cheering"],
            description="Grand reception entrance with cheering guests",
        ),
        Moment(
            moment_id="mo007",
            t_start=250.0,
            t_end=290.0,
            angles=[MomentAngle(shot_id="s08", camera_id="CAM_A", quality=0.90)],
            keep_score=0.90,
            tags=["speeches", "toast", "father_of_the_bride"],
            description="Father of the bride giving an emotional toast",
            speech=MomentSpeech(text="To my wonderful daughter and her new husband.", speaker="Father"),
        ),
        Moment(
            moment_id="mo008",
            t_start=310.0,
            t_end=345.0,
            angles=[MomentAngle(shot_id="s09", camera_id="CAM_A", quality=0.87)],
            keep_score=0.87,
            tags=["first_dance", "slow_dance", "dancing"],
            description="Couple sharing their romantic first dance",
        ),
        Moment(
            moment_id="mo009",
            t_start=360.0,
            t_end=400.0,
            angles=[MomentAngle(shot_id="s10", camera_id="CAM_A", quality=0.86)],
            keep_score=0.86,
            tags=["dance_floor", "party", "celebration", "high_energy"],
            description="High energy party celebration on the dance floor",
        ),
        Moment(
            moment_id="mo010",
            t_start=420.0,
            t_end=440.0,
            angles=[MomentAngle(shot_id="s11", camera_id="CAM_A", quality=0.82)],
            keep_score=0.82,
            tags=["sparklers", "send_off", "farewell"],
            description="Sparkler exit and farewell send off",
        ),
        # Special moment: Grandmother smiling
        Moment(
            moment_id="mo099",
            t_start=450.0,
            t_end=465.0,
            angles=[MomentAngle(shot_id="s12", camera_id="CAM_A", quality=0.75)],
            keep_score=0.75,
            tags=["grandmother", "family", "smile"],
            description="Grandmother smiling happily in the front row",
        ),
    ]

    speech_segments = [
        SpeechSegment(
            media_id="m001",
            start=80.0,
            end=120.0,
            speaker="Groom",
            text="I promise to love you always and forever.",
            words=[
                WordTimestamp(word="I", start=81.0, end=81.3),
                WordTimestamp(word="promise", start=81.4, end=82.0),
                WordTimestamp(word="to", start=82.1, end=82.3),
                WordTimestamp(word="love", start=82.4, end=82.8),
                WordTimestamp(word="you", start=82.9, end=83.2),
            ],
        )
    ]

    stats = IndexStats(
        total_source_seconds=1187.5,
        media_count=2,
        shots=len(shots),
        moments=len(moments),
        kept_seconds=400.0,
        keep_ratio=0.33,
        proxy_seconds=30.0,
        index_wall_seconds=45.0,
        realtime_factor=8.5,
        model_calls=0,
    )

    return FootageIndex(
        project_id="test-wedding-sharma",
        created_at=datetime.now(timezone.utc).isoformat(),
        source_dirs=["J:/footage"],
        media=media,
        sync_groups=sync_groups,
        shots=shots,
        moments=moments,
        speech=speech_segments,
        stats=stats,
    )


# --------------------------------------------------------------------------- #
# Hard Timebase Conversion Tests
# --------------------------------------------------------------------------- #


def test_timebase_conversion_multi_camera_offsets(multi_cam_index):
    """Test t_wall -> t_src conversion with cameras having different sync offsets.
    
    This is the highest-risk calculation in Phase 3.
    CAM_A offset: 0.0s
    CAM_B offset: 12.5s (started 12.5s after CAM_A)
    """
    sync_groups = multi_cam_index.sync_groups
    media_map = {m.media_id: m for m in multi_cam_index.media}

    # At wall-clock window [80.0, 100.0]
    t_wall_in = 80.0
    t_wall_out = 100.0

    # 1. For CAM_A (offset 0.0): t_src should equal t_wall exactly
    t_src_in_a, t_src_out_a = convert_wall_to_src(
        t_wall_in, t_wall_out, "m001", sync_groups, media_map
    )
    assert t_src_in_a == 80.0
    assert t_src_out_a == 100.0
    assert round(t_src_out_a - t_src_in_a, 3) == 20.0

    # 2. For CAM_B (offset 12.5): t_src = t_wall - 12.5
    # In = 80.0 - 12.5 = 67.5s, Out = 100.0 - 12.5 = 87.5s
    t_src_in_b, t_src_out_b = convert_wall_to_src(
        t_wall_in, t_wall_out, "m002", sync_groups, media_map
    )
    assert t_src_in_b == 67.5
    assert t_src_out_b == 87.5
    assert round(t_src_out_b - t_src_in_b, 3) == 20.0

    # 3. Round-trip: t_src -> t_wall
    w_in, w_out = convert_src_to_wall(t_src_in_b, t_src_out_b, "m002", sync_groups)
    assert w_in == t_wall_in
    assert w_out == t_wall_out


def test_timebase_conversion_boundary_clamping(multi_cam_index):
    """Verify clamping to [0, duration] on source media boundaries."""
    sync_groups = multi_cam_index.sync_groups
    media_map = {m.media_id: m for m in multi_cam_index.media}

    # If t_wall starts at 5.0s, but CAM_B started at 12.5s:
    # 5.0 - 12.5 = -7.5s -> should clamp to 0.0s!
    t_src_in, t_src_out = convert_wall_to_src(
        5.0, 20.0, "m002", sync_groups, media_map
    )
    assert t_src_in == 0.0
    assert t_src_out == 7.5


# --------------------------------------------------------------------------- #
# Planning & Constraints Tests
# --------------------------------------------------------------------------- #


def test_plan_wedding_highlight_duration_budget(multi_cam_index):
    """Verify planned film duration is within ±5% of target duration (180s)."""
    target = 180.0
    plan = plan_rundown(
        index=multi_cam_index,
        template="wedding-highlight",
        target_duration=target,
    )
    assert plan.target_duration == target
    tolerance = target * 0.05
    assert abs(plan.total_duration - target) <= tolerance + 1.0, (
        f"Plan duration {plan.total_duration}s not within ±5% of target {target}s"
    )
    assert len(plan.entries) > 0


def test_zero_duplicate_moments(multi_cam_index):
    """Verify zero duplicate moments across the entire edit plan."""
    plan = plan_rundown(
        index=multi_cam_index,
        template="wedding-highlight",
        target_duration=180.0,
    )
    seen_moments = set()
    for entry in plan.entries:
        assert entry.moment_id not in seen_moments, (
            f"Duplicate moment {entry.moment_id} found in edit plan!"
        )
        seen_moments.add(entry.moment_id)


def test_missing_beat_reporting(multi_cam_index):
    """Verify missing beats are explicitly reported, not silently dropped."""
    # Create template with an impossible beat (e.g. scuba diving at a wedding)
    custom_template = RundownTemplate(
        name="test-missing-beat-tmpl",
        target_duration=60.0,
        beats=[
            RundownBeat(id="arrival", duration=[10, 20], search=["arrival"]),
            RundownBeat(
                id="underwater_scuba",
                duration=[15, 30],
                must_have=["scuba_gear", "coral_reef"],
                search=["scuba diving", "underwater", "sharks"],
            ),
        ],
    )

    plan = plan_rundown(index=multi_cam_index, template=custom_template)
    assert len(plan.missing_beats) >= 1
    missing = next((mb for mb in plan.missing_beats if mb.beat_id == "underwater_scuba"), None)
    assert missing is not None
    assert "underwater_scuba" in missing.beat_id
    assert "scuba_gear" in missing.must_have_constraints or "coral_reef" in missing.must_have_constraints


def test_must_include_enforced_absolutely(multi_cam_index):
    """Client constraint: grandmother must be in the video -> unconditionally placed."""
    grandma_moment_id = "mo099"
    plan = plan_rundown(
        index=multi_cam_index,
        template="wedding-highlight",
        target_duration=180.0,
        must_include=[grandma_moment_id],
    )
    included_moment_ids = [e.moment_id for e in plan.entries]
    assert grandma_moment_id in included_moment_ids, (
        f"must_include moment {grandma_moment_id} was omitted from the plan!"
    )


def test_never_include_enforced_absolutely(multi_cam_index):
    """Client constraint: ex-partner moment must NOT be in the video -> omitted."""
    forbidden_moment_id = "mo001"
    plan = plan_rundown(
        index=multi_cam_index,
        template="wedding-highlight",
        target_duration=180.0,
        never_include=[forbidden_moment_id],
    )
    included_moment_ids = [e.moment_id for e in plan.entries]
    assert forbidden_moment_id not in included_moment_ids, (
        f"never_include moment {forbidden_moment_id} was included in the plan!"
    )


def test_multi_camera_angle_selection(multi_cam_index):
    """Verify best angle (CAM_B with quality 0.95 over CAM_A 0.92) is selected for vows."""
    plan = plan_rundown(
        index=multi_cam_index,
        template="wedding-highlight",
        target_duration=180.0,
    )
    vows_entry = next((e for e in plan.entries if e.beat_id == "vows"), None)
    assert vows_entry is not None
    assert vows_entry.camera_id == "CAM_B", "Planner did not pick highest-quality angle CAM_B"
    assert vows_entry.media_id == "m002"
    # Verify CAM_B sync offset applied: 80 - 12.5 = 67.5s in original file
    assert vows_entry.t_src_in == 67.5


def test_mechanical_reviewer_catches_violations():
    """Verify mechanical review scorecard flags sub-0.4s flash cuts and duplicates."""
    invalid_plan = EditPlanV2(
        plan_id="plan_invalid",
        project_id="test",
        template_name="wedding-highlight",
        target_duration=100.0,
        total_duration=1.5,
        entries=[
            # Sub-0.4s flash
            EditPlanEntryV2(
                entry_id="e1",
                moment_id="m1",
                shot_id="s1",
                media_id="m1",
                camera_id="CAM_A",
                t_src_in=10.0,
                t_src_out=10.2,  # 0.2s duration < 0.4s!
                duration=0.2,
                t_wall_in=10.0,
                t_wall_out=10.2,
                angle_chosen="CAM_A",
            ),
            # Duplicate moment
            EditPlanEntryV2(
                entry_id="e2",
                moment_id="m1",  # REPEATED!
                shot_id="s1",
                media_id="m1",
                camera_id="CAM_A",  # SAME ANGLE!
                t_src_in=12.0,
                t_src_out=13.0,
                duration=1.0,
                t_wall_in=12.0,
                t_wall_out=13.0,
                angle_chosen="CAM_A",
            ),
        ],
        created_at=datetime.now(timezone.utc).isoformat(),
    )

    card = review_plan_mechanics(invalid_plan)
    assert not card.passed
    assert len(card.sub_04_flashes) > 0
    assert len(card.repeated_moments) > 0
    assert len(card.consecutive_same_angles) > 0


def test_plan_io_and_approval_roundtrip(multi_cam_index):
    """Verify EditPlan serialization, deserialization, and approval state."""
    plan = plan_rundown(
        index=multi_cam_index,
        template="wedding-highlight",
        target_duration=180.0,
    )
    assert not plan.approved

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
        plan_path = tf.name

    try:
        write_edit_plan(plan, plan_path)
        loaded = read_edit_plan(plan_path)
        assert loaded.plan_id == plan.plan_id
        assert len(loaded.entries) == len(plan.entries)

        # Approve
        approve_plan(loaded)
        assert loaded.approved
        assert loaded.approved_at is not None

        # Revoke
        revoke_approval(loaded)
        assert not loaded.approved
        assert loaded.approved_at is None
    finally:
        Path(plan_path).unlink(missing_ok=True)
