"""Multi-Version Video Studio (Director 2.0 Layer C).
Generates distinct editorial variations from a single source video:
- Version A: Retention Cut (Fast pace, aggressive pause reduction, bold punch-ins)
- Version B: Educational Cut (Structured explanations, diagrams, clean typography)
- Version C: Cinematic Cut (Dramatic music pacing, high-contrast grading, SFX drops)
- Version D: Founder Cut (Authentic conversation, UI focus, minimal distractions)
Each version has an independent canonical EditPlan and render history.
"""
from __future__ import annotations

import copy
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from tools.edit.edit_plan import EditPlanManager
from .style_dna import get_style_dna, apply_style_dna_to_plan

@dataclass
class VideoVersion:
    version_id: str
    cut_type: str  # "retention", "educational", "cinematic", "founder"
    title: str
    description: str
    style_id: str
    target_duration: float
    plan: Dict[str, Any]
    render_artifact: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "version_id": self.version_id,
            "cut_type": self.cut_type,
            "title": self.title,
            "description": self.description,
            "style_id": self.style_id,
            "target_duration": self.target_duration,
            "plan_summary": {
                "keep_count": len(self.plan.get("keep", [])),
                "zooms_count": len(self.plan.get("zooms", [])),
                "sfx_count": len(self.plan.get("sfx", [])),
                "target_lufs": self.plan.get("audio", {}).get("target_lufs", -14.0),
            },
            "render_artifact": self.render_artifact,
        }

def generate_multi_versions(base_plan: Dict[str, Any], footage_index: Dict[str, Any]) -> List[VideoVersion]:
    """Produce 4 distinct editorial versions from source media."""
    src_dur = float(base_plan.get("source", {}).get("duration", 30.0))
    scenes = footage_index.get("scenes", [])
    versions: List[VideoVersion] = []

    # 1. Version A: Retention Cut
    plan_a = copy.deepcopy(base_plan)
    apply_style_dna_to_plan(plan_a, get_style_dna("viral_hook_fast_pace"))
    # Aggressive trimming
    plan_a["keep"] = [{"id": f"ka_{idx+1}", "start": s["start"], "end": s["start"] + min(2.2, s["end"] - s["start"])} for idx, s in enumerate(scenes[:4])]
    plan_a["zooms"] = [{"id": "za_1", "start": 0.0, "end": 2.5, "factor": 1.25}]
    plan_a["sfx"] = [{"id": "sfxa_1", "name": "whoosh_fast.wav", "at": 0.0}]
    versions.append(VideoVersion(
        version_id="ver_retention_a",
        cut_type="retention",
        title="Version A: 3-Second Viral Hook",
        description="High-velocity algorithmic retention cut with aggressive pause cuts and punch-in zooms.",
        style_id="viral_hook_fast_pace",
        target_duration=min(24.0, src_dur * 0.6),
        plan=plan_a,
    ))

    # 2. Version B: Educational Cut
    plan_b = copy.deepcopy(base_plan)
    apply_style_dna_to_plan(plan_b, get_style_dna("educational_masterclass"))
    # Keep full explanatory moments
    plan_b["keep"] = [{"id": f"kb_{idx+1}", "start": s["start"], "end": s["end"]} for idx, s in enumerate(scenes[:3])]
    plan_b["zooms"] = [{"id": "zb_1", "start": 4.0, "end": 8.0, "factor": 1.10}]
    versions.append(VideoVersion(
        version_id="ver_educational_b",
        cut_type="educational",
        title="Version B: Structured Masterclass",
        description="Conversational educational tempo with lower-third titles and balanced visual pacing.",
        style_id="educational_masterclass",
        target_duration=min(45.0, src_dur * 0.85),
        plan=plan_b,
    ))

    # 3. Version C: Cinematic Cut
    plan_c = copy.deepcopy(base_plan)
    apply_style_dna_to_plan(plan_c, get_style_dna("cinematic_event"))
    plan_c["keep"] = [{"id": f"kc_{idx+1}", "start": s["start"], "end": s["start"] + min(1.8, s["end"] - s["start"])} for idx, s in enumerate(scenes)]
    plan_c["zooms"] = [{"id": f"zc_{idx+1}", "start": idx * 3.0, "end": idx * 3.0 + 2.0, "factor": 1.20} for idx in range(3)]
    plan_c["sfx"] = [
        {"id": "sfxc_1", "name": "sub_drop.wav", "at": 0.0},
        {"id": "sfxc_2", "name": "impact_cinematic.wav", "at": 3.0},
    ]
    versions.append(VideoVersion(
        version_id="ver_cinematic_c",
        cut_type="cinematic",
        title="Version C: High-Energy Cinematic",
        description="Music-driven cut with frequent dynamic transitions, high contrast, and impact SFX.",
        style_id="cinematic_event",
        target_duration=min(20.0, src_dur * 0.5),
        plan=plan_c,
    ))

    # 4. Version D: Founder Cut
    plan_d = copy.deepcopy(base_plan)
    apply_style_dna_to_plan(plan_d, get_style_dna("yc_presentation"))
    plan_d["keep"] = [{"id": f"kd_{idx+1}", "start": s["start"], "end": s["end"]} for idx, s in enumerate(scenes[:2])]
    plan_d["zooms"] = []
    versions.append(VideoVersion(
        version_id="ver_founder_d",
        cut_type="founder",
        title="Version D: Authentic Founder Demo",
        description="Unfiltered founder pitch with product screen emphasis and zero flashy distractions.",
        style_id="yc_presentation",
        target_duration=min(35.0, src_dur * 0.75),
        plan=plan_d,
    ))

    return versions
