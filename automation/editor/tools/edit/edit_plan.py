"""Canonical EditPlan schema, validation, versioning, diffing, and timeline operations.
Director 2.0 single-source-of-truth timeline model with frame-accurate integer math.
"""
from __future__ import annotations

import copy
import hashlib
import json
import math
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

# Timebase resolution: microsecond precision + frame indexing
TIME_EPSILON = 1e-4

class EditPlanError(ValueError):
    """Raised when an EditPlan violation or invalid operation occurs."""
    pass

def time_to_frame(seconds: float, fps: float) -> int:
    """Convert float seconds to integer frame index."""
    if fps <= 0:
        fps = 30.0
    return int(round(seconds * fps))

def frame_to_time(frame: int, fps: float) -> float:
    """Convert integer frame index to float seconds."""
    if fps <= 0:
        fps = 30.0
    return round(frame / fps, 4)

def compute_plan_fingerprint(plan: Dict[str, Any]) -> str:
    """Compute cryptographic hash of timeline operations (ignoring volatile metadata)."""
    core = {
        "source": plan.get("source", {}),
        "keep": plan.get("keep", []),
        "captions": plan.get("captions", []),
        "speed": plan.get("speed", []),
        "transitions": plan.get("transitions", []),
        "zooms": plan.get("zooms", []),
        "overlays": plan.get("overlays", []),
        "audio": plan.get("audio", {}),
        "output": plan.get("output", {}),
    }
    dumped = json.dumps(core, sort_keys=True, default=str)
    return hashlib.sha256(dumped.encode("utf-8")).hexdigest()[:16]

def validate_edit_plan(plan: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Strict validation of canonical EditPlan schema.
    Returns (is_valid, list_of_errors).
    """
    errors: List[str] = []
    if not isinstance(plan, dict):
        return False, ["EditPlan must be a JSON object"]

    # 1. Source check
    src = plan.get("source")
    if not src or not isinstance(src, dict):
        errors.append("EditPlan missing required 'source' specification")
    else:
        dur = src.get("duration")
        if dur is None or float(dur) <= 0:
            errors.append(f"Invalid source duration: {dur}")
        src_path = src.get("path")
        if not src_path:
            errors.append("Source must specify media 'path'")

    # 2. Keep segments check
    keep = plan.get("keep")
    if keep is None:
        errors.append("EditPlan missing required 'keep' segment list")
    elif not isinstance(keep, list) or len(keep) == 0:
        errors.append("EditPlan 'keep' must be a non-empty list of segments")
    else:
        src_dur = float(src.get("duration", 1e9)) if src else 1e9
        prev_end = -1.0
        for idx, seg in enumerate(keep):
            if not isinstance(seg, dict):
                errors.append(f"keep[{idx}] must be an object")
                continue
            try:
                s = float(seg["start"])
                e = float(seg["end"])
            except (KeyError, TypeError, ValueError):
                errors.append(f"keep[{idx}] missing valid start/end times")
                continue
            if s < -TIME_EPSILON:
                errors.append(f"keep[{idx}] start time {s} < 0")
            if e <= s + TIME_EPSILON:
                errors.append(f"keep[{idx}] duration is zero or negative ({s} -> {e})")
            if e > src_dur + 0.1:
                errors.append(f"keep[{idx}] end time {e} exceeds source duration {src_dur}")
            if s < prev_end - TIME_EPSILON:
                errors.append(f"keep[{idx}] overlaps with prior segment (start {s} < prior end {prev_end})")
            prev_end = e

    # 3. Output settings check
    outp = plan.get("output", {})
    if outp:
        w = outp.get("width")
        h = outp.get("height")
        fps = outp.get("fps")
        if w is not None and (int(w) <= 0 or int(w) % 2 != 0):
            errors.append(f"Output width {w} must be positive even integer")
        if h is not None and (int(h) <= 0 or int(h) % 2 != 0):
            errors.append(f"Output height {h} must be positive even integer")
        if fps is not None and float(fps) <= 0:
            errors.append(f"Output fps {fps} must be positive")

    # 4. Captions check
    captions = plan.get("captions", [])
    if isinstance(captions, list):
        for idx, c in enumerate(captions):
            if not isinstance(c, dict):
                errors.append(f"captions[{idx}] must be an object")
                continue
            if "start" not in c or "end" not in c or not c.get("text"):
                errors.append(f"captions[{idx}] missing start/end or text")
            elif float(c["end"]) <= float(c["start"]):
                errors.append(f"captions[{idx}] end <= start")

    # 5. Sound design & SFX checks
    sfx = plan.get("sfx", [])
    if isinstance(sfx, list):
        for idx, s in enumerate(sfx):
            if "at" not in s and "timeline_time" not in s:
                errors.append(f"sfx[{idx}] missing timeline position ('at')")

    return (len(errors) == 0, errors)

def plan_diff(v1: Dict[str, Any], v2: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate structured semantic diff between two EditPlans."""
    diff: Dict[str, Any] = {
        "keep_changed": v1.get("keep") != v2.get("keep"),
        "captions_changed": v1.get("captions") != v2.get("captions"),
        "style_changed": v1.get("style_ref") != v2.get("style_ref"),
        "audio_changed": (v1.get("audio") != v2.get("audio") or v1.get("sfx") != v2.get("sfx")),
        "zooms_changed": v1.get("zooms") != v2.get("zooms"),
        "details": [],
    }

    # Compare keep segment counts and output duration
    k1, k2 = v1.get("keep", []), v2.get("keep", [])
    dur1 = sum(max(0.0, float(x.get("end", 0)) - float(x.get("start", 0))) for x in k1)
    dur2 = sum(max(0.0, float(x.get("end", 0)) - float(x.get("start", 0))) for x in k2)
    if abs(dur1 - dur2) > 0.05:
        diff["details"].append(f"Duration changed from {dur1:.1f}s to {dur2:.1f}s ({dur2 - dur1:+.1f}s)")
    if len(k1) != len(k2):
        diff["details"].append(f"Cut segments changed from {len(k1)} to {len(k2)}")

    c1, c2 = len(v1.get("captions", [])), len(v2.get("captions", []))
    if c1 != c2:
        diff["details"].append(f"Captions count changed from {c1} to {c2}")

    return diff

class EditPlanManager:
    """Manages an active EditPlan with version history, undo/redo, validation,
    and automatic approval gate invalidation.
    """
    def __init__(self, initial_plan: Dict[str, Any]):
        ok, errs = validate_edit_plan(initial_plan)
        if not ok:
            raise EditPlanError(f"Initial EditPlan invalid: {errs}")
        self.history: List[Dict[str, Any]] = [copy.deepcopy(initial_plan)]
        self.cursor: int = 0
        self.explanations: List[Dict[str, Any]] = [{
            "operation": "initial_creation",
            "reason": "Initial project blueprint",
            "timestamp": time.time(),
        }]

    @property
    def current(self) -> Dict[str, Any]:
        return self.history[self.cursor]

    @property
    def version(self) -> int:
        return self.cursor + 1

    @property
    def is_approved(self) -> bool:
        return bool(self.current.get("approval", {}).get("approved", False))

    def approve(self, approver: str = "Director", notes: str = "") -> Dict[str, Any]:
        """Grant human director approval to the current plan."""
        plan = copy.deepcopy(self.current)
        plan["approval"] = {
            "approved": True,
            "approver": approver,
            "approved_at": time.time(),
            "fingerprint": compute_plan_fingerprint(plan),
            "notes": notes,
        }
        self.history[self.cursor] = plan
        return plan["approval"]

    def invalidate_approval(self, reason: str = "Timeline modified") -> None:
        """Invalidate approval when timeline edits occur."""
        plan = self.current
        if plan.get("approval", {}).get("approved"):
            plan["approval"] = {
                "approved": False,
                "invalidated_at": time.time(),
                "reason": reason,
            }

    def apply_operation(self, op_name: str, op_params: Dict[str, Any], reason: str, confidence: float = 0.95) -> Dict[str, Any]:
        """Apply a named editing operation, create a new version, and invalidate approval.
        Supported operations:
        - cut_silences: remove dead air spans
        - add_keep_span: add a source range
        - remove_span: cut out a source interval
        - set_captions: update caption tracks
        - add_zoom: add punch-in zoom
        - set_style: apply style profile
        - add_sfx: insert sound effect cue
        """
        new_plan = copy.deepcopy(self.current)
        src_dur = float(new_plan.get("source", {}).get("duration", 1e9))

        if op_name == "remove_span":
            start = float(op_params["start"])
            end = float(op_params["end"])
            new_keep = []
            for seg in new_plan.get("keep", []):
                s, e = float(seg["start"]), float(seg["end"])
                if e <= start or s >= end:
                    new_keep.append(seg)
                elif s < start and e > end:
                    # Split segment
                    new_keep.append({"id": f"{seg.get('id','k')}_a", "start": s, "end": start})
                    new_keep.append({"id": f"{seg.get('id','k')}_b", "start": end, "end": e})
                elif s < start <= e:
                    new_keep.append({"id": seg.get("id"), "start": s, "end": start})
                elif s <= end < e:
                    new_keep.append({"id": seg.get("id"), "start": end, "end": e})
            new_plan["keep"] = new_keep

        elif op_name == "add_zoom":
            zooms = new_plan.setdefault("zooms", [])
            zooms.append({
                "id": f"z_{len(zooms)+1}",
                "start": float(op_params["start"]),
                "end": float(op_params["end"]),
                "factor": float(op_params.get("factor", 1.15)),
                "mode": op_params.get("mode", "punch_in"),
            })

        elif op_name == "add_sfx":
            sfx = new_plan.setdefault("sfx", [])
            sfx.append({
                "id": f"sfx_{len(sfx)+1}",
                "name": op_params["name"],
                "at": float(op_params["at"]),
                "volume": float(op_params.get("volume", 0.8)),
            })

        elif op_name == "set_captions":
            new_plan["captions"] = op_params.get("captions", [])

        elif op_name == "set_style":
            new_plan["style_ref"] = op_params.get("style_name")
            if "edit_params" in op_params:
                new_plan.setdefault("edit_params", {}).update(op_params["edit_params"])

        else:
            raise EditPlanError(f"Unsupported operation '{op_name}'")

        # Validate resulting plan
        ok, errs = validate_edit_plan(new_plan)
        if not ok:
            raise EditPlanError(f"Operation resulted in invalid EditPlan: {errs}")

        # Invalidate approval state
        new_plan["approval"] = {"approved": False, "reason": f"Modified by {op_name}: {reason}"}
        new_plan["version"] = self.version + 1
        new_plan["updated_at"] = time.time()

        # Discard redo branch if cursor is behind
        self.history = self.history[:self.cursor + 1]
        self.history.append(new_plan)
        self.cursor += 1

        explanation = {
            "version": self.version,
            "operation": op_name,
            "params": op_params,
            "reason": reason,
            "confidence": confidence,
            "timestamp": time.time(),
        }
        self.explanations.append(explanation)
        return {"ok": True, "version": self.version, "plan": new_plan, "explanation": explanation}

    def undo(self) -> Optional[Dict[str, Any]]:
        if self.cursor > 0:
            self.cursor -= 1
            return self.current
        return None

    def redo(self) -> Optional[Dict[str, Any]]:
        if self.cursor < len(self.history) - 1:
            self.cursor += 1
            return self.current
        return None
