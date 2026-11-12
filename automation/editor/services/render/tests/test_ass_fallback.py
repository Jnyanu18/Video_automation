"""A failed or slow HyperFrames render must never silently drop the captions."""
import subprocess

import cv2
import numpy as np

from services.render import render as R
from services.render.ass_fallback import build_ass, burn_captions


def test_build_ass_karaoke_and_plain():
    caps = [{"id": "c1", "text": "hello world", "start": 0.0, "end": 1.0, "style": "karaoke",
             "words": [{"word": "hello", "start": 0.0, "end": 0.4}, {"word": "world", "start": 0.5, "end": 1.0}]},
            {"id": "c2", "text": "second {line}", "start": 1.2, "end": 2.0, "style": "clean"}]
    ass = build_ass(caps, 360, 640)
    assert "PlayResX: 360" in ass and "PlayResY: 640" in ass
    assert r"Dialogue: 0,0:00:00.00,0:00:01.00,Karaoke,,0,0,0,,{\k40}HELLO {\k10}{\k50}WORLD" in ass
    assert "Default,,0,0,0,,second (line)" in ass  # braces can't smuggle override tags


def _frame(path, t):
    cap = cv2.VideoCapture(str(path))
    cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
    ok, fr = cap.read()
    cap.release()
    assert ok
    return fr


def test_burn_captions_draws_text(tmp_path, sample):
    plain = tmp_path / "plain.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(sample), "-t", "2", "-c:v", "libx264", "-preset", "ultrafast",
                    "-c:a", "aac", str(plain)], check=True)
    out = tmp_path / "cap.mp4"
    burn_captions(plain, [{"id": "c1", "text": "hello", "start": 0.0, "end": 2.0, "style": "bold-pop"}], 640, 360, out, tmp_path / "w")
    a, b = _frame(plain, 0.5), _frame(out, 0.5)
    diff = np.abs(a.astype(int) - b.astype(int)).sum(axis=2)
    assert (diff > 60).sum() > 200  # a visible block of changed pixels
    assert diff[: int(a.shape[0] * 0.5)].sum() < diff[int(a.shape[0] * 0.5):].sum()  # text sits in the lower half


def test_render_falls_back_to_burned_captions_with_a_warning(plan, monkeypatch, tmp_path):
    def boom(*a, **k):
        raise R.RenderError("hyperframes render failed (1): chrome crashed")
    monkeypatch.setattr(R, "hyperframes_render", boom)
    info = R.render_preview_info(plan, tmp_path)
    assert info["stage"] == "ffmpeg-ass-fallback"
    assert any("captions were burned in" in w and "chrome crashed" in w for w in info["warnings"])
    assert any("overlays were NOT drawn" in w for w in info["warnings"])  # the lower-third could not be drawn
    plain = tmp_path / "preview_cut.mp4"
    diff = np.abs(_frame(plain, 0.5).astype(int) - _frame(info["path"], 0.5).astype(int)).sum(axis=2)
    assert (diff > 60).sum() > 100


def test_hyperframes_timeout_is_configurable(monkeypatch):
    monkeypatch.delenv("HYPERFRAMES_TIMEOUT", raising=False)
    assert R._hf_timeout(False) == 900 and R._hf_timeout(True) == 600
    monkeypatch.setenv("HYPERFRAMES_TIMEOUT", "300")
    assert R._hf_timeout(False) == 300
    monkeypatch.setenv("HYPERFRAMES_TIMEOUT", "junk")
    assert R._hf_timeout(False) == 900
