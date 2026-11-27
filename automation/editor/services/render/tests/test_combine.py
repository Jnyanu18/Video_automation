import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

# abspath, not resolve(): automation/ is reached through a junction that resolve() expands elsewhere.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))

from services.render import combine as C  # noqa: E402
from services.render.combine import CombineError, combine_reel, probe_media, render_cards  # noqa: E402

# Placeholder brand tokens for tests only. Real renders pass the brand kit's tokens.
TEST_TOKENS = {
    "brandName": "TEST BRAND",
    "colors": {"bg": "#101010", "ink": "#f2f2f2", "accent": "#ff3300", "muted": "#808080"},
    "fonts": {"display": {"family": "Geist", "file": "Geist-Variable.woff2"},
              "mono": {"family": "GeistMono", "file": "GeistMono-Variable.woff2"}},
}


def _make_clip(path: Path, w: int, h: int, fps: int, dur: float, audio: bool = True,
               sr: int = 44100, ch: int = 1, pixfmt: str = "yuv420p") -> Path:
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"testsrc2=s={w}x{h}:r={fps}:d={dur}"]
    if audio:
        cmd += ["-f", "lavfi", "-i", f"sine=f=440:d={dur}:sample_rate={sr}"]
    cmd += ["-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", pixfmt]
    if audio:
        cmd += ["-c:a", "aac", "-ac", str(ch), "-ar", str(sr), "-shortest"]
    cmd += [str(path)]
    subprocess.run(cmd, check=True, capture_output=True)
    return path


@pytest.fixture(scope="module")
def clips(tmp_path_factory):
    d = tmp_path_factory.mktemp("combine_clips")
    return {
        # odd size, odd fps, mono 44.1k audio: needs the full normalisation path
        "cut_720_25": _make_clip(d / "cut_720_25.mp4", 1280, 720, 25, 2.0),
        "cut_1080_30_silent": _make_clip(d / "cut_1080_30_silent.mp4", 1080, 1920, 30, 1.5, audio=False),
        "title_540_24_silent": _make_clip(d / "title_540_24_silent.mp4", 540, 960, 24, 1.0, audio=False),
        # already matches the target exactly (h264 yuv420p, 1080x1920 @ 30, AAC 48 kHz stereo)
        "match_a": _make_clip(d / "match_a.mp4", 1080, 1920, 30, 1.0, sr=48000, ch=2),
        "match_b": _make_clip(d / "match_b.mp4", 1080, 1920, 30, 1.2, sr=48000, ch=2),
        "cut_1080_30_b": _make_clip(d / "cut_1080_30_b.mp4", 1080, 1920, 30, 1.5, sr=48000, ch=2),
    }


def _has_audio_stream(path) -> dict:
    return next(s for s in json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", str(path)],
        capture_output=True, text=True).stdout)["streams"] if s["codec_type"] == "audio")


def test_mismatched_size_and_fps_are_normalised(clips, tmp_path):
    parts = [{"kind": "title", "path": str(clips["title_540_24_silent"])},
             {"kind": "cut", "path": str(clips["cut_720_25"])},
             {"kind": "end", "path": str(clips["cut_1080_30_silent"])}]
    out, info = combine_reel(parts, tmp_path / "reel.mp4", 1080, 1920, 30)
    got = probe_media(out)
    assert (got["width"], got["height"]) == (1080, 1920)
    assert abs(got["fps"] - 30) < 1e-3
    assert info["video"] == "reencoded-parts"
    assert abs(info["duration"] - (1.0 + 2.0 + 1.5)) < 0.15
    a = _has_audio_stream(out)
    assert (a["codec_name"], a["sample_rate"], a["channels"]) == ("aac", "48000", 2)
    assert info["parts"][0]["width"] == 540 and info["parts"][1]["fps"] == 25.0


def test_fps_only_mismatch_is_retimed(clips, tmp_path):
    parts = [{"kind": "cut", "path": str(clips["cut_720_25"])}, {"kind": "cut", "path": str(clips["match_a"])}]
    out, info = combine_reel(parts, tmp_path / "fps.mp4", 1080, 1920, 30)
    assert abs(probe_media(out)["fps"] - 30) < 1e-3
    assert abs(info["duration"] - 3.0) < 0.15


def test_already_matching_parts_join_without_reencoding_video(clips, tmp_path):
    parts = [{"kind": "title", "path": str(clips["match_a"])}, {"kind": "cut", "path": str(clips["cut_1080_30_b"])},
             {"kind": "end", "path": str(clips["match_b"])}]
    out, info = combine_reel(parts, tmp_path / "copy.mp4", 1080, 1920, 30)
    assert info["video"] == "copy"
    assert abs(info["duration"] - (1.0 + 1.5 + 1.2)) < 0.15
    assert probe_media(out)["vcodec"] == "h264"


def test_loudness_is_normalised_to_target(clips, tmp_path):
    parts = [{"kind": "cut", "path": str(clips["cut_720_25"])}]
    _, info = combine_reel(parts, tmp_path / "loud.mp4", 1080, 1920, 30)
    assert info["lufs"] is not None and abs(info["lufs"] - C.TARGET_LUFS) <= 1.0, info
    assert info["true_peak"] <= C.TARGET_TP + 0.1, info


def test_single_audio_track_survives_join(clips, tmp_path):
    parts = [{"kind": "title", "path": str(clips["title_540_24_silent"])}, {"kind": "cut", "path": str(clips["cut_720_25"])}]
    out, _ = combine_reel(parts, tmp_path / "one_audio.mp4", 1080, 1920, 30)
    streams = json.loads(subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", str(out)],
                                        capture_output=True, text=True).stdout)["streams"]
    assert [s["codec_type"] for s in streams].count("audio") == 1


def test_silent_reel_is_rejected(clips, tmp_path):
    parts = [{"kind": "cut", "path": str(clips["cut_1080_30_silent"])}]
    with pytest.raises(CombineError, match="no audible audio"):
        combine_reel(parts, tmp_path / "silent.mp4", 1080, 1920, 30)


@pytest.mark.parametrize("kinds, path, w, h, fps, msg", [
    ([], None, 1080, 1920, 30, "empty"),
    (["title"], "REAL", 1080, 1920, 30, "at least one kind='cut'"),
    (["bogus"], "REAL", 1080, 1920, 30, "part kind"),
    (["cut"], "MISSING", 1080, 1920, 30, "missing or empty"),
    (["cut"], "REAL", 1081, 1920, 30, "even"),
])
def test_invalid_input_fails_before_ffmpeg(tmp_path, kinds, path, w, h, fps, msg):
    real = tmp_path / "real.mp4"
    real.write_bytes(b"not really a video, validation fails first")
    paths = {"REAL": str(real), "MISSING": str(tmp_path / "does-not-exist.mp4")}
    parts = [{"kind": k, "path": paths.get(path, "")} for k in kinds]
    with pytest.raises(CombineError, match=msg):
        combine_reel(parts, tmp_path / "x.mp4", w, h, fps)


def test_odd_dimensions_and_bad_fps_rejected(clips, tmp_path):
    parts = [{"kind": "cut", "path": str(clips["cut_720_25"])}]
    with pytest.raises(CombineError, match="even"):
        combine_reel(parts, tmp_path / "x.mp4", 1081, 1920, 30)
    with pytest.raises(CombineError, match="fps"):
        combine_reel(parts, tmp_path / "x.mp4", 1080, 1920, 0)


def test_concat_list_escapes_quotes(tmp_path):
    f = tmp_path / "it's.mp4"
    lst = tmp_path / "list.txt"
    C._concat_list([f], lst)
    assert "it'\\''s.mp4" in lst.read_text(encoding="utf-8")


def _chrome_available() -> bool:
    if os.environ.get("CHROME_PATH") and Path(os.environ["CHROME_PATH"]).exists():
        return True
    if shutil.which("chrome") or shutil.which("google-chrome") or shutil.which("chromium"):
        return True
    return any(Path(os.environ.get(v, ""), "Google", "Chrome", "Application", "chrome.exe").exists()
               for v in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA"))


def _remotion_skip_reason() -> str | None:
    if shutil.which("node") is None:
        return "node is not on PATH"
    if not (C.MOTION_KIT / "node_modules" / "remotion").is_dir():
        return f"remotion is not installed in {C.MOTION_KIT}"
    if not _chrome_available():
        return "no Chrome found (set CHROME_PATH) for the Remotion render"
    return None


@pytest.mark.skipif(_remotion_skip_reason() is not None, reason=_remotion_skip_reason() or "")
def test_rendered_cards_join_with_a_cut(clips, tmp_path):
    cards = render_cards(tokens=TEST_TOKENS, title_text="TEST TITLE", title_sub="SUB", end_text="CALL TO ACTION",
                         width=1080, height=1920, fps=30, out_dir=tmp_path / "cards",
                         title_seconds=1.5, end_seconds=1.5)
    assert set(cards) == {"title", "end"}
    for p in cards.values():
        got = probe_media(p)
        assert (got["width"], got["height"]) == (1080, 1920)
        assert abs(got["duration"] - 1.5) < 0.1
    parts = [{"kind": "title", "path": cards["title"]}, {"kind": "cut", "path": str(clips["cut_720_25"])},
             {"kind": "end", "path": cards["end"]}]
    out, info = combine_reel(parts, tmp_path / "reel.mp4", 1080, 1920, 30)
    assert abs(info["duration"] - (1.5 + 2.0 + 1.5)) < 0.2
    assert info["lufs"] is not None and abs(info["lufs"] - C.TARGET_LUFS) <= 1.0


def test_render_cards_reports_missing_node(monkeypatch, tmp_path):
    monkeypatch.setattr(C.shutil, "which", lambda name: None)
    with pytest.raises(C.CardRenderError, match="node"):
        render_cards(tokens=TEST_TOKENS, title_text="T", end_text="E", width=1080, height=1920, fps=30, out_dir=tmp_path)
