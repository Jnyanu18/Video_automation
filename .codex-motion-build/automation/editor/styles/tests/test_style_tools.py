import copy

import jsonschema
import pytest

from styles import TOOLS, synth
from styles.apply import _rechunk_captions
from tools.edit._common import load_schema


@pytest.fixture(scope="module")
def ref(tmp_path_factory):
    return synth.make_std_video(str(tmp_path_factory.mktemp("ref") / "ref.mp4"))


def plan(**kw):
    p = {"version": 1, "source": {"path": "in.mp4", "duration": 30.0, "width": 1280, "height": 720, "fps": 30},
         "output": {"width": 1280, "height": 720, "fps": 30}, "keep": [{"id": "k1", "start": 0, "end": 30}],
         "captions": [], "reframe": {"mode": "none", "track": []}, "overlays": [], "style_ref": None, "notes": ""}
    p.update(kw)
    return p


def call(tool, p, **kw):
    return TOOLS[tool]["fn"](p, **kw)


def test_registry():
    assert set(TOOLS) == {"extract_style", "apply_style", "list_styles"}
    assert all(t["description"] and t["input_schema"]["type"] == "object" for t in TOOLS.values())


def test_extract_saves_profile_and_does_not_touch_plan(ref, tmp_path):
    p = plan()
    before = copy.deepcopy(p)
    r = call("extract_style", p, video=ref, name="my ref!", transcript=synth.std_words(), workdir=str(tmp_path))
    assert r["plan"] == before and p == before
    assert r["result"]["style"] == "my_ref_" and (tmp_path / "styles" / "my_ref_.json").is_file()
    ev = r["result"]["evidence"]
    assert ev["pauses"] == 2 and ev["words_per_minute"] and r["result"]["edit_params"]["output_aspect"] == "16:9"
    assert call("extract_style", p, video=ref, workdir=str(tmp_path))["warnings"]  # no transcript -> warns


def test_extract_errors(ref, tmp_path):
    with pytest.raises(ValueError, match="not found"):
        call("extract_style", plan(), video=str(tmp_path / "nope.mp4"), workdir=str(tmp_path))
    with pytest.raises(ValueError, match="workdir"):
        call("extract_style", plan(), video=ref)


def test_copy_this_style_end_to_end(ref, tmp_path):
    wd = str(tmp_path)
    call("extract_style", plan(), video=ref, name="ref", transcript=synth.std_words(), workdir=wd)
    words = [{"word": w, "start": 1 + i * 0.4, "end": 1.35 + i * 0.4} for i, w in enumerate("one two three four five six seven".split())]
    p = plan(captions=[{"id": "c1", "text": "one two three four five six seven", "start": 1.0, "end": 3.8, "style": "bold-pop",
                        "words": words}])
    r = call("apply_style", p, style="ref", silences=[{"start": 10, "end": 12}], workdir=wd)
    new = r["plan"]
    jsonschema.validate(new, load_schema())
    assert new["style_ref"].endswith("ref.json") and new["output"]["width"] == 1920  # 16:9 reference
    assert new["captions"] and all(c["style"] in ("bold-pop", "clean-lower") for c in new["captions"])
    assert len(new["keep"]) == 2 and sum(k["end"] - k["start"] for k in new["keep"]) < 30  # the 2 s pause was tightened
    assert new["audio"]["loudness"]["target_lufs"] < -5
    assert any("loudness" in a for a in r["result"]["applied"])
    assert any("shot length not applied" in w for w in r["warnings"])
    assert call("apply_style", p, style="ref", workdir=wd)["warnings"][0].startswith("pauses were not tightened")


def test_apply_style_by_path_and_missing(ref, tmp_path):
    call("extract_style", plan(), video=ref, name="ref", workdir=str(tmp_path))
    r = call("apply_style", plan(), style=str(tmp_path / "styles" / "ref.json"), apply_loudness=False)
    assert "audio" not in r["plan"]
    with pytest.raises(ValueError, match="not found"):
        call("apply_style", plan(), style="nonexistent", workdir=str(tmp_path))


def test_list_styles(ref, tmp_path):
    assert call("list_styles", plan(), workdir=str(tmp_path))["result"]["styles"] == {}
    call("extract_style", plan(), video=ref, name="ref", workdir=str(tmp_path))
    assert "ref" in call("list_styles", plan(), workdir=str(tmp_path))["result"]["styles"]


def test_rechunk_keeps_matching_word_timings_for_karaoke():
    words = [{"word": w, "start": i * 0.5, "end": i * 0.5 + 0.4} for i, w in enumerate("a b c d e f".split())]
    caps = _rechunk_captions([{"id": "c1", "text": "a b c d e f", "start": 0.0, "end": 3.0, "words": words}], 3)
    assert [c["text"] for c in caps] == ["a b c", "d e f"]
    assert [[w["word"] for w in c["words"]] for c in caps] == [["a", "b", "c"], ["d", "e", "f"]]
    assert caps[1]["start"] == 1.5 and caps[1]["end"] == 2.9  # taken from the words, not from a proportional split


def test_rechunk_drops_words_that_do_not_match_the_text():
    caps = _rechunk_captions([{"id": "c1", "text": "a b c d", "start": 0, "end": 2, "words": [{"word": "x", "start": 0, "end": 1}]}], 2)
    assert len(caps) == 2 and all("words" not in c for c in caps)
