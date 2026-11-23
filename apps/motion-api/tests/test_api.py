"""The HTTP surface, wired to fakes and run synchronously."""
import pytest
from fastapi.testclient import TestClient

from motion_api.jobs import JobStore
from motion_api.kit import Scorecard
from motion_api.llm import FakeClient, final_turn, tool_turn
from motion_api.main import create_app

from .test_director import FakeRenderer


@pytest.fixture()
def client(tmp_path):
    store = JobStore(root=tmp_path / "jobs")
    llm = FakeClient(turns=[
        tool_turn("write_file", {"path": "plan.md", "content": "# plan"}),
        tool_turn("render_final", {"name": "film.mp4"}),
        final_turn(),
    ])
    app = create_app(client=llm, renderer=FakeRenderer(), store=store, background=False)
    return TestClient(app)


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["ok"] is True


def test_index_ui(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "Motion Films" in r.text


def test_a_brief_becomes_a_scored_film(client):
    r = client.post("/motion/jobs", json={"brief": "15s launch film for a yoga app"})
    assert r.status_code == 202
    job_id = r.json()["id"]

    got = client.get(f"/motion/jobs/{job_id}")
    assert got.status_code == 200
    body = got.json()
    assert body["status"] == "done"
    assert body["final_path"] == "out/film.mp4"
    assert body["scorecard"]["passes"] is True
    assert body["rounds"] >= 2
    assert body["errors"] == []


def test_jobs_are_listed_and_persisted(client, tmp_path):
    client.post("/motion/jobs", json={"brief": "one"})
    client.post("/motion/jobs", json={"brief": "two"})
    jobs = client.get("/motion/jobs").json()["jobs"]
    assert len(jobs) == 2

    # A fresh store over the same directory must find them again.
    reloaded = JobStore(root=tmp_path / "jobs")
    assert len(reloaded.list()) == 2


def test_unknown_job_is_404(client):
    assert client.get("/motion/jobs/mj_nope").status_code == 404
    assert client.get("/motion/jobs/mj_nope/film").status_code == 404


def test_empty_brief_is_rejected(client):
    assert client.post("/motion/jobs", json={"brief": ""}).status_code == 422


def test_a_failing_render_marks_the_job_failed(tmp_path):
    class Boom(FakeRenderer):
        def render_final(self, job_dir, name):
            raise RuntimeError("remotion bundle failed")

    llm = FakeClient(turns=[tool_turn("render_final", {"name": "f.mp4"}), final_turn()])
    app = create_app(client=llm, renderer=Boom(), store=JobStore(root=tmp_path / "j"),
                     background=False)
    c = TestClient(app)
    job_id = c.post("/motion/jobs", json={"brief": "x"}).json()["id"]

    body = c.get(f"/motion/jobs/{job_id}").json()
    assert body["status"] == "failed"
    assert any("remotion bundle failed" in e for e in body["errors"])
