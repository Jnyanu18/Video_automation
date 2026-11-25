"""Tests for multi-camera audio sync and synthetic offset recovery."""

import numpy as np
from footage.schema import MediaFile
from footage.sync import (
    build_sync_groups,
    compute_rms_envelope,
    cross_correlate_envelopes,
    estimate_mtime_offset,
)


def test_synthetic_offset_recovery():
    """Verify exact offset recovery on a synthetic audio envelope pair with a known shift."""
    hop_sec = 0.025  # 40 frames per second
    duration_sec = 60.0
    num_frames = int(duration_sec / hop_sec)

    # Generate distinct bursty pattern (simulating speech / event audio)
    rng = np.random.default_rng(42)
    env_ref = np.zeros(num_frames, dtype=np.float32)
    # Add bursts
    for burst_t in [5.0, 12.0, 22.0, 35.0, 48.0]:
        idx = int(burst_t / hop_sec)
        env_ref[idx:idx + 20] += rng.uniform(2.0, 5.0, size=min(20, num_frames - idx))
    env_ref += rng.normal(0.0, 0.2, size=num_frames).astype(np.float32)

    # Known offset: target is delayed by 3.50 seconds relative to ref
    known_offset_sec = 3.50
    shift_frames = int(known_offset_sec / hop_sec)

    env_target = np.zeros(num_frames, dtype=np.float32)
    env_target[shift_frames:] = env_ref[:num_frames - shift_frames]
    # Add independent background noise to target
    env_target += rng.normal(0.0, 0.3, size=num_frames).astype(np.float32)

    recovered_offset, confidence = cross_correlate_envelopes(
        env_ref, env_target, hop_sec=hop_sec
    )

    # Offset definition: offset = t_ref - t_target = -known_offset_sec or +known_offset_sec
    # Since target is delayed, ref occurs earlier: lag is +shift_frames
    assert abs(recovered_offset - known_offset_sec) <= (hop_sec * 2)
    assert confidence > 0.70


def test_uncorrelated_noise_low_confidence():
    """Uncorrelated signals yield low confidence."""
    hop_sec = 0.025
    rng = np.random.default_rng(123)
    env1 = rng.normal(0.0, 1.0, 1000).astype(np.float32)
    env2 = rng.normal(0.0, 1.0, 1000).astype(np.float32)

    _offset, conf = cross_correlate_envelopes(env1, env2, hop_sec=hop_sec)
    assert conf < 0.40


def test_empty_audio_envelope():
    """Empty signals return zero offset and zero confidence."""
    empty = np.array([], dtype=np.float32)
    env, _ = compute_rms_envelope(empty)
    assert len(env) == 0

    off, conf = cross_correlate_envelopes(empty, empty, hop_sec=0.025)
    assert off == 0.0
    assert conf == 0.0


def test_mtime_offset_calculation():
    """Start wallclock parsing calculates correct relative offset."""
    m1 = MediaFile(
        media_id="m1",
        path="/clip1.mp4",
        camera_id="CAM_A",
        duration=60.0,
        fps=25.0,
        width=1920,
        height=1080,
        codec="h264",
        has_audio=False,
        start_wallclock="2026-11-20T10:00:00+00:00",
    )
    m2 = MediaFile(
        media_id="m2",
        path="/clip2.mp4",
        camera_id="CAM_B",
        duration=60.0,
        fps=25.0,
        width=1920,
        height=1080,
        codec="h264",
        has_audio=False,
        start_wallclock="2026-11-20T10:00:15.500+00:00",
    )
    diff = estimate_mtime_offset(m1, m2)
    assert abs(diff - 15.5) < 0.01


def test_build_sync_groups_single_file():
    """Single media file creates standard SyncGroup."""
    m = MediaFile(
        media_id="m1",
        path="/clip1.mp4",
        camera_id="CAM_A",
        duration=10.0,
        fps=25.0,
        width=1920,
        height=1080,
        codec="h264",
        has_audio=False,
    )
    groups = build_sync_groups([m])
    assert len(groups) == 1
    assert groups[0].media_ids == ["m1"]
    assert groups[0].offsets["m1"] == 0.0
