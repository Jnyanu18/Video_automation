"""Sound effects: placement validates, follows cuts, and is actually audible in the mixed render."""
import copy
import subprocess

import jsonschema
import pytest

from services.render.audio import apply_audio, build_mix_graph, has_audio_effects
from tools.audio import TOOLS
from tools.audio.sfx import catalog
from tools.edit._common import load_schema
from tools.edit.timeline import remap_to_output

PLAN = {"version": 1, "source": {"path": "in.mp4", "duration": 30.0, "width": 1280, "height": 720, "fps": 30},
        "output": {"width": 1280, "height": 720, "fps": 30},
        "keep": [{"id": "k1", "start": 0, "end": 10}, {"id": "k2", "start": 20, "end": 30}],
        "captions": [], "reframe": {"mode": "none", "track": []}, "overlays": [], "style_ref": None, "notes": ""}


def call(plan, tool, **kw):
    return TOOLS[tool]["fn"](plan, **kw)


def test_library_has_the_forty_effects():
    names = {i["name"] for i in catalog()}
    assert len(names) == 40 and {"whoosh", "riser", "drop", "pop"} <= names


def test_list_sfx_filters_by_category():
    r = call(PLAN, "list_sfx", category="transition")["result"]
    assert r["count"] > 0 and all(i["name"] for i in r["sfx"])
    assert "whoosh" in {i["name"] for i in r["sfx"]}


def test_add_sfx_validates_and_is_pure():
    before = copy.deepcopy(PLAN)
    r = call(PLAN, "add_sfx", name="whoosh", at=0.5, volume_db=-6)
    assert PLAN == before
    fx = r["plan"]["audio"]["sfx"]
    assert fx[0]["id"] == "s1" and fx[0]["name"] == "whoosh" and fx[0]["path"].endswith("whoosh.wav")
    jsonschema.validate(r["plan"], load_schema())
    with pytest.raises(ValueError, match="unknown sound effect"):
        call(PLAN, "add_sfx", name="not-a-real-sound", at=1)
    with pytest.raises(ValueError):
        call(PLAN, "add_sfx", name="pop", at=99)


def test_add_sfx_warns_in_cut_region_and_ids_increment():
    r = call(PLAN, "add_sfx", name="pop", at=15)
    assert any("cut region" in w for w in r["warnings"])
    r2 = call(r["plan"], "add_sfx", name="pop", at=2)
    assert [x["id"] for x in r2["plan"]["audio"]["sfx"]] == ["s2", "s1"]  # sorted by time, ids unique


def test_remove_sfx():
    p = call(call(PLAN, "add_sfx", name="pop", at=1)["plan"], "add_sfx", name="drop", at=2)["plan"]
    r = call(p, "remove_sfx", ids=["s1"])
    assert r["result"] == {"removed": 1, "remaining": 1}
    assert "audio" not in call(r["plan"], "remove_sfx")["plan"]


def test_remap_moves_sfx_to_output_time_and_drops_cut_ones():
    p = call(call(PLAN, "add_sfx", name="pop", at=22)["plan"], "add_sfx", name="drop", at=15)["plan"]
    out = remap_to_output(p)
    assert [(x["name"], x["at"]) for x in out["audio"]["sfx"]] == [("pop", 12.0)]  # 22s -> 10 kept + 2


def test_mix_graph_delays_each_effect_and_numbers_inputs_after_music():
    p = call(PLAN, "add_sfx", name="whoosh", at=1.25)["plan"]
    p["audio"]["music"] = {"path": "m.wav"}
    g, extra, label = build_mix_graph(p, 10.0, True)
    assert label == "[mixfx]" and "adelay=1250|1250" in g and "[2:a]" in g  # input 0 video, 1 music, 2 sfx
    assert extra[-2:] == ["-i", p["audio"]["sfx"][0]["path"]]
    assert has_audio_effects({"audio": {"sfx": [{"at": 1}]}})


def test_sfx_without_voice_still_mixes(tmp_path):
    p = {"audio": {"sfx": [{"id": "s1", "name": "pop", "path": "x.wav", "at": 0.5, "volume_db": -6}]}}
    g, extra, label = build_mix_graph(p, 3.0, False)
    assert label == "[mixfx]" and g.startswith("[1:a]") and "amix=inputs=1" in g  # input 0 is the video, sfx is input 1


def test_effect_is_audible_in_the_rendered_audio(tmp_path):
    silent = tmp_path / "silent.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=black:s=160x90:r=10:d=3",
                    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", "3", "-c:v", "libx264", "-c:a", "aac",
                    "-shortest", str(silent)], check=True)
    plan = call({**PLAN, "time_base": "output"}, "add_sfx", name="drop", at=1.0, volume_db=0)["plan"]
    out = tmp_path / "out.mp4"
    apply_audio(plan, silent, out, tmp_path / "w", 3.0)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-ss", "0", "-t", "0.8", "-i", str(out), "-vn", "-af",
                        "volumedetect", "-f", "null", "-"], capture_output=True, text=True)
    before = float(r.stderr.split("max_volume:")[1].split("dB")[0])
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-ss", "1.0", "-t", "1.0", "-i", str(out), "-vn", "-af",
                        "volumedetect", "-f", "null", "-"], capture_output=True, text=True)
    after = float(r.stderr.split("max_volume:")[1].split("dB")[0])
    assert before < -60 and after > -30  # silence before the drop, clearly audible after it
