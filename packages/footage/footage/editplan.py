"""EditPlan v2 creation, timebase conversion, template loading, and mechanical review.

Agent B owns this file.
Timebases handled:
- t_wall: Synced wall-clock seconds across multi-camera groups.
- t_src: Original media file seconds used for conform renders.
- t_proxy: Proxy seconds (identical to t_src in duration/offset).
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import yaml

from footage.plan_schema import (
    ChapterMarker,
    DeliverableSpec,
    DeliverableType,
    EditPlanEntryV2,
    EditPlanV2,
    MissingBeatReport,
    MusicBed,
    ReviewScoreCard,
    RundownBeat,
    RundownTemplate,
)
from footage.schema import FootageIndex, MediaFile, Moment, Shot, SpeechSegment, SyncGroup

logger = logging.getLogger("footage.editplan")

DEFAULT_TEMPLATES_DIR = Path(__file__).parent / "templates"


# --------------------------------------------------------------------------- #
# Template loading
# --------------------------------------------------------------------------- #


def get_templates_dir(override: Optional[Path | str] = None) -> Path:
    """Return the active templates directory."""
    if override:
        return Path(override).resolve()
    return DEFAULT_TEMPLATES_DIR.resolve()


def list_templates(templates_dir: Optional[Path | str] = None) -> List[str]:
    """List available rundown template names."""
    tdir = get_templates_dir(templates_dir)
    if not tdir.is_dir():
        return []
    names = []
    for f in sorted(tdir.glob("*.yaml")) + sorted(tdir.glob("*.yml")):
        names.append(f.stem)
    return sorted(list(set(names)))


def load_template(
    name_or_path: str | Path,
    templates_dir: Optional[Path | str] = None,
) -> RundownTemplate:
    """Load a RundownTemplate by name or file path.
    
    A template is pure data. Loading new templates requires zero code changes.
    """
    path = Path(name_or_path)
    if not path.is_file():
        # Search in templates_dir
        tdir = get_templates_dir(templates_dir)
        yaml_path = tdir / f"{name_or_path}.yaml"
        yml_path = tdir / f"{name_or_path}.yml"
        if yaml_path.is_file():
            path = yaml_path
        elif yml_path.is_file():
            path = yml_path
        else:
            raise FileNotFoundError(
                f"Rundown template '{name_or_path}' not found in {tdir} or as file path."
            )

    raw_text = path.read_text(encoding="utf-8")
    data = yaml.safe_load(raw_text)
    if not isinstance(data, dict):
        raise ValueError(f"Template YAML at {path} must parse into a mapping.")

    # Validate beats
    raw_beats = data.get("beats", [])
    parsed_beats: List[RundownBeat] = []
    for rb in raw_beats:
        if isinstance(rb, dict):
            parsed_beats.append(RundownBeat(**rb))

    return RundownTemplate(
        name=data.get("name", path.stem),
        target_duration=float(data.get("target_duration", 180.0)),
        beats=parsed_beats,
        description=data.get("description"),
    )


# --------------------------------------------------------------------------- #
# Timebase conversion
# --------------------------------------------------------------------------- #


def build_offset_map(sync_groups: List[SyncGroup]) -> Dict[str, float]:
    """Map media_id -> offset in seconds relative to group origin (t_wall)."""
    offset_map: Dict[str, float] = {}
    for sg in sync_groups:
        for mid, off in sg.offsets.items():
            offset_map[mid] = float(off)
    return offset_map


def convert_wall_to_src(
    t_wall_in: float,
    t_wall_out: float,
    media_id: str,
    sync_groups: List[SyncGroup],
    media_map: Optional[Dict[str, MediaFile]] = None,
) -> Tuple[float, float]:
    """Convert synced wall-clock time (t_wall) to original file timebase (t_src).
    
    Relation:
        t_wall = t_src + offset  (from moments.py)
        t_src  = t_wall - offset
        
    Args:
        t_wall_in: Wall-clock in-point in seconds.
        t_wall_out: Wall-clock out-point in seconds.
        media_id: Target camera/file media identifier.
        sync_groups: Multi-camera synchronization groups.
        media_map: Optional map of media_id -> MediaFile for duration bounds clamping.
        
    Returns:
        (t_src_in, t_src_out) in source media seconds.
        
    Raises:
        ValueError: If t_wall_out <= t_wall_in or conversion yields invalid bounds.
    """
    if t_wall_out <= t_wall_in:
        raise ValueError(f"Invalid duration: t_wall_out ({t_wall_out}) <= t_wall_in ({t_wall_in})")

    offset_map = build_offset_map(sync_groups)
    off = offset_map.get(media_id, 0.0)

    t_src_in = round(t_wall_in - off, 3)
    t_src_out = round(t_wall_out - off, 3)

    if media_map and media_id in media_map:
        media_file = media_map[media_id]
        # Clamp to media boundaries
        t_src_in = max(0.0, min(t_src_in, media_file.duration))
        t_src_out = max(t_src_in, min(t_src_out, media_file.duration))

    return (t_src_in, t_src_out)


def convert_src_to_wall(
    t_src_in: float,
    t_src_out: float,
    media_id: str,
    sync_groups: List[SyncGroup],
) -> Tuple[float, float]:
    """Convert original file timebase (t_src) to synced wall-clock time (t_wall)."""
    offset_map = build_offset_map(sync_groups)
    off = offset_map.get(media_id, 0.0)
    t_wall_in = round(t_src_in + off, 3)
    t_wall_out = round(t_src_out + off, 3)
    return (t_wall_in, t_wall_out)


# --------------------------------------------------------------------------- #
# Mechanical Reviewer Gate
# --------------------------------------------------------------------------- #


def review_plan_mechanics(
    plan: EditPlanV2,
    template: Optional[RundownTemplate] = None,
    index: Optional[FootageIndex] = None,
) -> ReviewScoreCard:
    """Perform hard mechanical review checks that require zero model calls.
    
    Checks enforced:
    1. No shot under 0.4s (sub-0.4s flash rejection).
    2. No two adjacent shots from the same angle of the same moment.
    3. No repeated moment in the edit plan.
    4. Speech whole protection: never cut mid-word or mid-utterance when speech_whole=True.
    5. Total duration inside the template target budget (within ±5%).
    
    Returns:
        ReviewScoreCard with pass/fail status and detailed diagnostics.
    """
    issues: List[str] = []
    sub_04_flashes: List[str] = []
    consecutive_same_angles: List[str] = []
    repeated_moments: List[str] = []
    speech_violations: List[str] = []

    seen_moments: Dict[str, int] = {}
    total_dur = 0.0
    min_shot_duration = float("inf") if plan.entries else 0.0

    target_dur = plan.target_duration
    if template:
        target_dur = template.target_duration

    # Map speech words if index is available
    speech_segments = index.speech if index else []

    for i, entry in enumerate(plan.entries):
        shot_dur = round(entry.t_src_out - entry.t_src_in, 3)
        total_dur += shot_dur
        min_shot_duration = min(min_shot_duration, shot_dur)

        # 1. No shot under 0.4s
        if shot_dur < 0.4:
            sub_04_flashes.append(
                f"Entry #{i+1} ({entry.entry_id}, moment {entry.moment_id}) duration {shot_dur:.2f}s < 0.4s"
            )

        # 2. No repeated moment
        if entry.moment_id in seen_moments:
            repeated_moments.append(
                f"Moment {entry.moment_id} repeated in entry #{i+1} (first seen entry #{seen_moments[entry.moment_id]+1})"
            )
        seen_moments[entry.moment_id] = i

        # 3. No two adjacent shots from same angle of same moment
        if i > 0:
            prev = plan.entries[i - 1]
            if prev.moment_id == entry.moment_id and prev.camera_id == entry.camera_id:
                consecutive_same_angles.append(
                    f"Adjacent entries #{i} and #{i+1} both use camera {entry.camera_id} for moment {entry.moment_id}"
                )

        # 4. Speech whole protection
        if entry.speech_whole and speech_segments:
            # Check if t_src_in or t_src_out cuts inside a word
            for sp in speech_segments:
                if sp.media_id == entry.media_id:
                    for w in sp.words:
                        if w.start < entry.t_src_in < w.end:
                            speech_violations.append(
                                f"Entry #{i+1} in-point ({entry.t_src_in:.2f}s) cuts mid-word '{w.word}' ({w.start:.2f}-{w.end:.2f}s)"
                            )
                        if w.start < entry.t_src_out < w.end:
                            speech_violations.append(
                                f"Entry #{i+1} out-point ({entry.t_src_out:.2f}s) cuts mid-word '{w.word}' ({w.start:.2f}-{w.end:.2f}s)"
                            )

    total_dur = round(total_dur, 2)

    # 5. Total duration within template target budget (within ±5% or acceptable tolerance)
    if target_dur > 0:
        tolerance = 0.05 * target_dur
        min_acceptable = target_dur - tolerance
        max_acceptable = target_dur + tolerance
        # Allow missing beats to naturally reduce duration, but flag if overshoot
        if total_dur > max_acceptable:
            issues.append(
                f"Total duration ({total_dur:.1f}s) exceeds target budget ({target_dur:.1f}s ±5%: {min_acceptable:.1f}-{max_acceptable:.1f}s)"
            )
        elif not plan.missing_beats and total_dur < min_acceptable:
            issues.append(
                f"Total duration ({total_dur:.1f}s) below target budget ({target_dur:.1f}s ±5%: {min_acceptable:.1f}-{max_acceptable:.1f}s) with no missing beats"
            )

    issues.extend(sub_04_flashes)
    issues.extend(consecutive_same_angles)
    issues.extend(repeated_moments)
    issues.extend(speech_violations)

    passed = len(issues) == 0
    feedback = "All mechanical checks passed." if passed else "; ".join(issues)

    return ReviewScoreCard(
        passed=passed,
        total_duration=total_dur,
        target_duration=target_dur,
        min_shot_duration=0.0 if min_shot_duration == float("inf") else min_shot_duration,
        repeated_moments=repeated_moments,
        sub_04_flashes=sub_04_flashes,
        consecutive_same_angles=consecutive_same_angles,
        speech_cut_violations=speech_violations,
        issues=issues,
        overall_score=1.0 if passed else max(0.0, round(1.0 - 0.2 * len(issues), 2)),
        feedback=feedback,
    )


# --------------------------------------------------------------------------- #
# Plan file I/O & lifecycle
# --------------------------------------------------------------------------- #


def write_edit_plan(plan: EditPlanV2, out_path: Path | str) -> Path:
    """Atomically write EditPlanV2 to disk."""
    dest = Path(out_path).resolve()
    dest.parent.mkdir(parents=True, exist_ok=True)

    tmp = dest.with_name(f"{dest.name}.tmp.{uuid.uuid4().hex[:8]}")
    payload = plan.model_dump_json(indent=2)

    with open(tmp, "w", encoding="utf-8") as f:
        f.write(payload)
        f.flush()
        os.fsync(f.fileno())

    os.replace(tmp, dest)
    return dest


def read_edit_plan(path: Path | str) -> EditPlanV2:
    """Read and validate an EditPlanV2 JSON file."""
    p = Path(path).resolve()
    if not p.is_file():
        raise FileNotFoundError(f"Edit plan file not found: {p}")
    raw = p.read_text(encoding="utf-8")
    return EditPlanV2.model_validate_json(raw)


def approve_plan(plan: EditPlanV2) -> EditPlanV2:
    """Mark an edit plan as human-approved."""
    from datetime import datetime, timezone
    plan.approved = True
    plan.approved_at = datetime.now(timezone.utc).isoformat()
    return plan


def revoke_approval(plan: EditPlanV2) -> EditPlanV2:
    """Revoke human approval for an edit plan (e.g. after a revision)."""
    plan.approved = False
    plan.approved_at = None
    return plan
