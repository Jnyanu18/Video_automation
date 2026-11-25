"""Tests for shots.py."""

from pathlib import Path
from footage.shots import detect_shot_boundaries


def test_detect_shot_boundaries_missing_file():
    """Missing file falls back to single shot spanning duration."""
    bounds = detect_shot_boundaries("/missing/proxy.mp4", duration=15.0)
    assert len(bounds) == 1
    assert bounds[0] == (0.0, 15.0)


def test_detect_shot_boundaries_zero_duration():
    """Zero duration handled gracefully without error."""
    bounds = detect_shot_boundaries("/missing/proxy.mp4", duration=0.0)
    assert len(bounds) == 1
    assert bounds[0] == (0.0, 0.0)
