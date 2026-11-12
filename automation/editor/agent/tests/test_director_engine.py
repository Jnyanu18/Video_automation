import pytest
from tools.edit.edit_plan import EditPlanManager
from agent.director_engine import DirectorEngine

@pytest.fixture
def plan_mgr():
    base_plan = {
        "version": 1,
        "source": {"path": "assets/test.mp4", "duration": 30.0, "width": 1080, "height": 1920, "fps": 30.0},
        "output": {"width": 1080, "height": 1920, "fps": 30.0},
        "keep": [{"id": "k1", "start": 0.0, "end": 30.0}],
    }
    return EditPlanManager(base_plan)

@pytest.fixture
def footage_index():
    return {
        "media_id": "test_director",
        "duration": 30.0,
        "scenes": [
            {"scene_id": "sc_01", "start": 0.0, "end": 3.2, "transcript": "Never build features nobody asked for", "visual_tags": ["hook"]},
            {"scene_id": "sc_02", "start": 3.2, "end": 15.0, "transcript": "Here is the proof in our customer data", "visual_tags": ["demo"]},
            {"scene_id": "sc_03", "start": 15.0, "end": 22.0, "transcript": "They wanted this simple button instead", "visual_tags": ["solution"]},
            {"scene_id": "sc_04", "start": 22.0, "end": 30.0, "transcript": "Send this to your team and follow for part 2", "visual_tags": ["cta"]},
        ],
    }

def test_director_plan_narrative_cut(plan_mgr, footage_index):
    director = DirectorEngine(plan_mgr, footage_index)
    res = director.plan_narrative_cut(style="viral_hook_fast_pace", platform="instagram_reels")
    assert res["ok"] is True
    plan = res["plan"]
    assert len(plan["keep"]) >= 2
    assert len(plan["zooms"]) >= 1
    assert len(plan["sfx"]) >= 1
    assert "viral_hook_fast_pace" in plan["style_ref"]

def test_conversational_patch_lifecycle(plan_mgr, footage_index):
    director = DirectorEngine(plan_mgr, footage_index)
    patch = director.propose_conversational_patch("Make the opening hook punchier")
    assert patch.patch_id.startswith("patch_")
    assert "hook" in patch.summary.lower()
    assert len(patch.operations) > 0

    # Apply patch (contains 2 operations: add_zoom and add_sfx)
    res = director.apply_patch(patch.patch_id)
    assert res["ok"] is True
    assert res["new_version"] == 3
    assert plan_mgr.version == 3
    assert not plan_mgr.is_approved

def test_reject_patch(plan_mgr, footage_index):
    director = DirectorEngine(plan_mgr, footage_index)
    patch = director.propose_conversational_patch("Tighten pacing")
    rej = director.reject_patch(patch.patch_id)
    assert rej["ok"] is True
    assert rej["status"] == "REJECTED"
    assert plan_mgr.version == 1
