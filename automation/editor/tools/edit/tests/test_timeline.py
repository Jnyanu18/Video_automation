import copy

import pytest

from tools.edit.timeline import (normalize_keep, output_duration, output_to_source, remap_to_output,
                                 segments, source_to_output)


def plan(keep, captions=(), overlays=(), dur=100.0, track=()):
    return {"version": 1, "source": {"path": "in.mp4", "duration": dur},
            "keep": [{"id": f"k{i}", "start": s, "end": e} for i, (s, e) in enumerate(keep)],
            "captions": [{"id": f"c{i}", "text": "t", "start": s, "end": e} for i, (s, e) in enumerate(captions)],
            "overlays": [{"id": f"o{i}", "kind": "broll", "start": s, "end": e} for i, (s, e) in enumerate(overlays)],
            "reframe": {"mode": "face-follow", "track": [{"t": t, "cx": 0.5, "cy": 0.5} for t in track]}}


def spans(items):
    return [(i["start"], i["end"]) for i in items]


def test_single_segment_offset():
    r = remap_to_output(plan([(10, 20)], captions=[(12, 14)]))
    assert spans(r["captions"]) == [(2, 4)]
    assert r["timeline"]["duration"] == 10


def test_two_segments_second_offset():
    r = remap_to_output(plan([(0, 5), (10, 15)], captions=[(11, 12)]))
    assert spans(r["captions"]) == [(6, 7)]


def test_caption_in_cut_dropped():
    r = remap_to_output(plan([(0, 5), (10, 15)], captions=[(6, 9)]))
    assert r["captions"] == []


def test_caption_spanning_cut_is_split():
    r = remap_to_output(plan([(0, 5), (10, 15)], captions=[(4, 11)]))
    assert spans(r["captions"]) == [(4, 5), (5, 6)]
    assert [c["id"] for c in r["captions"]] == ["c0", "c0~2"]


def test_caption_partially_outside_start_clipped():
    r = remap_to_output(plan([(5, 10)], captions=[(3, 7)]))
    assert spans(r["captions"]) == [(0, 2)]


def test_adjacent_segments_merge_and_caption_not_split():
    r = remap_to_output(plan([(0, 5), (5, 10)], captions=[(4, 6)]))
    assert spans(r["captions"]) == [(4, 6)]
    assert len(r["timeline"]["segments"]) == 1


def test_overlapping_segments_merge():
    p = plan([(0, 6), (4, 10)], captions=[(5, 8)])
    assert normalize_keep(p["keep"]) == [(0, 10)]
    assert spans(remap_to_output(p)["captions"]) == [(5, 8)]
    assert output_duration(p) == 10


def test_contained_segment_ignored():
    assert normalize_keep(plan([(0, 10), (2, 3)])["keep"]) == [(0, 10)]


def test_unsorted_segments_sorted():
    r = remap_to_output(plan([(10, 15), (0, 5)], captions=[(11, 12), (1, 2)]))
    assert spans(r["captions"]) == [(1, 2), (6, 7)]


def test_empty_and_inverted_segments_ignored():
    p = plan([(3, 3), (8, 7), (10, 12)], captions=[(10, 11)])
    assert [{k: sg[k] for k in ("src_start", "src_end", "out_start", "out_end")} for sg in segments(p)] == [
        {"src_start": 10, "src_end": 12, "out_start": 0, "out_end": 2}]
    assert spans(remap_to_output(p)["captions"]) == [(0, 1)]


def test_no_keep_everything_dropped():
    r = remap_to_output(plan([], captions=[(1, 2)], overlays=[(1, 2)], track=[1]))
    assert r["captions"] == [] and r["overlays"] == [] and r["reframe"]["track"] == []
    assert r["timeline"]["duration"] == 0


def test_keep_clamped_to_source_duration():
    p = plan([(0, 500)], dur=20)
    assert output_duration(p) == 20


def test_overlays_remapped_and_split():
    r = remap_to_output(plan([(0, 2), (4, 6)], overlays=[(1, 5)]))
    assert spans(r["overlays"]) == [(1, 2), (2, 3)]
    assert r["overlays"][0]["kind"] == "broll"


def test_zero_length_item_kept_as_point():
    r = remap_to_output(plan([(0, 5)], captions=[(2, 2)]))
    assert spans(r["captions"]) == [(2, 2)]
    assert remap_to_output(plan([(0, 5)], captions=[(7, 7)]))["captions"] == []


def test_reframe_track_remapped():
    r = remap_to_output(plan([(10, 20)], track=[5, 12, 20]))
    assert [p["t"] for p in r["reframe"]["track"]] == [2, 10]


def test_input_not_mutated_and_idempotent():
    p = plan([(0, 5), (10, 15)], captions=[(4, 11)])
    snap = copy.deepcopy(p)
    r = remap_to_output(p)
    assert p == snap
    assert remap_to_output(r) == r
    assert r["time_base"] == "output"


def test_point_conversions():
    p = plan([(0, 5), (10, 15)])
    assert source_to_output(p, 12) == 7
    assert source_to_output(p, 7) is None
    assert source_to_output(p, 5) == 5
    assert output_to_source(p, 7) == 12
    assert output_to_source(p, 11) is None


def test_ordering_by_start():
    r = remap_to_output(plan([(0, 10)], captions=[(5, 6), (1, 2)]))
    assert spans(r["captions"]) == [(1, 2), (5, 6)]


def test_output_validates_against_schema():
    jsonschema = pytest.importorskip("jsonschema")
    from tools.edit._common import load_schema
    jsonschema.validate(remap_to_output(plan([(0, 5), (10, 15)], captions=[(4, 11)])), load_schema())
