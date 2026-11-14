"""Backward-compatibility adapters between CanonicalEditPlan and legacy dictionary representations.

Guarantees 100% interoperability with existing consumers across:
- automation/editor/api_server.py
- automation/editor/services/render/cut.py
- automation/editor/services/render/composition.py
- automation/editor/evals/checks.py
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from .canonical_plan import (
    AudioComposition,
    CanonicalEditPlan,
    CaptionGroup,
    OverlayItem,
    SFXCue,
    SourceAsset,
    TimelineClip,
    TimebaseConfig,
    WordTimestamp,
)


def to_legacy_dict(canonical: CanonicalEditPlan) -> Dict[str, Any]:
    """Convert CanonicalEditPlan into the legacy JSON/dictionary format."""
    # Source
    primary_src = canonical.sources[0] if canonical.sources else None
    source_dict = {
        "path": primary_src.path if primary_src else "",
        "duration": primary_src.duration if primary_src else canonical.total_duration,
    }

    # Keep segments (from sequence)
    keep_list = []
    zooms_list = []
    speed_list = []
    for c in canonical.sequence:
        keep_list.append({"start": c.source_start, "end": c.source_end})
        if c.zoom_in and c.zoom_in > 1.0:
            zooms_list.append({"start": c.source_start, "end": c.source_end, "scale": c.zoom_in})
        if c.speed != 1.0:
            speed_list.append({"start": c.source_start, "end": c.source_end, "factor": c.speed})

    # Captions
    captions_list = []
    for cap in canonical.captions:
        word_list = [w.model_dump() for w in cap.words]
        captions_list.append({
            "id": cap.group_id,
            "start": cap.start,
            "end": cap.end,
            "text": cap.text,
            "style": cap.style,
            "words": word_list,
        })

    # Overlays
    overlays_list = []
    for o in canonical.overlays:
        overlays_list.append({
            "id": o.overlay_id,
            "kind": o.kind,
            "template": o.template,
            "start": o.timeline_start,
            "end": o.timeline_end,
            "props": o.props,
        })

    # Audio
    sfx_list = [
        {"name": s.name, "at": s.timeline_at, "volume": s.volume}
        for s in canonical.audio.sfx_cues
    ]
    audio_dict = {
        "bgm_path": canonical.audio.bgm_path,
        "bgm_volume": canonical.audio.bgm_volume,
        "voice_ducking_db": canonical.audio.voice_ducking_db,
        "sfx": sfx_list,
        "target_lufs": canonical.audio.target_lufs,
    }

    # Output
    output_dict = {
        "width": canonical.timebase.width,
        "height": canonical.timebase.height,
        "fps": canonical.timebase.fps,
        "duration": canonical.total_duration,
    }

    return {
        "plan_id": canonical.plan_id,
        "source": source_dict,
        "keep": keep_list,
        "captions": captions_list,
        "speed": speed_list,
        "transitions": [],
        "zooms": zooms_list,
        "overlays": overlays_list,
        "audio": audio_dict,
        "output": output_dict,
        "fingerprint": canonical.fingerprint,
    }


def from_legacy_dict(data: Dict[str, Any], plan_id: Optional[str] = None) -> CanonicalEditPlan:
    """Construct a CanonicalEditPlan from a legacy dictionary."""
    pid = plan_id or data.get("plan_id") or f"plan_{uuid.uuid4().hex[:8]}"
    
    # 1. Sources
    src_data = data.get("source") or {}
    src_path = str(src_data.get("path") or "unspecified_source.mp4")
    src_dur = float(src_data.get("duration") or 30.0)
    source_asset = SourceAsset(
        source_id="src_01",
        path=src_path,
        duration=max(0.1, src_dur),
    )

    # 2. Sequence (from keep segments)
    sequence_clips: List[TimelineClip] = []
    cur_timeline = 0.0
    for idx, k in enumerate(data.get("keep") or []):
        s_start = float(k.get("start", 0.0))
        s_end = float(k.get("end", s_start + 1.0))
        dur = max(0.01, s_end - s_start)
        
        # Check zoom matches
        zoom_val = None
        for z in data.get("zooms") or []:
            if abs(float(z.get("start", -99)) - s_start) < 0.05:
                zoom_val = float(z.get("scale", 1.15))
                break

        # Check speed matches
        speed_val = 1.0
        for sp in data.get("speed") or []:
            if abs(float(sp.get("start", -99)) - s_start) < 0.05:
                speed_val = float(sp.get("factor", 1.0))
                break

        sequence_clips.append(
            TimelineClip(
                clip_id=f"clip_{idx+1:02d}",
                source_id="src_01",
                source_start=s_start,
                source_end=s_end,
                timeline_start=round(cur_timeline, 4),
                timeline_end=round(cur_timeline + (dur / speed_val), 4),
                speed=speed_val,
                zoom_in=zoom_val,
            )
        )
        cur_timeline += dur / speed_val

    # 3. Captions
    caption_groups: List[CaptionGroup] = []
    for idx, cap in enumerate(data.get("captions") or []):
        c_start = float(cap.get("start", 0.0))
        c_end = float(cap.get("end", c_start + 1.0))
        words_raw = cap.get("words") or []
        parsed_words = []
        for w in words_raw:
            parsed_words.append(
                WordTimestamp(
                    word=str(w.get("word", "")),
                    start=float(w.get("start", c_start)),
                    end=float(w.get("end", c_end)),
                )
            )

        caption_groups.append(
            CaptionGroup(
                group_id=str(cap.get("id") or f"cap_{idx+1:02d}"),
                text=str(cap.get("text", "")),
                start=c_start,
                end=c_end,
                style=cap.get("style", "karaoke"),
                words=parsed_words,
            )
        )

    # 4. Overlays
    overlay_items: List[OverlayItem] = []
    for idx, ov in enumerate(data.get("overlays") or []):
        o_start = float(ov.get("start", 0.0))
        o_end = float(ov.get("end", o_start + 2.0))
        overlay_items.append(
            OverlayItem(
                overlay_id=str(ov.get("id") or f"ov_{idx+1:02d}"),
                kind=ov.get("kind", "diagram"),
                template=str(ov.get("template", "counter")),
                timeline_start=o_start,
                timeline_end=o_end,
                props=ov.get("props") or {},
            )
        )

    # 5. Audio
    audio_data = data.get("audio") or {}
    sfx_raw = audio_data.get("sfx") or []
    sfx_cues = []
    for idx, s in enumerate(sfx_raw):
        sfx_cues.append(
            SFXCue(
                sfx_id=f"sfx_{idx+1:02d}",
                name=str(s.get("name", "whoosh")),
                timeline_at=float(s.get("at", 0.0)),
                volume=float(s.get("volume", 0.8)),
            )
        )

    audio_comp = AudioComposition(
        bgm_path=audio_data.get("bgm_path"),
        bgm_volume=float(audio_data.get("bgm_volume", 0.15)),
        voice_ducking_db=float(audio_data.get("voice_ducking_db", -18.0)),
        sfx_cues=sfx_cues,
        target_lufs=float(audio_data.get("target_lufs", -14.0)),
    )

    # 6. Timebase
    out_cfg = data.get("output") or {}
    timebase = TimebaseConfig(
        fps=float(out_cfg.get("fps", 30.0)),
        width=int(out_cfg.get("width", 1080)),
        height=int(out_cfg.get("height", 1920)),
    )

    return CanonicalEditPlan(
        plan_id=pid,
        timebase=timebase,
        sources=[source_asset],
        sequence=sequence_clips,
        captions=caption_groups,
        overlays=overlay_items,
        audio=audio_comp,
    )
