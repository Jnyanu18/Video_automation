"""Animated diagrams: valid input, valid generated script, and a loud failure if the script is ever broken."""
import re

import pytest

from services.render import composition, diagrams, render as R
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


@pytest.mark.parametrize("prm", PRMS, ids=[p["template"] for p in PRMS])
def test_a_whole_composition_with_the_diagram_passes_the_script_check(prm, tmp_path):
    (tmp_path / "c.mp4").write_bytes(b"x")
    ov = [{"id": "o1", "kind": "diagram", "start": 1.0, "end": 6.0, "asset": "d", "params": prm}]
    assert composition.build_composition(tmp_path / "p", tmp_path / "c.mp4", 10.0, [], ov, 360, 640, 24) == []
    page = (tmp_path / "p" / "index.html").read_text()
    assert "window.__timelines" in page and ".dg{" in page and 'id="ov0p"' in page


def test_a_broken_script_is_refused_not_shipped():
    with pytest.raises(ValueError, match="syntax error"):
        composition._check_script('<script>tl.from("#a",{y:15px});</script>')


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


def test_a_composition_that_cannot_be_built_falls_back_visibly(monkeypatch, tmp_path):
    import json
    import subprocess
    clip = tmp_path / "in.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=s=320x180:r=15:d=3", "-f", "lavfi", "-i", "sine=f=300:d=3",
                    "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(clip)], check=True)
    plan = {"version": 1, "source": {"path": str(clip), "duration": 3.0, "width": 320, "height": 180, "fps": 15}, "output": {"width": 180, "height": 320, "fps": 15},
            "keep": [{"id": "k1", "start": 0, "end": 3.0}], "reframe": {"mode": "center", "track": []},
            "captions": [{"id": "c1", "text": "hello there", "start": 0.2, "end": 2.5, "style": "bold-pop"}],
            "overlays": [{"id": "o1", "kind": "diagram", "start": 0.5, "end": 2.8, "asset": "d", "params": PRMS[3]}], "notes": ""}

    def boom(*a, **k):
        raise ValueError("the generated animation script has a syntax error: test")
    monkeypatch.setattr(R, "build_composition", boom)
    info = R.render_preview_info(plan, tmp_path / "w")
    assert info["stage"] == "ffmpeg-ass-fallback" and any("syntax error" in w for w in info["warnings"])
    json.dumps(info)
