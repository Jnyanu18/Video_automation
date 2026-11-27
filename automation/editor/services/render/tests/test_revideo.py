"""Revideo captions: settings, timing and the real render. The real render is skipped when node or ffmpeg is missing."""
from __future__ import annotations

import json
import subprocess

import pytest

import services.render.revideo as rv


def test_style_defaults_and_bad_values_are_reported():
    warnings: list[str] = []
    st = rv._style({"textColor": "not-a-colour", "position": "sideways", "size": "huge"}, warnings)
    assert st == {"textColor": "#FFFFFF", "position": "bottom", "size": 78}
    assert len(warnings) == 3


def test_style_accepts_valid_values():
    warnings: list[str] = []
    st = rv._style({"textColor": "#ff8a4c", "position": "top", "size": 90}, warnings)
    assert st["textColor"] == "#FF8A4C" and st["position"] == "top" and st["size"] == 90
    assert warnings == []


def test_clamp_drops_empty_and_tiny_captions_and_keeps_order():
    items = [
        {"text": "  keep me ", "start": 0.0, "end": 1.0},
        {"text": "   ", "start": 1.0, "end": 2.0},
        {"text": "tiny", "start": 2.0, "end": 2.01},
        {"text": "late", "start": 3.5, "end": 9.0},
    ]
    out = rv._clamp(items, 4.0)
    assert [c["text"] for c in out] == ["keep me", "late"]
    assert out[1]["end"] == 4.0


def test_props_shape():
    props = rv._props([{"text": "Hi", "start": 0, "end": 1}], 2.0, 1080, 1920, 30, {"textColor": "#FFFFFF", "position": "top", "size": 78})
    assert props["mode"] == "captions" and props["width"] == 1080 and props["height"] == 1920
    assert props["captionY"] == -0.28
    assert props["colors"]["bg"] == "#00FF00"
    assert props["captions"] == [{"text": "Hi", "start": 0.0, "end": 1.0}]


def test_last_json_line_is_parsed_from_noisy_output():
    stdout = "vite log\n{\"ok\": true, \"path\": \"x.mp4\"}\n"
    assert rv._parse_last_json(stdout) == {"ok": True, "path": "x.mp4"}
    assert rv._parse_last_json("no json here") == {}


def test_missing_node_fails_clearly(tmp_path, monkeypatch):
    monkeypatch.setattr(rv.shutil, "which", lambda name: None)
    with pytest.raises(rv.CaptionsRenderError, match="node is not on PATH"):
        rv.build_composition(tmp_path / "p", tmp_path / "cut.mp4", 1.0, [], [], 1080, 1920, 30, out_mp4=tmp_path / "o.mp4")


def test_overlays_are_reported_not_drawn(tmp_path, monkeypatch):
    # Stop before rendering: the warning is produced before the layer is drawn, so fake the render step.
    monkeypatch.setattr(rv, "renderer_ready", lambda: (True, ""))

    def fake_layer(proj, props, out_layer, timeout):
        out_layer.write_bytes(b"x")
    monkeypatch.setattr(rv, "_render_layer", fake_layer)
    monkeypatch.setattr(rv, "_composite", lambda *a, **k: None)
    _, warnings = rv.build_composition(tmp_path / "p", tmp_path / "cut.mp4", 1.0, [],
                                       [{"kind": "title", "text": "T", "start": 0, "end": 1}],
                                       1080, 1920, 30, out_mp4=tmp_path / "o.mp4")
    assert any("NOT drawn" in w for w in warnings)


def _real_renderer_ready() -> tuple[bool, str]:
    ok, why = rv.renderer_ready()
    if ok and not (rv.KIT_DIR / "render.mjs").is_file():
        return False, "packages/revideo-kit is missing"
    return ok, why


@pytest.mark.slow
def test_real_caption_render_keeps_video_and_audio(tmp_path):
    ok, why = _real_renderer_ready()
    if not ok:
        pytest.skip(why)
    cut = tmp_path / "cut.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=3",
                    "-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-shortest", "-c:v", "libx264",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", str(cut)], check=True)
    out = tmp_path / "final.mp4"
    _, warnings = rv.build_composition(tmp_path / "proj", cut, 3.0,
                                       [{"text": "Hello there", "start": 0.2, "end": 1.4}],
                                       [], 1080, 1920, 30, out_mp4=out, timeout=900)
    assert out.is_file()
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height",
                            "-of", "json", str(out)], capture_output=True, text=True)
    streams = json.loads(probe.stdout)["streams"]
    video = next(s for s in streams if s["codec_type"] == "video")
    assert (video["width"], video["height"]) == (1080, 1920)
    assert any(s["codec_type"] == "audio" for s in streams)
