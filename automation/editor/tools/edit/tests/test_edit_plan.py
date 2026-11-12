import pytest
from tools.edit.edit_plan import (
    EditPlanManager, EditPlanError, validate_edit_plan,
    plan_diff, time_to_frame, frame_to_time, compute_plan_fingerprint
)

@pytest.fixture
def sample_plan():
    return {
        "version": 1,
        "source": {"path": "assets/sample.mp4", "duration": 30.0, "width": 1080, "height": 1920, "fps": 30.0},
        "output": {"width": 1080, "height": 1920, "fps": 30.0},
        "keep": [
            {"id": "k1", "start": 0.0, "end": 10.0},
            {"id": "k2", "start": 12.0, "end": 28.0},
        ],
        "captions": [
            {"id": "c1", "start": 0.5, "end": 2.5, "text": "Welcome to Director 2.0"},
        ],
        "zooms": [],
        "sfx": [],
        "audio": {"target_lufs": -14.0},
    }

def test_validate_edit_plan(sample_plan):
    ok, errs = validate_edit_plan(sample_plan)
    assert ok is True
    assert len(errs) == 0

def test_validate_invalid_plan():
    ok, errs = validate_edit_plan({"source": {"path": ""}})
    assert ok is False
    assert any("keep" in e for e in errs)

def test_time_and_frame_conversions():
    assert time_to_frame(1.0, 30.0) == 30
    assert time_to_frame(0.03333, 30.0) == 1
    assert frame_to_time(30, 30.0) == 1.0

def test_edit_plan_manager_lifecycle(sample_plan):
    mgr = EditPlanManager(sample_plan)
    assert mgr.version == 1
    assert not mgr.is_approved

    # Approve
    appr = mgr.approve(approver="Vishnu", notes="Looks great")
    assert appr["approved"] is True
    assert mgr.is_approved is True

    # Apply operation: remove span
    res = mgr.apply_operation(
        "remove_span",
        {"start": 15.0, "end": 20.0},
        reason="Cut tangent about weather",
        confidence=0.98
    )
    assert res["ok"] is True
    assert mgr.version == 2
    # Approval must be invalidated
    assert mgr.is_approved is False

    # Check keep segments were split/trimmed
    cur_keep = mgr.current["keep"]
    assert len(cur_keep) == 3  # [0, 10], [12, 15], [20, 28]

    # Test undo
    prev = mgr.undo()
    assert mgr.version == 1
    assert len(prev["keep"]) == 2

    # Test redo
    nxt = mgr.redo()
    assert mgr.version == 2
    assert len(nxt["keep"]) == 3

def test_plan_diff(sample_plan):
    mgr = EditPlanManager(sample_plan)
    v1 = mgr.current
    mgr.apply_operation("add_zoom", {"start": 0.0, "end": 3.0, "factor": 1.2}, reason="Punch in on hook")
    v2 = mgr.current

    diff = plan_diff(v1, v2)
    assert diff["zooms_changed"] is True
