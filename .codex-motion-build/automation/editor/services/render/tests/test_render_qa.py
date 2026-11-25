import pytest
from services.render.render_qa import (
    QADefect, QAReport, inspect_rendered_mp4, AutomatedRepairEngine
)
from tools.edit.edit_plan import EditPlanManager

def test_qa_defect_data_model():
    defect = QADefect(
        defect_id="DF_TEST",
        severity="CRITICAL",
        category="visual",
        title="Black frame detected",
        detail="0.6s black screen at 0:02",
        timestamp=2.0,
        repairable=True,
        proposed_fix={"op": "remove_span", "params": {"start": 2.0, "end": 2.6}}
    )
    d = defect.to_dict()
    assert d["defect_id"] == "DF_TEST"
    assert d["severity"] == "CRITICAL"
    assert d["repairable"] is True
    assert d["proposed_fix"]["op"] == "remove_span"

def test_qa_report_missing_file():
    rep = inspect_rendered_mp4("non_existent_file.mp4")
    assert rep.status == "FAIL"
    assert rep.has_critical_defects is True
    assert rep.score == 0.0
    assert rep.defects[0].defect_id == "DF_NO_FILE"

def test_automated_repair_engine_mock():
    # Setup mock plan manager
    plan = {
        "version": 1,
        "source": {"path": "assets/test.mp4", "duration": 30.0},
        "output": {"width": 1920, "height": 1080}, # Wrong aspect (landscape)
        "keep": [{"id": "k1", "start": 0.0, "end": 30.0}],
    }
    mgr = EditPlanManager(plan)

    # Mock render function that fixes aspect ratio on second attempt
    attempts = [0]
    def mock_render(p):
        attempts[0] += 1
        return "assets/fixed_render.mp4"

    engine = AutomatedRepairEngine(mock_render, max_attempts=2)
    assert engine.max_attempts == 2
