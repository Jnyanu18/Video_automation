import pytest
from agent.editing_memory import EditingMemoryStore, PerformanceRecord

def _rec(i, hook, completion, style="viral_hook_fast_pace"):
    return PerformanceRecord(record_id=f"rec_{i:02d}", media_id=f"m_{i:02d}", title=f"Reel {i}", style_id=style,
                             duration_seconds=30.0, cuts_count=6, hook_type=hook, published_at=0.0, reach=10000, views=8000,
                             completion_rate=completion, dm_sends=200, saves=100, follows=20)


def test_editing_memory_lifecycle():
    # The store ships empty on purpose (no invented performance numbers). The lifecycle is exercised with explicit records.
    store = EditingMemoryStore()
    assert store.records == [] and store.generate_recommendations() == []

    for rec in [_rec(1, "visual_punch_in", 0.76), _rec(2, "bold_statement", 0.71),
                _rec(3, "visual_punch_in", 0.74), _rec(4, "delayed_intro", 0.44)]:
        store.add_record(rec)
    assert len(store.records) == 4

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
