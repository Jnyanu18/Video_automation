"""Claude as an editing step: unit tests with fake clients only. No network, no API keys."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from studio import claude_director as cd  # noqa: E402
from studio import director  # noqa: E402

TRANSCRIPT = {"segments": [
    {"start": 0.0, "end": 3.0, "text": "We ship 2600 orders a week."},
    {"start": 3.0, "end": 6.0, "text": "Each order is checked by hand."},
    {"start": 6.0, "end": 9.5, "text": "Nobody skips the last check."},
    {"start": 9.5, "end": 12.0, "text": "That is the whole secret."},
]}
SFX = ["whoosh", "pop"]
GOOD_PLAN = {
    "hook": {"text": "We ship 2600 orders a week"},
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


def _json(plan=GOOD_PLAN):
    return json.dumps(plan)


# ------------------------------------------------------------------------------------------- configuration
def test_default_model_is_sonnet_and_env_overrides_it():
    assert cd.model_name({}) == "claude-sonnet-5-5"
    assert cd.model_name({"EDITOR_CLAUDE_MODEL": "claude-opus-5-5"}) == "claude-opus-5-5"
    assert cd.model_name({"EDITOR_CLAUDE_MODEL": "  "}) == "claude-sonnet-5-5"


def test_claude_selected_accepts_claude_and_anthropic_only():
    assert cd.claude_selected({"EDITOR_LLM": "claude"})
    assert cd.claude_selected({"EDITOR_LLM": "Anthropic"})
    assert not cd.claude_selected({"EDITOR_LLM": "gemini"})
    assert not cd.claude_selected({})


def test_no_key_means_no_claude_client_and_fallback_needs_gemini_key():
    assert cd.make_client({}) is None
    assert cd.make_client({"ANTHROPIC_API_KEY": "  "}) is None
    assert cd.gemini_fallback_client({}) is None


def test_real_client_is_built_offline_with_the_chosen_model():
    client = cd.make_client({"ANTHROPIC_API_KEY": "test-key-not-real", "EDITOR_CLAUDE_MODEL": "claude-opus-5-5"})
    assert cd.is_claude_client(client) and client.model == "claude-opus-5-5"


def test_gemini_fallback_client_uses_the_gemini_endpoint():
    fb = cd.gemini_fallback_client({"GEMINI_API_KEY": "test-gemini-not-real"})
    assert fb is not None and "generativelanguage" in fb.base_url and not cd.is_claude_client(fb)


# ------------------------------------------------------------------------------------------- inputs
def test_removed_gaps_are_the_silences_between_kept_ranges():
    keep = [{"start": 6.0, "end": 9.0}, {"start": 0.0, "end": 3.0}, {"start": 4.0, "end": 6.0}]
    assert cd.removed_gaps(keep) == [(3.0, 4.0)]
    assert cd.removed_gaps([]) == []


def test_build_content_caps_frames_and_skips_missing_files(tmp_path):
    paths = []
    for i in range(8):
        p = tmp_path / f"f{i}.jpg"
        p.write_bytes(b"\xff\xd8fake")
        paths.append((float(i), str(p)))
    frames = paths + [(99.0, str(tmp_path / "missing.jpg"))]
    blocks = cd.build_content("ctx", frames)
    images = [b for b in blocks if b["type"] == "image"]
    assert len(images) == cd.MAX_FRAMES
    assert blocks[0] == {"type": "text", "text": "ctx"}
    assert images[0]["source"]["media_type"] == "image/jpeg"


def test_context_carries_silences_scenes_and_scorecard():
    sents = director.sentences(TRANSCRIPT)
    text = cd.build_context(sents, 12.0, "viral_hook_fast_pace", "", SFX, silences=[(3.0, 4.0)], scenes=[(0.0, 6.0)],
                            scorecard={"status": "FAIL", "score": 0.4, "failed_checks": ["hook"], "internal": 1})
    assert "Removed silences" in text and "3.00-4.00" in text
    assert "Scene boundaries" in text and "0.00-6.00" in text
    assert '"failed_checks": ["hook"]' in text and "internal" not in text


# ------------------------------------------------------------------------------------------- the Claude step
def test_claude_plans_the_edit_and_sends_frames_and_extra_context(tmp_path):
    frame = tmp_path / "frame.jpg"
    frame.write_bytes(b"\xff\xd8fake")
    client = FakeClaude([_json()])
    plan, source, warns = cd.plan_edit(client, TRANSCRIPT, 12.0, "viral_hook_fast_pace", "", SFX,
                                       frames=[(1.2, str(frame))], silences=[(3.0, 4.0)])
    assert source == "claude"
    assert plan["hook"]["text"].startswith("We ship")
    assert plan["beats"] and plan["beats"][0]["template"] == "counter"
    call = client.messages.calls[0]
    assert call["model"] == "claude-sonnet-5-5"
    assert "Removed silences (start-end, seconds): 3.00-4.00" in call["messages"][0]["content"][0]["text"]
    assert any(b["type"] == "image" for b in call["messages"][0]["content"])


def test_non_json_reply_gets_one_retry_then_succeeds():
    client = FakeClaude(["Sure! Here is my plan.", _json()])
    plan, source, _ = cd.plan_edit(client, TRANSCRIPT, 12.0, "viral_hook_fast_pace", "", SFX)
    assert source == "claude" and len(client.messages.calls) == 2


def test_claude_error_falls_back_to_the_gemini_path_and_says_so():
    claude = FakeClaude([RuntimeError("boom: rate limited")])
    gemini = _Client([_json()])
    plan, source, warns = cd.plan_edit(claude, TRANSCRIPT, 12.0, "viral_hook_fast_pace", "", SFX, fallback=gemini)
    assert source == "llm"
    assert any("Claude could not plan" in w for w in warns)
    assert len(gemini.messages.calls) == 1


def test_plan_without_a_hook_is_treated_as_a_failure_and_falls_back(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)  # never reach a real Gemini endpoint from a test
    no_hook = dict(GOOD_PLAN, hook=None, beats=[])
    claude = FakeClaude([_json(no_hook), _json(no_hook)])
    _, source, warns = cd.plan_edit(claude, TRANSCRIPT, 12.0, "viral_hook_fast_pace", "", SFX, fallback=None)
    assert source == "heuristic"  # no Gemini key here, so the built-in planner answers
    assert any("Claude could not plan" in w for w in warns)


def test_no_key_anywhere_still_produces_a_plan_from_the_heuristic(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    plan, source, _ = cd.plan_edit(None, TRANSCRIPT, 12.0, "viral_hook_fast_pace", "", SFX)
    assert source == "heuristic" and plan["hook"] is not None


def test_non_claude_client_keeps_the_existing_director_path():
    gemini = _Client([_json()])
    _, source, _ = cd.plan_edit(gemini, TRANSCRIPT, 12.0, "viral_hook_fast_pace", "", SFX)
    assert source == "llm" and len(gemini.messages.calls) == 1


def test_silent_transcript_is_refused_like_the_director():
    with pytest.raises(ValueError):
        cd.plan_edit(FakeClaude([_json()]), {"segments": []}, 12.0, "viral_hook_fast_pace", "", SFX)
