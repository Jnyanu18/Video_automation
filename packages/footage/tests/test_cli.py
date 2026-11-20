"""Tests for footage CLI commands."""

import json
from footage.cli import main
from footage.index import write_index
from footage.schema import FootageIndex, IndexStats


def test_cli_stats_command(tmp_path, monkeypatch, capsys):
    """Test 'footage stats <index.json> --json' prints valid JSON stats on stdout."""
    idx_path = tmp_path / "index.json"
    stats = IndexStats(
        total_source_seconds=50.0,
        media_count=1,
        shots=4,
        moments=2,
        kept_seconds=5.0,
        keep_ratio=0.10,
        proxy_seconds=4.0,
        index_wall_seconds=6.0,
        realtime_factor=8.3,
        model_calls=0,
    )
    idx = FootageIndex(
        index_version=2,
        project_id="cli-test",
        created_at="2026-11-20T12:00:00Z",
        source_dirs=["/test"],
        stats=stats,
    )
    write_index(idx, idx_path)

    monkeypatch.setattr("sys.argv", ["footage", "stats", str(idx_path), "--json"])
    ret = main()
    assert ret == 0

    captured = capsys.readouterr()
    stdout_data = json.loads(captured.out)
    assert stdout_data["total_source_seconds"] == 50.0
    assert stdout_data["model_calls"] == 0
