"""Publish gate and best-of-N planning: unit tests with fake clients only. No network, no API keys, no ffmpeg needed."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from studio import claude_director as cd  # noqa: E402
from studio import gate  # noqa: E402

TRANSCRIPT = {"segments": [
    {"start": 0.0, "end": 3.0, "text": "We ship 2600 orders a week."},
    {"start": 3.0, "end": 6.0, "text": "Each order is checked by hand."},
    {"start": 6.0, "end": 9.5, "text": "Nobody skips the last check."},
    {"start": 9.5, "end": 12.0, "text": "That is the whole secret."},
]}
SENTS = [{"start": s["start"], "end": s["end"], "text": s["text"]} for s in TRANSCRIPT["segments"]]
SFX = ["whoosh", "pop"]


def _plan(hook: str) -> dict:
    return {
        "hook": {"text": hook},
        "rehook": {"text": "Here is the part most people miss", "start": 4.0, "end": 5.5},
        "speaker": None,
        "beats": [{"template": "counter", "start": 5.0, "end": 9.0, "value": 2600, "suffix": "+", "caption": "orders a week"}],
        "zooms": [{"start": 1.0, "end": 2.0}],
        "sfx": [{"name": "whoosh", "at": 0.2}],
        "cta": {"text": "Send this to a friend"},
    }


class _Messages:
    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = []

    def create(self, **kw):
        self.calls.append(kw)
        r = self.replies.pop(0)
        if isinstance(r, BaseException):
            raise r
        return {"content": [{"type": "text", "text": r}]}


class _Client:
    def __init__(self, replies, model="claude-sonnet-5-5"):
        self.messages = _Messages(replies)
        self.model = model
        self.api_key = "test-key-not-real"


# A fake that looks like the Anthropic SDK to is_claude_client (module name starts with "anthropic").
FakeClaude = type("FakeClaude", (_Client,), {"__module__": "anthropic.fake"})


# ------------------------------------------------------------------------------------------- publish gate
def test_verdict_takes_the_worst_level():
    assert gate.verdict([])["verdict"] == gate.PASS
    assert gate.verdict([gate._check("a", gate.PASS, "")])["verdict"] == gate.PASS
    v = gate.verdict([gate._check("a", gate.PASS, ""), gate._check("b", gate.REVIEW, "x"), gate._check("c", gate.BLOCK, "y")])
    assert v["verdict"] == gate.BLOCK and v["blocked_by"] == ["c"] and v["needs_review"] == ["b"]


def test_full_plan_passes_plan_checks():
    checks = gate.plan_checks(_plan("We ship 2600 orders a week"))
    assert all(c["level"] == gate.PASS for c in checks)


def test_missing_rehook_and_cta_ask_for_review_not_block():
    p = _plan("Hook")
    p["rehook"], p["cta"] = None, None
    levels = {c["name"]: c["level"] for c in gate.plan_checks(p)}
    assert levels["rehook"] == gate.REVIEW and levels["call to action"] == gate.REVIEW
    assert gate.verdict(gate.plan_checks(p))["verdict"] == gate.REVIEW


def test_hand_made_edit_without_director_plan_is_not_held_back():
    # Recipes and hand-made edits have no director plan, so the playbook checks simply do not apply to them.
    assert gate.verdict(gate.plan_checks(None))["verdict"] == gate.PASS


def test_missing_render_blocks(tmp_path):
    # render_qa reports a missing file as CRITICAL: the gate must block, with no ffmpeg involved.
    g = gate.check_for_publish(str(tmp_path / "nope.mp4"), _plan("Hook"))
    assert g["verdict"] == gate.BLOCK
    assert "File Not Found" in g["blocked_by"]


def test_visual_review_never_blocks(monkeypatch):
    import agent.review as review

    monkeypatch.setattr(review, "review_once", lambda **kw: {"pass": False, "issues": ["caption covers the face"]})
    checks = gate.visual_checks(_Client([]), "x.mp4", _plan("Hook"))
    assert checks == [{"name": "visual review", "level": gate.REVIEW, "detail": "caption covers the face"}]


def test_visual_review_failure_is_a_review_note(monkeypatch):
    import agent.review as review

    def boom(**kw):
        raise RuntimeError("network down")

    monkeypatch.setattr(review, "review_once", boom)
    checks = gate.visual_checks(_Client([]), "x.mp4", _plan("Hook"))
    assert checks[0]["level"] == gate.REVIEW and "could not run" in checks[0]["detail"]


# ------------------------------------------------------------------------------------------- best-of-N
def test_candidate_count_is_clamped_and_defaults_to_off():
    assert cd.candidate_count({}) == 1
    assert cd.candidate_count({"EDITOR_PLAN_CANDIDATES": "2"}) == 2
    assert cd.candidate_count({"EDITOR_PLAN_CANDIDATES": "9"}) == 3
    assert cd.candidate_count({"EDITOR_PLAN_CANDIDATES": "0"}) == 1
    assert cd.candidate_count({"EDITOR_PLAN_CANDIDATES": "lots"}) == 1


def test_pick_best_chooses_the_highest_score():
    client = _Client([json.dumps({"scores": [{"candidate": 1, "score": 4}, {"candidate": 2, "score": 8}]})])
    idx, note = cd.pick_best(client, [_plan("A"), _plan("B")], SENTS)
    assert idx == 1 and "8" in note


def test_pick_best_falls_back_to_first_on_unreadable_judge():
    client = _Client(["I think the second one is better, honestly."])
    assert cd.pick_best(client, [_plan("A"), _plan("B")], SENTS)[0] == 0


def test_pick_best_falls_back_when_the_judge_call_fails():
    client = _Client([RuntimeError("boom")])
    assert cd.pick_best(client, [_plan("A"), _plan("B")], SENTS)[0] == 0


def test_plan_edit_drafts_and_keeps_the_judged_best(monkeypatch):
    monkeypatch.setenv("EDITOR_PLAN_CANDIDATES", "2")
    client = FakeClaude([
        json.dumps(_plan("First draft hook")),
        json.dumps(_plan("Second draft hook")),
        json.dumps({"scores": [{"candidate": 1, "score": 5}, {"candidate": 2, "score": 9}]}),
    ])
    plan, source, warns = cd.plan_edit(client, TRANSCRIPT, 12.0, "viral_hook_fast_pace", "", SFX)
    assert source == "claude"
    assert plan["hook"]["text"] == "Second draft hook"
    assert any("best of 2" in w for w in warns)
    assert len(client.messages.calls) == 3  # two drafts and one judge call


def test_plan_edit_with_one_candidate_makes_no_judge_call(monkeypatch):
    monkeypatch.delenv("EDITOR_PLAN_CANDIDATES", raising=False)
    client = FakeClaude([json.dumps(_plan("Only draft"))])
    plan, source, _ = cd.plan_edit(client, TRANSCRIPT, 12.0, "viral_hook_fast_pace", "", SFX)
    assert plan["hook"]["text"] == "Only draft" and len(client.messages.calls) == 1
