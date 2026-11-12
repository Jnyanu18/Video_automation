import pytest
from agent.editing_memory import EditingMemoryStore, PerformanceRecord

def test_editing_memory_lifecycle():
    store = EditingMemoryStore()
    assert len(store.records) >= 4

    recs = store.generate_recommendations()
    assert len(recs) >= 1
    assert any("Hook" in r["title"] or "Punch-In" in r["title"] for r in recs)

def test_csv_import():
    store = EditingMemoryStore()
    initial_count = len(store.records)
    csv_sample = """record_id,title,duration,cuts,hook_type,reach,views,completion_rate,dm_sends,saves,follows
rec_new_1,Test Imported Reel,25.0,6,visual_punch_in,5000,4200,0.82,180,95,20"""
    imported = store.import_from_csv(csv_sample)
    assert imported == 1
    assert len(store.records) == initial_count + 1
    new_rec = store.records[-1]
    assert new_rec.record_id == "rec_new_1"
    assert new_rec.sends_per_1k_reach == 36.0
