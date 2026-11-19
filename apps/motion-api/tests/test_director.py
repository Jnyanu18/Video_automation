"""The agent loop, driven entirely by fakes: no API key, no Remotion, no network."""
from pathlib import Path

import pytest

from motion_api.director import MAX_ROUNDS, Director, tool_schemas
from motion_api.kit import Scorecard, Still
from motion_api.llm import FakeClient, final_turn, tool_turn


class FakeRenderer:
    """Records calls; returns a tiny but real-looking JPEG payload."""

    def __init__(self, card: Scorecard | None = None, fail_audio: bool = False):
        self.calls: list[str] = []
        self.card = card or Scorecard(
            path="out/film.mp4", duration=15.0, fps=60, width=1080,
            height=1920, lufs=-14.1, peak=-2.0,
        )
        self.fail_audio = fail_audio

    def prepare(self, job_dir: Path) -> None:
        self.calls.append("prepare")

    def build_audio(self, job_dir):
        self.calls.append("build_audio")
        if self.fail_audio:
            raise RuntimeError("score.py exited 1: no such note 'zz'")
        return "LUFS -14.1, peak -2.0"

    def render_stills(self, job_dir, times):
        self.calls.append("render_stills")
        return [Still(seconds=t, jpeg=b"\xff\xd8\xff\xe0fake-jpeg") for t in times]

    def render_final(self, job_dir, name):
        self.calls.append("render_final")
        return self.card


@pytest.fixture()
def job_dir(tmp_path):
    d = tmp_path / "job"
    (d / "src" / "kit").mkdir(parents=True)
    return d


def make(client, renderer, job_dir):
    return Director(client=client, renderer=renderer, job_dir=job_dir,
                    system_blocks=[{"type": "text", "text": "SKILL"}])


def test_tool_schemas_are_strict_and_closed():
    for tool in tool_schemas():
        assert tool["strict"] is True
        assert tool["input_schema"]["additionalProperties"] is False
        assert "required" in tool["input_schema"]


def test_happy_path_runs_to_a_scored_film(job_dir):
    client = FakeClient(turns=[
        tool_turn("write_file", {"path": "plan.md", "content": "# plan"}),
        tool_turn("write_file", {"path": "src/film.tsx", "content": "export const film = {};"}),
        tool_turn("build_audio", {}),
        tool_turn("render_stills", {"times": [1.0, 2.5]}),
        tool_turn("render_final", {"name": "film.mp4"}),
        final_turn("done"),
    ])
    renderer = FakeRenderer()
    t = make(client, renderer, job_dir).run("Make a 15s launch film.")

    assert t.stopped == "end_turn"
    assert t.final_path == "out/film.mp4"
    assert t.scorecard.ok is True
    assert t.stills == [1.0, 2.5]
    assert renderer.calls == ["build_audio", "render_stills", "render_final"]
    assert (job_dir / "src" / "film.tsx").is_file()
    assert not t.errors


def test_stills_come_back_as_image_blocks(job_dir):
    client = FakeClient(turns=[
        tool_turn("render_stills", {"times": [1.0, 2.0]}),
        final_turn(),
    ])
    make(client, FakeRenderer(), job_dir).run("brief")

    # The message after the assistant turn carries the tool_result.
    sent = client.seen[-1]["messages"]
    result = sent[-1]["content"][0]
    assert result["type"] == "tool_result"
    blocks = result["content"]
    images = [b for b in blocks if b["type"] == "image"]
    assert len(images) == 2
    for img in images:
        assert img["source"]["type"] == "base64"
        assert img["source"]["media_type"] == "image/jpeg"
        assert isinstance(img["source"]["data"], str) and img["source"]["data"]
    # Each image is labelled with its timestamp so the model knows what it sees.
    assert [b["text"] for b in blocks if b["type"] == "text"] == ["t=1.00s", "t=2.00s"]


def test_a_blocked_write_is_an_error_result_not_a_crash(job_dir):
    client = FakeClient(turns=[
        tool_turn("write_file", {"path": "../../escape.tsx", "content": "x"}),
        final_turn(),
    ])
    t = make(client, FakeRenderer(), job_dir).run("brief")

    assert len(t.errors) == 1
    assert t.errors[0].startswith("write_file:")
    result = client.seen[-1]["messages"][-1]["content"][0]
    assert result["is_error"] is True
    assert not (job_dir.parent / "escape.tsx").exists()


def test_a_failing_tool_is_reported_back_to_the_model(job_dir):
    client = FakeClient(turns=[tool_turn("build_audio", {}), final_turn()])
    t = make(client, FakeRenderer(fail_audio=True), job_dir).run("brief")

    result = client.seen[-1]["messages"][-1]["content"][0]
    assert result["is_error"] is True
    assert "score.py" in result["content"][0]["text"]
    assert t.errors


def test_a_refusal_stops_the_loop_immediately(job_dir):
    from motion_api.llm import LLMResponse

    client = FakeClient(turns=[LLMResponse(content=[], stop_reason="refusal")])
    t = make(client, FakeRenderer(), job_dir).run("brief")

    assert t.stopped == "refusal"
    assert t.rounds == 1


def test_a_failing_scorecard_gets_exactly_one_fix_round(job_dir):
    bad = Scorecard(path="out/f.mp4", duration=15.0, fps=60, width=1080,
                    height=1920, lufs=-9.0, peak=-0.2)
    client = FakeClient(turns=[
        tool_turn("render_final", {"name": "f.mp4"}),
        final_turn("i think it is fine"),
        tool_turn("render_final", {"name": "f.mp4"}),
        final_turn("still not fixed"),
    ])
    t = make(client, FakeRenderer(card=bad), job_dir).run("brief")

    assert t.scorecard.ok is False
    assert any("loudness" in f for f in t.scorecard.failures())
    assert any("true peak" in f for f in t.scorecard.failures())
    # It is nudged once, then allowed to stop rather than looping forever.
    assert t.stopped == "end_turn"


def test_the_loop_is_bounded(job_dir):
    client = FakeClient(turns=[tool_turn("build_audio", {}) for _ in range(MAX_ROUNDS + 5)])
    t = make(client, FakeRenderer(), job_dir).run("brief")

    assert t.stopped == "max_rounds"
    assert t.rounds == MAX_ROUNDS
