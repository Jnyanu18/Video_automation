"""Comprehensive test suite for GrowthOS Phase P0:
- Layer 1 CreativePlan, Layer 2 CanonicalEditPlan, Layer 3 RenderPlan
- Backward compatibility adapters & serialization roundtrips
- Deterministic cryptographic fingerprinting
- Transactional EditorialPatch application & rollback
- Timebase frame-accuracy & timestamp bounds
- CapabilityAIRouter routing & resilience
"""
import pytest
from pathlib import Path

from tools.edit.creative_plan import CreativeBrief, CreativeBeat, CreativePlan, StyleGuide
from tools.edit.canonical_plan import (
    CanonicalEditPlan,
    TimebaseConfig,
    SourceAsset,
    TimelineClip,
    CaptionGroup,
    OverlayItem,
    SFXCue,
    AudioComposition,
    EditorialPatch,
    PatchOperation,
)
from tools.edit.render_plan import compile_render_plan, RenderPlan
from tools.edit.adapters import to_legacy_dict, from_legacy_dict
from tools.edit.edit_plan import EditPlanManager
from agent.ai_router import CapabilityAIRouter, ModelCapability, Provider, CAPABILITY_MATRIX


# --------------------------------------------------------------------------- #
# 1. Layer 1: CreativePlan Tests
# --------------------------------------------------------------------------- #
def test_creative_plan_creation():
    brief = CreativeBrief(
        product="AILO Video Engine",
        audience="Growth Marketers",
        tone="sleek",
        target_duration=30.0,
        platform="instagram_reels",
        core_hook="Most editors die on manual timelines.",
    )
    beats = [
        CreativeBeat(
            beat_id="beat_01_hook",
            intention="hook",
            target_start=0.0,
            target_duration=2.5,
            visual_type="talking_head",
            spoken_intent="Hook audience on timeline drag",
            motion_cue="stamp",
        ),
        CreativeBeat(
            beat_id="beat_02_problem",
            intention="problem",
            target_start=2.5,
            target_duration=4.5,
            visual_type="diagram",
            spoken_intent="Show manual cut vs AI",
            motion_cue="counter",
        ),
    ]
    plan = CreativePlan(
        plan_id="cp_test_01",
        brief=brief,
        narrative_arc=beats,
    )
    assert plan.plan_id == "cp_test_01"
    assert plan.brief.product == "AILO Video Engine"
    assert len(plan.narrative_arc) == 2
    assert plan.total_target_duration == 7.0


# --------------------------------------------------------------------------- #
# 2. Layer 2: CanonicalEditPlan & Fingerprint Tests
# --------------------------------------------------------------------------- #
def test_canonical_edit_plan_validation():
    timebase = TimebaseConfig(fps=30.0, width=1080, height=1920)
    source = SourceAsset(source_id="src_01", path="raw/test.mp4", duration=60.0)
    clip1 = TimelineClip(
        clip_id="c_01",
        source_id="src_01",
        source_start=0.0,
        source_end=3.0,
        timeline_start=0.0,
        timeline_end=3.0,
    )
    clip2 = TimelineClip(
        clip_id="c_02",
        source_id="src_01",
        source_start=10.0,
        source_end=15.0,
        timeline_start=3.0,
        timeline_end=8.0,
    )
    plan = CanonicalEditPlan(
        plan_id="cep_01",
        timebase=timebase,
        sources=[source],
        sequence=[clip1, clip2],
    )
    assert plan.total_duration == 8.0
    assert len(plan.fingerprint) == 16
    
    # Deterministic fingerprint: same inputs must produce exact same fingerprint
    plan_dup = CanonicalEditPlan(
        plan_id="cep_02",
        timebase=timebase,
        sources=[source],
        sequence=[clip1, clip2],
    )
    assert plan.fingerprint == plan_dup.fingerprint


def test_timeline_consistency_violation():
    timebase = TimebaseConfig(fps=30.0)
    source = SourceAsset(source_id="src_01", path="raw/test.mp4", duration=10.0)
    # Clip ends beyond source duration
    with pytest.raises(Exception):
        TimelineClip(
            clip_id="bad_clip",
            source_id="src_01",
            source_start=5.0,
            source_end=2.0,  # end < start
        )


# --------------------------------------------------------------------------- #
# 3. Transactional EditorialPatch & Rollback Tests
# --------------------------------------------------------------------------- #
def test_transactional_editorial_patch_apply_and_rollback():
    timebase = TimebaseConfig(fps=30.0)
    source = SourceAsset(source_id="src_01", path="raw/test.mp4", duration=60.0)
    clip = TimelineClip(
        clip_id="c_01",
        source_id="src_01",
        source_start=0.0,
        source_end=5.0,
        timeline_start=0.0,
        timeline_end=5.0,
    )
    plan = CanonicalEditPlan(
        plan_id="cep_patch_test",
        timebase=timebase,
        sources=[source],
        sequence=[clip],
    )
    initial_fp = plan.fingerprint

    # Apply valid patch: add an overlay
    patch = EditorialPatch(
        patch_id="patch_01",
        summary="Add counter diagram overlay",
        reason="Emphasize numerical stat",
        operations=[
            PatchOperation(
                op="add_overlay",
                params={
                    "overlay_id": "ov_01",
                    "kind": "diagram",
                    "template": "counter",
                    "timeline_start": 1.0,
                    "timeline_end": 4.0,
                    "props": {"value": 100},
                },
            )
        ],
    )
    success = plan.apply_patch(patch)
    assert success is True
    assert len(plan.overlays) == 1
    assert plan.fingerprint != initial_fp
    assert len(plan.revision_history) == 1

    # Test rollback
    rolled_back = plan.rollback_patch("patch_01")
    assert rolled_back is True
    assert len(plan.overlays) == 0
    assert plan.fingerprint == initial_fp
    assert len(plan.revision_history) == 0


def test_patch_atomic_failure_reverts_state():
    timebase = TimebaseConfig(fps=30.0)
    source = SourceAsset(source_id="src_01", path="raw/test.mp4", duration=20.0)
    clip = TimelineClip(
        clip_id="c_01",
        source_id="src_01",
        source_start=0.0,
        source_end=5.0,
        timeline_start=0.0,
        timeline_end=5.0,
    )
    plan = CanonicalEditPlan(
        plan_id="cep_atomic_test",
        timebase=timebase,
        sources=[source],
        sequence=[clip],
    )
    initial_fp = plan.fingerprint

    # Attempt an invalid patch that violates timeline bounds (start > end)
    bad_patch = EditorialPatch(
        patch_id="bad_patch",
        summary="Invalid trim",
        reason="Testing atomicity",
        operations=[
            PatchOperation(
                op="add_overlay",
                params={
                    "overlay_id": "ov_bad",
                    "kind": "diagram",
                    "template": "counter",
                    "timeline_start": 5.0,
                    "timeline_end": 2.0,  # Invalid: end < start
                },
            )
        ],
    )
    with pytest.raises(RuntimeError):
        plan.apply_patch(bad_patch)

    # State must be completely untouched
    assert plan.fingerprint == initial_fp
    assert len(plan.overlays) == 0
    assert len(plan.revision_history) == 0


# --------------------------------------------------------------------------- #
# 4. Backward Compatibility & Roundtrip Serialization Tests
# --------------------------------------------------------------------------- #
def test_legacy_roundtrip_compatibility():
    legacy_plan = {
        "source": {"path": "uploads/video.mp4", "duration": 45.0},
        "keep": [
            {"start": 0.0, "end": 3.2},
            {"start": 5.0, "end": 12.0},
        ],
        "captions": [
            {
                "id": "c1",
                "start": 0.2,
                "end": 2.8,
                "text": "Hello world",
                "style": "karaoke",
                "words": [
                    {"word": "Hello", "start": 0.2, "end": 1.0},
                    {"word": "world", "start": 1.1, "end": 2.8},
                ],
            }
        ],
        "speed": [],
        "transitions": [],
        "zooms": [{"start": 0.0, "end": 3.2, "scale": 1.15}],
        "overlays": [
            {
                "id": "ov1",
                "kind": "diagram",
                "template": "counter",
                "start": 1.0,
                "end": 3.0,
                "props": {"value": 500},
            }
        ],
        "audio": {
            "bgm_path": "audio/music.mp3",
            "bgm_volume": 0.2,
            "voice_ducking_db": -16.0,
            "sfx": [{"name": "whoosh", "at": 0.1, "volume": 0.9}],
            "target_lufs": -14.0,
        },
        "output": {"width": 1080, "height": 1920, "fps": 30.0},
    }

    # Convert to Canonical
    canonical = from_legacy_dict(legacy_plan, plan_id="roundtrip_test")
    assert canonical.plan_id == "roundtrip_test"
    assert len(canonical.sequence) == 2
    assert canonical.sequence[0].zoom_in == 1.15
    assert len(canonical.captions) == 1
    assert len(canonical.captions[0].words) == 2
    assert len(canonical.audio.sfx_cues) == 1

    # Convert back to legacy dict
    roundtripped = to_legacy_dict(canonical)
    assert roundtripped["source"]["path"] == "uploads/video.mp4"
    assert len(roundtripped["keep"]) == 2
    assert roundtripped["keep"][0]["start"] == 0.0
    assert roundtripped["keep"][0]["end"] == 3.2
    assert len(roundtripped["captions"]) == 1
    assert roundtripped["captions"][0]["text"] == "Hello world"
    assert len(roundtripped["zooms"]) == 1
    assert roundtripped["zooms"][0]["scale"] == 1.15
    assert len(roundtripped["audio"]["sfx"]) == 1


def test_edit_plan_manager_canonical_bridge():
    legacy_plan = {
        "source": {"path": "uploads/video.mp4", "duration": 30.0},
        "keep": [{"start": 0.0, "end": 5.0}],
    }
    mgr = EditPlanManager(legacy_plan)
    canonical = mgr.to_canonical()
    assert isinstance(canonical, CanonicalEditPlan)
    assert canonical.sequence[0].source_end == 5.0

    # Test reconstruct from canonical
    mgr2 = EditPlanManager.from_canonical(canonical)
    assert mgr2.current["source"]["path"] == "uploads/video.mp4"
    assert len(mgr2.current["keep"]) == 1


# --------------------------------------------------------------------------- #
# 5. Layer 3: RenderPlan Compiler Tests
# --------------------------------------------------------------------------- #
def test_compile_render_plan():
    canonical = from_legacy_dict({
        "source": {"path": "uploads/video.mp4", "duration": 20.0},
        "keep": [{"start": 1.0, "end": 6.0}],
        "zooms": [{"start": 1.0, "end": 6.0, "scale": 1.2}],
        "overlays": [{"id": "o1", "kind": "diagram", "template": "flow", "start": 1.5, "end": 4.5, "props": {}}],
        "audio": {"bgm_path": "music.mp3", "sfx": [{"name": "pop", "at": 2.0, "volume": 0.8}]},
    })

    render_plan = compile_render_plan(canonical, output_path="out/final.mp4")
    assert isinstance(render_plan, RenderPlan)
    assert render_plan.output_path == "out/final.mp4"
    assert render_plan.primary_engine == "ffmpeg_hyperframes"
    
    # Check FFmpeg spec
    assert len(render_plan.ffmpeg.clips) == 1
    assert render_plan.ffmpeg.clips[0].source_start == 1.0
    assert render_plan.ffmpeg.clips[0].zoom_filter is not None
    assert render_plan.ffmpeg.bgm_path == "music.mp3"
    assert len(render_plan.ffmpeg.sfx_files) == 1

    # Check HyperFrames spec
    assert render_plan.hyperframes.enabled is True
    assert len(render_plan.hyperframes.overlays) == 1


# --------------------------------------------------------------------------- #
# 6. Capability-Based AI Router Tests
# --------------------------------------------------------------------------- #
def test_capability_ai_router_mappings():
    r = CapabilityAIRouter()
    status = r.get_status()
    assert "providers" in status
    assert "routes" in status

    # Verify specialized capability mappings
    assert CAPABILITY_MATRIX[ModelCapability.CREATIVE_DIRECTION].primary_provider == Provider.ANTHROPIC
    assert CAPABILITY_MATRIX[ModelCapability.STORYTELLING].primary_provider == Provider.ANTHROPIC
    assert CAPABILITY_MATRIX[ModelCapability.RENDERED_VIDEO_REVIEW].primary_provider == Provider.GEMINI
    assert CAPABILITY_MATRIX[ModelCapability.VISUAL_UNDERSTANDING].primary_provider == Provider.GEMINI

    # Dispatch fallback test: when neither API key is active, degrades gracefully to fallback
    def mock_anthropic():
        return "claude_response"

    def mock_fallback():
        return "fallback_response"

    result = r.dispatch(
        ModelCapability.CREATIVE_DIRECTION,
        execute_anthropic=mock_anthropic,
        execute_fallback=mock_fallback,
    )
    # Since neither key is forced in unit test environment, fallback executes
    assert result in ("claude_response", "fallback_response")
