"""Integration module for Agentic Video Editor (AVE) into AILO Studio.

Bridges the multi-agent orchestration from `agentic-video-editor`:
- PySceneDetect + Faster-Whisper Footage Preprocessing
- Director -> Trim Refiner -> Editor -> Reviewer Pipeline Runner
- Gemini Multimodal Video Reviewer (5-dimension score + actionable feedback)
- Pipelines and Style templates
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

log = logging.getLogger("ave_integration")

def _get_ave_root() -> Path:
    candidates = [
        Path("J:/ai editor/agentic-video-editor"),
        Path(__file__).parent.parent.parent.parent / "agentic-video-editor",
        Path.cwd() / "agentic-video-editor",
    ]
    for c in candidates:
        if c.is_dir():
            return c
    return Path("J:/ai editor/agentic-video-editor")

AVE_ROOT = _get_ave_root()

def is_ave_available() -> bool:
    try:
        import src.models.schemas  # noqa: F401
        import src.pipeline.preprocess  # noqa: F401
        import src.pipeline.runner  # noqa: F401
        return True
    except ImportError:
        return False

def list_pipelines() -> List[Dict[str, Any]]:
    pipe_dir = AVE_ROOT / "pipelines"
    if not pipe_dir.is_dir():
        return []
    import yaml
    results = []
    for f in pipe_dir.glob("*.yaml"):
        try:
            data = yaml.safe_load(f.read_text(encoding="utf-8")) or {}
            results.append({
                "id": f.stem,
                "name": data.get("name", f.stem),
                "path": str(f),
                "steps_count": len(data.get("steps", [])),
                "raw": data,
            })
        except Exception as e:
            log.warning("Failed parsing pipeline %s: %s", f, e)
    return results

def list_styles() -> List[Dict[str, Any]]:
    style_dir = AVE_ROOT / "styles"
    if not style_dir.is_dir():
        return []
    import yaml
    results = []
    for f in style_dir.glob("*.yaml"):
        try:
            data = yaml.safe_load(f.read_text(encoding="utf-8")) or {}
            results.append({
                "id": f.stem,
                "name": data.get("name", f.stem),
                "path": str(f),
                "target_duration": data.get("target_duration_seconds", 30),
                "raw": data,
            })
        except Exception as e:
            log.warning("Failed parsing style %s: %s", f, e)
    return results

def preprocess_footage_dir(footage_dir: Path | str, output_path: Optional[Path | str] = None) -> Dict[str, Any]:
    """Run scene detection and whisper transcription using AVE preprocessor."""
    from src.pipeline.preprocess import preprocess_footage

    f_dir = Path(footage_dir).resolve()
    if not f_dir.is_dir():
        raise ValueError(f"Footage directory not found: {footage_dir}")

    out_p = Path(output_path).resolve() if output_path else f_dir / "footage_index.json"
    index = preprocess_footage(f_dir, out_p)
    return json.loads(index.model_dump_json())

def run_agentic_edit(
    footage_dir: Path | str,
    brief_data: Dict[str, Any],
    pipeline_name: str = "ugc-ad",
    style_name: Optional[str] = "dtc-testimonial",
    human_approval: bool = False,
    output_dir: Optional[Path | str] = None,
) -> Dict[str, Any]:
    """Execute the full agentic editing loop with retries and multimodal review."""
    from src.models.schemas import CreativeBrief
    from src.pipeline.runner import run_pipeline

    f_dir = Path(footage_dir).resolve()
    if not f_dir.is_dir():
        raise ValueError(f"Footage directory not found: {footage_dir}")

    idx_path = f_dir / "footage_index.json"
    if not idx_path.is_file():
        log.info("Preprocessing footage for AVE: %s", f_dir)
        preprocess_footage_dir(f_dir, idx_path)

    pipe_path = AVE_ROOT / "pipelines" / f"{pipeline_name}.yaml"
    if not pipe_path.is_file():
        # Fallback to direct path
        pipe_path = Path(pipeline_name)
    if not pipe_path.is_file():
        raise ValueError(f"Pipeline manifest not found: {pipeline_name}")

    style_ref = None
    if style_name:
        s_path = AVE_ROOT / "styles" / f"{style_name}.yaml"
        if s_path.is_file():
            style_ref = str(s_path)
        else:
            style_ref = style_name

    brief = CreativeBrief(
        product=brief_data.get("product", "AILO AI Video Editor"),
        audience=brief_data.get("audience", "Creators, founders and marketing teams"),
        tone=brief_data.get("tone", "authentic, high-energy, premium"),
        duration_seconds=int(brief_data.get("duration_seconds", 30)),
        style_ref=style_ref,
    )

    log.info("Starting AVE pipeline '%s' with brief: %s", pipe_path.name, brief.product)
    res = run_pipeline(str(pipe_path), brief, str(idx_path), human_approval=human_approval)

    review_dict = None
    if res.review:
        review_dict = {
            "adherence": res.review.adherence,
            "pacing": res.review.pacing,
            "visual_quality": res.review.visual_quality,
            "watchability": res.review.watchability,
            "overall": res.review.overall,
            "feedback": res.review.feedback,
        }

    return {
        "ok": True,
        "final_video_path": res.final_video_path,
        "review": review_dict,
        "retries_used": res.retries_used,
        "warnings": res.warnings,
        "feedback_history": res.feedback_history,
        "edit_plan": res.edit_plan.model_dump() if res.edit_plan else None,
    }

def review_video_with_gemini(video_path: Path | str, brief_data: Dict[str, Any]) -> Dict[str, Any]:
    """Score a rendered video using Gemini 3.1 Pro native video understanding."""
    from src.tools.analyze import review_output

    v_path = Path(video_path).resolve()
    if not v_path.is_file():
        raise ValueError(f"Video file not found: {video_path}")

    brief_str = json.dumps(brief_data, indent=2) if isinstance(brief_data, dict) else str(brief_data)
    score = review_output(str(v_path), brief_str)

    return {
        "ok": True,
        "video_path": str(v_path),
        "score": {
            "adherence": score.adherence,
            "pacing": score.pacing,
            "visual_quality": score.visual_quality,
            "watchability": score.watchability,
            "overall": score.overall,
            "feedback": score.feedback,
        },
    }
