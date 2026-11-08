"""Unified per-reel analysis pipeline: cuts, palette, audio, Whisper, vision."""
from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Dict, Any, Optional

from ..schemas.analysis import ReelAnalysis, AudioMetrics, VisionStyleMetrics
from ..ingestion.frame_extractor import extract_frames
from .cuts import detect_cuts
from .palette import extract_palette
from .audio import probe_video, measure_loudness
from .transcribe import transcribe_audio
from .vision_eval import evaluate_vision

log = logging.getLogger("reelforge.analysis.pipeline")

def analyze_single_reel(video_path: Path | str, cache_dir: Optional[Path | str] = None, force_recompute: bool = False) -> ReelAnalysis:
    """Analyze a single reference reel deterministically and cache the result."""
    v = Path(video_path).resolve()
    reel_id = v.parent.name if v.parent.name != "Reference" else v.stem
    
    # Check cache
    cache_file = None
    if cache_dir:
        c_dir = Path(cache_dir)
        c_dir.mkdir(parents=True, exist_ok=True)
        cache_file = c_dir / f"{reel_id}.json"
        if cache_file.is_file() and not force_recompute:
            try:
                cached_data = json.loads(cache_file.read_text(encoding="utf-8"))
                return ReelAnalysis(**cached_data)
            except Exception as e:
                log.warning("Cache read failed for %s: %s", reel_id, e)

    log.info("Starting analysis for reel: %s", v.name)
    probe_info = probe_video(v)
    duration = probe_info.get("duration", 0.0)

    # 1. Frames extraction (0.5s interval)
    frames_dir = v.parent / "frames"
    frames = extract_frames(v, frames_dir, fps=2.0)

    # 2. Cuts
    cuts_data = detect_cuts(v, threshold=0.3)

    # 3. Palette
    palette = extract_palette(frames, k=5)

    # 4. Loudness & Audio
    audio_met = measure_loudness(v)

    # 5. Whisper Transcription
    words, text, wpm = transcribe_audio(v)
    audio_met.speech_wpm = wpm or 160.0

    # 6. Vision Evaluation
    vision_style = evaluate_vision(frames)

    analysis = ReelAnalysis(
        reel_id=reel_id,
        duration=duration,
        width=probe_info.get("width", 1080),
        height=probe_info.get("height", 1920),
        fps=probe_info.get("fps", 30.0),
        cuts=cuts_data["cuts"],
        avg_cut_interval=cuts_data["avg_cut_interval"],
        palette=palette,
        audio=audio_met,
        transcript=words,
        full_transcript_text=text,
        vision_style=vision_style,
        analyzed_at=time.time(),
    )

    if cache_file:
        try:
            cache_file.write_text(analysis.model_dump_json(indent=2), encoding="utf-8")
        except Exception as e:
            log.warning("Failed writing cache for %s: %s", reel_id, e)

    return analysis
