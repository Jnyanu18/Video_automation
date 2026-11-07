import json
import shutil
import subprocess

import jsonschema
import pytest

from tools.edit import TOOLS
from tools.edit._common import load_schema
from tools.edit.timeline import output_duration


def base(keep=((0, 60),)):
    return {"version": 1, "source": {"path": "in.mp4", "duration": 60, "width": 1920, "height": 1080, "fps": 30},
            "output": {"width": 1920, "height": 1080, "fps": 30},
            "keep": [{"id": f"k{i}", "start": s, "end": e} for i, (s, e) in enumerate(keep)],
            "captions": [], "overlays": [], "reframe": {"mode": "none", "track": []}, "style_ref": None, "notes": ""}


def call(name, plan, **kw):
    r = TOOLS[name]["fn"](plan, **kw)
    assert set(r) == {"plan", "result", "warnings"}
    jsonschema.validate(r["plan"], load_schema())
    return r


def ks(p):
    return [(k["start"], k["end"]) for k in p["keep"]]


def test_tools_registry():
    assert set(TOOLS) == {"cut_silences", "cut_segments", "set_captions", "style_captions",
                          "reframe_vertical", "preview_frame"}
    for t in TOOLS.values():
        assert callable(t["fn"]) and t["description"] and t["input_schema"]["type"] == "object"
    json.dumps({k: {"d": v["description"], "s": v["input_schema"]} for k, v in TOOLS.items()})


def test_base_valid():
    jsonschema.validate(base(), load_schema())


def test_cut_silences_basic_and_pure():
    p = base()
    r = call("cut_silences", p, silences=[{"start": 10, "end": 12}, {"start": 30, "end": 30.3}], padding=0.1)
    assert ks(r["plan"]) == [(0, 10.1), (11.9, 60)]
    assert ks(p) == [(0, 60)]
    assert r["result"]["removed"] == pytest.approx(1.8)


def test_cut_silences_keep_gap():
    r = call("cut_silences", base(), silences=[{"start": 10, "end": 12}], padding=0, keep_gap=0.2)
    assert r["result"]["output_duration"] == pytest.approx(58.2)


def test_cut_silences_overlapping_and_edges():
    r = call("cut_silences", base(), silences=[[0, 2], [1.5, 4], [58, 60]], padding=0)
    assert ks(r["plan"]) == [(4, 58)]


def test_cut_silences_empty_warns():
    r = call("cut_silences", base(), silences=[])
    assert ks(r["plan"]) == [(0, 60)] and r["warnings"]


def test_cut_silences_all_removed_warns():
    r = call("cut_silences", base(), silences=[[0, 60]], padding=0)
    assert r["plan"]["keep"] == [] and any("empty" in w for w in r["warnings"])


def test_cut_silences_bad_input():
    with pytest.raises(ValueError):
        call("cut_silences", base(), silences=[{"start": 5, "end": 2}])


def test_cut_segments_remove_and_adjacent_removes():
    r = call("cut_segments", base(), remove=[(10, 20), (20, 25), (5, 7)])
    assert ks(r["plan"]) == [(0, 5), (7, 10), (25, 60)]


def test_cut_segments_remove_outside_warns():
    p = base(((0, 10),))
    r = call("cut_segments", p, remove=[(20, 30)])
    assert ks(r["plan"]) == [(0, 10)] and r["warnings"]


def test_cut_segments_keep_replaces_and_merges():
    r = call("cut_segments", base(), keep=[(5, 10), (8, 12), (12, 15), (30, 30)])
    assert ks(r["plan"]) == [(5, 15)]


def test_cut_segments_keep_clamped():
    r = call("cut_segments", base(), keep=[(55, 90)])
    assert ks(r["plan"]) == [(55, 60)] and r["warnings"]


def test_cut_segments_requires_arg():
    with pytest.raises(ValueError):
        call("cut_segments", base())


def test_cut_then_silence_compose():
    r = call("cut_segments", base(), remove=[(0, 10)])
    r = call("cut_silences", r["plan"], silences=[[5, 20]], padding=0)
    assert ks(r["plan"]) == [(20, 60)]
    assert output_duration(r["plan"]) == 40


WORDS = [{"word": w, "start": i * 0.4, "end": i * 0.4 + 0.3} for i, w in enumerate("one two three four five six".split())]


def test_set_captions_explicit():
    r = call("set_captions", base(), captions=[{"text": "b", "start": 2, "end": 3}, {"text": "a", "start": 0, "end": 1}],
             style="clean-lower")
    caps = r["plan"]["captions"]
    assert [c["text"] for c in caps] == ["a", "b"] and all(c["style"] == "clean-lower" for c in caps)
    assert len({c["id"] for c in caps}) == 2


def test_set_captions_words_grouping():
    r = call("set_captions", base(), words=WORDS, max_words=3)
    assert [c["text"] for c in r["plan"]["captions"]] == ["one two three", "four five six"]
    assert r["plan"]["captions"][0]["start"] == 0


def test_set_captions_words_gap_and_sentence_split():
    w = [{"word": "Hi.", "start": 0, "end": 0.3}, {"word": "there", "start": 0.4, "end": 0.7},
         {"word": "late", "start": 5, "end": 5.3}]
    r = call("set_captions", base(), words=w, max_words=5)
    assert [c["text"] for c in r["plan"]["captions"]] == ["Hi.", "there", "late"]


def test_set_captions_append_unique_ids_and_overlap_warning():
    r = call("set_captions", base(), captions=[{"text": "a", "start": 0, "end": 2}])
    r = call("set_captions", r["plan"], captions=[{"text": "b", "start": 1, "end": 3}], mode="append")
    assert len(r["plan"]["captions"]) == 2 and len({c["id"] for c in r["plan"]["captions"]}) == 2
    assert any("overlap" in w for w in r["warnings"])


def test_set_captions_skips_bad_items_and_validates_args():
    r = call("set_captions", base(), captions=[{"text": " ", "start": 0, "end": 1}, {"text": "x", "start": 2, "end": 2}])
    assert r["plan"]["captions"] == [] and len(r["warnings"]) == 2
    with pytest.raises(ValueError):
        call("set_captions", base())
    with pytest.raises(ValueError):
        call("set_captions", base(), captions=[], words=[])
    with pytest.raises(ValueError):
        call("set_captions", base(), captions=[], style="nope")


def test_style_captions_all_styles():
    from tools.edit.styles import CAPTION_STYLES
    assert {"bold-pop", "clean-lower", "karaoke"} <= set(CAPTION_STYLES)
    p = call("set_captions", base(), words=WORDS)["plan"]
    for s in CAPTION_STYLES:
        r = call("style_captions", p, style=s)
        assert all(c["style"] == s for c in r["plan"]["captions"]) and r["result"]["style_def"]


def test_style_captions_subset_unknown_and_list():
    p = call("set_captions", base(), words=WORDS, max_words=3, style="bold-pop")["plan"]
    r = call("style_captions", p, style="karaoke", caption_ids=["c1", "zzz"])
    assert [c["style"] for c in r["plan"]["captions"]] == ["karaoke", "bold-pop"]
    assert r["warnings"]
    assert "bold-pop" in call("style_captions", p, list_styles=True)["result"]["styles"]
    with pytest.raises(ValueError):
        call("style_captions", p, style="nope")


def test_reframe_center():
    r = call("reframe_vertical", base(), mode="center")
    assert r["plan"]["output"]["width"] == 1080 and r["plan"]["output"]["height"] == 1920
    assert r["plan"]["reframe"]["mode"] == "center"


def test_reframe_face_follow_clamps_and_smooths():
    # crop frac = (1080/1920*1080)/1920 = 0.31640625 -> half = 0.158
    track = [{"t": 0, "cx": 0.0, "cy": 0.4}, {"t": 1, "cx": 1.0, "cy": 0.4}, {"t": 2, "cx": 0.5, "cy": 0.4}]
    r = call("reframe_vertical", base(), track=track, smoothing=1.0)
    xs = [p["cx"] for p in r["plan"]["reframe"]["track"]]
    assert xs[0] == pytest.approx(0.1582, abs=1e-3) and xs[1] == pytest.approx(0.8418, abs=1e-3) and xs[2] == 0.5
    r2 = call("reframe_vertical", base(), track=track, smoothing=0.3)
    assert r2["plan"]["reframe"]["track"][1]["cx"] < xs[1]


def test_reframe_face_follow_no_track_falls_back():
    r = call("reframe_vertical", base())
    assert r["plan"]["reframe"]["mode"] == "center" and r["warnings"]


def test_reframe_none_restores_and_bad_mode():
    p = call("reframe_vertical", base(), mode="center")["plan"]
    r = call("reframe_vertical", p, mode="none")
    assert r["plan"]["output"]["width"] == 1920
    with pytest.raises(ValueError):
        call("reframe_vertical", p, mode="zoom")


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="ffmpeg missing")
def test_preview_frame_real(tmp_path):
    vid = tmp_path / "in.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc=size=640x360:rate=10:duration=6",
                    "-pix_fmt", "yuv420p", str(vid)], check=True)
    p = base(((0, 2), (4, 6)))
    p["source"] = {"path": str(vid), "duration": 6, "width": 640, "height": 360, "fps": 10}
    r = call("preview_frame", p, time=2.5, workdir=str(tmp_path / "w"))
    assert r["result"]["source_time"] == pytest.approx(4.5)
    assert (tmp_path / "w").glob("*.jpg") and r["plan"] == p
    from pathlib import Path
    assert Path(r["result"]["path"]).stat().st_size > 500
    pv = call("reframe_vertical", p, mode="center")["plan"]
    r = call("preview_frame", pv, time=0.5, workdir=str(tmp_path / "w"))
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0",
                            r["result"]["path"]], capture_output=True, text=True).stdout.strip()
    w, h = map(int, probe.split(","))
    assert abs(w / h - 9 / 16) < 0.02
    with pytest.raises(ValueError):
        call("preview_frame", p, time=5, workdir=str(tmp_path))  # beyond output duration
    r = call("preview_frame", p, time=3, workdir=str(tmp_path), time_base="source")
    assert r["result"]["source_time"] == 3


def test_preview_missing_source(tmp_path):
    with pytest.raises(FileNotFoundError):
        call("preview_frame", base(), time=1, workdir=str(tmp_path))


def test_set_captions_from_saved_transcript(tmp_path):
    import json
    base = {"version": 1, "source": {"path": "in.mp4", "duration": 600.0}, "keep": [{"id": "k1", "start": 0, "end": 600}]}
    words = [{"word": f"w{i}", "start": i * 0.5, "end": i * 0.5 + 0.4} for i in range(1200)]  # 10 min: far beyond a tool result
    (tmp_path / "transcript.json").write_text(json.dumps({"words": words}))
    r = TOOLS["set_captions"]["fn"](base, from_transcript=True, workdir=str(tmp_path), style="karaoke")
    caps = r["plan"]["captions"]
    assert sum(len(c["words"]) for c in caps) == 1200 and caps[-1]["words"][-1]["word"] == "w1199"
    with pytest.raises(ValueError, match="call transcribe first"):
        TOOLS["set_captions"]["fn"](base, from_transcript=True, workdir=str(tmp_path / "empty"))
    with pytest.raises(ValueError, match="cannot be combined"):
        TOOLS["set_captions"]["fn"](base, from_transcript=True, words=words[:2], workdir=str(tmp_path))
    (tmp_path / "transcript.json").write_text(json.dumps({"words": []}))
    with pytest.raises(ValueError, match="no words"):
        TOOLS["set_captions"]["fn"](base, from_transcript=True, workdir=str(tmp_path))
