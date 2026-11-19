"""Conversational storyboard editor with validated JSON patching and undo/redo history."""
from __future__ import annotations

import copy
import json
import logging
import os
from typing import List, Dict, Any, Tuple, Optional

from ..schemas.storyboard import StoryboardPlan, StoryboardScene, StoryboardPatch, ScenePatch

log = logging.getLogger("reelforge.storyboard.editor")

class StoryboardHistory:
    """Manages version stack with undo and redo for a storyboard."""

    def __init__(self, initial_plan: StoryboardPlan):
        self._history: List[StoryboardPlan] = [copy.deepcopy(initial_plan)]
        self._pointer: int = 0

    @property
    def current(self) -> StoryboardPlan:
        return self._history[self._pointer]

    def push(self, new_plan: StoryboardPlan) -> None:
        # Truncate forward history if we are in the middle of undo stack
        self._history = self._history[:self._pointer + 1]
        self._history.append(copy.deepcopy(new_plan))
        self._pointer += 1

    def undo(self) -> Optional[StoryboardPlan]:
        if self.can_undo:
            self._pointer -= 1
            return self.current
        return None

    def redo(self) -> Optional[StoryboardPlan]:
        if self.can_redo:
            self._pointer += 1
            return self.current
        return None

    @property
    def can_undo(self) -> bool:
        return self._pointer > 0

    @property
    def can_redo(self) -> bool:
        return self._pointer < len(self._history) - 1


def apply_patch(plan: StoryboardPlan, patch: StoryboardPatch) -> Tuple[StoryboardPlan, Dict[str, Any]]:
    """Apply a validated StoryboardPatch to a plan and return (updated_plan, diff)."""
    updated = copy.deepcopy(plan)
    diff: Dict[str, Any] = {"reason": patch.reason, "changes": []}

    if patch.title:
        diff["changes"].append(f"Title: '{plan.title}' -> '{patch.title}'")
        updated.title = patch.title

    if patch.target_duration:
        diff["changes"].append(f"Target duration: {plan.target_duration}s -> {patch.target_duration}s")
        updated.target_duration = patch.target_duration

    # Remove scenes
    if patch.removed_scene_numbers:
        updated.scenes = [s for s in updated.scenes if s.scene_number not in patch.removed_scene_numbers]
        diff["changes"].append(f"Removed scenes: {patch.removed_scene_numbers}")

    # Update scenes
    for u in patch.scene_updates:
        for s in updated.scenes:
            if s.scene_number == u.scene_number:
                if u.src_start is not None:
                    s.src_start = u.src_start
                if u.src_end is not None:
                    s.src_end = u.src_end
                    s.out_duration = round(s.src_end - s.src_start, 2)
                if u.caption_text is not None:
                    s.caption_text = u.caption_text
                if u.camera_motion is not None:
                    s.camera_motion = u.camera_motion
                if u.transition is not None:
                    s.transition = u.transition
                if u.visual_notes is not None:
                    s.visual_notes = u.visual_notes
                diff["changes"].append(f"Updated scene {s.scene_number}")

    # Add scenes
    if patch.added_scenes:
        for ns in patch.added_scenes:
            updated.scenes.append(ns)
            diff["changes"].append(f"Added scene {ns.scene_number}")

    # Re-index scene numbers consecutively
    updated.scenes.sort(key=lambda s: s.src_start)
    for i, s in enumerate(updated.scenes, 1):
        s.scene_number = i

    updated.target_duration = round(sum(s.out_duration for s in updated.scenes), 2)
    return updated, diff


def revise_storyboard(
    plan: StoryboardPlan,
    user_instruction: str,
    api_key: Optional[str] = None
) -> Tuple[StoryboardPlan, Dict[str, Any]]:
    """
    Takes plain English revision (e.g. "shorten intro", "make scene 1 zoom in")
    and returns (new_plan, diff_summary).
    """
    key = api_key or os.environ.get("ANTHROPIC_API_KEY")
    patch_dict: Dict[str, Any] = {}

    if key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=key)
            model = os.environ.get("REELFORGE_MODEL", "claude-3-7-sonnet-20250219")

            prompt = f"""You are ReelForge Storyboard Reviser.
Given this current storyboard:
{plan.model_dump_json(indent=2)}

The user requests this revision:
"{user_instruction}"

Return ONLY a valid JSON patch conforming to StoryboardPatch:
{{
  "title": null,
  "target_duration": null,
  "scene_updates": [
    {{
      "scene_number": 1,
      "src_start": null,
      "src_end": null,
      "caption_text": "Updated caption if requested",
      "camera_motion": "punch_zoom_1.15x",
      "transition": null,
      "visual_notes": null
    }}
  ],
  "added_scenes": [],
  "removed_scene_numbers": [],
  "reason": "Brief summary of applied revision"
}}
"""
            resp = client.messages.create(
                model=model,
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}]
            )
            text = resp.content[0].text.strip()
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            patch_dict = json.loads(text.strip())
        except Exception as e:
            log.warning("LLM storyboard revision failed: %s, falling back to heuristic parsing.", e)

    if not patch_dict:
        # Heuristic revision fallback for offline/test
        lower = user_instruction.lower()
        updates = []
        removals = []
        reason = f"Revision: {user_instruction}"

        if ("shorten" in lower or "cut" in lower) and ("intro" in lower or "first" in lower or "scene 1" in lower):
            if plan.scenes:
                s1 = plan.scenes[0]
                new_dur = max(0.8, s1.out_duration * 0.7)
                updates.append(ScenePatch(scene_number=1, src_end=round(s1.src_start + new_dur, 2)))
                reason = "Shortened scene 1 intro duration"
        elif "zoom" in lower:
            updates.append(ScenePatch(scene_number=1, camera_motion="punch_zoom_1.15x"))
            reason = "Applied punch zoom to scene 1"
        elif "remove scene" in lower:
            # extract scene number
            for num in [1, 2, 3, 4, 5, 6]:
                if f"scene {num}" in lower:
                    removals.append(num)
                    reason = f"Removed scene {num}"
                    break

        patch = StoryboardPatch(scene_updates=updates, removed_scene_numbers=removals, reason=reason)
    else:
        patch = StoryboardPatch(**patch_dict)

    return apply_patch(plan, patch)
