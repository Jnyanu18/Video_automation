"""The review gate = visual reviewer AND evals scorecard."""
import json
import subprocess

import pytest

from agent import FakeClient, iter_agent, response, run_agent, tool_use
from agent.review import run_scorecard, scorecard_issues

PASS = '{"pass": true, "issues": []}'


@pytest.fixture(scope="module")
def source(tmp_path_factory):
    """7 s: tone 0-2, SILENCE 2-5, tone 5-7."""
    p = tmp_path_factory.mktemp("src") / "talk.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc=duration=7:size=320x240:rate=10",
                    "-f", "lavfi", "-i", "sine=f=440:d=7", "-af", "volume='if(between(t,2,5),0,0.5)':eval=frame",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(p)], check=True)
    return str(p)


def make_plan(src, keep=((0, 7),)):
    return {"version": 1, "source": {"path": src, "duration": 7.0, "width": 320, "height": 240, "fps": 10},
            "keep": [{"id": f"k{i}", "start": s, "end": e} for i, (s, e) in enumerate(keep)], "captions": [], "overlays": []}


def tools_for(src):
    def cut_silence(plan, **kw):
        p = dict(plan)
        p["keep"] = [{"id": "k0", "start": 0, "end": 2.05}, {"id": "k1", "start": 4.95, "end": 7}]
        return {"plan": p, "result": {}, "warnings": []}

    def render_preview(plan, workdir=None, **kw):
        return {"plan": plan, "result": {"path": src}, "warnings": []}

    spec = lambda f: {"fn": f, "description": "", "input_schema": {"type": "object", "properties": {}}}  # noqa: E731
    return {"cut_silence": spec(cut_silence), "render_preview": spec(render_preview)}


def test_scorecard_fail_blocks_a_passing_visual_review_then_fix_passes(source, tmp_path):
    c = FakeClient([
        response(tool_use("review_plan")), response(PASS),               # visual reviewer likes it, scorecard must not
        response(tool_use("cut_silence")),
        response(tool_use("review_plan")), response(PASS),
        response("Done."),
    ])
    r = run_agent("p", "clean up", make_plan(source), tools_for(source), c, workdir=str(tmp_path / "wd"))
    assert [(x["round"], x["pass"]) for x in r["reviews"]] == [(1, False), (2, True)]
    card1 = r["reviews"][0]["scorecard"]
    assert card1["available"] and card1["overall"] == "FAIL" and any(f["name"] == "silence_remaining" for f in card1["failed"])
    assert r["reviews"][0]["issues"][0].startswith("[scorecard FAIL] silence_remaining")
    assert r["reviews"][1]["scorecard"]["overall"] in ("PASS", "WARN")
    told_claude = c.calls[2]["messages"][-1]["content"][0]["content"]
    assert '"passed": false' in told_claude and "scorecard FAIL" in told_claude
    assert any(e["type"] == "scorecard" and e["round"] == 1 and e["overall"] == "FAIL" for e in r["events"])


def test_visual_reviewer_is_told_about_the_scorecard(source, tmp_path):
    c = FakeClient([response(tool_use("review_plan")), response(PASS), response("ok")])
    run_agent("p", "go", make_plan(source), tools_for(source), c, workdir=str(tmp_path / "wd"))
    text = c.calls[1]["messages"][0]["content"][0]["text"]
    assert "Automatic scorecard" in text and "silence_remaining" in text


def test_visual_fail_still_fails_when_scorecard_passes(source, tmp_path):
    plan = make_plan(source, keep=((0, 2.05), (4.95, 7)))
    c = FakeClient([response(tool_use("review_plan")), response('{"pass": false, "issues": ["caption cut off"]}'), response("ok")])
    r = run_agent("p", "go", plan, tools_for(source), c, workdir=str(tmp_path / "wd"))
    assert r["reviews"][0]["pass"] is False and r["reviews"][0]["issues"] == ["caption cut off"]


def test_unavailable_scorecard_never_blocks(tmp_path):
    plan = make_plan(str(tmp_path / "missing.mp4"))
    card = run_scorecard(plan, str(tmp_path))
    assert card == {"available": False, "reason": "source video not found"} and scorecard_issues(card) == []


def test_transcript_from_workdir_is_used_for_cut_mid_word(source, tmp_path):
    wd = tmp_path / "wd"
    wd.mkdir()
    (wd / "transcript.json").write_text(json.dumps({"words": [{"word": "hello", "start": 1.5, "end": 2.6}]}))
    plan = make_plan(source, keep=((0, 2.0), (4.95, 7)))                  # cuts at 2.0, inside "hello"
    card = run_scorecard(plan, str(wd))
    assert card["available"] and any(f["name"] == "no_cut_mid_word" for f in card["failed"])
    no_tx = run_scorecard(plan, str(tmp_path))                            # no transcript: the check is skipped
    assert "no_cut_mid_word" in no_tx["skipped"]


def test_broken_checker_is_swallowed(source, tmp_path, monkeypatch):
    import evals
    monkeypatch.setattr(evals, "evaluate", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("boom")))
    card = run_scorecard(make_plan(source), str(tmp_path))
    assert card["available"] is False and "boom" in card["reason"]
