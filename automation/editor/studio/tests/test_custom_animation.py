"""Custom animation: toolkit validation, compilation, the Gemini design loop (fake client) and director integration."""
import json
import subprocess
import tempfile
from pathlib import Path

import pytest

from services.render import custom, diagrams
from studio import animator, director

GOOD = animator.EXAMPLE


def test_valid_scene_compiles_to_parseable_js():
    scene = custom.validate(GOOD, 6.0)
    svg, js = custom.compile_scene(scene, "ov0", 0.0, 6.0)
    assert 'id="ov0_user"' in svg
    src = "\n".join(js)
    if subprocess.run(["node", "--version"], capture_output=True).returncode == 0:
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "x.js"
            f.write_text("const tl={fromTo(){return tl},to(){return tl},set(){return tl}};\n" + src, encoding="utf-8")
            assert subprocess.run(["node", "--check", str(f)], capture_output=True).returncode == 0


@pytest.mark.parametrize("mut,needle", [
    (lambda s: s["elements"][3].update(text="x" * 40), "limit"),
    (lambda s: s["elements"][0].update(name="unicorn"), "icon name"),
    (lambda s: s["elements"][1].update(x=990), "sticks out"),
    (lambda s: s["elements"].append(dict(s["elements"][0])), "duplicate"),
    (lambda s: s["motion"].append({"target": "user", "effect": "fade", "at": 1.0}), "two entrances"),
    (lambda s: s["motion"].append({"target": "ghost", "effect": "pop", "at": 1.0}), "unknown target"),
    (lambda s: s["elements"][3].update(text="a < b"), "must not contain"),
])
def test_bad_scenes_are_rejected_with_a_reason(mut, needle):
    s = json.loads(json.dumps(GOOD))
    mut(s)
    with pytest.raises(custom.SceneError) as e:
        custom.validate(s, 6.0)
    assert needle in str(e.value)


def test_template_registry_accepts_custom_and_wraps_errors():
    diagrams.validate({"template": "custom", "scene": GOOD}, 6.0)
    with pytest.raises(diagrams.DiagramError):
        diagrams.validate({"template": "custom", "scene": {"elements": [], "motion": []}}, 6.0)


class FakeClient:
    api_key = "k"
    model = "fake"

    def __init__(self, replies):
        self.replies, self.calls = list(replies), []
        self.messages = self

    def create(self, **kw):
        self.calls.append(kw["messages"])
        return {"content": [{"type": "text", "text": self.replies.pop(0)}]}


def test_design_retries_with_the_exact_problem_then_accepts():
    bad = json.loads(json.dumps(GOOD))
    bad["elements"][3]["text"] = "x" * 40
    c = FakeClient([json.dumps(bad), json.dumps(GOOD)])
    scene, log = animator.design(c, "approval before acting", 6.0, probe=False)
    assert scene is not None and len(c.calls) == 2
    assert "limit" in c.calls[1][-1]["content"]  # the retry message carries the validator's complaint
    assert log[0].startswith("attempt 1: rejected") and log[-1] == "attempt 2: accepted"


def test_design_gives_up_after_three_bad_answers():
    c = FakeClient(["not json"] * 3)
    scene, log = animator.design(c, "idea", 6.0, probe=False)
    assert scene is None and len(log) == 3


def test_design_without_a_client_is_a_clean_no():
    scene, log = animator.design(None, "idea", 6.0)
    assert scene is None and "no LLM" in log[0]


def test_fill_custom_drops_failed_beats_and_keeps_templates():
    beats = [{"template": "counter", "start": 5, "end": 9, "value": 3, "suffix": "", "caption": "x"},
             {"template": "custom", "start": 12, "end": 18, "idea": "approval before acting"}]
    out, warns = animator.fill_custom(FakeClient(["nope"] * 3), beats)
    assert [b["template"] for b in out] == ["counter"] and "dropped" in warns[0]


def test_director_keeps_custom_beat_with_idea_and_caps_them():
    sents = [{"start": float(i * 8), "end": float(i * 8 + 7), "text": f"sentence number {i} about agents"} for i in range(6)]
    raw = {"hook": {"text": "Agents ask first"}, "beats": [
        {"template": "custom", "start": 8, "end": 15, "idea": "the agent asks the user for approval"},
        {"template": "custom", "start": 16, "end": 23, "idea": "requests go to many tools but one agent"},
        {"template": "custom", "start": 24, "end": 31, "idea": "a third one that must be dropped"}]}
    plan, _ = director.clean(raw, 48.0, sents, ["whoosh"])
    assert [b["template"] for b in plan["beats"]].count("custom") == 2
    steps = director.to_steps(plan)
    assert not [s for s in steps if s["tool"] == "add_diagram"]  # not designed yet: no step without a scene
    plan["beats"][0]["scene"] = GOOD
    steps = director.to_steps(plan)
    d = [s for s in steps if s["tool"] == "add_diagram"]
    assert len(d) == 1 and d[0]["input"]["template"] == "custom" and "idea" not in d[0]["input"]
