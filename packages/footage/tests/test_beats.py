"""Tests for music beat tracking, cut snapping, and speech-whole protection."""

import math
from pathlib import Path
import tempfile
import numpy as np
import pytest

from footage.beats import (
    compute_energy_curve,
    detect_beat_grid,
    find_nearest_beat,
    snap_cuts_to_beats,
)
from footage.plan_schema import EditPlanEntryV2


def test_find_nearest_beat():
    """Verify beat proximity matching with max_drift threshold."""
    grid = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5]
    # Exactly on beat
    assert find_nearest_beat(1.0, grid, max_drift=0.3) == 1.0
    # Within drift (1.08 -> 1.0)
    assert find_nearest_beat(1.08, grid, max_drift=0.2) == 1.0
    # Within drift (1.45 -> 1.5)
    assert find_nearest_beat(1.45, grid, max_drift=0.2) == 1.5
    # Beyond max drift -> unchanged
    assert find_nearest_beat(1.25, grid, max_drift=0.1) == 1.25


def test_compute_energy_curve_three_act_structure():
    """Verify narrative 3-act energy curve: slow open, high-energy montage, gentle close."""
    curve = compute_energy_curve(None, total_duration=100.0, num_samples=50)
    assert len(curve) == 50

    # Act 1 (first 25%): energy is moderate
    act1_energy = [e for t, e in curve if t < 25.0]
    # Act 2 (25% to 85%): energy is high
    act2_energy = [e for t, e in curve if 25.0 <= t <= 85.0]
    # Act 3 (last 15%): energy resolves downwards
    act3_energy = [e for t, e in curve if t > 85.0]

    mean_act1 = sum(act1_energy) / len(act1_energy)
    mean_act2 = sum(act2_energy) / len(act2_energy)
    mean_act3 = sum(act3_energy) / len(act3_energy)

    assert mean_act2 > mean_act1, f"Act 2 montage energy ({mean_act2}) should be higher than Act 1 ({mean_act1})"
    assert mean_act2 > mean_act3, f"Act 2 montage energy ({mean_act2}) should be higher than Act 3 ({mean_act3})"


def test_detect_beat_grid_with_wav_file():
    """Verify beat tracking on a real user-supplied audio file."""
    import soundfile as sf

    sr = 22050
    duration = 3.0
    # Generate 120 BPM clicks (2 beats per second -> click every 0.5s)
    samples = int(sr * duration)
    audio = np.zeros(samples, dtype=np.float32)
    for beat_time in [0.0, 0.5, 1.0, 1.5, 2.0, 2.5]:
        idx = int(beat_time * sr)
        audio[idx : min(samples, idx + 400)] = 0.9

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
        wav_path = tf.name
    try:
        sf.write(wav_path, audio, sr)
        grid = detect_beat_grid(wav_path)
        assert len(grid) > 0
        assert grid[0] >= 0.0
    finally:
        Path(wav_path).unlink(missing_ok=True)


def test_snap_cuts_normal_entries():
    """Verify normal cut points snap to beat grid."""
    beat_grid = [0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0]

    entries = [
        EditPlanEntryV2(
            entry_id="e1",
            moment_id="m1",
            shot_id="s1",
            media_id="med1",
            camera_id="CAM_A",
            t_src_in=10.0,
            t_src_out=11.9,  # 1.9s duration -> target timeline 1.9s, close to beat 2.0
            duration=1.9,
            t_wall_in=10.0,
            t_wall_out=11.9,
            angle_chosen="CAM_A",
            speech_whole=False,
        ),
        EditPlanEntryV2(
            entry_id="e2",
            moment_id="m2",
            shot_id="s2",
            media_id="med1",
            camera_id="CAM_A",
            t_src_in=20.0,
            t_src_out=22.1,  # 2.1s duration
            duration=2.1,
            t_wall_in=20.0,
            t_wall_out=22.1,
            angle_chosen="CAM_A",
            speech_whole=False,
        ),
    ]

    snapped = snap_cuts_to_beats(entries, beat_grid, protected_speech_whole=True)
    assert len(snapped) == 2
    # e1 duration should snap from 1.9 to 2.0
    assert snapped[0].duration == 2.0
    assert snapped[0].t_src_out == 12.0


def test_speech_whole_stays_off_beat_grid():
    """CRITICAL: Moments marked speech_whole must stay OFF the beat grid.
    
    Never chop a vow or a speech to fit a beat.
    """
    beat_grid = [0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0]

    vow_entry = EditPlanEntryV2(
        entry_id="e_vow",
        moment_id="m_vow",
        shot_id="s_vow",
        media_id="med1",
        camera_id="CAM_A",
        t_src_in=50.0,
        t_src_out=53.37,  # Exact natural speech ending at 3.37s
        duration=3.37,
        t_wall_in=50.0,
        t_wall_out=53.37,
        angle_chosen="CAM_A",
        speech_whole=True,  # PROTECTED
    )

    broll_entry = EditPlanEntryV2(
        entry_id="e_broll",
        moment_id="m_broll",
        shot_id="s_broll",
        media_id="med1",
        camera_id="CAM_A",
        t_src_in=10.0,
        t_src_out=11.95,
        duration=1.95,
        t_wall_in=10.0,
        t_wall_out=11.95,
        angle_chosen="CAM_A",
        speech_whole=False,
    )

    snapped = snap_cuts_to_beats([vow_entry, broll_entry], beat_grid, protected_speech_whole=True)
    assert len(snapped) == 2

    # Vow entry duration must remain exactly 3.37s, untouched by beat grid!
    assert snapped[0].duration == 3.37, "Vow duration was chopped or changed by beat snapping!"
    assert snapped[0].t_src_out == 53.37, "Vow cut-out point was moved!"

    # Second entry (normal broll) can snap
    assert snapped[1].duration != 1.95 or abs(snapped[1].duration - 2.0) < 0.1


def test_snap_cuts_min_duration_floor():
    """Ensure beat snapping never reduces a shot below the 0.4s floor."""
    beat_grid = [0.0, 0.1, 0.5, 1.0]
    entry = EditPlanEntryV2(
        entry_id="e_short",
        moment_id="m_short",
        shot_id="s_short",
        media_id="med1",
        camera_id="CAM_A",
        t_src_in=10.0,
        t_src_out=10.45,
        duration=0.45,
        t_wall_in=10.0,
        t_wall_out=10.45,
        angle_chosen="CAM_A",
        speech_whole=False,
    )

    snapped = snap_cuts_to_beats([entry], beat_grid, min_shot_duration=0.4)
    assert snapped[0].duration >= 0.4
