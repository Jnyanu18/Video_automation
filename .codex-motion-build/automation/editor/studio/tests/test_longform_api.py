"""API tests for longform footage indexing and retrieval routes."""

from __future__ import annotations

import sys
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


def test_longform_unavailable_degradation(api_client, monkeypatch):
    """When ailo-footage is not installed, routes return 503 unavailable."""
    client, _ = api_client
    monkeypatch.setattr(longform_mod, "is_footage_available", lambda: False)

    res_post = client.post("/api/editor/longform/index", json={"source_dir": "/dummy"})
    assert res_post.status_code == 503
    msg = res_post.json().get("detail") or res_post.json().get("message") or ""
    assert "not installed" in msg.lower()

    res_poll = client.get("/api/editor/longform/index/dummy_jid")
    assert res_poll.status_code == 503

    res_moments = client.get("/api/editor/longform/proj1/moments")
    assert res_moments.status_code == 503

    res_rej = client.get("/api/editor/longform/proj1/rejected")
    assert res_rej.status_code == 503


def test_longform_index_and_poll(api_client, tmp_path):
    """Test start index returns 202 and polling yields status."""
    client, work = api_client
    src_dir = tmp_path / "footage"
    src_dir.mkdir()

    with patch("footage.index.index_footage") as mock_idx:
        from footage.schema import FootageIndex, IndexStats
        mock_idx.return_value = FootageIndex(
            index_version=2,
            project_id="test_event",
            created_at="2026-11-20T10:00:00Z",
            source_dirs=[str(src_dir)],
            stats=IndexStats(
                total_source_seconds=60.0,
                media_count=1,
                shots=2,
                moments=1,
                kept_seconds=10.0,
                keep_ratio=0.166,
                proxy_seconds=2.0,
                index_wall_seconds=4.0,
                realtime_factor=15.0,
                model_calls=0,
            ),
        )

        res = client.post(
            "/api/editor/longform/index",
            json={"source_dir": str(src_dir), "project_id": "test_event"},
        )
        assert res.status_code == 202
        data = res.json()
        assert "job_id" in data
        jid = data["job_id"]

        poll_res = client.get(f"/api/editor/longform/index/{jid}")
        assert poll_res.status_code == 200
        poll_data = poll_res.json()
        assert poll_data["job_id"] == jid
        assert poll_data["status"] in ("running", "done")


def test_longform_moments_and_rejected_routes(api_client, tmp_path):
    """Test moments and rejected routes return filtered and paged results."""
    client, work = api_client
    proj_dir = work / "longform" / "test_proj"
    proj_dir.mkdir(parents=True)
    idx_path = proj_dir / "index.json"

    from footage.index import write_index
    from footage.schema import FootageIndex, IndexStats, MediaFile, Moment, MomentAngle, RejectReason, Shot

    index = FootageIndex(
        index_version=2,
        project_id="test_proj",
        created_at="2026-11-20T10:00:00Z",
        source_dirs=[str(tmp_path)],
        media=[
            MediaFile(
                media_id="m1",
                path=str(tmp_path / "a.mp4"),
                camera_id="CAM_A",
                duration=30.0,
                fps=25.0,
                width=1920,
                height=1080,
                codec="h264",
                has_audio=False,
            )
        ],
        shots=[
            Shot(
                shot_id="s1",
                media_id="m1",
                start=0.0,
                end=5.0,
                keep_score=0.8,
                reject_reason=None,
            ),
            Shot(
                shot_id="s2",
                media_id="m1",
                start=5.0,
                end=8.0,
                keep_score=0.2,
                reject_reason=RejectReason.OUT_OF_FOCUS,
            ),
        ],
        moments=[
            Moment(
                moment_id="mo0001",
                t_start=0.0,
                t_end=5.0,
                angles=[MomentAngle(shot_id="s1", camera_id="CAM_A", quality=0.8)],
                keep_score=0.8,
                tags=["entrance"],
            )
        ],
        stats=IndexStats(
            total_source_seconds=30.0,
            media_count=1,
            shots=2,
            moments=1,
            kept_seconds=5.0,
            keep_ratio=0.166,
            proxy_seconds=1.0,
            index_wall_seconds=2.0,
            realtime_factor=15.0,
            model_calls=0,
        ),
    )
    write_index(index, idx_path)

    # Test moments endpoint
    res_m = client.get("/api/editor/longform/test_proj/moments")
    assert res_m.status_code == 200
    data_m = res_m.json()
    assert data_m["total"] == 1
    assert data_m["moments"][0]["moment_id"] == "mo0001"

    # Test rejected endpoint
    res_r = client.get("/api/editor/longform/test_proj/rejected")
    assert res_r.status_code == 200
    data_r = res_r.json()
    assert data_r["total_rejected"] == 1
    assert data_r["rejected_shots"][0]["reject_reason"] == "out_of_focus"
