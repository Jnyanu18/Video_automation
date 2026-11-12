"""End-to-end API tests: real FFmpeg, a scripted LLM client, and a fake publishing adapter. No network, no API keys."""
from __future__ import annotations

import json
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import api_server  # noqa: E402
from agent import FakeClient, response, tool_use  # noqa: E402
from services.api.editor_api import adapters  # noqa: E402
from studio import health, publishing  # noqa: E402


@pytest.fixture
def env(tmp_path, monkeypatch):
    work, renders = tmp_path / "work", tmp_path / "renders"
    work.mkdir()
    monkeypatch.delenv("EDITOR_MEDIA_ROOTS", raising=False)
    monkeypatch.setattr(health, "gemini_probe", lambda: {"status": "ONLINE", "detail": "test", "provider": "test"})
    app = api_server.create_app(tmp_path / "state.json", renders, work, start_scheduler=False)
    video = work / "talk.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=s=320x180:r=15:d=6", "-f", "lavfi", "-i",
                    "sine=f=300:d=6", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac",
                    "-shortest", str(video)], check=True)
    return {"app": app, "client": TestClient(app), "video": video, "renders": renders, "tmp": tmp_path}


def script(monkeypatch, *turns):
    """Each turn = list of tool calls then a closing text. Clients are created per job, so each job pops one turn."""
    queue = list(turns)

    def make():
        steps = queue.pop(0)
        out = [response(tool_use(n, a)) for n, a in steps[:-1]] + [response(steps[-1])]
        c = FakeClient(out)
        c.supports_vision, c.api_key, c.model = False, "k", "fake"
        return c
    monkeypatch.setattr(adapters, "_make_client", make)


def wait_for(client, sb_id, pred, timeout=40):
    end = time.time() + timeout
    while time.time() < end:
        d = client.get(f"/api/editor/storyboard/{sb_id}").json()["data"]
        if pred(d):
            return d
        time.sleep(0.25)
    raise AssertionError(f"timed out; last state: {d.get('status')} {d.get('render_job')} {d.get('error')}")


def make_storyboard(env, monkeypatch, extra_turns=()):
    script(monkeypatch, [("add_sfx", {"name": "whoosh", "at": 0.4}), "Added a whoosh at 0.4s."], *extra_turns)
    r = env["client"].post("/api/editor/storyboard/create", json={"video_path": str(env["video"]), "prompt": "tighten it"})
    assert r.status_code == 202, r.text
    return r.json()["storyboard_id"]


def test_storyboard_job_is_async_and_real(env, monkeypatch):
    c = env["client"]
    sb_id = make_storyboard(env, monkeypatch)
    sb = wait_for(c, sb_id, lambda d: d["status"] != "processing")
    assert sb["status"] == "ready" and sb["error"] is None and sb["approved"] is False
    card = sb["storyboard"]
    assert card["scenes_count"] == 1 and card["duration"]["original_seconds"] == pytest.approx(6.0, abs=0.2)
    assert card["sound_design"]["sfx_count"] == 1 and card["sound_design"]["sfx"][0]["name"] == "whoosh"
    assert card["scorecard"]["available"] and card["scorecard"]["checks"]
    assert any(e["type"] == "tool" and e["name"] == "add_sfx" and e["state"] == "ok" for e in sb["events"])
    assert [s["id"] for s in c.get("/api/editor/storyboards").json()["storyboards"]] == [sb_id]
    assert "plan" not in sb and "plan" in c.get(f"/api/editor/storyboard/{sb_id}?include_plan=true").json()["data"]


def test_state_survives_a_restart(env, monkeypatch):
    sb_id = make_storyboard(env, monkeypatch)
    wait_for(env["client"], sb_id, lambda d: d["status"] == "ready")
    again = TestClient(api_server.create_app(env["tmp"] / "state.json", env["renders"], env["tmp"] / "work", start_scheduler=False))
    assert again.get(f"/api/editor/storyboard/{sb_id}").json()["data"]["status"] == "ready"


def test_final_render_requires_approval_then_produces_a_playable_file(env, monkeypatch):
    c = env["client"]
    sb_id = make_storyboard(env, monkeypatch)
    wait_for(c, sb_id, lambda d: d["status"] == "ready")
    r = c.post(f"/api/editor/storyboard/{sb_id}/render", json={"quality": "final"})
    assert r.status_code == 409 and r.json() == {"ok": False, "error": "NOT_APPROVED", "message": r.json()["message"]}
    assert c.post(f"/api/editor/storyboard/{sb_id}/approve").json()["data"]["approved"] is True
    assert c.post(f"/api/editor/storyboard/{sb_id}/render", json={"quality": "final"}).status_code == 202
    sb = wait_for(c, sb_id, lambda d: (d["render_job"] or {}).get("status") in ("done", "failed"), timeout=90)
    assert sb["render_job"]["status"] == "done", sb["render_job"]
    rec = sb["latest_render"]
    f = env["renders"] / f"{rec['render_id']}.mp4"
    assert f.is_file() and rec["duration"] == pytest.approx(6.0, abs=0.3) and rec["backend"].endswith("+audio")
    assert sb["stage"] == "rendered"
    media = c.get("/api/editor/media").json()
    assert media["total_renders"] == 1 and media["renders"][0]["storyboard_id"] == sb_id


def test_revision_invalidates_approval(env, monkeypatch):
    c = env["client"]
    sb_id = make_storyboard(env, monkeypatch, [[("add_sfx", {"name": "pop", "at": 3.0}), "Added a pop at 3s."]])
    wait_for(c, sb_id, lambda d: d["status"] == "ready")
    c.post(f"/api/editor/storyboard/{sb_id}/approve")
    assert c.post(f"/api/editor/storyboard/{sb_id}/chat", json={"message": "add a pop"}).status_code == 202
    sb = wait_for(c, sb_id, lambda d: d["status"] == "ready" and d["storyboard"]["sound_design"]["sfx_count"] == 2)
    assert sb["approved"] is False and sb["approval_reset"] is True


def test_failed_job_is_reported_not_hidden(env, monkeypatch):
    monkeypatch.setattr(adapters, "_make_client", lambda: None)
    r = env["client"].post("/api/editor/storyboard/create", json={"video_path": str(env["video"])})
    assert r.status_code == 503 and r.json()["error"] == "UNAVAILABLE" and "No LLM" in r.json()["message"]


def test_video_path_must_be_inside_media_roots(env):
    c = env["client"]
    outside = env["tmp"] / "elsewhere.mp4"
    outside.write_bytes(env["video"].read_bytes())
    assert c.post("/api/editor/storyboard/create", json={"video_path": str(outside)}).status_code == 400
    assert c.post("/api/editor/storyboard/create", json={"video_path": str(env["tmp"] / "nope.mp4")}).status_code == 404
    assert c.get("/api/editor/storyboard/missing").json() == {"ok": False, "error": "NOT_FOUND", "message": "Storyboard not found"}


# ---------------------------------------------------------------- publishing against a fake adapter
class FakeAdapter(BaseHTTPRequestHandler):
    posts_created = 0
    fail_create = False

    def log_message(self, *a):
        pass

    def _send(self, code, body):
        raw = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/v2/users/me/accounts":
            return self._send(200, {"items": [{"id": "acc1", "platform": "instagram", "username": "studio"}]})
        if self.path.startswith("/v2/posts/"):
            return self._send(200, {"status": "published", "publicUrl": "https://instagram.com/reel/ABC/"})
        self._send(404, {})

    def do_POST(self):
        n = int(self.headers.get("content-length", 0))
        body = json.loads(self.rfile.read(n) or b"{}")
        if self.path == "/v2/media":
            return self._send(200, {"id": "m1", "url": "https://postiz.media/abc"})
        if self.path == "/v2/posts":
            FakeAdapter.posts_created += 1
            assert body["post"]["accountId"] == "acc1" and body["post"]["content"]["mediaUrls"] == ["https://postiz.media/abc"]
            if FakeAdapter.fail_create:
                return self._send(502, {"error": "boom"})
            return self._send(200, {"postSubmissionId": "sub1"})
        self._send(404, {})


@pytest.fixture
def adapter(monkeypatch):
    FakeAdapter.posts_created, FakeAdapter.fail_create = 0, False
    srv = HTTPServer(("127.0.0.1", 0), FakeAdapter)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    monkeypatch.setenv("POSTIZ_ADAPTER_URL", f"http://127.0.0.1:{srv.server_port}")
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://studio.example.test")
    monkeypatch.setattr(publishing, "POLL_SECONDS", 0.01)
    yield FakeAdapter
    srv.shutdown()


def rendered_storyboard(env, monkeypatch):
    c = env["client"]
    sb_id = make_storyboard(env, monkeypatch)
    wait_for(c, sb_id, lambda d: d["status"] == "ready")
    c.post(f"/api/editor/storyboard/{sb_id}/approve")
    c.post(f"/api/editor/storyboard/{sb_id}/render", json={"quality": "final"})
    wait_for(c, sb_id, lambda d: (d["render_job"] or {}).get("status") == "done", timeout=90)
    return sb_id


def wait_item(c, pid, status, timeout=15):
    end = time.time() + timeout
    while time.time() < end:
        it = next(p for p in c.get("/api/editor/publishing/queue").json()["queue"] if p["id"] == pid)
        if it["status"] == status:
            return it
        time.sleep(0.1)
    raise AssertionError(f"post stuck at {it['status']} {it.get('error')}")


def test_publish_flow_end_to_end(env, monkeypatch, adapter):
    c = env["client"]
    sb_id = rendered_storyboard(env, monkeypatch)
    acc = {a["platform"]: a for a in c.get("/api/editor/publishing/accounts").json()["accounts"]}
    assert acc["instagram"]["connected"] and acc["instagram"]["account"] == "studio" and not acc["tiktok"]["connected"]
    r = c.post("/api/editor/publishing/schedule", json={"title": "T", "caption": "send this", "storyboard_id": sb_id})
    assert r.status_code == 200
    it = wait_item(c, r.json()["item"]["id"], "PUBLISHED")
    assert it["results"]["instagram"]["url"] == "https://instagram.com/reel/ABC/" and adapter.posts_created == 1
    # engagement is recorded by hand and flows into analytics
    assert c.get("/api/editor/analytics").json()["engagement"]["connected"] is False
    assert c.put(f"/api/editor/publishing/{it['id']}/metrics", json={"views": 1000, "sends": 40, "saves": 20, "completion_pct": 70}).status_code == 200
    eng = c.get("/api/editor/analytics").json()["engagement"]
    assert eng["connected"] and eng["sends_per_1k_reach"] == 40.0 and eng["save_rate_pct"] == 2.0
    assert c.put(f"/api/editor/publishing/{it['id']}/metrics", json={"completion_pct": 140}).status_code == 400
    assert c.get("/api/editor/overview").json()["kpis"]["published"] == 1


def test_schedule_validation(env, monkeypatch, adapter):
    c = env["client"]
    body = {"title": "T", "caption": "c"}
    assert c.post("/api/editor/publishing/schedule", json=body).status_code == 400                    # no render
    sb_id = rendered_storyboard(env, monkeypatch)
    assert c.post("/api/editor/publishing/schedule", json={**body, "storyboard_id": sb_id, "platforms": ["tiktok"]}).status_code == 400
    future = c.post("/api/editor/publishing/schedule", json={**body, "storyboard_id": sb_id, "scheduled_at": "2099-01-01T10:00:00+00:00"}).json()["item"]
    assert future["status"] == "SCHEDULED" and adapter.posts_created == 0                            # not published early
    assert c.post(f"/api/editor/publishing/{future['id']}/cancel").json()["item"]["status"] == "CANCELED"
    assert c.post(f"/api/editor/publishing/{future['id']}/cancel").status_code == 409


def test_ambiguous_create_is_never_retried_automatically(env, monkeypatch, adapter):
    c = env["client"]
    adapter.fail_create = True
    sb_id = rendered_storyboard(env, monkeypatch)
    pid = c.post("/api/editor/publishing/schedule", json={"title": "T", "caption": "c", "storyboard_id": sb_id}).json()["item"]["id"]
    it = wait_item(c, pid, "FAILED")
    assert it["error"]["code"] == "OUTCOME_UNKNOWN" and it["outcome_unknown"] and adapter.posts_created == 1
    assert c.post(f"/api/editor/publishing/{pid}/retry").status_code == 409                          # blocked until the operator checks
    adapter.fail_create = False
    assert c.post(f"/api/editor/publishing/{pid}/confirm-retry").status_code == 200
    wait_item(c, pid, "PUBLISHED")
    assert adapter.posts_created == 2


def test_missing_public_url_fails_clearly(env, monkeypatch, adapter):
    c = env["client"]
    monkeypatch.delenv("PUBLIC_BASE_URL")
    sb_id = rendered_storyboard(env, monkeypatch)
    pid = c.post("/api/editor/publishing/schedule", json={"title": "T", "caption": "c", "storyboard_id": sb_id}).json()["item"]["id"]
    it = wait_item(c, pid, "FAILED")
    assert it["error"]["code"] == "PUBLIC_URL_MISSING" and adapter.posts_created == 0


def test_scheduler_publishes_due_items(env, monkeypatch, adapter):
    c, pub = env["client"], env["app"].state.publisher
    sb_id = rendered_storyboard(env, monkeypatch)
    soon = time.strftime("%Y-%m-%dT%H:%M:%S%z", time.localtime(time.time() + 1))
    soon = soon[:-2] + ":" + soon[-2:]
    pid = c.post("/api/editor/publishing/schedule", json={"title": "T", "caption": "c", "storyboard_id": sb_id, "scheduled_at": soon}).json()["item"]["id"]
    assert pub.due() == []
    time.sleep(1.5)
    assert pub.due() == [pid]
    pub.publish(pid)
    assert wait_item(c, pid, "PUBLISHED")


# ---------------------------------------------------------------- series, analytics, health
def test_series_template_progress_and_episode_storyboard(env, monkeypatch):
    c = env["client"]
    monkeypatch.setattr(adapters, "_make_client", lambda: None)
    s = c.post("/api/editor/series/generate", json={"title": "Founder Playbook", "niche": "SaaS", "episodes_count": 3}).json()["series"]
    assert s["generated_by"] == "template" and len(s["episodes"]) == 3 and s["progress"] == {"total": 3, "storyboarded": 0, "rendered": 0, "published": 0}
    assert c.post("/api/editor/series/generate", json={"title": "x", "niche": "y", "episodes_count": 1}).status_code == 400
    ep = c.patch(f"/api/editor/series/{s['id']}/episodes/2", json={"hook": "A sharper hook"}).json()["series"]["episodes"][1]
    assert ep["hook"] == "A sharper hook"
    script(monkeypatch, [("add_sfx", {"name": "pop", "at": 1.0}), "Added a pop."])
    r = c.post(f"/api/editor/series/{s['id']}/episodes/1/storyboard", json={"video_path": str(env["video"])})
    assert r.status_code == 202
    sb_id = r.json()["storyboard_id"]
    wait_for(c, sb_id, lambda d: d["status"] == "ready")
    prog = c.get("/api/editor/series").json()["series"][0]
    assert prog["episodes"][0]["storyboard_id"] == sb_id and prog["progress"]["storyboarded"] == 1
    sb = c.get(f"/api/editor/storyboard/{sb_id}").json()["data"]
    assert sb["series"] == {"id": s["id"], "episode": 1} and "Episode 1 of 3" in sb["prompt"]


def test_series_uses_the_llm_when_it_answers(env):
    store = env["app"].state.store
    from studio import series

    class C:
        api_key, model = "k", "m"

        class messages:
            @staticmethod
            def create(**kw):
                eps = [{"title": f"E{i}", "hook": f"hook {i}", "cliffhanger": f"loop {i}", "continuity": "c"} for i in (1, 2)]
                return {"content": [{"type": "text", "text": json.dumps({"episodes": eps})}]}
    s = series.create_series(store, "T", "N", 2, "a", C())
    assert s["generated_by"] == "llm" and s["episodes"][1]["hook"] == "hook 2"


def test_overview_and_analytics_come_from_real_records(env, monkeypatch):
    c = env["client"]
    empty = c.get("/api/editor/overview").json()
    assert empty["kpis"]["storyboards"] == 0 and empty["kpis"]["avg_score"] is None and c.get("/api/editor/analytics").json()["production"]["avg_score"] is None
    sb_id = make_storyboard(env, monkeypatch)
    wait_for(c, sb_id, lambda d: d["status"] == "ready")
    ov = c.get("/api/editor/overview").json()
    assert ov["kpis"]["storyboards"] == 1 and ov["kpis"]["awaiting_approval"] == 1
    assert {p["key"]: p["count"] for p in ov["pipeline"]}["awaiting_approval"] == 1
    an = c.get("/api/editor/analytics").json()
    assert an["production"]["storyboards"] == 1 and an["by_style"][0]["style"] == "viral_hook_fast_pace"
    assert an["production"]["avg_score"] is not None and an["recent_activity"]


def test_integration_health_is_probed_not_asserted(env):
    d = env["client"].get("/api/editor/integrations/health").json()
    by = {s["id"]: s for s in d["services"]}
    assert by["ffmpeg"]["status"] == "ONLINE" and by["sfx"]["detail"] == "40 effects" and "ytdlp" in by
    assert by["mpt_server"]["status"] in ("STANDBY", "OFFLINE", "ONLINE") and by["editor_api"]["status"] == "ONLINE"
    assert "core_ready" in d["summary"]
    wf = env["client"].get("/api/editor/automation/workflows").json()
    assert len(wf["workflows"]) == 7 and wf["workflows"][0]["webhooks"] == ["reels/intake", "reels/intake-retry"]


def test_copilot_is_honest_without_a_key(env, monkeypatch):
    monkeypatch.setattr(adapters, "_make_client", lambda: None)
    r = env["client"].post("/api/editor/copilot/chat", json={"message": "hi"}).json()
    assert r["ok"] is False and r["error"] == "LLM_NOT_CONFIGURED"
    c = FakeClient([response("Open on the number, then cut to the face.")])
    c.api_key, c.model = "k", "m"
    monkeypatch.setattr(adapters, "_make_client", lambda: c)
    r = env["client"].post("/api/editor/copilot/chat", json={"message": "hook idea?"}).json()
    assert r["ok"] and "Open on the number" in r["reply"]


def test_settings_persist_and_validate(env):
    c = env["client"]
    d = c.get("/api/editor/settings").json()
    assert d["settings"]["default_style"] == "viral_hook_fast_pace" and d["thresholds"]["hook_fail_seconds"] == 1.5
    assert c.put("/api/editor/settings", json={"default_style": "nope"}).status_code == 400
    assert c.put("/api/editor/settings", json={"default_prompt": "   "}).status_code == 400
    assert c.put("/api/editor/settings", json={"default_style": "cinematic_punch", "default_prompt": "Be bold."}).json()["settings"] == {
        "default_style": "cinematic_punch", "default_prompt": "Be bold."}
    again = TestClient(api_server.create_app(env["tmp"] / "state.json", env["renders"], env["tmp"] / "work", start_scheduler=False))
    assert again.get("/api/editor/settings").json()["settings"]["default_style"] == "cinematic_punch"


def test_validation_errors_use_the_dashboard_error_shape(env):
    r = env["client"].post("/api/editor/series/generate", json={"title": "x"})
    assert r.status_code == 422 and r.json()["ok"] is False and r.json()["error"] == "INVALID" and "niche" in r.json()["message"]


def test_claude_can_be_the_brain(monkeypatch):
    monkeypatch.setenv("EDITOR_LLM", "anthropic")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.delenv("EDITOR_LLM_MODEL", raising=False)
    c = adapters._make_client()
    assert type(c).__module__.startswith("anthropic") and c.model == "claude-sonnet-5-5" and c.api_key == "sk-ant-test"
    monkeypatch.setenv("EDITOR_LLM_MODEL", "claude-opus-5-5")
    assert adapters._make_client().model == "claude-opus-5-5"
    monkeypatch.delenv("ANTHROPIC_API_KEY")
    assert adapters._make_client() is None  # explicit choice, no key: not silently Gemini


def test_claude_key_is_validated_live(monkeypatch):
    health._cache.clear()
    seen = {}
    monkeypatch.setattr(health, "http_get", lambda url, timeout=2.0, headers=None: (seen.update(url=url, headers=headers) or (200, "")))
    monkeypatch.setenv("EDITOR_LLM", "anthropic")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    out = health.gemini_probe()
    assert out["status"] == "ONLINE" and out["provider"] == "anthropic"
    assert seen["url"] == "https://api.anthropic.com/v1/models" and seen["headers"]["x-api-key"] == "sk-ant-test"
    health._cache.clear()
    monkeypatch.setattr(health, "http_get", lambda *a, **k: (401, ""))
    assert health.gemini_probe()["status"] == "ERROR"
    health._cache.clear()
