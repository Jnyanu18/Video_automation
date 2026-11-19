import pytest
from tools.analysis.footage_intelligence import search_footage, SearchResult

@pytest.fixture
def mock_index():
    return {
        "media_id": "test_001",
        "duration": 30.0,
        "scenes": [
            {
                "scene_id": "scene_01",
                "start": 0.0,
                "end": 3.2,
                "transcript": "Stop building features nobody asked for",
                "visual_tags": ["hook", "introduction", "core_problem"],
                "camera": {"framing": "Close-Up / Talking Head"},
                "keyframe": "/fake/kf1.jpg",
            },
            {
                "scene_id": "scene_02",
                "start": 3.2,
                "end": 14.0,
                "transcript": "Here is our product dashboard demo showing daily active users and retention",
                "visual_tags": ["product_demo"],
                "camera": {"framing": "Medium Action Shot"},
                "keyframe": "/fake/kf2.jpg",
            },
            {
                "scene_id": "scene_03",
                "start": 14.0,
                "end": 22.5,
                "transcript": "Our pricing model starts at 29 dollars per month",
                "visual_tags": ["pricing"],
                "camera": {"framing": "Close-Up / Talking Head"},
                "keyframe": "/fake/kf3.jpg",
            },
            {
                "scene_id": "scene_04",
                "start": 22.5,
                "end": 30.0,
                "transcript": "Send this to your cofounder and follow for part 2 tomorrow",
                "visual_tags": ["cta"],
                "camera": {"framing": "Medium Action Shot"},
                "keyframe": "/fake/kf4.jpg",
            },
        ]
    }

def test_search_speech_query(mock_index):
    results = search_footage(mock_index, "features nobody asked for")
    assert len(results) > 0
    top = results[0]
    assert top.scene_id == "scene_01"
    assert top.start == 0.0
    assert top.end == 3.2
    assert "Stop building" in top.snippet

def test_search_visual_tag_query(mock_index):
    results = search_footage(mock_index, "pricing")
    assert len(results) > 0
    top = results[0]
    assert top.scene_id == "scene_03"
    assert top.start == 14.0
    assert top.end == 22.5

def test_search_demo_query(mock_index):
    results = search_footage(mock_index, "dashboard demo")
    assert len(results) > 0
    top = results[0]
    assert top.scene_id == "scene_02"

def test_search_empty_query(mock_index):
    results = search_footage(mock_index, "")
    assert results == []
