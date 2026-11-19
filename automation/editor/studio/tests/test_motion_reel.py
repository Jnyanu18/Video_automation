import json
from pathlib import Path

import pytest

from studio import motion_reel

SPEC = Path(__file__).resolve().parents[1] / "reels" / "ailo_launch.json"


def spec():
    return json.loads(SPEC.read_text(encoding="utf-8"))


def test_shipped_spec_builds_a_project(tmp_path):
    idx = motion_reel.build(spec(), tmp_path)
    page = idx.read_text(encoding="utf-8")
    assert 'data-composition-id="main"' in page and 'window.__timelines["main"] = tl' in page
    assert page.count('class="clip scene') == 7
    assert (tmp_path / "assets" / "whoosh.wav").exists() and (tmp_path / "reel.json").exists()


def test_accent_markup_spans_several_words():
    out = motion_reel._words("*by hand?* now", "x", "hl")
    assert out.count(" ac") == 2 and "now" in out


def test_first_frame_is_never_empty_or_a_logo():
    s = spec()
    s["scenes"][0]["kind"] = "orb"
    with pytest.raises(motion_reel.ReelError, match="first scene"):
        motion_reel.validate(s)


@pytest.mark.parametrize("mut,msg", [
    (lambda s: s["scenes"][1].update(duration=20), "duration"),
    (lambda s: s["scenes"][1].update(kind="spinny"), "unknown kind"),
    (lambda s: s["scenes"][1].update(typed="a — b"), "em dash"),
    (lambda s: s.update(scenes=s["scenes"][:2]), "3 to 12"),
])
def test_bad_specs_are_refused(mut, msg):
    s = spec()
    mut(s)
    with pytest.raises(motion_reel.ReelError, match=msg):
        motion_reel.validate(s)


def test_unknown_sound_is_refused(tmp_path):
    s = spec()
    s["sfx"].append({"name": "nope", "at": 1})
    with pytest.raises(Exception):
        motion_reel.build(s, tmp_path)
