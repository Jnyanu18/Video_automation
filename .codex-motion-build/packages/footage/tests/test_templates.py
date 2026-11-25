"""Tests for rundown templates, YAML loading, and zero-code extensibility."""

from pathlib import Path
import tempfile
import pytest

from footage.editplan import get_templates_dir, list_templates, load_template
from footage.plan_schema import RundownBeat, RundownTemplate


def test_list_default_templates():
    """Verify all 5 standard vertical templates are discovered."""
    templates = list_templates()
    expected = {
        "wedding-highlight",
        "wedding-full",
        "school-annual-day",
        "corporate-event",
        "birthday",
    }
    assert expected.issubset(set(templates)), f"Expected templates {expected}, found {templates}"


def test_load_wedding_highlight():
    """Verify wedding-highlight template parses properly with required beats."""
    tmpl = load_template("wedding-highlight")
    assert tmpl.name == "wedding-highlight"
    assert tmpl.target_duration == 210.0
    assert len(tmpl.beats) >= 8

    # Vows must prefer speech_whole
    vows_beat = next((b for b in tmpl.beats if b.id == "vows"), None)
    assert vows_beat is not None
    assert vows_beat.prefer == "speech_whole"
    assert "speech" in vows_beat.must_have

    # Speeches must prefer speech_whole
    speeches_beat = next((b for b in tmpl.beats if b.id == "speeches"), None)
    assert speeches_beat is not None
    assert speeches_beat.prefer == "speech_whole"


def test_load_wedding_full():
    """Verify wedding-full template has full ceremony and long target duration."""
    tmpl = load_template("wedding-full")
    assert tmpl.target_duration >= 600.0
    beat_ids = [b.id for b in tmpl.beats]
    assert "ceremony_full" in beat_ids
    assert "full_speeches" in beat_ids


def test_load_school_annual_day():
    """Verify school-annual-day template."""
    tmpl = load_template("school-annual-day")
    assert tmpl.target_duration == 300.0
    beat_ids = [b.id for b in tmpl.beats]
    assert "principal_speech" in beat_ids
    assert "cultural_dance" in beat_ids
    assert "grand_finale" in beat_ids


def test_load_corporate_event():
    """Verify corporate-event template."""
    tmpl = load_template("corporate-event")
    assert tmpl.target_duration == 180.0
    beat_ids = [b.id for b in tmpl.beats]
    assert "keynote_opening" in beat_ids
    assert "panel_discussion" in beat_ids


def test_load_birthday():
    """Verify birthday template loaded from YAML alone."""
    tmpl = load_template("birthday")
    assert tmpl.target_duration == 120.0
    beat_ids = [b.id for b in tmpl.beats]
    assert "cake_cutting" in beat_ids
    cake_beat = next(b for b in tmpl.beats if b.id == "cake_cutting")
    assert cake_beat.prefer == "speech_whole"


def test_new_event_type_yaml_only_no_code_change():
    """Prove that adding a new event type requires only writing a YAML file."""
    yaml_content = """
name: charity-gala-2026
description: Annual charity fundraiser gala
target_duration: 240
beats:
  - id: red_carpet
    must_have: [exterior, guests]
    duration: [15, 30]
    search: ["red carpet", "arrival", "step and repeat"]
  - id: auction
    must_have: [speech]
    duration: [40, 80]
    search: ["live auction", "bidding", "gavel"]
    prefer: speech_whole
  - id: check_presentation
    must_have: [applause]
    duration: [20, 40]
    search: ["big check", "presentation", "donation", "cheering"]
"""
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmpl_file = Path(tmp_dir) / "charity-gala.yaml"
        tmpl_file.write_text(yaml_content, encoding="utf-8")

        # Load from direct path
        tmpl = load_template(tmpl_file)
        assert tmpl.name == "charity-gala-2026"
        assert tmpl.target_duration == 240.0
        assert len(tmpl.beats) == 3

        # Load by name from custom templates dir
        discovered = list_templates(tmp_dir)
        assert "charity-gala" in discovered
        tmpl_by_name = load_template("charity-gala", templates_dir=tmp_dir)
        assert tmpl_by_name.name == "charity-gala-2026"


def test_load_template_missing_raises():
    """Verify FileNotFoundError on nonexistent template."""
    with pytest.raises(FileNotFoundError):
        load_template("nonexistent_event_type_xyz_999")


def test_beat_duration_properties():
    """Verify min_duration, max_duration, and target_duration computations."""
    b1 = RundownBeat(id="b1", duration=[10.0, 25.0])
    assert b1.min_duration == 10.0
    assert b1.max_duration == 25.0
    assert b1.target_duration == 17.5

    b2 = RundownBeat(id="b2", duration=30.0)
    assert b2.min_duration == 30.0
    assert b2.max_duration == 30.0
    assert b2.target_duration == 30.0
