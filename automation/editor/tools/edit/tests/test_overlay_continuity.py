"""An entrance-animated overlay must not be split (and so replayed) when a silence cut falls inside it."""
from tools.edit.timeline import remap_to_output

PLAN = {"version": 1, "source": {"path": "x.mp4", "duration": 30.0, "width": 640, "height": 360, "fps": 30},
        "output": {"width": 360, "height": 640, "fps": 30},
        # 2 seconds (10..12) are cut out of the middle
        "keep": [{"id": "k1", "start": 0, "end": 10}, {"id": "k2", "start": 12, "end": 30}],
        "captions": [], "reframe": {"mode": "none", "track": []}, "notes": ""}


def remap(kind, params=None, start=8.0, end=15.0):
    plan = {**PLAN, "overlays": [{"id": "o1", "kind": kind, "start": start, "end": end, "asset": "x", "params": params or {}}]}
    return remap_to_output(plan)["overlays"]


def test_a_diagram_across_a_cut_stays_one_continuous_piece():
    out = remap("diagram", {"template": "flow", "steps": ["a", "b"]})
    assert len(out) == 1 and out[0]["id"] == "o1"
    assert out[0]["start"] == 8.0 and abs(out[0]["end"] - 13.0) < 1e-6  # source 15 -> output 13 (2 s were cut before it)


def test_titles_lower_thirds_and_cards_are_continuous_too():
    for kind in ("title", "lower-third", "graphic"):
        assert len(remap(kind)) == 1, kind


def test_footage_overlays_still_split_per_kept_segment():
    out = remap("broll")
    assert [o["id"] for o in out] == ["o1", "o1~2"]


def test_an_overlay_entirely_inside_a_cut_is_dropped_and_one_that_starts_in_a_cut_starts_at_the_next_kept_frame():
    assert remap("diagram", start=10.2, end=11.8) == []
    out = remap("diagram", start=10.5, end=15.0)
    assert len(out) == 1 and abs(out[0]["start"] - 10.0) < 1e-6  # the cut hole closes, so the next kept frame is output 10.0
