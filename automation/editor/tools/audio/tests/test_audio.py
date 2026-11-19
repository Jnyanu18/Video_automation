import copy
import json
import subprocess

import jsonschema
import pytest

from tools.audio import TOOLS
from tools.edit._common import load_schema

PLAN = {"version": 1, "source": {"path": "in.mp4", "duration": 30.0, "width": 1280, "height": 720, "fps": 30},
        "output": {"width": 1280, "height": 720, "fps": 30}, "keep": [{"id": "k1", "start": 0, "end": 20}],
        "captions": [], "reframe": {"mode": "none", "track": []}, "overlays": [], "style_ref": None, "notes": ""}


def call(plan, name, **kw):
    return TOOLS[name]["fn"](plan, **kw)


@pytest.fixture(scope="module")
def song(tmp_path_factory):
    p = tmp_path_factory.mktemp("m") / "song.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "sine=f=220:d=5", str(p)], check=True)
    return p


def test_registry():
    assert set(TOOLS) == {"add_music", "duck_music_under_speech", "normalize_loudness", "mute_segments",
                          "list_sfx", "add_sfx", "remove_sfx"}
    for spec in TOOLS.values():
        json.dumps(spec["input_schema"])
        assert spec["description"]


def test_add_music_from_file_validates_and_is_pure(song):
    before = copy.deepcopy(PLAN)
    r = call(PLAN, "add_music", path=str(song), volume_db=-20, start=1, fade_out=3)
    assert PLAN == before
    m = r["plan"]["audio"]["music"]
    assert m["path"].endswith("song.wav") and m["volume_db"] == -20 and m["start"] == 1 and m["loop"] is True
    assert r["result"]["music_duration"] == pytest.approx(5.0, abs=0.1)
    jsonschema.validate(r["plan"], load_schema())


def test_add_music_errors(tmp_path, song):
    for kw in (dict(), dict(path=str(song), generate="calm"), dict(path="missing.mp3"), dict(path=str(song), volume_db=5),
               dict(path=str(song), start=-1), dict(generate="polka", workdir=str(tmp_path)), dict(generate="calm")):
        with pytest.raises(ValueError):
            call(PLAN, "add_music", **kw)
    txt = tmp_path / "a.txt"
    txt.write_text("x")
    with pytest.raises(ValueError, match="unsupported"):
        call(PLAN, "add_music", path=str(txt))
    fake = tmp_path / "fake.mp3"
    fake.write_bytes(b"not audio at all")
    with pytest.raises(ValueError):
        call(PLAN, "add_music", path=str(fake))
    video_only = tmp_path / "v.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=red:s=64x64:d=1", "-an",
                    str(tmp_path / "v.mp4")], check=True)
    (tmp_path / "v.mp4").rename(tmp_path / "v.m4a")
    with pytest.raises(ValueError, match="no audio stream|cannot read"):
        call(PLAN, "add_music", path=str(tmp_path / "v.m4a"))


def test_add_music_generate_writes_a_real_file(tmp_path):
    r = call(PLAN, "add_music", generate="ambient", workdir=str(tmp_path))
    p = r["plan"]["audio"]["music"]["path"]
    assert p.endswith("music_ambient.wav") and r["result"]["music_duration"] > 30
    assert any("synthesized" in w for w in r["warnings"])


def test_loop_off_short_music_warns(song):
    r = call(PLAN, "add_music", path=str(song), loop=False)
    assert any("shorter than the video" in w for w in r["warnings"])


def test_duck_and_loudness_settings():
    p = call(PLAN, "duck_music_under_speech", amount_db=9)
    assert p["warnings"] and p["plan"]["audio"]["duck"]["amount_db"] == 9  # warns: no music yet
    for kw in (dict(amount_db=0), dict(amount_db=99), dict(attack_ms=0), dict(release_ms=1)):
        with pytest.raises(ValueError):
            call(PLAN, "duck_music_under_speech", **kw)
    n = call(PLAN, "normalize_loudness", target_lufs=-14)["plan"]
    assert n["audio"]["loudness"]["target_lufs"] == -14
    assert "loudness" not in call(n, "normalize_loudness", enabled=False)["plan"].get("audio", {})
    for kw in (dict(target_lufs=0), dict(target_lufs=-50), dict(true_peak_db=3), dict(lra=0)):
        with pytest.raises(ValueError):
            call(PLAN, "normalize_loudness", **kw)
    jsonschema.validate(n, load_schema())


def test_mute_segments_merge_replace_clear():
    p = call(PLAN, "mute_segments", ranges=[{"start": 2, "end": 3}, [2.5, 4]])["plan"]
    assert p["audio"]["mute"] == [{"id": "m1", "start": 2, "end": 4}]
    p = call(p, "mute_segments", ranges=[{"start": 10, "end": 11}])["plan"]
    assert len(p["audio"]["mute"]) == 2
    p = call(p, "mute_segments", ranges=[{"start": 5, "end": 6}], mode="replace")["plan"]
    assert [(m["start"], m["end"]) for m in p["audio"]["mute"]] == [(5, 6)]
    assert "audio" not in call(p, "mute_segments", ranges=[], mode="clear")["plan"]
    for bad in ([], [{"start": 3, "end": 3}], [{"start": -1, "end": 2}], [{"nope": 1}]):
        with pytest.raises(ValueError):
            call(PLAN, "mute_segments", ranges=bad)
    assert call(PLAN, "mute_segments", ranges=[{"start": 25, "end": 28}])["warnings"]  # outside the kept footage
    jsonschema.validate(p, load_schema())
