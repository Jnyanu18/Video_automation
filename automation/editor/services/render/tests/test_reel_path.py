"""The reel path renders from the engine alone: no MoneyPrinterTurbo, FFmpeg for cut/reframe/scale, Revideo (or the
FFmpeg ASS fallback) for captions, and an FFmpeg-only route when there is nothing to draw."""
import re
import socket
import sys
import urllib.request
from pathlib import Path

from services.render import render as R
from services.render import render_final_info, render_preview_info

REEL_FILES = ["render.py", "cut.py", "revideo.py", "combine.py", "timeline.py", "audio.py", "ass_fallback.py", "custom.py",
              "diagrams.py", "render_qa.py", "cli.py", "__init__.py"]
MPT_REFERENCE = re.compile(r"(?i)\bmpt\b|moneyprinter|adapters[/\\]mpt|:8080\b|:8791\b")


def _refuse_network(monkeypatch):
    """Any attempt to open a socket (MPT listens on 127.0.0.1:8080, its adapter on 8791) fails the test."""
    def refuse(*_a, **_k):
        raise AssertionError("the reel path tried to open a network connection")
    monkeypatch.setattr(socket.socket, "connect", refuse)
    monkeypatch.setattr(socket, "create_connection", refuse)
    monkeypatch.setattr(urllib.request, "urlopen", refuse)


def test_reel_modules_do_not_reference_mpt():
    root = Path(__file__).resolve().parents[1]
    hits = [f"{name}: {line.strip()}" for name in REEL_FILES if (root / name).is_file()
            for line in (root / name).read_text(encoding="utf-8").splitlines() if MPT_REFERENCE.search(line)]
    assert hits == []


def test_reel_path_does_not_call_mpt(plan, tmp_path, monkeypatch, fake_remotion):
    # The MPT adapter is a Node service on 127.0.0.1:8791 and MoneyPrinterTurbo on :8080. Neither may be reached,
    # and no MPT-named module may be imported by the render path.
    monkeypatch.setenv("MPT_URL", "http://127.0.0.1:8080")
    monkeypatch.setenv("MPT_API_KEY", "should-not-be-used")
    _refuse_network(monkeypatch)
    before = set(sys.modules)
    preview = render_preview_info(plan, tmp_path / "p")
    final = render_final_info(plan, tmp_path / "f")
    assert Path(preview["path"]).is_file() and Path(final["path"]).is_file()
    new = {m.lower() for m in set(sys.modules) - before}
    assert not [m for m in new if "mpt" in m.split(".") or "moneyprinter" in m]


def test_final_render_carries_an_output_scorecard(plan, tmp_path, fake_remotion):
    info = render_final_info(plan, tmp_path)
    card = info["scorecard"]
    names = {c["name"]: c["status"] for c in card["checks"]}
    assert names["size"] == "PASS" and names["fps"] == "PASS" and names["duration"] == "PASS"
    assert card["status"] in ("PASS", "WARN")
    assert info["stage"] == "revideo" and len(fake_remotion) == 1


def test_preview_render_skips_the_output_scorecard(plan, tmp_path, fake_remotion):
    assert "scorecard" not in render_preview_info(plan, tmp_path)
    assert fake_remotion[0]["w"] == 360 and fake_remotion[0]["h"] == 640  # the preview is drawn at its own size


def test_captions_survive_when_the_caption_renderer_fails(plan, tmp_path, monkeypatch):
    # Always runs: with Revideo failing, captions must still reach the file through the FFmpeg fallback.
    def failing(*_a, **_k):
        raise R.RenderError("Revideo caption render failed: chrome missing")
    monkeypatch.setattr(R, "build_composition", failing)
    info = render_final_info(plan, tmp_path)
    assert info["stage"] == "ffmpeg-ass-fallback"
    assert any("caption render failed" in w and "chrome missing" in w for w in info["warnings"])
    assert Path(info["path"]).is_file()
