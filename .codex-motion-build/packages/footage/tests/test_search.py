"""Tests for moment search."""

from footage.schema import (
    FootageIndex,
    IndexStats,
    Moment,
    MomentAngle,
    MomentSpeech,
)
from footage.search import find_moments


def _make_search_index() -> FootageIndex:
    stats = IndexStats(
        total_source_seconds=60.0,
        media_count=1,
        shots=3,
        moments=3,
        kept_seconds=20.0,
        keep_ratio=0.33,
        proxy_seconds=5.0,
        index_wall_seconds=10.0,
        realtime_factor=6.0,
    )
    moments = [
        Moment(
            moment_id="mo0001",
            t_start=0.0,
            t_end=5.0,
            tags=["vows", "ceremony"],
            description="The bride and groom exchange emotional wedding vows at the altar",
            speech=MomentSpeech(text="I take you to be my lawfully wedded wife", speaker="S1"),
        ),
        Moment(
            moment_id="mo0002",
            t_start=5.0,
            t_end=10.0,
            tags=["arrival", "guests"],
            description="Guests arriving at the reception hall and smiling",
            speech=None,
        ),
        Moment(
            moment_id="mo0003",
            t_start=10.0,
            t_end=15.0,
            tags=["dance", "party"],
            description="Couple first dance under romantic warm spotlight",
            speech=None,
        ),
    ]
    return FootageIndex(
        index_version=2,
        project_id="test-search",
        created_at="2026-11-20T00:00:00Z",
        source_dirs=["/test"],
        moments=moments,
        stats=stats,
    )


def test_find_moments_keyword_tag_and_desc():
    index = _make_search_index()
    results = find_moments("vows", index)
    assert len(results) >= 1
    assert results[0][0].moment_id == "mo0001"
    assert results[0][1] > 0.5


def test_find_moments_speech_match():
    index = _make_search_index()
    results = find_moments("lawfully wedded", index)
    assert len(results) >= 1
    assert results[0][0].moment_id == "mo0001"


def test_find_moments_tie_breaking_deterministic():
    stats = IndexStats(
        total_source_seconds=60.0,
        media_count=1,
        shots=2,
        moments=2,
        kept_seconds=20.0,
        keep_ratio=0.33,
        proxy_seconds=5.0,
        index_wall_seconds=10.0,
        realtime_factor=6.0,
    )
    m_b = Moment(moment_id="mo0002", t_start=5.0, t_end=10.0, tags=["dance"])
    m_a = Moment(moment_id="mo0001", t_start=0.0, t_end=5.0, tags=["dance"])
    # Put them in reverse id order in index
    index = FootageIndex(
        index_version=2,
        project_id="test",
        created_at="2026-11-20T00:00:00Z",
        source_dirs=["/test"],
        moments=[m_b, m_a],
        stats=stats,
    )
    results = find_moments("dance", index)
    assert len(results) == 2
    # Equal relevance should break tie by moment_id ascending: mo0001 before mo0002
    assert results[0][0].moment_id == "mo0001"
    assert results[1][0].moment_id == "mo0002"


def test_find_moments_empty_and_no_match():
    index = _make_search_index()
    assert find_moments("", index) == []
    assert find_moments("nonexistent_keyword_xyz", index) == []
