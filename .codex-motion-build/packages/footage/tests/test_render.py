"""Tests for conform rendering, ffmpeg mastering, 409 NOT_APPROVED gate, and deliverables."""

import json
from pathlib import Path
import tempfile
import pytest

from footage.editplan import approve_plan
from footage.plan_schema import (
    ChapterMarker,
    DeliverableSpec,
    DeliverableType,
    EditPlanEntryV2,
    EditPlanV2,
)
from footage.render import (
    PlanNotApprovedError,
    conform_render,
    format_ffmetadata_chapters,
    measure_audio_loudness,
    render_all_deliverables,
)


@pytest.fixture
def sample_approved_plan() -> EditPlanV2:
    """Fixture providing an approved EditPlanV2 ready for rendering."""
    entries = [
        EditPlanEntryV2(
            entry_id="e01",
            beat_id="arrival",
            moment_id="mo001",
            shot_id="s01",
            media_id="m001",
            camera_id="CAM_A",
            t_src_in=0.0,
            t_src_out=1.5,
            duration=1.5,
            t_wall_in=0.0,
            t_wall_out=1.5,
            angle_chosen="CAM_A",
            speech_whole=False,
        ),
        EditPlanEntryV2(
            entry_id="e02",
            beat_id="vows",
            moment_id="mo002",
            shot_id="s02",
            media_id="m001",
            camera_id="CAM_A",
            t_src_in=2.0,
            t_src_out=3.5,
            duration=1.5,
            t_wall_in=2.0,
            t_wall_out=3.5,
            angle_chosen="CAM_A",
            speech_whole=True,
        ),
    ]

    chapters = [
        ChapterMarker(title="Arrival", start_time=0.0, end_time=1.5),
        ChapterMarker(title="Vows", start_time=1.5, end_time=3.0),
    ]

    deliverables = {
        "highlight": DeliverableSpec(
            deliverable_type=DeliverableType.HIGHLIGHT,
            target_duration=3.0,
            total_duration=3.0,
            entries=entries,
            chapters=chapters,
        ),
        "teaser": DeliverableSpec(
            deliverable_type=DeliverableType.TEASER,
            target_duration=1.5,
            total_duration=1.5,
            entries=[entries[0]],
            chapters=[],
        ),
        "full": DeliverableSpec(
            deliverable_type=DeliverableType.FULL,
            target_duration=3.0,
            total_duration=3.0,
            entries=entries,
            chapters=chapters,
        ),
    }

    plan = EditPlanV2(
        plan_id="plan_test_001",
        project_id="test_render_proj",
        template_name="wedding-highlight",
        target_duration=3.0,
        total_duration=3.0,
        entries=entries,
        chapters=chapters,
        deliverables=deliverables,
        approved=True,
        approved_at="2026-11-20T10:00:00Z",
        created_at="2026-11-20T10:00:00Z",
    )
    return plan


def test_409_not_approved_for_unapproved_render(sample_approved_plan):
    """MANDATORY: Conform render must return 409 NOT_APPROVED when unapproved.
    
    Nobody ships a wedding film unreviewed.
    """
    unapproved_plan = sample_approved_plan.model_copy(update={"approved": False, "approved_at": None})

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tf:
        out_mp4 = tf.name

    try:
        with pytest.raises(PlanNotApprovedError) as exc_info:
            conform_render(unapproved_plan, out_mp4, deliverable="highlight", allow_unapproved=False)

        assert exc_info.value.status_code == 409
        assert "409 NOT_APPROVED" in str(exc_info.value)
    finally:
        Path(out_mp4).unlink(missing_ok=True)


def test_format_ffmetadata_chapters():
    """Verify formatting of ffmpeg chapter metadata."""
    chapters = [
        ChapterMarker(title="Welcome", start_time=0.0, end_time=15.5),
        ChapterMarker(title="Vows", start_time=15.5, end_time=45.0),
    ]
    txt = format_ffmetadata_chapters(chapters, title="Wedding Highlight")
    assert ";FFMETADATA1" in txt
    assert "title=Wedding Highlight" in txt
    assert "[CHAPTER]" in txt
    assert "TIMEBASE=1/1000" in txt
    assert "START=0" in txt
    assert "END=15500" in txt
    assert "title=Welcome" in txt
    assert "START=15500" in txt
    assert "END=45000" in txt
    assert "title=Vows" in txt


def test_conform_render_approved_produces_mp4_with_lufs_and_peak(sample_approved_plan):
    """Verify conform render produces valid MP4 with measured -14 LUFS and true peak < -1.5."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        out_mp4 = Path(tmp_dir) / "highlight.mp4"
        res = conform_render(
            sample_approved_plan,
            out_mp4,
            deliverable="highlight",
            allow_unapproved=False,
            work_dir=tmp_dir,
        )

        assert out_mp4.is_file()
        assert out_mp4.stat().st_size > 1000
        assert res["deliverable"] == "highlight"
        assert res["approved"] is True

        # Check audio mastering targets
        assert abs(res["lufs"] - (-14.0)) <= 1.5, f"LUFS {res['lufs']} outside -14 ± 1.5"
        assert res["peak"] <= -1.5, f"Peak {res['peak']} exceeds -1.5 dBTP threshold"


def test_allow_unapproved_draft_render(sample_approved_plan):
    """Verify allow_unapproved=True bypasses the 409 gate for preview/draft renders."""
    unapproved_plan = sample_approved_plan.model_copy(update={"approved": False})

    with tempfile.TemporaryDirectory() as tmp_dir:
        out_mp4 = Path(tmp_dir) / "draft.mp4"
        res = conform_render(
            unapproved_plan,
            out_mp4,
            deliverable="highlight",
            allow_unapproved=True,
            work_dir=tmp_dir,
        )
        assert out_mp4.is_file()
        assert res["approved"] is False


def test_render_all_deliverables(sample_approved_plan):
    """Verify rendering all 3 deliverables (teaser, highlight, full)."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        results = render_all_deliverables(sample_approved_plan, tmp_dir, allow_unapproved=False)
        assert "teaser" in results
        assert "highlight" in results
        assert "full" in results

        for d_name, d_res in results.items():
            mp4_path = Path(d_res["output_path"])
            assert mp4_path.is_file(), f"{d_name} MP4 was not created"
            assert mp4_path.stat().st_size > 1000
