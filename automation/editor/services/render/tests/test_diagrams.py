"""Animated diagrams: valid input, valid generated script, and a loud failure if the script is ever broken."""
import re

import pytest

from services.render import diagrams, render as R
from tools.visuals import TOOLS

PRMS = [
    {"template": "counter", "value": 2600, "suffix": "+", "caption": "users"},
    {"template": "versus", "left": {"tag": "EASY", "text": "a", "value": 1}, "right": {"tag": "HARD", "text": "b", "value": 0.3, "tone": "bad"}},
    {"template": "brands", "top": ["AWS", "Google Cloud"], "top_caption": "x", "bottom": "Ascorp", "bottom_caption": "y"},
    {"template": "flow", "steps": ["Ask", "Preview", "Approve", "Done"]},
    {"template": "shift", "from": "Click", "to": "Ask"},
]


def px(v):
    return f"{v:.1f}px"


@pytest.mark.parametrize("prm", PRMS, ids=[p["template"] for p in PRMS])
def test_every_template_renders_numbers_not_css_lengths_into_the_script(prm):
    html, js = diagrams.render(prm, "ov0", 1.0, 6.0, px)
    assert html and js and all(line.startswith("tl.") or line.startswith("var ") for line in js)
    assert not re.findall(r"[xy]:-?[\d.]+px", "\n".join(js))  # `y:15px` is a JS syntax error that silently kills ALL animation


def test_validation_gives_the_agent_something_to_act_on():
    for bad, msg in [({"template": "nope"}, "template must be"), ({"template": "flow", "steps": ["a"]}, "2 to 5 steps"),
                     ({"template": "flow", "steps": ["a", "x" * 40]}, "too long"), ({"template": "counter", "value": -1, "caption": "c"}, "non-negative"),
                     ({"template": "versus", "left": {"tag": "A", "text": "t", "value": 2}, "right": PRMS[1]["right"]}, "between 0 and 1")]:
        with pytest.raises(diagrams.DiagramError, match=msg):
            diagrams.validate(bad)


def test_add_diagram_tool():
    plan = {"version": 1, "source": {"path": "x", "duration": 30.0, "width": 640, "height": 360, "fps": 30}, "keep": [], "overlays": []}
    add = TOOLS["add_diagram"]["fn"]
    ok = add(plan, template="flow", start=2, end=8, steps=["Ask", "Approve"])
    assert ok["plan"]["overlays"][0]["kind"] == "diagram" and ok["plan"]["overlays"][0]["params"]["steps"] == ["Ask", "Approve"]
    assert "2 seconds" in add(plan, template="flow", start=2, end=3, steps=["a", "b"])["warnings"][0]
    assert "not added" in add(plan, template="flow", start=2, end=8, steps=["only one"])["warnings"][0]
    with_from = add(plan, template="shift", start=1, end=6, **{"from": "Click through menus", "to": "Just ask"})
    assert with_from["plan"]["overlays"][0]["params"]["from"] == "Click through menus"  # `from` is a Python keyword: must survive


def test_diagrams_are_not_drawn_by_the_remotion_path_and_say_so():
    """Diagrams are HTML/GSAP and the Remotion captions renderer only draws title and lower-third: the diagram is dropped."""
    from services.render import composition as C
    warns = []
    diagram = {"id": "o1", "kind": "diagram", "start": 0.5, "end": 2.8, "asset": "d", "params": PRMS[3]}
    props = C._props([], [diagram], 3.0, 180, 320, 15, dict(C.DEFAULT_STYLE), "cut.mp4", warns)
    assert props["overlays"] == []
    assert any("diagram" in w and "not drawn" in w for w in warns)
