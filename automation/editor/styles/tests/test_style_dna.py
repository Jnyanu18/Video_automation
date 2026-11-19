import pytest
from styles.style_dna import get_style_dna, apply_style_dna_to_plan, STYLE_PRESETS
from styles.versions import generate_multi_versions

def test_style_presets():
    assert "viral_hook_fast_pace" in STYLE_PRESETS
    assert "educational_masterclass" in STYLE_PRESETS
    assert "cinematic_event" in STYLE_PRESETS

    viral = get_style_dna("viral_hook_fast_pace")
    assert viral.avg_shot_duration <= 2.0
    assert viral.caption_style == "karaoke"
    assert viral.target_lufs == -14.0

def test_apply_style_dna():
    plan = {"keep": [{"id": "k1", "start": 0.0, "end": 10.0}], "captions": [{"text": "hi"}]}
    style = get_style_dna("educational_masterclass")
    updated = apply_style_dna_to_plan(plan, style)
    assert updated["style_ref"] == "educational_masterclass"
    assert updated["audio"]["target_lufs"] == -15.0
    assert updated["captions"][0]["style"] == "clean-lower"

def test_generate_multi_versions():
    base_plan = {
        "version": 1,
        "source": {"path": "assets/test.mp4", "duration": 40.0},
        "output": {"width": 1080, "height": 1920},
        "keep": [{"id": "k1", "start": 0.0, "end": 40.0}],
    }
    mock_index = {
        "scenes": [
            {"start": 0.0, "end": 5.0},
            {"start": 5.0, "end": 15.0},
            {"start": 15.0, "end": 28.0},
            {"start": 28.0, "end": 40.0},
        ]
    }
    versions = generate_multi_versions(base_plan, mock_index)
    assert len(versions) == 4
    cut_types = [v.cut_type for v in versions]
    assert "retention" in cut_types
    assert "educational" in cut_types
    assert "cinematic" in cut_types
    assert "founder" in cut_types
