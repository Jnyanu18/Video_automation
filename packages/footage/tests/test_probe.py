"""Tests for probe.py."""

from pathlib import Path
from footage.probe import (
    compute_checksum,
    infer_camera_id,
    is_reparse_point,
    parse_fps,
    probe_file,
    walk_media_files,
)


def test_parse_fps():
    """Verify fps string fraction parsing."""
    assert parse_fps("25/1") == 25.0
    assert abs(parse_fps("30000/1001") - 29.97) < 0.01
    assert parse_fps("60") == 60.0
    assert parse_fps("invalid") == 25.0


def test_infer_camera_id_override():
    """Caller override map takes top precedence."""
    p = Path("/raw/reel1/clip01.mp4")
    cid, reason = infer_camera_id(p, {}, camera_map={"reel1": "CAM_OVERRIDE"})
    assert cid == "CAM_OVERRIDE"
    assert "camera_map" in reason


def test_infer_camera_id_parent_folder():
    """Camera ID inferred from parent directory structure."""
    p1 = Path("/raw/CAM_A/clip01.mp4")
    cid1, _ = infer_camera_id(p1, {})
    assert cid1 == "CAM_A"

    p2 = Path("/raw/cam-b/clip01.mp4")
    cid2, _ = infer_camera_id(p2, {})
    assert cid2 == "CAM_B"

    p3 = Path("/raw/A001/clip01.mp4")
    cid3, _ = infer_camera_id(p3, {})
    assert cid3 == "CAM_A"


def test_infer_camera_id_metadata():
    """Camera ID inferred from camera make and model tags."""
    p = Path("/raw/random/clip01.mp4")
    meta = {"make": "Sony", "model": "FX3"}
    cid, reason = infer_camera_id(p, meta)
    assert "Sony_FX3" in cid
    assert "metadata" in reason


def test_infer_camera_id_fallback():
    """Default fallback when no clues match."""
    p = Path("/raw/random/001.mp4")
    cid, reason = infer_camera_id(p, {})
    assert cid == "CAM_DEFAULT"


def test_compute_checksum(tmp_path):
    """Checksum is deterministic and handles file updates."""
    f = tmp_path / "test.bin"
    f.write_bytes(b"hello world")
    c1 = compute_checksum(f)
    assert len(c1) == 64
    c2 = compute_checksum(f)
    assert c1 == c2

    f.write_bytes(b"hello changed world")
    c3 = compute_checksum(f)
    assert c1 != c3


def test_probe_nonexistent_file():
    """Probing missing file populates error field without raising exception."""
    mf = probe_file(Path("/does/not/exist.mp4"), "m999")
    assert mf.media_id == "m999"
    assert mf.error is not None
    assert "not found" in mf.error.lower()


def test_walk_media_files(tmp_path):
    """Walk directories finding video extensions while ignoring non-videos."""
    sub1 = tmp_path / "sub1"
    sub1.mkdir()
    (sub1 / "clip1.mp4").write_bytes(b"")
    (sub1 / "clip2.mov").write_bytes(b"")
    (sub1 / "ignore.txt").write_bytes(b"")
    (tmp_path / "top.mkv").write_bytes(b"")

    files = walk_media_files(tmp_path)
    names = {f.name for f in files}
    assert names == {"clip1.mp4", "clip2.mov", "top.mkv"}


def test_is_reparse_point_normal_dir(tmp_path):
    """Normal directory is not a reparse point."""
    d = tmp_path / "normal_dir"
    d.mkdir()
    assert not is_reparse_point(d)
