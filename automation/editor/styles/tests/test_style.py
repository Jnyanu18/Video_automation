import copy
import json

import pytest

from styles import apply_style, extract_style, load_style, save_style
from styles import synth
from styles.apply import _tighten_keeps


@pytest.fixture(scope="module")
def vid(tmp_path_factory):
    return synth.make_std_video(str(tmp_path_factory.mktemp("m") / "ref.mp4"))


@pytest.fixture(scope="module")
def capvid(tmp_path_factory):
    d = tmp_path_factory.mktemp("c")
    return synth.make_std_video(str(d / "cap.mp4"), size=(360, 640), text="HELLO WORLD", text_y="h-th-80")


def test_measurements(vid):
    p = extract_style(vid, transcript=synth.std_words())
    assert p["source"]["width"] == 320 and abs(p["source"]["duration"] - 7.0) < 0.2
    assert p["pacing"]["shot_count"] == 3
    assert abs(p["pacing"]["avg_shot_length"] - 7.0 / 3) < 0.15
    assert p["pacing"]["pause_count"] == 2
    assert abs(p["pacing"]["max_pause_observed"] - 1.0) < 0.2
    assert 0.5 < p["pacing"]["speech_ratio"] < 0.85
    assert p["audio"]["integrated_lufs"] is not None and p["audio"]["integrated_lufs"] < 0
    # 13 words over a 6.7s span incl. pauses; 0.4s words back to back -> 150 wpm while articulating
    assert 110 <= p["speech"]["words_per_minute"] <= 122
    assert 145 <= p["speech"]["articulation_wpm"] <= 155
    assert len(p["palette"]["colors"]) == 5
    assert all(c["hex"].startswith("#") and len(c["hex"]) == 7 for c in p["palette"]["colors"])
    assert abs(sum(c["weight"] for c in p["palette"]["colors"]) - 1) < 0.02
    ep = p["edit_params"]
    assert 0.15 <= ep["max_pause"] <= 0.8 and ep["output_aspect"] == "16:9"


def test_no_transcript_means_no_wpm(vid):
    assert extract_style(vid)["speech"]["words_per_minute"] is None


def test_caption_detection(vid, capvid):
    plain = extract_style(vid)["captions"]
    assert plain["detected"] is False
    c = extract_style(capvid)
    assert c["captions"]["detected"] is True
    assert c["captions"]["position"] == "bottom"
    assert 0.02 < c["captions"]["size_frac"] < 0.25
    assert c["edit_params"]["output_aspect"] == "9:16"
    assert c["edit_params"]["caption_position"] == "bottom"


def test_save_load_roundtrip(vid, tmp_path):
    p = extract_style(vid, name="myref")
    path = save_style(p, str(tmp_path / "sub" / "myref.json"))
    assert load_style(path) == json.loads(json.dumps(p))


def _style(**ep):
    base = {"max_pause": 0.3, "target_shot_length": 2.0, "caption_style": "bold-pop", "caption_max_words": 3,
            "caption_position": "middle", "output_aspect": "9:16", "target_lufs": -16.0}
    base.update(ep)
    return {"name": "demo", "edit_params": base}


def test_apply_style_does_not_mutate_and_sets_fields():
    plan = synth.std_plan("x.mp4", [(0, 7)], captions=[
        {"id": "c1", "text": "one two three four five six seven", "start": 0.0, "end": 3.0, "style": "clean"}])
    before = copy.deepcopy(plan)
    out = apply_style(plan, _style())
    assert plan == before
    assert out["style_ref"] == "styles/demo.json"
    assert (out["output"]["width"], out["output"]["height"]) == (1080, 1920)
    assert [c["text"] for c in out["captions"]] == ["one two three", "four five six", "seven"][:len(out["captions"])] \
        or all(len(c["text"].split()) <= 3 for c in out["captions"])
    assert all(len(c["text"].split()) <= 3 for c in out["captions"])
    assert all(c["style"] == "bold-pop" for c in out["captions"])
    assert out["captions"][0]["start"] == 0.0 and abs(out["captions"][-1]["end"] - 3.0) < 1e-6
    assert len({c["id"] for c in out["captions"]}) == len(out["captions"])
    hints = json.loads(out["notes"].split("[style_hints] ")[1])
    assert hints["max_pause"] == 0.3 and hints["target_lufs"] == -16.0
    # idempotent notes
    again = apply_style(out, _style())
    assert again["notes"].count("[style_hints]") == 1


def test_apply_style_tightens_pauses_with_silences():
    plan = synth.std_plan("x.mp4", [(0, 7)])
    out = apply_style(plan, _style(max_pause=0.3), silences=[(2.0, 3.0), (5.0, 5.5)])
    keep = [(k["start"], k["end"]) for k in out["keep"]]
    total = sum(b - a for a, b in keep)
    # 1.0s -> 0.3 and 0.5s -> 0.3 : removes 0.7 + 0.2
    assert abs(total - (7.0 - 0.9)) < 1e-6
    assert all(b - a >= 0.4 for a, b in keep)


def test_tighten_leaves_short_pauses_alone():
    keep = [{"id": "k1", "start": 0, "end": 5}]
    assert _tighten_keeps(keep, [(1.0, 1.2)], 0.3) == [{"id": "k1", "start": 0.0, "end": 5.0}]


def test_apply_without_captions_or_output_size():
    plan = synth.std_plan("x.mp4", [(0, 7)])
    out = apply_style(plan, _style(), set_output_size=False)
    assert out["output"] == plan["output"] and out["captions"] == []
