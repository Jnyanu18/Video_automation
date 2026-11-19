import copy
import json

import jsonschema
import pytest

from tools.edit._common import load_schema
from tools.edit.timeline import output_duration
from tools.effects import TOOLS
from tools.effects.ffmpeg import XFADE, atempo_chain, grade_filters, zoom_filters

PLAN = {"version": 1, "source": {"path": "in.mp4", "duration": 60.0, "width": 1920, "height": 1080, "fps": 30},
        "output": {"width": 1080, "height": 1920, "fps": 30},
        "keep": [{"id": "k1", "start": 0, "end": 10}, {"id": "k2", "start": 20, "end": 30}],
        "captions": [], "reframe": {"mode": "none", "track": []}, "overlays": [], "style_ref": None, "notes": ""}


def call(plan, name, **kw):
    return TOOLS[name]["fn"](plan, **kw)


def valid(plan):
    jsonschema.validate(plan, load_schema())


def test_registry_has_all_tools_with_schemas():
    assert {"set_speed", "add_zoom", "add_transition", "set_color_grade", "clear_effects"} <= set(TOOLS)
    for spec in TOOLS.values():
        assert callable(spec["fn"]) and spec["description"] and spec["input_schema"]["type"] == "object"
        json.dumps(spec["input_schema"])


def test_pure_and_schema_valid():
    before = copy.deepcopy(PLAN)
    p = call(PLAN, "set_speed", start=2, end=6, factor=2)["plan"]
    p = call(p, "add_zoom", start=1, end=4, scale=1.5)["plan"]
    p = call(p, "add_transition", kind="wipe-left", duration=0.5, boundary=0)["plan"]
    p = call(p, "set_color_grade", preset="cinematic", exposure=0.3)["plan"]
    assert PLAN == before
    valid(p)


def test_set_speed_changes_duration_and_normalizes():
    r = call(PLAN, "set_speed", start=0, end=10, factor=2)
    assert r["result"]["output_duration_before"] == 20 and r["result"]["output_duration"] == 15
    r2 = call(r["plan"], "set_speed", start=2, end=4, factor=4)  # overrides inside the 2x range
    assert [(x["start"], x["end"], x["factor"]) for x in r2["plan"]["speed"]] == [(0, 2, 2.0), (2, 4, 4.0), (4, 10, 2.0)]
    r3 = call(r2["plan"], "set_speed", start=0, end=10, factor=1)  # restore
    assert "speed" not in r3["plan"] and output_duration(r3["plan"]) == 20


@pytest.mark.parametrize("kw", [dict(start=5, end=5, factor=2), dict(start=-1, end=5, factor=2),
                                dict(start=0, end=5, factor=0), dict(start=0, end=5, factor=50)])
def test_set_speed_rejects_bad_input(kw):
    with pytest.raises(ValueError):
        call(PLAN, "set_speed", **kw)


def test_set_speed_warns_outside_kept_footage():
    assert call(PLAN, "set_speed", start=12, end=18, factor=2)["warnings"]


def test_add_zoom_validation_and_ids():
    p = call(PLAN, "add_zoom", start=1, end=3)["plan"]
    p = call(p, "add_zoom", start=5, end=8, scale=1.4, cx=0.4, cy=0.3)["plan"]
    assert [z["id"] for z in p["zooms"]] == ["z1", "z2"]
    for kw in (dict(scale=1.0), dict(scale=5), dict(cx=2), dict(ramp=0), dict(ease="bounce"), dict(start=4, end=3)):
        with pytest.raises(ValueError):
            call(PLAN, "add_zoom", **{"start": 1, "end": 3, **kw})
    assert call(PLAN, "add_zoom", start=1, end=3, scale=3)["warnings"]


def test_add_transition_by_boundary_at_and_all():
    r = call(PLAN, "add_transition", kind="crossfade", duration=1.0, boundary=0)
    assert r["result"]["output_duration"] == 19 and r["plan"]["transitions"][0]["at"] == 15
    r = call(PLAN, "add_transition", at=14, duration=0.5)
    assert r["result"]["applied_to_cuts"] == [0]
    r = call(PLAN, "add_transition", all=True, duration=0.5)
    assert len(r["plan"]["transitions"]) == 1  # only one cut in this plan


def test_add_transition_replaces_same_cut_and_survives_recut():
    p = call(PLAN, "add_transition", kind="crossfade", boundary=0)["plan"]
    p = call(p, "add_transition", kind="slide-left", duration=1.0, boundary=0)["plan"]
    assert len(p["transitions"]) == 1 and p["transitions"][0]["kind"] == "slide-left"
    from tools.edit.cut import cut_segments
    p = cut_segments(p, remove=[{"start": 24, "end": 26}])["plan"]  # re-cut elsewhere: 3 kept segments, one transition
    assert output_duration(p) == 10 + 4 + 4 - 1


def test_add_transition_errors():
    one = dict(PLAN, keep=[{"id": "k1", "start": 0, "end": 10}])
    with pytest.raises(ValueError, match="single kept segment"):
        call(one, "add_transition", boundary=0)
    with pytest.raises(ValueError, match="unknown transition"):
        call(PLAN, "add_transition", kind="explode", boundary=0)
    with pytest.raises(ValueError):
        call(PLAN, "add_transition", boundary=5)
    with pytest.raises(ValueError):
        call(PLAN, "add_transition")
    with pytest.raises(ValueError):
        call(PLAN, "add_transition", boundary=0, duration=10)


def test_transition_longer_than_clip_warns_and_is_clamped():
    p = dict(PLAN, keep=[{"id": "k1", "start": 0, "end": 1}, {"id": "k2", "start": 20, "end": 30}])
    r = call(p, "add_transition", boundary=0, duration=2.0)
    assert r["warnings"] and r["result"]["output_duration"] == 10.5


def test_color_grade_merge_reset_and_validation(tmp_path):
    p = call(PLAN, "set_color_grade", preset="warm")["plan"]
    p = call(p, "set_color_grade", contrast=1.2)["plan"]
    assert p["color_grade"] == {"preset": "warm", "contrast": 1.2}
    assert "color_grade" not in call(p, "set_color_grade", reset=True)["plan"]
    for kw in (dict(preset="nope"), dict(exposure=9), dict(saturation=-1), dict(lut="missing.cube"), dict()):
        with pytest.raises(ValueError):
            call(PLAN, "set_color_grade", **kw)
    bad = tmp_path / "x.txt"
    bad.write_text("x")
    with pytest.raises(ValueError, match="cube"):
        call(PLAN, "set_color_grade", lut=str(bad))
    lut = tmp_path / "id.cube"
    lut.write_text("LUT_3D_SIZE 2\n" + "\n".join(f"{r} {g} {b}" for b in (0, 1) for g in (0, 1) for r in (0, 1)))
    p = call(PLAN, "set_color_grade", lut=str(lut))["plan"]
    assert p["color_grade"]["lut"].endswith("id.cube")
    assert any(f.startswith("lut3d=file=") for f in grade_filters(p["color_grade"]))


def test_clear_effects():
    p = call(PLAN, "set_speed", start=0, end=4, factor=2)["plan"]
    p = call(p, "add_zoom", start=1, end=3)["plan"]
    p = call(p, "add_zoom", start=5, end=7)["plan"]
    p = call(p, "set_color_grade", preset="bw")["plan"]
    assert [z["id"] for z in call(p, "clear_effects", kind="zooms", ids=["z1"])["plan"]["zooms"]] == ["z2"]
    cleared = call(p, "clear_effects", kind="all")["plan"]
    assert not {"speed", "zooms", "color_grade"} & set(cleared)
    assert call(p, "clear_effects", kind="transitions")["warnings"]
    with pytest.raises(ValueError):
        call(p, "clear_effects", kind="bogus")


def test_filter_builders():
    assert atempo_chain(2) == "atempo=2.00000"
    assert atempo_chain(0.25).count("atempo=0.5") == 2  # 0.25 needs two chained 0.5 stages
    assert atempo_chain(0.1).startswith("atempo=0.5,atempo=0.5,atempo=0.5")
    assert zoom_filters([], 0, 5, 640, 360) == []
    assert zoom_filters([{"start": 10, "end": 12}], 0, 5, 640, 360) == []  # not overlapping this piece
    z = zoom_filters([{"start": 1, "end": 3, "scale": 1.5}], 0, 5, 640, 360)
    assert z[0].startswith("scale=") and "eval=frame" in z[0] and z[1].startswith("crop=640:360")
    assert grade_filters(None) == [] and grade_filters({"preset": "neutral"}) == []
    assert "eq=contrast=1.200:saturation=0.500" in grade_filters({"contrast": 1.2, "saturation": 0.5})
    assert "exposure=exposure=0.500" in grade_filters({"exposure": 0.5})
    assert set(XFADE.values()) >= {"fade", "wipeleft", "slideleft", "fadeblack"}
