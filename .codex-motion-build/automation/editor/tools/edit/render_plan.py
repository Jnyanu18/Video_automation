"""Layer 3: RenderPlan - Compilation of Canonical Timeline into Engine-Specific Instructions.

Completely shields the Creative and Canonical layers from:
- FFmpeg filtergraph syntax and command-line arguments
- HyperFrames HTML template variables and Chrome BeginFrame options
- Remotion composition IDs and React prop serializations
"""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from .canonical_plan import CanonicalEditPlan


class FFmpegClipInstruction(BaseModel):
    """Specific cutting and filter parameters for a single source clip."""
    source_path: str
    source_start: float
    source_end: float
    output_duration: float
    speed: float = 1.0
    crop_filter: Optional[str] = None
    zoom_filter: Optional[str] = None
    volume: float = 1.0


class FFmpegRenderSpec(BaseModel):
    """Low-level FFmpeg render instructions."""
    clips: List[FFmpegClipInstruction] = Field(default_factory=list)
    video_codec: str = "libx264"
    audio_codec: str = "aac"
    pixel_format: str = "yuv420p"
    target_resolution: str = "1080x1920"
    target_fps: float = 30.0
    loudness_norm: bool = True
    target_lufs: float = -14.0
    bgm_path: Optional[str] = None
    bgm_volume: float = 0.15
    sfx_files: List[Dict[str, Any]] = Field(default_factory=list)


class HyperFramesRenderSpec(BaseModel):
    """Instructions for headless Chrome GSAP rendering."""
    enabled: bool = True
    template_name: str = "reel_graphics"
    duration: float = 0.0
    variables: Dict[str, Any] = Field(default_factory=dict)
    overlays: List[Dict[str, Any]] = Field(default_factory=list)
    captions: List[Dict[str, Any]] = Field(default_factory=list)
    begin_frame_fast_path: bool = True


class RemotionRenderSpec(BaseModel):
    """Instructions for Remotion procedural rendering (e.g. 3D, carousels)."""
    enabled: bool = False
    composition_id: str = "Main"
    input_props: Dict[str, Any] = Field(default_factory=dict)
    output_format: Literal["mp4", "prores_alpha", "webm_alpha"] = "mp4"


class RenderPlan(BaseModel):
    """Complete, compiled multi-engine RenderPlan."""
    plan_id: str
    canonical_fingerprint: str
    primary_engine: Literal["ffmpeg_hyperframes", "remotion", "ffmpeg_only"] = "ffmpeg_hyperframes"
    ffmpeg: FFmpegRenderSpec = Field(default_factory=FFmpegRenderSpec)
    hyperframes: HyperFramesRenderSpec = Field(default_factory=HyperFramesRenderSpec)
    remotion: RemotionRenderSpec = Field(default_factory=RemotionRenderSpec)
    output_path: Optional[str] = None


def compile_render_plan(canonical: CanonicalEditPlan, output_path: Optional[str] = None) -> RenderPlan:
    """Pure deterministic compiler: CanonicalEditPlan -> RenderPlan.

    Does not execute rendering; translates canonical abstractions into
    exact instructions consumable by render engines.
    """
    source_map = {s.source_id: s for s in canonical.sources}

    # 1. Compile FFmpeg clip instructions
    ffmpeg_clips: List[FFmpegClipInstruction] = []
    for clip in canonical.sequence:
        src = source_map.get(clip.source_id)
        src_path = src.path if src else ""
        
        # Spatial reframe filter
        crop = None
        if clip.reframe == "center_crop":
            crop = f"crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale={canonical.timebase.width}:{canonical.timebase.height}"

        # Zoom filter
        zoom = None
        if clip.zoom_in and clip.zoom_in > 1.0:
            zoom = f"scale={clip.zoom_in}*iw:-1,crop=iw/{clip.zoom_in}:ih/{clip.zoom_in}"

        ffmpeg_clips.append(
            FFmpegClipInstruction(
                source_path=src_path,
                source_start=clip.source_start,
                source_end=clip.source_end,
                output_duration=round((clip.source_end - clip.source_start) / clip.speed, 4),
                speed=clip.speed,
                crop_filter=crop,
                zoom_filter=zoom,
                volume=clip.volume,
            )
        )

    # 2. Compile FFmpeg Audio & SFX
    sfx_list = [
        {"name": s.name, "at": s.timeline_at, "volume": s.volume}
        for s in canonical.audio.sfx_cues
    ]

    ffmpeg_spec = FFmpegRenderSpec(
        clips=ffmpeg_clips,
        target_resolution=f"{canonical.timebase.width}x{canonical.timebase.height}",
        target_fps=canonical.timebase.fps,
        loudness_norm=True,
        target_lufs=canonical.audio.target_lufs,
        bgm_path=canonical.audio.bgm_path,
        bgm_volume=canonical.audio.bgm_volume,
        sfx_files=sfx_list,
    )

    # 3. Compile HyperFrames graphics
    overlay_data = [o.model_dump() for o in canonical.overlays]
    caption_data = [c.model_dump() for c in canonical.captions]

    hf_spec = HyperFramesRenderSpec(
        enabled=bool(overlay_data or caption_data),
        duration=canonical.total_duration,
        overlays=overlay_data,
        captions=caption_data,
        begin_frame_fast_path=True,
    )

    return RenderPlan(
        plan_id=canonical.plan_id,
        canonical_fingerprint=canonical.fingerprint,
        primary_engine="ffmpeg_hyperframes" if hf_spec.enabled else "ffmpeg_only",
        ffmpeg=ffmpeg_spec,
        hyperframes=hf_spec,
        output_path=output_path,
    )
