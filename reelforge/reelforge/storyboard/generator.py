"""Storyboard generation engine from raw footage + approved StyleSheet."""
from __future__ import annotations

import json
import logging
import os
import subprocess
from pathlib import Path
from typing import Optional, List, Dict, Any

from ..schemas.storyboard import StoryboardPlan, StoryboardScene
from ..schemas.style import StyleSheet
from ..analysis.transcribe import transcribe_audio

log = logging.getLogger("reelforge.storyboard.generator")

def get_video_duration(video_path: str) -> float:
    """Use ffprobe to inspect video duration."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        video_path
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return float(res.stdout.strip())
    except Exception as e:
        log.warning("ffprobe failed to get duration: %s. Defaulting to 15.0s", e)
        return 15.0

def generate_storyboard(
    raw_video_path: str,
    style_sheet: StyleSheet,
    target_duration: Optional[float] = None,
    user_instruction: str = "",
    api_key: Optional[str] = None
) -> StoryboardPlan:
    """
    Generate a StoryboardPlan from raw footage and an approved StyleSheet.
    Transcribes audio for speech cues, then uses Anthropic LLM (or deterministic fallback)
    to plan engaging scenes (hook -> value -> CTA) respecting the style sheet pacing.
    """
    raw_path = Path(raw_video_path)
    if not raw_path.exists():
        raise FileNotFoundError(f"Raw footage not found: {raw_video_path}")

    orig_dur = get_video_duration(str(raw_path))

    # Transcribe speech
    log.info("Transcribing raw footage: %s", raw_path.name)
    try:
        words, transcript_text, _ = transcribe_audio(str(raw_path))
    except Exception as e:
        log.warning("Transcription failed or faster-whisper unavailable: %s", e)
        words = []
        transcript_text = "Raw footage clip"


    # Determine cut frequency from style sheet
    avg_cut = style_sheet.pacing.avg_cut_interval_seconds or 1.8
    if not target_duration or target_duration <= 0:
        # Default target duration: between 10s and 30s based on raw footage
        target_duration = min(max(orig_dur * 0.5, 10.0), 30.0)

    num_scenes = max(3, int(round(target_duration / avg_cut)))
    key = api_key or os.environ.get("ANTHROPIC_API_KEY")

    if key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=key)
            model = os.environ.get("REELFORGE_MODEL", "claude-3-7-sonnet-20250219")

            prompt = f"""You are ReelForge Storyboard Planner.
Generate a structured 9:16 vertical reel storyboard from this raw footage.

RAW FOOTAGE METRICS:
- Total original duration: {orig_dur:.1f}s
- Target reel duration: {target_duration:.1f}s
- Full transcript: "{transcript_text}"
- Word timings: {json.dumps(words[:50])}

APPROVED STYLE SHEET (v{style_sheet.version}):
- Target cut interval: {avg_cut}s
- Caption style: {style_sheet.captions.style} ({style_sheet.captions.words_per_chunk} words/chunk)
- Sound & SFX: {style_sheet.sound.sfx_intensity}

USER INSTRUCTION:
"{user_instruction if user_instruction else 'Create high-retention reel with strong hook and CTA'}"

RULES:
1. Return valid JSON only conforming to the StoryboardPlan schema.
2. Generate approximately {num_scenes} scenes (Scene 1 MUST be a viral hook, last scene MUST be CTA).
3. src_start and src_end MUST be strictly within 0.0 and {orig_dur:.2f}.
4. out_duration = src_end - src_start. Sum of out_duration should be close to {target_duration:.1f}s.
5. camera_motion options: "center", "punch_zoom_1.15x", "slow_push".
6. transition options: "hard_cut", "whip_pan", "flash".

JSON Format:
{{
  "title": "Generated Reel Storyboard",
  "raw_video_path": "{str(raw_path).replace(chr(92), '/')}",
  "style_sheet_version": {style_sheet.version},
  "original_duration": {orig_dur},
  "target_duration": {target_duration},
  "scenes": [
    {{
      "scene_number": 1,
      "src_start": 0.0,
      "src_end": 1.8,
      "out_duration": 1.8,
      "caption_text": "HOOK TEXT",
      "camera_motion": "punch_zoom_1.15x",
      "transition": "hard_cut",
      "visual_notes": "Punch in on speaker face",
      "rationale": "High energy hook"
    }}
  ]
}}
"""
            resp = client.messages.create(
                model=model,
                max_tokens=2500,
                messages=[{"role": "user", "content": prompt}]
            )
            raw_text = resp.content[0].text.strip()
            if "```" in raw_text:
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
            data = json.loads(raw_text.strip())
            data["raw_video_path"] = str(raw_path)
            return StoryboardPlan(**data)
        except Exception as e:
            log.warning("LLM storyboard generation failed (%s), using deterministic pacing fallback.", e)

    # Deterministic fallback: slice footage into balanced scenes matching avg_cut
    scenes: List[StoryboardScene] = []
    chunk_dur = target_duration / num_scenes
    src_step = min(orig_dur / num_scenes, chunk_dur)

    current_src = 0.0
    for idx in range(1, num_scenes + 1):
        s_end = min(current_src + chunk_dur, orig_dur)
        # Choose camera motion and transition from style
        motion = "punch_zoom_1.15x" if idx % 2 == 1 else "center"
        trans = "whip_pan" if idx == 1 else "hard_cut"

        # Caption text
        if idx == 1:
            caption = "Wait until you see this..."
            rationale = "Hook scene to capture immediate viewer attention."
        elif idx == num_scenes:
            caption = "Follow for more daily tips!"
            rationale = "High-conversion CTA scene."
        else:
            caption = f"Key point #{idx - 1} explained"
            rationale = f"Core content delivery scene {idx}."

        scenes.append(StoryboardScene(
            scene_number=idx,
            src_start=round(current_src, 2),
            src_end=round(s_end, 2),
            out_duration=round(s_end - current_src, 2),
            caption_text=caption,
            camera_motion=motion,
            transition=trans,
            visual_notes=f"Framing {motion} with {style_sheet.fonts.casing} subtitles",
            rationale=rationale
        ))
        current_src += src_step
        if current_src >= orig_dur:
            break

    return StoryboardPlan(
        title=f"Reel Storyboard - {raw_path.stem}",
        raw_video_path=str(raw_path),
        style_sheet_version=style_sheet.version,
        original_duration=round(orig_dur, 2),
        target_duration=round(sum(s.out_duration for s in scenes), 2),
        scenes=scenes,
        approved=False
    )
