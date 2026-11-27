"""The givemotion queue kind and the Claude-side job steps. The queue folder is a temp dir; givemotion is mocked."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from studio import agent_bridge as ab  # noqa: E402
from studio import givemotion, givemotion_job  # noqa: E402

JOB_ID = "aj_0123456789ab"


@pytest.fixture
def queue(tmp_path, monkeypatch):
    monkeypatch.setattr(ab, "QUEUE_DIR", tmp_path / "queue")
    folder = ab.QUEUE_DIR / JOB_ID
    folder.mkdir(parents=True)
    (folder / "job.json").write_text('{"id": "%s", "status": "working", "kind": "givemotion"}' % JOB_ID, encoding="utf-8")
    return folder


# ---- queue contract -----------------------------------------------------------------------------

def test_givemotion_is_an_accepted_job_kind():
    req = ab.AgentJobRequest(prompt="Launch film for AILO", kind="givemotion")
    assert req.kind == "givemotion"
    assert "givemotion" in ab.KINDS


def test_unknown_kind_is_still_rejected():
    with pytest.raises(ValidationError):
        ab.AgentJobRequest(prompt="Launch film for AILO", kind="teleport")


def test_existing_kinds_unchanged():
    for kind in ("motion", "edit", "event"):
        assert ab.AgentJobRequest(prompt="Launch film for AILO", kind=kind).kind == kind


# ---- job steps ----------------------------------------------------------------------------------

def test_bad_job_id_is_refused(queue):
    with pytest.raises(givemotion_job.JobError):
        givemotion_job.check_job("../../etc")


def test_missing_job_folder_is_refused(tmp_path, monkeypatch):
    monkeypatch.setattr(ab, "QUEUE_DIR", tmp_path / "queue")
    with pytest.raises(givemotion_job.JobError, match="no job folder"):
        givemotion_job.check_job("aj_ffffffffffff")


def test_missing_composition_is_refused(queue):
    with pytest.raises(givemotion_job.JobError, match="write the composition first"):
        givemotion_job.render_job(JOB_ID)


def test_render_refuses_when_check_fails(queue, monkeypatch):
    (queue / "video.html").write_text("<html></html>", encoding="utf-8")
    monkeypatch.setattr(givemotion, "check_html", lambda p, **kw: {"ok": False, "output": "", "error": "2 error(s)", "result": {"errors": 2}})

    def must_not_render(*a, **kw):
        raise AssertionError("render must not run after a failed check")

    monkeypatch.setattr(givemotion, "render_html", must_not_render)
    res = givemotion_job.render_job(JOB_ID)
    assert res["ok"] is False
    assert "check failed" in res["error"]


def test_render_writes_mp4_beside_composition(queue, monkeypatch):
    (queue / "video.html").write_text("<html></html>", encoding="utf-8")
    monkeypatch.setattr(givemotion, "check_html", lambda p, **kw: {"ok": True, "output": "", "error": "", "result": {"ok": True}})
    seen = {}

    def fake_render(html_path, out_path, **kw):
        seen["html"], seen["out"] = Path(html_path), Path(out_path)
        return {"ok": True, "output": str(out_path), "error": "", "result": {"frames": 90}}

    monkeypatch.setattr(givemotion, "render_html", fake_render)
    res = givemotion_job.render_job(JOB_ID)
    assert res["ok"] is True
    assert seen["html"] == queue / "video.html"
    assert seen["out"] == queue / "givemotion.mp4"


def test_job_note_records_the_check(queue, monkeypatch):
    (queue / "video.html").write_text("<html></html>", encoding="utf-8")
    monkeypatch.setattr(givemotion, "check_html", lambda p, **kw: {"ok": True, "output": "", "error": "", "result": {}})
    givemotion_job.check_job(JOB_ID)
    texts = [u["text"] for u in ab.read_job(JOB_ID).get("updates", [])]
    assert any(t.startswith("Composition checked: ok") for t in texts)


def test_cli_returns_nonzero_on_failure(queue, monkeypatch, capsys):
    rc = givemotion_job._main(["check", "../../nope"])
    assert rc == 1
    assert '"ok": false' in capsys.readouterr().out.lower()


def test_cli_rejects_unknown_command(capsys):
    assert givemotion_job._main(["publish", JOB_ID]) == 2


# ---- brand kit for a job ------------------------------------------------------------------------

def _write_job_owner(queue, owner):
    job = queue / "job.json"
    data = json.loads(job.read_text(encoding="utf-8"))
    data["user_id"] = owner
    job.write_text(json.dumps(data), encoding="utf-8")


def test_kit_for_job_reads_the_owners_real_kit(queue, tmp_path, monkeypatch):
    kit_src = Path(__file__).resolve().parents[2] / "brand" / "examples" / "ailo.draft.json"
    kit = json.loads(kit_src.read_text(encoding="utf-8"))
    kit["owner"] = "owner-1"
    _write_job_owner(queue, "owner-1")
    account = tmp_path / "account"
    (account / "brand").mkdir(parents=True)
    (account / "brand" / "kit.json").write_text(json.dumps(kit), encoding="utf-8")
    monkeypatch.setattr(givemotion_job, "account_work_dir", lambda owner: account)
    res = givemotion_job.kit_for_job(JOB_ID)
    assert res["has_kit"] is True
    assert res["palette"]["primary"] == "#FF8A4C"
    assert res["heading_font"] == "Poppins"
    assert res["logo_file"] is None  # the example logo is a web URL, so it is not embedded


def test_kit_for_job_without_a_kit_says_so(queue, tmp_path, monkeypatch):
    _write_job_owner(queue, "owner-1")
    monkeypatch.setattr(givemotion_job, "account_work_dir", lambda owner: tmp_path / "empty")
    res = givemotion_job.kit_for_job(JOB_ID)
    assert res["has_kit"] is False
    assert "built-in AILO palette" in res["note"]
