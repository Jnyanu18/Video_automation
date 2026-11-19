"""remap_to_output with speed changes and transitions (these change the output timeline)."""
import copy

import pytest

from tools.edit.timeline import (output_duration, output_to_source, remap_to_output, segments, source_to_output,
                                 speed_ranges)


def mk(keep, speed=(), transitions=(), captions=(), zooms=(), mute=(), dur=100.0):
    p = {"version": 1, "source": {"path": "in.mp4", "duration": dur},
         "keep": [{"id": f"k{i}", "start": s, "end": e} for i, (s, e) in enumerate(keep)],
         "captions": [{"id": f"c{i}", "text": "t", "start": s, "end": e} for i, (s, e) in enumerate(captions)],
         "overlays": []}
    if speed:
        p["speed"] = [{"id": f"s{i}", "start": s, "end": e, "factor": f} for i, (s, e, f) in enumerate(speed)]
    if transitions:
        p["transitions"] = [{"id": f"t{i}", "at": a, "kind": "crossfade", "duration": d}
                            for i, (a, d) in enumerate(transitions)]
    if zooms:
        p["zooms"] = [{"id": f"z{i}", "start": s, "end": e, "scale": 1.3} for i, (s, e) in enumerate(zooms)]
    if mute:
        p["audio"] = {"mute": [{"id": f"m{i}", "start": s, "end": e} for i, (s, e) in enumerate(mute)]}
    return p


def sp(items):
    return [(i["start"], i["end"]) for i in items]


def test_double_speed_halves_duration():
    p = mk([(0, 10)], speed=[(0, 10, 2.0)])
    assert output_duration(p) == 5.0
    assert source_to_output(p, 6) == 3.0
    assert output_to_source(p, 3.0) == 6.0


def test_slowmo_doubles_duration():
    assert output_duration(mk([(0, 4)], speed=[(0, 4, 0.5)])) == 8.0


def test_partial_speed_pieces_and_offsets():
    p = mk([(0, 10)], speed=[(2, 6, 2.0)])
    pcs = segments(p)[0]["pieces"]
    assert [(x["src_start"], x["src_end"], x["factor"]) for x in pcs] == [(0, 2, 1.0), (2, 6, 2.0), (6, 10, 1.0)]
    assert [(x["out_start"], x["out_end"]) for x in pcs] == [(0, 2), (2, 4), (4, 8)]
    assert output_duration(p) == 8.0


def test_caption_inside_sped_region_is_shortened():
    r = remap_to_output(mk([(0, 10)], speed=[(2, 6, 2.0)], captions=[(2, 6)]))
    assert sp(r["captions"]) == [(2, 4)]


def test_caption_after_sped_region_shifts_earlier():
    r = remap_to_output(mk([(0, 10)], speed=[(2, 6, 2.0)], captions=[(7, 9)]))
    assert sp(r["captions"]) == [(5, 7)]


def test_caption_spanning_speed_boundary_stays_one_item():
    r = remap_to_output(mk([(0, 10)], speed=[(2, 6, 2.0)], captions=[(1, 7)]))
    assert sp(r["captions"]) == [(1, 5)]  # 1s normal + 2s (4s at 2x) + 1s normal -> 1..5
    assert len(r["captions"]) == 1


def test_speed_with_cuts():
    p = mk([(0, 4), (10, 14)], speed=[(10, 14, 4.0)], captions=[(11, 12)])
    assert output_duration(p) == 5.0
    assert sp(remap_to_output(p)["captions"]) == [(4.25, 4.5)]


def test_speed_over_cut_region_does_not_matter():
    p = mk([(0, 4), (10, 14)], speed=[(4, 10, 8.0)])
    assert output_duration(p) == 8.0


def test_overlapping_speed_later_wins():
    rs = speed_ranges(mk([(0, 10)], speed=[(0, 10, 2.0), (4, 6, 4.0)]))
    assert rs == [(0.0, 4.0, 2.0), (4.0, 6.0, 4.0), (6.0, 10.0, 2.0)]


def test_factor_clamped():
    assert speed_ranges(mk([(0, 10)], speed=[(0, 10, 1000)])) == [(0.0, 10.0, 16.0)]


def test_roundtrip_source_output_source():
    p = mk([(0, 4), (10, 20), (30, 31)], speed=[(2, 3, 0.5), (12, 18, 3.0)])
    for t in [0, 1.5, 2.5, 3.9, 10.01, 12, 14.7, 18, 19.9, 30.5]:
        o = source_to_output(p, t)
        assert o is not None
        assert output_to_source(p, o) == pytest.approx(t, abs=1e-4)


def test_output_time_monotonic_in_source_time():
    p = mk([(0, 4), (10, 20)], speed=[(2, 3, 0.5), (12, 18, 3.0)])
    ts = [i / 10 for i in range(0, 40)] + [10 + i / 10 for i in range(0, 100)]
    os_ = [source_to_output(p, t) for t in ts]
    assert all(b >= a - 1e-9 for a, b in zip(os_, os_[1:]))


def test_transition_shortens_output_and_shifts_later_items():
    p = mk([(0, 5), (10, 15)], transitions=[(7.5, 1.0)], captions=[(11, 12)])
    assert output_duration(p) == 9.0
    sg = segments(p)
    assert sg[1]["out_start"] == 4.0 and sg[1]["overlap_in"] == 1.0
    assert sp(remap_to_output(p)["captions"]) == [(5, 6)]


def test_transition_matching_gap_boundaries_and_miss():
    inside = mk([(0, 5), (10, 15)], transitions=[(5.0, 1.0)])
    edge = mk([(0, 5), (10, 15)], transitions=[(10.0, 1.0)])
    outside = mk([(0, 5), (10, 15)], transitions=[(3.0, 1.0)])
    assert output_duration(inside) == output_duration(edge) == 9.0
    assert output_duration(outside) == 10.0


def test_transition_duration_clamped_to_half_of_shorter_segment():
    p = mk([(0, 1), (10, 20)], transitions=[(5, 5.0)])
    assert segments(p)[1]["overlap_in"] == 0.5
    assert output_duration(p) == 10.5


def test_transition_plus_speed():
    p = mk([(0, 4), (10, 14)], speed=[(0, 4, 2.0)], transitions=[(7, 1.0)])
    assert output_duration(p) == 2.0 + 4.0 - 1.0
    assert segments(p)[1]["out_start"] == 1.0


def test_two_transitions_chain():
    p = mk([(0, 5), (10, 15), (20, 25)], transitions=[(7, 1.0), (17, 1.0)])
    assert output_duration(p) == 13.0
    assert [s["out_start"] for s in segments(p)] == [0, 4.0, 8.0]


def test_zooms_and_mutes_remapped_with_speed():
    p = mk([(0, 10)], speed=[(2, 6, 2.0)], zooms=[(2, 6)], mute=[(7, 8)])
    r = remap_to_output(p)
    assert sp(r["zooms"]) == [(2, 4)]
    assert sp(r["audio"]["mute"]) == [(5, 6)]
    assert "audio" in p and p["audio"]["mute"][0]["start"] == 7  # input untouched


def test_remap_idempotent_and_pure_with_effects():
    p = mk([(0, 5), (10, 15)], speed=[(1, 2, 2.0)], transitions=[(7, 1.0)], captions=[(1, 12)])
    before = copy.deepcopy(p)
    r = remap_to_output(p)
    assert p == before
    assert remap_to_output(r) == r


def test_no_effects_unchanged_behaviour():
    p = mk([(10, 20)], captions=[(12, 14)])
    assert output_duration(p) == 10
    assert sp(remap_to_output(p)["captions"]) == [(2, 4)]
