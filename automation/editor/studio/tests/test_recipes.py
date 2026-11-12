"""Recipes: fixed tool steps, no LLM. Same video + same steps = same edit."""
import json
import subprocess
import sys
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import api_server  # noqa: E402
from agent.loop import _call_tool, _normalize  # noqa: E402
from services.api.editor_api import adapters  # noqa: E402
from studio import health, recipes  # noqa: E402

TOOLS = adapters.collect_tools()
PLAN = {"version": 1, "source": {"path": "x.mp4", "duration": 20.0, "width": 640, "height": 360, "fps": 30},
        "output": {"width": 1080, "height": 1920, "fps": 30}, "keep": [{"id": "k1", "start": 0, "end": 20}],
        "captions": [], "reframe": {"mode": "center", "track": []}, "zooms": [], "transitions": [], "overlays": [], "notes": ""}


def run(steps, tmp_path, plan=PLAN):
    return recipes.run(json.loads(json.dumps(plan)), steps, TOOLS, str(tmp_path), _call_tool, _normalize)


def test_validate_rejects_bad_recipes():
    for bad, msg in [([], "non-empty"), ([{"tool": "nope"}], "unknown tool"), ([{"input": {}}], "needs a 'tool'"),
                     ([{"tool": "render_final"}], "approval comes first"), ([{"tool": "add_sfx", "input": 5}], "'input' must be an object")]:
        with pytest.raises(recipes.RecipeError, match=msg):
            recipes.validate(bad, TOOLS)


def test_steps_run_in_order_and_are_deterministic(tmp_path):
    steps = [{"tool": "add_sfx", "input": {"name": "whoosh", "at": 1}},
             {"tool": "add_title", "input": {"text": "Hi", "start": 0, "end": 2, "y": 0.3, "size": 50, "box": True}},
             {"tool": "add_zoom", "input": {"start": 5, "end": 7, "scale": 1.12}}]
    a, log = run(steps, tmp_path)
    b, _ = run(steps, tmp_path)
    assert a == b and [e["tool"] for e in log] == ["add_sfx", "add_title", "add_zoom"] and all(e["ok"] for e in log)
    assert a["overlays"][0]["params"] == {"text": "Hi", "subtitle": "", "style": "clean", "position": "center", "y": 0.3, "size": 50.0, "box": True}


def test_silences_flow_from_detect_to_cut(tmp_path):
    (tmp_path / "silences.json").write_text(json.dumps({"silences": [{"start": 4.0, "end": 6.0}]}))
    plan, _ = run([{"tool": "cut_silences", "input": {"silences": "$silences", "min_silence": 0.25, "padding": 0.05}}], tmp_path)
    assert [(round(k["start"], 2), round(k["end"], 2)) for k in plan["keep"]] == [(0.0, 4.05), (5.95, 20.0)]
    with pytest.raises(recipes.RecipeError, match="silences"):
        run([{"tool": "cut_silences", "input": {"silences": "$silences"}}], tmp_path / "empty")


def test_a_failing_step_is_named_and_stops_the_recipe(tmp_path):
    with pytest.raises(recipes.RecipeError, match=r"step 2 \(add_sfx\) failed.*unknown sound effect"):
        run([{"tool": "add_zoom", "input": {"start": 1, "end": 2}}, {"tool": "add_sfx", "input": {"name": "nope", "at": 1}},
             {"tool": "add_zoom", "input": {"start": 3, "end": 4}}], tmp_path)


def test_shipped_recipes_are_valid():
    saved = recipes.list_saved()
    assert any(r["name"] == "vishnu_ascorp_founder_pitch" for r in saved)
    for r in saved:
        recipes.validate(recipes.load_saved(r["name"])["steps"], TOOLS)
    with pytest.raises(recipes.RecipeError):
        recipes.load_saved("../../etc/passwd")


@pytest.fixture
def env(tmp_path, monkeypatch):
    work = tmp_path / "work"
    work.mkdir()
    monkeypatch.setattr(health, "gemini_probe", lambda: {"status": "ONLINE", "detail": "t", "provider": "t"})
    app = api_server.create_app(tmp_path / "s.json", tmp_path / "r", work, start_scheduler=False)
    v = work / "c.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=s=320x180:r=15:d=5", "-f", "lavfi", "-i", "sine=f=300:d=5",
                    "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(v)], check=True)
    return TestClient(app), v


def wait_done(c, sb, timeout=40):
    end = time.time() + timeout
    while time.time() < end:
        d = c.get(f"/api/editor/storyboard/{sb}").json()["data"]
        if d["status"] != "processing":
            return d
        time.sleep(0.3)
    raise AssertionError("recipe job timed out")


def test_recipe_endpoint_builds_a_storyboard_without_any_llm(env, monkeypatch):
    c, video = env

    def no_llm():
        raise AssertionError("a recipe must never call the LLM")
    monkeypatch.setattr(adapters, "_make_client", no_llm)
    steps = [{"tool": "add_sfx", "input": {"name": "pop", "at": 1.0}}, {"tool": "add_title", "input": {"text": "Send this to a friend", "start": 3, "end": 5}}]
    r = c.post("/api/editor/storyboard/create-from-recipe", json={"video_path": str(video), "recipe": steps, "title": "t"})
    assert r.status_code == 202
    d = wait_done(c, r.json()["storyboard_id"])
    assert d["status"] == "ready" and d["storyboard"]["sound_design"]["sfx_count"] == 1 and "Ran the recipe" in d["agent_reply"]
    assert [e["name"] for e in d["events"]] == ["add_sfx", "add_title"] and all(e["state"] == "ok" for e in d["events"])
    # the closing title counts as the share trigger even though it is not a caption
    assert d["storyboard"]["growth_signals"]["sendability"]["status"] == "pass"
    assert any(x["name"] == "vishnu_ascorp_founder_pitch" for x in c.get("/api/editor/recipes").json()["recipes"])


def test_recipe_endpoint_validates_and_reports_step_failures(env):
    c, video = env
    assert c.post("/api/editor/storyboard/create-from-recipe", json={"video_path": str(video), "recipe": [{"tool": "render_final"}]}).status_code == 400
    assert c.post("/api/editor/storyboard/create-from-recipe", json={"video_path": str(video), "recipe": "no_such"}).status_code == 400
    r = c.post("/api/editor/storyboard/create-from-recipe", json={"video_path": str(video), "recipe": [{"tool": "add_sfx", "input": {"name": "zzz", "at": 1}}]})
    d = wait_done(c, r.json()["storyboard_id"])
    assert d["status"] == "failed" and "step 1 (add_sfx) failed" in d["error"]
