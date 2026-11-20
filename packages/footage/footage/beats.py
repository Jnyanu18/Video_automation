"""Music beat detection, rhythmic cut snapping, and energy-aware pacing.

Agent B owns this file.
"""

from __future__ import annotations

import logging
import math
from pathlib import Path
from typing import List, Optional, Sequence, Set, Tuple
import numpy as np

from footage.plan_schema import EditPlanEntryV2

logger = logging.getLogger("footage.beats")


def detect_beat_grid(
    music_path: Path | str,
    default_bpm: float = 120.0,
    max_duration: Optional[float] = None,
) -> List[float]:
    """Detect musical beat timestamps (in seconds) from a user-supplied audio track.
    
    Accepts ONLY a user-supplied music track (never generates or fetches music).
    Uses librosa beat tracking when available, with a deterministic fallback.
    
    Returns:
        Sorted list of beat timestamps in seconds [t_0, t_1, t_2, ...].
    """
    path = Path(music_path).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"User music track does not exist: {path}")

    try:
        import librosa  # type: ignore

        # Load audio (mono, 22050 Hz)
        y, sr = librosa.load(str(path), sr=22050, mono=True, duration=max_duration)
        if len(y) == 0:
            raise ValueError("Audio track is empty.")

        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        if len(beat_times) > 0:
            return [round(float(t), 3) for t in beat_times]

    except Exception as e:
        logger.warning("Librosa beat detection failed or yielded empty beats (%s). Using fallback grid.", e)

    # Deterministic fallback grid
    # Default 120 BPM -> interval = 60.0 / 120 = 0.5s
    interval = 60.0 / max(30.0, min(240.0, default_bpm))
    total_sec = max_duration or 300.0
    beats = [round(i * interval, 3) for i in range(int(total_sec / interval) + 1)]
    return beats


def compute_energy_curve(
    music_path: Optional[Path | str] = None,
    total_duration: float = 180.0,
    num_samples: int = 100,
) -> List[Tuple[float, float]]:
    """Compute normalized energy curve [0.0, 1.0] across the target duration.
    
    If music audio is provided, calculates RMS envelope energy.
    Otherwise, models a standard narrative 3-act energy arc:
    - Act 1 (0.0 - 0.25): Warm, slower open (energy ~0.3 - 0.5)
    - Act 2 (0.25 - 0.85): High energy rhythmic montage (energy ~0.7 - 1.0)
    - Act 3 (0.85 - 1.0): Gentle, reflective resolution (energy ~0.4 - 0.2)
    """
    if music_path and Path(music_path).is_file():
        try:
            import librosa
            y, sr = librosa.load(str(music_path), sr=11025, mono=True, duration=total_duration)
            if len(y) > 0:
                frame_length = int(sr * 0.5)
                hop_length = int(sr * 0.25)
                rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
                times = librosa.times_like(rms, sr=sr, hop_length=hop_length)
                max_val = float(np.max(rms)) if len(rms) > 0 and np.max(rms) > 0 else 1.0
                norm_rms = [float(v) / max_val for v in rms]
                return [(round(float(t), 2), round(v, 3)) for t, v in zip(times, norm_rms)]
        except Exception as e:
            logger.debug("RMS extraction on music failed: %s", e)

    # Parametric 3-act curve
    result = []
    times = np.linspace(0.0, total_duration, num_samples)
    for t in times:
        frac = t / max(1.0, total_duration)
        if frac < 0.25:
            # Slow ramp from 0.35 to 0.6
            val = 0.35 + 0.25 * (frac / 0.25)
        elif frac < 0.85:
            # High energy plateau with peaks
            sub_frac = (frac - 0.25) / 0.60
            val = 0.70 + 0.25 * math.sin(sub_frac * math.pi)
        else:
            # Slow close down to 0.3
            sub_frac = (frac - 0.85) / 0.15
            val = 0.70 - 0.40 * sub_frac
        result.append((round(float(t), 2), round(float(val), 3)))
    return result


def find_nearest_beat(
    time_sec: float,
    beat_grid: Sequence[float],
    max_drift: float = 0.6,
) -> float:
    """Find the closest beat in beat_grid within max_drift tolerance.
    
    Returns original time_sec if no beat is within max_drift.
    """
    if not beat_grid:
        return time_sec

    # Binary search or closest
    idx = int(np.searchsorted(beat_grid, time_sec))
    candidates = []
    if idx < len(beat_grid):
        candidates.append(beat_grid[idx])
    if idx > 0:
        candidates.append(beat_grid[idx - 1])

    best_beat = min(candidates, key=lambda b: abs(b - time_sec))
    if abs(best_beat - time_sec) <= max_drift:
        return best_beat
    return time_sec


def snap_cuts_to_beats(
    entries: List[EditPlanEntryV2],
    beat_grid: List[float],
    protected_speech_whole: bool = True,
    min_shot_duration: float = 0.4,
) -> List[EditPlanEntryV2]:
    """Snap cut transition points between shots to musical beats.
    
    CRITICAL RULE:
    Moments marked speech_whole stay OFF the beat grid — never chop
    a vow or a speech to fit a beat.
    
    Args:
        entries: Ordered list of cut entries in the plan.
        beat_grid: Detected beat timestamps in timeline seconds.
        protected_speech_whole: If True, entries with speech_whole=True are never snapped.
        min_shot_duration: Hard lower bound preventing sub-0.4s flash cuts.
        
    Returns:
        New list of EditPlanEntryV2 with beat-aligned timing where allowed.
    """
    if not entries or not beat_grid:
        return entries

    result: List[EditPlanEntryV2] = []
    current_timeline_time = 0.0

    for i, entry in enumerate(entries):
        orig_dur = entry.t_src_out - entry.t_src_in

        # If speech_whole is enabled for this entry, keep it OFF the beat grid
        if protected_speech_whole and entry.speech_whole:
            new_dur = max(min_shot_duration, orig_dur)
            new_entry = entry.model_copy(update={
                "t_src_out": round(entry.t_src_in + new_dur, 3),
                "duration": round(new_dur, 3),
                "t_wall_out": round(entry.t_wall_in + new_dur, 3),
            })
            result.append(new_entry)
            current_timeline_time += new_dur
            continue

        # For normal moments, snap the cut-out point to a nearby beat on timeline
        target_timeline_out = current_timeline_time + orig_dur
        snapped_timeline_out = find_nearest_beat(
            target_timeline_out,
            beat_grid,
            max_drift=min(0.5, orig_dur * 0.25),
        )

        new_dur = snapped_timeline_out - current_timeline_time
        if new_dur < min_shot_duration:
            new_dur = min_shot_duration

        new_entry = entry.model_copy(update={
            "t_src_out": round(entry.t_src_in + new_dur, 3),
            "duration": round(new_dur, 3),
            "t_wall_out": round(entry.t_wall_in + new_dur, 3),
        })
        result.append(new_entry)
        current_timeline_time += new_dur

    return result
