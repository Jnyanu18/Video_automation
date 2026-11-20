"""API tests for longform film planning, human approval, and conform rendering routes."""

from __future__ import annotations

import sys
import time
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import api_server
from studio import longform as longform_mod


@pytest.fixture
def api_client(tmp_path):
    work = tmp_path / "work"
    renders = tmp_path / "renders"
    work.mkdir()
    renders.mkdir()
    app = api_server.create_app(
        state_file=tmp_path / "state.json",
        renders_dir=renders,
        work_dir=work,
        start_scheduler=False,
    )
    return TestClient(app), work


def test_longform_plan_unavailable_degradation(api_client, monkeypatch):
    """When ailo-footage is not installed, new routes return 503."""
    client, _ = api_client
    monkeypatch.setattr(longform_mod, "is_footage_available", lambda: False)

    # Plan
    res_plan = client.post("/api/editor/longform/proj1/plan", json={"template": "wedding-highlight"})
    assert res_plan.status_code == 503

    # Get plan
    res_get_plan = client.get("/api/editor/longform/proj1/plan/plan_123")
    assert res_get_plan.status_code == 503

    # Approve
    res_app = client.post("/api/editor/longform/proj1/plan/plan_123/approve")
    assert res_app.status_code == 503

    # Render
    res_rnd = client.post("/api/editor/longform/proj1/render", json={"plan_id": "plan_123"})
    assert res_rnd.status_code == 503

    # Render poll
    res_rnd_poll = client.get("/api/editor/longform/proj1/render/lfr_123")
    assert res_rnd_poll.status_code == 503


def test_longform_plan_202_and_polling(api_client, tmp_path):
    """Test POST /plan starts background job (202) and yields plan with missing-beat report."""
    client, work = api_client
    proj_id = "test_wedding"
    proj_dir = work / "longform" / proj_id
    proj_dir.mkdir(parents=True)
    idx_path = proj_dir / "index.json"

    # Write a minimal valid FootageIndex
    from footage.schema import FootageIndex, IndexStats, MediaFile, Moment, MomentAngle, Shot
    from footage.index import write_index

    idx = FootageIndex(
        project_id=proj_id,
        created_at="2026-11-20T10:00:00Z",
        source_dirs=["/raw"],
        media=[
            MediaFile(
                media_id="m1",
                path="J:/raw/cam_a.mp4",
                camera_id="CAM_A",
                duration=120.0,
                fps=25.0,
                width=1920,
                height=1080,
                codec="h264",
                has_audio=True,
            )
        ],
        shots=[
            Shot(shot_id="s1", media_id="m1", start=10.0, end=30.0, keep_score=0.9, audio_class="speech", faces=2)
        ],
        moments=[
            Moment(
                moment_id="mo1",
                t_start=10.0,
                t_end=30.0,
                angles=[MomentAngle(shot_id="s1", camera_id="CAM_A", quality=0.9)],
                keep_score=0.9,
                tags=["vows", "speech"],
                description="Wedding vows",
            )
        ],
        stats=IndexStats(
            total_source_seconds=120.0,
            media_count=1,
            shots=1,
            moments=1,
            kept_seconds=20.0,
            keep_ratio=0.166,
            proxy_seconds=1.0,
            index_wall_seconds=2.0,
            realtime_factor=10.0,
            model_calls=0,
        ),
    )
    write_index(idx, idx_path)

    # Request plan
    res = client.post(
        f"/api/editor/longform/{proj_id}/plan",
        json={"template": "wedding-highlight", "target_duration": 60.0},
    )
    assert res.status_code == 202
    data = res.json()
    assert "job_id" in data
    jid = data["job_id"]

    # Poll until done
    plan_id = None
    for _ in range(30):
        poll = client.get(f"/api/editor/longform/index/{jid}")
        if poll.status_code == 200:
            p_data = poll.json()
            if p_data.get("status") == "done":
                plan_id = p_data.get("plan_id")
                break
        time.sleep(0.1)

    assert plan_id is not None

    # GET /plan/{plan_id}
    res_plan = client.get(f"/api/editor/longform/{proj_id}/plan/{plan_id}")
    assert res_plan.status_code == 200
    plan_data = res_plan.json()
    assert plan_data["plan_id"] == plan_id
    assert "missing_beats" in plan_data
    assert "entries" in plan_data
    assert plan_data["approved"] is False


def test_longform_render_unapproved_returns_409(api_client, tmp_path):
    """MANDATORY: Rendering an unapproved plan must return 409 NOT_APPROVED."""
    client, work = api_client
    proj_id = "test_wedding_409"
    proj_dir = work / "longform" / proj_id
    plans_dir = proj_dir / "plans"
    plans_dir.mkdir(parents=True)

    from footage.plan_schema import EditPlanEntryV2, EditPlanV2
    from footage.editplan import write_edit_plan

    plan = EditPlanV2(
        plan_id="plan_unapproved_99",
        project_id=proj_id,
        template_name="wedding-highlight",
        target_duration=60.0,
        total_duration=10.0,
        entries=[
            EditPlanEntryV2(
                entry_id="e1",
                moment_id="mo1",
                shot_id="s1",
                media_id="m1",
                camera_id="CAM_A",
                t_src_in=0.0,
                t_src_out=1.0,
                duration=1.0,
                t_wall_in=0.0,
                t_wall_out=1.0,
                angle_chosen="CAM_A",
            )
        ],
        approved=False,
        created_at="2026-11-20T10:00:00Z",
    )
    write_edit_plan(plan, plans_dir / f"{plan.plan_id}.json")

    # Attempt render unapproved
    res = client.post(
        f"/api/editor/longform/{proj_id}/render",
        json={"plan_id": plan.plan_id, "deliverable": "highlight"},
    )
    assert res.status_code == 409
    err = res.json().get("message") or res.json().get("detail") or res.json().get("error") or ""
    assert "409" in err or "NOT_APPROVED" in err or "CONFLICT" in err


def test_longform_approve_and_render_flow(api_client, tmp_path):
    """Test full approval and render flow via API routes."""
    client, work = api_client
    proj_id = "test_wedding_approve"
    proj_dir = work / "longform" / proj_id
    plans_dir = proj_dir / "plans"
    plans_dir.mkdir(parents=True)

    from footage.plan_schema import EditPlanEntryV2, EditPlanV2
    from footage.editplan import write_edit_plan

    plan = EditPlanV2(
        plan_id="plan_to_approve_88",
        project_id=proj_id,
        template_name="wedding-highlight",
        target_duration=3.0,
        total_duration=1.0,
        entries=[
            EditPlanEntryV2(
                entry_id="e1",
                moment_id="mo1",
                shot_id="s1",
                media_id="m1",
                camera_id="CAM_A",
                t_src_in=0.0,
                t_src_out=1.0,
                duration=1.0,
                t_wall_in=0.0,
                t_wall_out=1.0,
                angle_chosen="CAM_A",
            )
        ],
        approved=False,
        created_at="2026-11-20T10:00:00Z",
    )
    write_edit_plan(plan, plans_dir / f"{plan.plan_id}.json")

    # 1. Approve
    res_app = client.post(f"/api/editor/longform/{proj_id}/plan/{plan.plan_id}/approve")
    assert res_app.status_code == 200
    app_data = res_app.json()
    assert app_data["approved"] is True

    # 2. Render now succeeds with 202
    res_rnd = client.post(
        f"/api/editor/longform/{proj_id}/render",
        json={"plan_id": plan.plan_id, "deliverable": "highlight"},
    )
    assert res_rnd.status_code == 202
    rnd_data = res_rnd.json()
    assert "job_id" in rnd_data
    r_jid = rnd_data["job_id"]

    # 3. Poll render status
    res_poll = client.get(f"/api/editor/longform/{proj_id}/render/{r_jid}")
    assert res_poll.status_code == 200
    poll_data = res_poll.json()
    assert poll_data["job_id"] == r_jid
