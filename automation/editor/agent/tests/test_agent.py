import os
import subprocess

import pytest

from agent import FakeClient, run_agent, iter_agent, response, text, tool_use
from agent.registry import load_toolspecs

PLAN = {"version": 1, "source": {"path": "in.mp4", "duration": 10, "width": 1920, "height": 1080, "fps": 30},
        "keep": [{"id": "k1", "start": 0, "end": 10}], "captions": [], "overlays": []}


def cut_segments(plan, segments=None, **kw):
    p = dict(plan)
    p["keep"] = [{"id": f"k{i}", "start": s, "end": e} for i, (s, e) in enumerate(segments or [])]
    return {"plan": p, "result": {"kept": len(p["keep"])}, "warnings": ["w1"]}


def boom(plan, **kw):
    raise ValueError("bad thing")


TOOLS = {
    "cut_segments": {"fn": cut_segments, "description": "cut", "input_schema": {"type": "object", "properties": {}}},
    "boom": {"fn": boom, "description": "fails", "input_schema": {"type": "object", "properties": {}}},
}


def make_video(path, secs=2):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"testsrc=duration={secs}:size=320x240:rate=10",
                    "-pix_fmt", "yuv420p", str(path)], check=True)
    return str(path)


def test_plain_reply():
    c = FakeClient([response("Hi! Upload done, what next?", input_tokens=1000, output_tokens=200)])
    r = run_agent("p1", "hello", PLAN, TOOLS, c)
    assert r["reply"].startswith("Hi!")
    assert r["plan"]["revision"] == 1
    assert [e["type"] for e in r["events"]] == ["message", "usage"]
    assert r["usage"]["input_tokens"] == 1000 and r["usage"]["cost_usd"] == round((1000 * 3 + 200 * 15) / 1e6, 6)
    assert c.calls[0]["model"] == "claude-sonnet-5-5"
    names = [t["name"] for t in c.calls[0]["tools"]]
    assert {"cut_segments", "inspect_frames", "review_plan", "get_plan"} <= set(names)


def test_tool_loop_versions_and_events():
    c = FakeClient([
        response("I'll trim to 0-4s.", tool_use("cut_segments", {"segments": [[0, 4]]}, id="t1")),
        response("Done: kept 4s."),
    ])
    seen = []
    r = run_agent("p1", "trim it", PLAN, TOOLS, c, on_event=seen.append)
    assert r["plan"]["revision"] == 2 and r["plan"]["keep"][0]["end"] == 4
    assert PLAN["version"] == 1 and PLAN["keep"][0]["end"] == 10  # input untouched
    assert [v["version"] for v in r["versions"]] == [1, 2] and r["versions"][1]["tool"] == "cut_segments"
    types = [e["type"] for e in r["events"]]
    assert types == ["message", "tool_started", "tool_finished", "plan_version", "message", "usage"]
    assert seen == r["events"]
    fin = [e for e in r["events"] if e["type"] == "tool_finished"][0]
    assert fin["ok"] and fin["plan_version"] == 2 and fin["warnings"] == ["w1"]
    # tool_result was fed back to Claude
    last_user = c.calls[1]["messages"][-1]
    assert last_user["content"][0]["type"] == "tool_result" and last_user["content"][0]["tool_use_id"] == "t1"
    assert r["reply"] == "Done: kept 4s."


def test_tool_error_and_unknown_tool():
    c = FakeClient([
        response(tool_use("boom", id="a"), tool_use("nope", id="b")),
        response("Sorry, that failed."),
    ])
    r = run_agent("p", "x", PLAN, TOOLS, c)
    res = c.calls[1]["messages"][-1]["content"]
    assert all(x.get("is_error") for x in res)
    assert "bad thing" in res[0]["content"] and "unknown tool" in res[1]["content"]
    assert r["plan"]["revision"] == 1
    assert [e["ok"] for e in r["events"] if e["type"] == "tool_finished"] == [False, False]


def test_max_iterations_guard():
    c = FakeClient([response(tool_use("cut_segments", {"segments": []})) for _ in range(10)])
    r = run_agent("p", "loop", PLAN, TOOLS, c, max_iterations=3)
    assert r["stop_reason"] == "max_iterations" and len(c.calls) == 3
    assert "stopped after 3 steps" in r["reply"]
    assert r["plan"]["revision"] == 4


def test_cost_limit():
    c = FakeClient([response(tool_use("cut_segments", {"segments": []}), input_tokens=1_000_000, output_tokens=0)] * 3)
    r = run_agent("p", "x", PLAN, TOOLS, c, max_cost_usd=1.0)
    assert r["stop_reason"] == "cost_limit" and len(c.calls) == 1


def test_missing_tool_modules_skipped():
    assert load_toolspecs(("tools.does_not_exist", "services.nope")) == {}
    c = FakeClient([response("ok")])
    r = run_agent("p", "x", PLAN, {}, c)  # no tools at all still works
    assert r["reply"] == "ok"


def test_lazy_import_real_modules(tmp_path, monkeypatch):
    pkg = tmp_path / "faketools"
    pkg.mkdir()
    (pkg / "__init__.py").write_text(
        "TOOLS={'hello':{'fn':lambda plan,**k:{'plan':plan,'result':{},'warnings':[]},'description':'d','input_schema':{'type':'object'}}}")
    monkeypatch.syspath_prepend(str(tmp_path))
    assert "hello" in load_toolspecs(("faketools", "missing.mod"))


def test_workdir_injected():
    got = {}

    def t(plan, workdir=None, **kw):
        got["wd"] = workdir
        return {"plan": plan, "result": {}, "warnings": []}

    c = FakeClient([response(tool_use("t")), response("k")])
    run_agent("p", "x", PLAN, {"t": {"fn": t, "description": "", "input_schema": {}}}, c, workdir=None)
    assert got["wd"] and os.path.isdir(got["wd"])


def test_inspect_frames_returns_images(tmp_path):
    v = make_video(tmp_path / "v.mp4")
    c = FakeClient([response(tool_use("inspect_frames", {"video": v, "times": [0.2, 1.0]})), response("Looks fine.")])
    r = run_agent("p", "look", PLAN, TOOLS, c, workdir=str(tmp_path / "wd"))
    content = c.calls[1]["messages"][-1]["content"][0]["content"]
    imgs = [b for b in content if b["type"] == "image"]
    assert len(imgs) == 2 and imgs[0]["source"]["type"] == "base64" and len(imgs[0]["source"]["data"]) > 100
    assert r["plan"]["revision"] == 1  # inspecting does not version the plan


def _render_tool(tmp_path):
    def render_preview(plan, workdir):
        return make_video(os.path.join(workdir, f"prev_{plan['revision']}.mp4"))
    return {"render_preview": {"fn": render_preview, "description": "", "input_schema": {}}}


def test_review_fail_fix_pass(tmp_path):
    tools = {**TOOLS, **_render_tool(tmp_path)}
    c = FakeClient([
        response(tool_use("review_plan")),
        response('{"pass": false, "issues": ["caption cut off at t=1.0"]}'),  # reviewer call
        response(tool_use("cut_segments", {"segments": [[0, 5]]})),
        response(tool_use("review_plan")),
        response('Sure: {"pass": true, "issues": []}'),
        response("Reviewed and fixed."),
    ])
    r = run_agent("p", "go", PLAN, tools, c, workdir=str(tmp_path / "wd"))
    assert [(x["round"], x["pass"]) for x in r["reviews"]] == [(1, False), (2, True)]
    # reviewer call carried 4 image blocks
    rev = c.calls[1]["messages"][0]["content"]
    assert sum(b["type"] == "image" for b in rev) == 4
    first = c.calls[2]["messages"][-1]["content"][0]["content"]
    assert "caption cut off" in first and '"passed": false' in first
    assert r["reply"] == "Reviewed and fixed."
    assert r["usage"]["api_calls"] == 6


def test_review_limit(tmp_path):
    tools = {**_render_tool(tmp_path)}
    fail = '{"pass": false, "issues": ["bad"]}'
    c = FakeClient([
        response(tool_use("review_plan")), response(fail),
        response(tool_use("review_plan")), response(fail),
        response(tool_use("review_plan")),  # over limit: no reviewer call
        response("Could not fully fix."),
    ])
    r = run_agent("p", "go", PLAN, tools, c, workdir=str(tmp_path / "wd"), max_review_rounds=2)
    assert len(r["reviews"]) == 2
    limit_msg = c.calls[5]["messages"][-1]["content"][0]["content"]
    assert "limit_reached" in limit_msg


def test_iter_agent_streams_incrementally():
    c = FakeClient([response("a"),])
    it = iter_agent("p", "x", PLAN, TOOLS, c)
    assert next(it)["type"] == "message"
    assert [e["type"] for e in it] == ["usage", "done"]


def test_history_and_sdk_style_objects():
    from types import SimpleNamespace as NS
    resp = NS(content=[NS(type="text", text="obj reply")], stop_reason="end_turn",
              usage=NS(input_tokens=10, output_tokens=5, cache_read_input_tokens=0, cache_creation_input_tokens=0))
    c = FakeClient([resp])
    r = run_agent("p", "x", PLAN, TOOLS, c, history=[{"role": "user", "content": "earlier"}, {"role": "assistant", "content": "ok"}])
    assert r["reply"] == "obj reply" and len(c.calls[0]["messages"]) == 3
