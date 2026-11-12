"""Learning one style from several reference videos (ported from ReelForge)."""
import subprocess
import sys
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import api_server  # noqa: E402
from studio import health  # noqa: E402
from styles.aggregate import aggregate  # noqa: E402


def prof(max_pause, shot, style, words, pos, lufs, color):
    return {"source": {"path": "x"}, "pacing": {"avg_shot_length": shot, "cuts_per_minute": 60 / shot, "p90_pause": max_pause},
            "edit_params": {"max_pause": max_pause, "target_shot_length": shot, "caption_style": style, "caption_max_words": words,
                            "caption_position": pos, "output_aspect": "9:16", "target_lufs": lufs}, "palette": {"colors": [{"hex": color, "weight": 0.5}]}}


def test_numbers_use_the_median_and_choices_the_majority():
    p = aggregate([prof(0.2, 1.5, "bold-pop", 3, "middle", -14, "#111111"), prof(0.3, 2.0, "bold-pop", 4, "middle", -13, "#222222"),
                   prof(0.9, 9.0, "clean-lower", 6, "bottom", -20, "#333333")], "mine")
    e = p["edit_params"]
    assert e["max_pause"] == 0.3 and e["target_shot_length"] == 2.0          # the 9 s outlier shot length does not drag it
    assert e["caption_style"] == "bold-pop" and e["caption_position"] == "middle" and e["caption_max_words"] == 4 and e["target_lufs"] == -14
    assert p["name"] == "mine" and p["learned_from"] == 3 and len(p["palette"]["colors"]) == 3


def test_missing_values_are_ignored_and_empty_input_is_refused():
    p = aggregate([prof(0.2, 1.5, "bold-pop", 3, "middle", None, "#111111")], "solo")
    assert p["edit_params"]["target_lufs"] is None and p["edit_params"]["max_pause"] == 0.2
    with pytest.raises(ValueError):
        aggregate([], "none")


@pytest.fixture
def env(tmp_path, monkeypatch):
    work = tmp_path / "work"
    work.mkdir()
    monkeypatch.setattr(health, "gemini_probe", lambda: {"status": "ONLINE", "detail": "t", "provider": "t"})
    monkeypatch.setattr(api_server, "ROOT", tmp_path)       # learned styles are written under ROOT/styles: keep the repo clean
    (tmp_path / "styles").mkdir()
    app = api_server.create_app(tmp_path / "s.json", tmp_path / "r", work, start_scheduler=False)
    paths = []
    for i, d in enumerate((4, 5)):
        v = work / f"ref{i}.mp4"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"testsrc2=s=320x180:r=15:d={d}", "-f", "lavfi", "-i", f"sine=f=300:d={d}",
                        "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(v)], check=True)
        paths.append(str(v))
    return TestClient(app), paths, tmp_path


def wait_job(c, jid, timeout=60):
    end = time.time() + timeout
    while time.time() < end:
        j = c.get(f"/api/editor/styles/learn/{jid}").json()["job"]
        if j["status"] != "running":
            return j
        time.sleep(0.3)
    raise AssertionError("style job timed out")


def test_learn_a_style_from_two_files(env):
    c, paths, root = env
    r = c.post("/api/editor/styles/learn", json={"name": "my style!", "video_paths": paths})
    assert r.status_code == 202
    j = wait_job(c, r.json()["job"]["id"])
    assert j["status"] == "done" and j["style"] == "my_style_" and j["learned_from"] == 2
    assert (root / "styles" / "my_style_.json").is_file()
    assert "my_style_" in c.get("/api/editor/styles").json()["custom"]


def test_learn_validates_input(env):
    c, paths, _ = env
    assert c.post("/api/editor/styles/learn", json={"name": "x1", "video_paths": []}).status_code == 400            # nothing to learn from
    assert c.post("/api/editor/styles/learn", json={"name": "x1", "video_paths": paths * 3}).status_code == 400     # more than 5
    assert c.post("/api/editor/styles/learn", json={"name": "viral_hook_fast_pace", "video_paths": paths}).status_code == 400
    assert c.post("/api/editor/styles/learn", json={"name": "x1", "urls": ["https://evil.example.com/v"]}).status_code == 400
    assert c.get("/api/editor/styles/learn/nope").status_code == 404
