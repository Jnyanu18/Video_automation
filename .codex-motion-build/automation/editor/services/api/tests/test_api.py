import sys
import types

import pytest

from conftest import wait
from editor_api import adapters


def sse(c, pid, **params):
    out = []
    with c.stream("GET", f"/projects/{pid}/events", params={"follow": "false", **params}) as r:
        assert r.headers["content-type"].startswith("text/event-stream")
        cur = {}
        for line in r.iter_lines():
            if line.startswith("id: "): cur["id"] = int(line[4:])
            elif line.startswith("event: "): cur["event"] = line[7:]
            elif line.startswith("data: "):
                import json; cur["data"] = json.loads(line[6:]); out.append(cur); cur = {}
    return out


def test_create_and_get(client):
    r = client.post("/projects", json={"name": "demo"})
    assert r.status_code == 201
    pid = r.json()["id"]
    g = client.get(f"/projects/{pid}").json()
    assert g["name"] == "demo" and g["status"] == "created"
    assert g["plan"] is None and g["messages"] == []
    assert client.get("/projects/nope").status_code == 404
    assert client.post("/projects").status_code == 201  # body optional


def test_upload_creates_plan_v1(client, project):
    r = client.post(f"/projects/{project}/upload", files={"file": ("../evil name.mp4", b"abc", "video/mp4")})
    assert r.status_code == 201
    body = r.json()
    assert body["plan_version"] == 1
    plan = body["plan"]
    assert plan["version"] == 1 and plan["source"]["path"].endswith("evil_name.mp4")
    assert ".." not in plan["source"]["path"]
    assert set(plan) >= {"source", "output", "keep", "captions", "reframe", "overlays", "style_ref", "notes"}
    g = client.get(f"/projects/{project}").json()
    assert g["status"] == "uploaded" and g["assets"][0]["kind"] == "source"
    assert client.get(f"/projects/{project}/source").status_code == 200


def test_upload_empty_and_missing_project(client, project):
    assert client.post(f"/projects/{project}/upload", files={"file": ("a.mp4", b"")}).status_code == 400
    assert client.post("/projects/x/upload", files={"file": ("a.mp4", b"1")}).status_code == 404


def test_message_requires_upload(client, project):
    assert client.post(f"/projects/{project}/messages", json={"content": "hi"}).status_code == 409
    assert client.post(f"/projects/{project}/messages", json={"content": ""}).status_code == 422


def test_message_runs_agent_and_versions_plan(client, uploaded):
    r = client.post(f"/projects/{uploaded}/messages", json={"content": "cut the silences"})
    assert r.status_code == 202 and r.json()["job"]["kind"] == "agent"
    wait(client)
    g = client.get(f"/projects/{uploaded}").json()
    assert g["status"] == "ready"
    assert [m["role"] for m in g["messages"]] == ["user", "assistant"]
    assert g["plan_version"] == 2 and "cut the silences" in g["plan"]["notes"]
    assert g["jobs"][0]["status"] == "done" and g["jobs"][0]["result"]["backend"] == "fake"
    plans = client.get(f"/projects/{uploaded}/plans").json()
    assert [p["version"] for p in plans] == [1, 2] and plans[1]["created_by"] == "agent"
    assert "notes" not in client.get(f"/projects/{uploaded}/plans/1").json()["plan"]["notes"]


def test_plan_restore_and_manual_put(client, uploaded):
    client.post(f"/projects/{uploaded}/messages", json={"content": "x"})
    wait(client)
    r = client.post(f"/projects/{uploaded}/plans/1/restore")
    assert r.status_code == 201 and r.json()["version"] == 3 and r.json()["created_by"] == "restore"
    cur = client.get(f"/projects/{uploaded}").json()["plan"]
    cur["captions"] = [{"id": "c1", "text": "hi", "start": 0, "end": 1, "style": "bold-pop"}]
    assert client.put(f"/projects/{uploaded}/plan", json=cur).json()["version"] == 4
    # identical plan => no new version
    assert client.put(f"/projects/{uploaded}/plan", json=cur).json()["version"] == 4
    assert client.put(f"/projects/{uploaded}/plan", json={"x": 1}).status_code == 422
    assert client.get(f"/projects/{uploaded}/plans/99").status_code == 404


def test_sse_events_and_replay(client, uploaded):
    client.post(f"/projects/{uploaded}/messages", json={"content": "hello"})
    wait(client)
    evs = sse(client, uploaded)
    types_ = [e["event"] for e in evs]
    for t in ["upload.done", "job.queued", "job.started", "agent.started", "agent.thinking",
              "message", "plan.updated", "job.completed"]:
        assert t in types_, t
    assert types_.index("job.queued") < types_.index("job.started") < types_.index("job.completed")
    ids = [e["id"] for e in evs]
    assert ids == sorted(ids)
    # replay after an id
    rest = sse(client, uploaded, after=ids[2])
    assert [e["id"] for e in rest] == ids[3:]
    # Last-Event-ID header
    with client.stream("GET", f"/projects/{uploaded}/events?follow=false",
                       headers={"Last-Event-ID": str(ids[-1])}) as r:
        assert "".join(r.iter_lines()) == ""


def test_render_flow(client, uploaded):
    assert client.get(f"/projects/{uploaded}/render").status_code == 404
    r = client.post(f"/projects/{uploaded}/render", json={"quality": "final"})
    assert r.status_code == 202
    wait(client)
    g = client.get(f"/projects/{uploaded}/render")
    assert g.status_code == 200 and g.headers["content-type"] == "video/mp4"
    assert g.content == b"\x00" * 2048  # fake renderer copies source
    # No preview render yet: the player falls back to the uploaded source rather than a 404.
    assert client.get(f"/projects/{uploaded}/render?quality=preview").status_code == 200
    client.post(f"/projects/{uploaded}/render", json={"quality": "preview"})
    wait(client)
    assert client.get(f"/projects/{uploaded}/render?quality=preview").status_code == 200
    assert "render.done" in [e["event"] for e in sse(client, uploaded)]
    assert client.post(f"/projects/{uploaded}/render", json={"quality": "bogus"}).status_code == 422


def test_render_without_upload(client, project):
    assert client.post(f"/projects/{project}/render").status_code == 409


def test_job_failure_reported(client, uploaded, monkeypatch):
    def boom(*a, **k): raise RuntimeError("kaboom")
    monkeypatch.setattr(adapters, "run_agent", boom)
    client.post(f"/projects/{uploaded}/messages", json={"content": "x"})
    wait(client)
    g = client.get(f"/projects/{uploaded}").json()
    assert g["status"] == "error" and g["jobs"][0]["status"] == "error" and "kaboom" in g["jobs"][0]["error"]
    assert "job.failed" in [e["event"] for e in sse(client, uploaded)]
    # worker survives: next job runs
    monkeypatch.undo()
    client.post(f"/projects/{uploaded}/render")
    wait(client)
    assert client.get(f"/projects/{uploaded}").json()["status"] == "ready"


def test_adapter_uses_real_agent_when_present(monkeypatch):
    calls = {}
    mod = types.ModuleType("agent")
    def run_agent(pid, msg, plan, tools, client):
        calls["args"] = (pid, msg, plan, client)
        return {"plan": {**plan, "notes": "real"}, "reply": "real reply", "events": []}
    mod.run_agent = run_agent
    monkeypatch.setitem(sys.modules, "agent", mod)
    monkeypatch.setenv("EDITOR_AGENT", "real")
    out = adapters.run_agent("p1", "hi", {"notes": ""}, tools={})
    assert out["backend"] == "real" and out["reply"] == "real reply" and calls["args"][1] == "hi"
    # auto mode without API key falls back to fake even if the module exists
    monkeypatch.setenv("EDITOR_AGENT", "auto")
    for key in ("ANTHROPIC_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY", "EDITOR_LLM"):  # a real .env may be loaded by other tests
        monkeypatch.delenv(key, raising=False)
    oc = sys.modules.get("agent.openai_compat")
    if oc is not None:  # make_client_from_env() re-reads the .env file on every call; keep the test independent of the developer's keys
        monkeypatch.setattr(oc, "load_dotenv", lambda *a, **k: {})
    assert adapters.run_agent("p1", "hi", {"notes": ""}, tools={})["backend"] == "fake"


def test_adapter_falls_back_when_modules_missing(monkeypatch, tmp_path):
    monkeypatch.setenv("EDITOR_AGENT", "auto")
    monkeypatch.setenv("EDITOR_RENDER", "auto")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "x")
    for m in ("agent", "services.render"):
        monkeypatch.setitem(sys.modules, m, None)  # forces ImportError
    assert adapters.run_agent("p", "m", {"notes": ""}, tools={})["backend"] == "fake"
    path, backend = adapters.render_final({}, tmp_path)
    assert backend == "fake" and path.endswith("final.mp4")


def test_adapter_uses_real_render(monkeypatch, tmp_path):
    mod = types.ModuleType("services.render")
    mod.render_final = lambda plan, wd: str(tmp_path / "x.mp4")
    monkeypatch.setitem(sys.modules, "services.render", mod)
    monkeypatch.setenv("EDITOR_RENDER", "auto")
    assert adapters.render_final({}, tmp_path) == (str(tmp_path / "x.mp4"), "real")


def test_agent_edit_queues_preview_render(client, uploaded):
    """After the agent changes the plan, a preview render is queued so the player shows the edit."""
    client.post(f"/projects/{uploaded}/messages", json={"content": "cut the silences"})
    wait(client)
    kinds = [j["kind"] for j in client.get(f"/projects/{uploaded}").json()["jobs"]]
    assert "agent" in kinds and "render_preview" in kinds
    assert client.get(f"/projects/{uploaded}/render?quality=final").status_code == 404  # final is never implicit


def test_agent_receives_chat_history_and_workdir(client, uploaded, monkeypatch):
    """Claude must see earlier turns of the conversation, and get a per-project work directory."""
    seen = []
    real = adapters.run_agent

    def spy(pid, msg, plan, tools=None, history=None, workdir=None):
        seen.append({"msg": msg, "history": history or [], "workdir": str(workdir)})
        return real(pid, msg, plan, tools, history, workdir)

    monkeypatch.setattr(adapters, "run_agent", spy)
    client.post(f"/projects/{uploaded}/messages", json={"content": "first"})
    wait(client)
    client.post(f"/projects/{uploaded}/messages", json={"content": "second"})
    wait(client)
    assert seen[0]["history"] == []
    assert seen[1]["msg"] == "second"
    contents = [h["content"] for h in seen[1]["history"]]
    assert contents[0] == "first" and "second" not in contents  # earlier turns only, not the current message
    assert seen[1]["workdir"].replace("\\", "/").endswith("/work/agent")


def test_scripted_agent_mode_runs_real_loop_and_real_tools(client, uploaded, monkeypatch, tmp_path):
    """EDITOR_AGENT=scripted: the real agent loop + real tools, with Claude's decisions replayed from a JSON file."""
    import json
    script = tmp_path / "script.json"
    script.write_text(json.dumps({"turns": [
        {"match": "tighten", "steps": [{"tool": "cut_segments", "input": {"remove": [{"start": 0.0, "end": 0.0}]}}, {"say": "x"}]},
        {"match": "speed", "steps": [{"tool": "set_speed", "input": {"start": 0, "end": 5, "factor": 2.0}},
                                     {"say": "Sped up the first five seconds."}]}]}))
    monkeypatch.setenv("EDITOR_AGENT", "scripted")
    monkeypatch.setenv("EDITOR_AGENT_SCRIPT", str(script))
    before = client.get(f"/projects/{uploaded}").json()
    # the upload is a fake 2 KB file: ffprobe fails, so there is no real source plan to edit; give it a plan
    plan = before["plan"]
    plan["source"]["duration"] = 10.0
    assert client.put(f"/projects/{uploaded}/plan", json=plan).status_code in (200, 201)
    client.post(f"/projects/{uploaded}/messages", json={"content": "please speed this up"})
    wait(client)
    after = client.get(f"/projects/{uploaded}").json()
    assert after["plan"]["speed"] == [{"id": "s1", "start": 0.0, "end": 5.0, "factor": 2.0}]
    assert after["messages"][-1]["content"] == "Sped up the first five seconds."
    assert after["plan_version"] > before["plan_version"]
    jobs = {j["kind"]: j for j in after["jobs"]}
    assert jobs["agent"]["result"]["backend"] == "real"


def test_scripted_mode_errors_are_reported_not_hidden(client, uploaded, monkeypatch, tmp_path):
    monkeypatch.setenv("EDITOR_AGENT", "scripted")
    monkeypatch.delenv("EDITOR_AGENT_SCRIPT", raising=False)
    client.post(f"/projects/{uploaded}/messages", json={"content": "anything"})
    wait(client)
    job = [j for j in client.get(f"/projects/{uploaded}").json()["jobs"] if j["kind"] == "agent"][0]
    assert job["status"] == "error" and "EDITOR_AGENT_SCRIPT" in job["error"]
