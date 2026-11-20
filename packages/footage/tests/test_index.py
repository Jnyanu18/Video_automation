"""Tests for index read, atomic write, and stats block."""

import json
from pathlib import Path
from footage.index import read_index, write_index
from footage.schema import FootageIndex, IndexStats, MediaFile, Shot


def test_atomic_index_write_and_read(tmp_path):
    """Verify write_index writes atomically and read_index reconstructs valid model."""
    out_file = tmp_path / "sub" / "idx.json"
    stats = IndexStats(
        total_source_seconds=100.0,
        media_count=1,
        shots=5,
        moments=3,
        kept_seconds=10.0,
        keep_ratio=0.10,
        proxy_seconds=8.0,
        index_wall_seconds=12.0,
        realtime_factor=8.33,
        model_calls=0,
    )
    index = FootageIndex(
        index_version=2,
        project_id="atomic-test",
        created_at="2026-11-20T12:00:00Z",
        source_dirs=[str(tmp_path)],
        media=[
            MediaFile(
                media_id="m1",
                path=str(tmp_path / "vid.mp4"),
                camera_id="CAM_A",
                duration=100.0,
                fps=25.0,
                width=1920,
                height=1080,
                codec="h264",
                has_audio=False,
            )
        ],
        shots=[
            Shot(
                shot_id="s1",
                media_id="m1",
                start=0.0,
                end=10.0,
                keep_score=0.8,
            )
        ],
        stats=stats,
    )

    written_path = write_index(index, out_file)
    assert written_path.is_file()

    # Verify no temporary files remain in directory
    tmps = list(out_file.parent.glob("*.tmp*"))
    assert len(tmps) == 0

    # Read back and validate
    loaded = read_index(written_path)
    assert loaded.index_version == 2
    assert loaded.project_id == "atomic-test"
    assert loaded.stats.realtime_factor == 8.33
    assert len(loaded.shots) == 1
