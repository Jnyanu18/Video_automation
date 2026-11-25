import json

import jsonschema
import pytest

from tools.analysis import TOOLS, register_backend
from tools.analysis.faces import pick_face, smooth_track
from tools.analysis.scenes import cuts_to_scenes
from tools.analysis.silences import invert, parse_silencedetect

SCHEMA = None


def _schema():
    from pathlib import Path
    p = Path(__file__).resolve().parents[2] / "edit" / "editplan.schema.json"
    return json.loads(p.read_text()) if p.exists() else None


def _validate(plan):
    s = _schema()
    if s:
        jsonschema.validate(plan, s)


def test_tools_registry():
    assert set(TOOLS) == {"analyze_video", "transcribe", "detect_silences", "detect_scenes", "track_faces"}
    for name, spec in TOOLS.items():
        assert callable(spec["fn"]) and spec["description"]
        assert spec["input_schema"]["type"] == "object"
        json.dumps(spec["input_schema"])


def test_silences_real(media, plan):
    r = TOOLS["detect_silences"]["fn"](plan, video=str(media["av"]), min_len=0.5)
    s = r["result"]["silences"]
    assert len(s) == 1 and s[0]["start"] == pytest.approx(2.0, abs=0.15) and s[0]["end"] == pytest.approx(4.0, abs=0.15)
    sp = r["result"]["speech"]
    assert len(sp) == 2 and sp[0]["start"] == 0.0 and sp[1]["end"] == pytest.approx(r["result"]["duration"], abs=0.01)


def test_silence_trailing_closed_at_duration(media, plan):
    r = TOOLS["detect_silences"]["fn"](plan, video=str(media["tail"]))
    s = r["result"]["silences"]
    assert len(s) == 1 and s[0]["end"] == pytest.approx(r["result"]["duration"], abs=0.01)


def test_silence_no_audio(media, plan):
    r = TOOLS["detect_silences"]["fn"](plan, video=str(media["noaudio"]))
    assert r["warnings"] and r["result"]["speech"] == []


def test_silence_parsers():
    log = "silence_start: 1.5\nsilence_end: 2.5 | silence_duration: 1\nsilence_start: 9"
    assert parse_silencedetect(log, 10.0) == [{"start": 1.5, "end": 2.5}, {"start": 9.0, "end": 10.0}]
    assert invert([{"start": 0, "end": 1}], 3) == [{"start": 1.0, "end": 3.0}]


def test_scenes_real(media, plan):
    r = TOOLS["detect_scenes"]["fn"](plan, video=str(media["av"]))
    assert r["result"]["cuts"] == [pytest.approx(3.0, abs=0.1)]
    sc = r["result"]["scenes"]
    assert len(sc) == 2 and sc[0]["start"] == 0.0 and sc[-1]["end"] == pytest.approx(6.0, abs=0.05)


def test_scenes_min_len():
    assert len(cuts_to_scenes([1.0, 1.1, 5.0], 10, 0.5)) == 3
    assert cuts_to_scenes([], 4.0) == [{"index": 0, "start": 0.0, "end": 4.0}]


def test_transcribe_fixture(media, plan):
    r = TOOLS["transcribe"]["fn"](plan, video=str(media["av"]), backend="fixture", transcript_fixture=str(media["words"]))
    res = r["result"]
    assert res["status"] == "ok" and res["language"] == "en" and len(res["words"]) == 4
    assert [s["text"] for s in res["segments"]] == ["Hello world.", "Second bit"]
    assert res["text"] == "Hello world. Second bit"


def test_transcribe_auto_uses_fixture_env(media, plan, monkeypatch):
    monkeypatch.setenv("CE_TRANSCRIPT_FIXTURE", str(media["words"]))
    r = TOOLS["transcribe"]["fn"](plan, video=str(media["av"]))
    assert r["result"]["backend"] == "fixture"


def test_transcribe_custom_backend_and_failure(media, plan):
    register_backend("stub", lambda v, **k: {"words": [{"word": "hi", "start": 0, "end": 1}], "language": "en"})
    assert TOOLS["transcribe"]["fn"](plan, video=str(media["av"]), backend="stub")["result"]["text"] == "hi"

    def boom(v, **k):
        raise RuntimeError("download blocked")
    register_backend("boom", boom)
    r = TOOLS["transcribe"]["fn"](plan, video=str(media["av"]), backend="boom")
    assert r["result"]["status"] == "unavailable" and r["result"]["words"] == [] and "EMPTY" in r["warnings"][0]
    with pytest.raises(ValueError):
        TOOLS["transcribe"]["fn"](plan, video=str(media["av"]), backend="nope")


def test_faster_whisper_degrades_offline(media, plan):
    """Real faster-whisper backend: model download is blocked here, so it must degrade, not crash."""
    r = TOOLS["transcribe"]["fn"](plan, video=str(media["av"]), backend="faster-whisper")
    assert r["result"]["status"] in ("ok", "unavailable")
    if r["result"]["status"] == "unavailable":
        assert r["warnings"]


def test_analyze_video(media, plan, tmp_path):
    r = TOOLS["analyze_video"]["fn"](plan, video=str(media["av"]), workdir=str(tmp_path),
                                     backend="fixture", transcript_fixture=str(media["words"]))
    p = r["plan"]
    assert p["source"]["width"] == 320 and p["source"]["height"] == 240 and p["source"]["fps"] == 25
    assert p["source"]["duration"] == pytest.approx(6.0, abs=0.1)
    assert {"probe", "silences", "scenes", "transcript"} <= set(r["result"])
    assert (tmp_path / "analysis.json").exists() and (tmp_path / "silences.json").exists()
    assert plan["source"]["duration"] == 0  # input not mutated
    _validate(p)


def test_analyze_video_no_audio(media, plan):
    r = TOOLS["analyze_video"]["fn"](plan, video=str(media["noaudio"]))
    assert "silences" not in r["result"] and "transcript" not in r["result"] and "scenes" in r["result"]


def test_missing_video(plan):
    with pytest.raises(FileNotFoundError):
        TOOLS["detect_scenes"]["fn"](plan, video="/nope.mp4")


# ---- faces ----
def test_track_faces_real_face(face_video, plan, tmp_path):
    r = TOOLS["track_faces"]["fn"](plan, video=str(face_video), sample_fps=5, workdir=str(tmp_path))
    res = r["result"]
    assert res["detector"] == "opencv-haar" and res["coverage"] > 0.6, res["coverage"]
    tr = res["track"]
    assert r["plan"]["reframe"] == {"mode": "face-follow", "track": tr}
    # face pans right: cx should increase substantially from start to end
    assert tr[-1]["cx"] - tr[0]["cx"] > 0.25
    assert all(0 <= p["cx"] <= 1 and 0 <= p["cy"] <= 1 for p in tr)
    assert all(b["t"] > a["t"] for a, b in zip(tr, tr[1:]))
    # face center: x ~ (60+t*120 + 0.43*512)/1280 at t=0 ~ 0.22 ; y ~ (100+0.22*512)/720 ~ 0.29
    assert tr[0]["cx"] == pytest.approx(0.22, abs=0.06) and tr[0]["cy"] == pytest.approx(0.29, abs=0.06)
    assert (tmp_path / "face_track.json").exists()
    _validate(r["plan"])


def test_track_faces_none_falls_back_to_center(media, plan):
    r = TOOLS["track_faces"]["fn"](plan, video=str(media["av"]))
    assert r["result"]["mode"] == "center" and r["plan"]["reframe"]["mode"] == "center"
    assert r["plan"]["reframe"]["track"][0]["cx"] == 0.5 and r["warnings"]
    _validate(r["plan"])


def test_track_faces_custom_detector_gaps_and_smoothing(media, plan):
    def det(frame, t):  # face jumps at t=3, vanishes for 1.5..2.0
        if 1.5 <= t < 2.0:
            return []
        return [(0.1, 0.2, 0.2, 0.2)] if t < 3 else [(0.7, 0.2, 0.2, 0.2)]
    r = TOOLS["track_faces"]["fn"](plan, video=str(media["av"]), detector=det, sample_fps=5, max_speed=1.0)
    res = r["result"]
    assert 0 < res["coverage"] < 1
    tr = res["track"]
    assert tr[0]["cx"] == pytest.approx(0.2, abs=0.01)
    # jump (0.2 -> 0.8) is rate-limited: no single step exceeds max_speed * dt (0.2) + tolerance
    assert max(abs(b["cx"] - a["cx"]) for a, b in zip(tr, tr[1:])) <= 0.2 + 1e-3
    assert tr[-1]["cx"] > 0.7  # but converges
    assert r["plan"]["reframe"]["mode"] == "face-follow"


def test_track_faces_fixture_detector(media, plan, tmp_path):
    f = tmp_path / "faces.json"
    f.write_text(json.dumps({"faces": [{"t": 0, "boxes": [[0.4, 0.3, 0.2, 0.2]]}]}))
    r = TOOLS["track_faces"]["fn"](plan, video=str(media["av"]), detector="fixture", faces_fixture=str(f),
                                   set_reframe=False)
    assert r["result"]["coverage"] == 1.0 and "reframe" not in r["plan"]
    assert r["result"]["track"][0]["cx"] == pytest.approx(0.5, abs=0.01)


def test_track_faces_mediapipe_needs_model(media, plan):
    with pytest.raises(ValueError):
        TOOLS["track_faces"]["fn"](plan, video=str(media["av"]), detector="mediapipe")


def test_pick_face_and_smooth():
    big, small = (0.1, 0.1, 0.3, 0.3), (0.7, 0.1, 0.1, 0.1)
    assert pick_face([small, big], None) == big
    assert pick_face([], None) is None
    # comparable sizes: keep the one nearest the previous position
    a, b = (0.1, 0.1, 0.2, 0.2), (0.7, 0.1, 0.21, 0.21)
    assert pick_face([a, b], (0.2, 0.2)) == a
    assert smooth_track([]) == []
    jitter = [{"t": i * 0.2, "cx": 0.5 + (0.004 if i % 2 else -0.004), "cy": 0.5} for i in range(10)]
    assert len({p["cx"] for p in smooth_track(jitter)}) <= 2  # deadband suppresses jitter
