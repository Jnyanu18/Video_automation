"""Captions on the Revideo path (services/render/revideo.py), and the FFmpeg routes around it.

Revideo renders the caption layer over solid green; FFmpeg keys it out and lays it over the cut. Fast tests never run
Revideo: its `node render.mjs` call is faked with a green clip. The one real render is marked slow and skips itself
when node or the kit (packages/revideo-kit) is missing.

Known gaps of the Revideo path, kept visible here rather than hidden: title and lower-third overlays are not drawn
(reported in the warnings), and karaoke word highlighting is only drawn by the FFmpeg fallback (test_karaoke.py).
"""
import json
import re
import subprocess
import time
from pathlib import Path

import cv2
import numpy as np
import pytest

from services.render import render as R
from services.render import revideo as RV
from services.render import render_final_info
from services.render.cut import probe

RENDER_DIR = Path(RV.__file__).resolve().parent
# The render path: every module a render goes through. None of them may mention HyperFrames any more.
RENDER_PATH_FILES = ["render.py", "revideo.py", "cut.py", "timeline.py", "audio.py", "combine.py", "ass_fallback.py"]
READY, WHY = RV.renderer_ready()


def test_render_path_has_no_hyperframes():
    hits = []
    for name in RENDER_PATH_FILES:
        for n, line in enumerate((RENDER_DIR / name).read_text(encoding="utf-8").splitlines(), 1):
            if re.search(r"(?i)hyperframes", line):
                hits.append(f"{name}:{n}: {line.strip()}")
    assert hits == []


def test_render_path_uses_revideo():
    assert R.build_composition is RV.build_composition


def test_ffmpeg_only_route_makes_an_mp4(plan, tmp_path, monkeypatch):
    plan["captions"], plan["overlays"] = [], []

    def must_not_run(*_a, **_k):
        raise AssertionError("the caption renderer must not run when there is nothing to draw")
    monkeypatch.setattr(R, "build_composition", must_not_run)
    info = render_final_info(plan, tmp_path)
    assert info["stage"] == "ffmpeg-only" and info["warnings"] == []
    i = probe(info["path"])
    assert (i["width"], i["height"]) == (360, 640) and abs(i["duration"] - 3.0) < 0.15


@pytest.mark.skipif(not (RV.KIT_DIR / "src").is_dir(), reason=f"Revideo kit source not found at {RV.KIT_DIR}")
def test_captions_route_hands_props_to_revideo(plan, tmp_path, monkeypatch):
    monkeypatch.setattr(RV, "renderer_ready", lambda: (True, ""))
    monkeypatch.setattr(RV, "_link_node_modules", lambda proj: None)  # the fake render needs no packages
    plan["caption_style"] = {"textColor": "#00ff00", "position": "top", "size": 64}
    plan["overlays"].append({"id": "o2", "kind": "broll", "start": 0.5, "end": 1.0, "asset": "x.mp4", "params": {}})
    seen = {}
    real_run = subprocess.run  # the patch is on the shared subprocess module: ffprobe and ffmpeg must still run

    def fake_run(cmd, **kw):
        if cmd[0] != "node":
            return real_run(cmd, **kw)
        proj, layer = Path(cmd[2]), Path(cmd[3])
        props = json.loads((proj / "src" / "props.json").read_text(encoding="utf-8"))
        seen.update(cmd=cmd, cwd=kw.get("cwd"), proj=proj, props=props)
        real_run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i",
                  f"color=c=0x00FF00:s={props['width']}x{props['height']}:r=30:d={props['duration']}",
                  "-c:v", "libx264", "-pix_fmt", "yuv420p", str(layer)], check=True)
        return subprocess.CompletedProcess(cmd, 0, stdout=json.dumps({"ok": True}) + "\n", stderr="")

    monkeypatch.setattr(RV.subprocess, "run", fake_run)
    info = render_final_info(plan, tmp_path)

    cmd = seen["cmd"]
    assert cmd[0] == "node" and cmd[1].endswith("render.mjs")
    assert Path(seen["cwd"]).resolve() == RV.KIT_DIR.resolve()
    assert str(seen["proj"]).startswith(str(tmp_path)), "the captions project must be a scratch copy"

    p = seen["props"]
    assert p["mode"] == "captions" and (p["width"], p["height"], p["fps"]) == (360, 640, 30.0)
    assert abs(p["duration"] - 3.0) < 0.05  # the cut's probed length (encoder padding is under one frame)
    assert [c["text"] for c in p["captions"]] == ["hello world", "in the cut"]  # c3 is cut away
    assert abs(p["captions"][1]["start"] - 1.7) < 1e-6 and abs(p["captions"][1]["end"] - 2.5) < 1e-6  # output time
    assert p["colors"]["bg"] == RV.KEY_GREEN and p["colors"]["ink"] == "#00FF00"
    assert p["captionY"] == RV.POSITIONS["top"] and p["captionSize"] == 64

    assert info["stage"] == "revideo" and Path(info["path"]).is_file()
    assert any("lower-third" in w and "NOT drawn" in w for w in info["warnings"])
    assert any("broll" in w and "not drawn" in w for w in info["warnings"])
    i = probe(info["path"])
    assert (i["width"], i["height"]) == (360, 640) and i["has_audio"]  # the cut's audio is kept


def test_bad_style_values_fall_back_with_a_warning():
    warns = []
    st = RV._style({"textColor": "white", "position": "left", "size": "huge"}, warns)
    assert st == {"textColor": "#FFFFFF", "position": "bottom", "size": 78}
    assert len(warns) == 3


def test_missing_renderer_is_reported_not_crashed(plan, tmp_path, monkeypatch):
    monkeypatch.setattr(RV, "renderer_ready", lambda: (False, "node is not on PATH"))
    info = render_final_info(plan, tmp_path)
    assert info["stage"] == "ffmpeg-ass-fallback"
    assert any("node is not on PATH" in w for w in info["warnings"])


@pytest.mark.slow
@pytest.mark.skipif(not READY, reason=f"Revideo captions renderer unavailable: {WHY}")
def test_real_revideo_captions_render(tmp_path):
    clip = tmp_path / "in.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=s=360x640:r=30:d=3",
                    "-f", "lavfi", "-i", "sine=f=440:d=3", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-shortest", str(clip)], check=True)
    plan = {"version": 1, "source": {"path": str(clip), "duration": 3.0, "width": 360, "height": 640, "fps": 30},
            "output": {"width": 360, "height": 640, "fps": 30},
            "keep": [{"id": "k1", "start": 0.0, "end": 3.0}], "reframe": {"mode": "none", "track": []},
            "captions": [{"id": "c1", "text": "hello big world", "start": 0.2, "end": 2.6}],
            "overlays": [], "style_ref": None, "notes": ""}
    work = tmp_path / "w"
    t0 = time.time()
    info = render_final_info(plan, work)
    print(f"\nrevideo captions render (3 s clip, 360x640): {time.time() - t0:.1f} s")
    assert info["stage"] == "revideo" and info["warnings"] == []
    i = probe(info["path"])
    assert abs(i["duration"] - 3.0) < 0.15 and i["has_audio"] and (i["width"], i["height"]) == (360, 640)
    # the caption is drawn: the frame at 1.0 s differs from the plain cut
    a = cv2.VideoCapture(str(work / "final_cut.mp4"))
    b = cv2.VideoCapture(info["path"])
    a.set(cv2.CAP_PROP_POS_MSEC, 1000)
    b.set(cv2.CAP_PROP_POS_MSEC, 1000)
    _, fa = a.read()
    _, fb = b.read()
    diff = np.abs(fa.astype(int) - fb.astype(int)).sum(axis=2)
    assert (diff > 60).sum() > 200
