"""Generate web/tests/fixtures/timeline_cases.json from the PYTHON timeline (tools/edit/timeline.py).

The web client has a TypeScript port (web/lib/timeline.ts); tests/timeline.parity.test.ts must reproduce these numbers.
Re-run after changing the Python timeline:  python scripts/gen_timeline_fixture.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from tools.edit.timeline import output_duration, output_to_source, segments, source_to_output  # noqa: E402


def mk(keep, speed=(), transitions=(), dur=100.0):
    p = {"version": 1, "source": {"path": "in.mp4", "duration": dur, "width": 1920, "height": 1080, "fps": 30},
         "output": {"width": 1080, "height": 1920, "fps": 30},
         "keep": [{"id": f"k{i}", "start": s, "end": e} for i, (s, e) in enumerate(keep)],
         "captions": [], "reframe": {"mode": "none"}, "overlays": [], "style_ref": None}
    if speed:
        p["speed"] = [{"id": f"s{i}", "start": s, "end": e, "factor": f} for i, (s, e, f) in enumerate(speed)]
    if transitions:
        p["transitions"] = [{"id": f"t{i}", "at": a, "kind": k, "duration": d} for i, (a, k, d) in enumerate(transitions)]
    return p


CASES = {
    "plain": mk([(0, 10)]),
    "cuts": mk([(0, 5), (10, 15), (30, 31)]),
    "unsorted_and_touching": mk([(10, 15), (0, 5), (5, 8), (3, 3), (9, 8)]),
    "clamped_to_source": mk([(-5, 4), (90, 120)], dur=100.0),
    "double_speed": mk([(0, 10)], speed=[(0, 10, 2.0)]),
    "slowmo": mk([(0, 4)], speed=[(0, 4, 0.5)]),
    "partial_speed": mk([(0, 10)], speed=[(2, 6, 2.0)]),
    "speed_and_cuts": mk([(0, 4), (10, 20), (30, 31)], speed=[(2, 3, 0.5), (12, 18, 3.0)]),
    "overlapping_speed_later_wins": mk([(0, 10)], speed=[(0, 10, 2.0), (4, 6, 4.0)]),
    "factor_clamped": mk([(0, 10)], speed=[(0, 10, 1000)]),
    "speed_restore_to_1": mk([(0, 10)], speed=[(0, 10, 2.0), (3, 5, 1.0)]),
    "transition": mk([(0, 5), (10, 15)], transitions=[(7.5, "crossfade", 1.0)]),
    "transition_at_gap_edges": mk([(0, 5), (10, 15), (20, 25)], transitions=[(5.0, "wipe-left", 1.0), (20.0, "slide-left", 0.5)]),
    "transition_clamped": mk([(0, 1), (10, 20)], transitions=[(5, "crossfade", 5.0)]),
    "transition_miss": mk([(0, 5), (10, 15)], transitions=[(3.0, "crossfade", 1.0)]),
    "transition_plus_speed": mk([(0, 4), (10, 14)], speed=[(0, 4, 2.0)], transitions=[(7, "dissolve", 1.0)]),
    "chained_transitions": mk([(0, 5), (10, 15), (20, 25)], transitions=[(7, "crossfade", 1.0), (17, "crossfade", 1.0)]),
    "everything": mk([(0, 5), (8, 14), (20, 30)], speed=[(1, 2, 2.0), (22, 26, 0.5)],
                     transitions=[(6, "crossfade", 0.6), (17, "fade-black", 1.2)]),
}


def samples(plan):
    segs = segments(plan)
    ts = {0.0, 0.5, 1.0, 2.5, 5.0, 7.5, 10.0, 12.0, 14.7, 19.9, 30.5}
    for s in segs:
        ts |= {s["src_start"], s["src_end"], (s["src_start"] + s["src_end"]) / 2, s["src_start"] + 0.01}
    os_ = {0.0, 0.3, 1.0, 3.3, 5.5, 9.0, 12.5}
    for s in segs:
        os_ |= {s["out_start"], s["out_end"], (s["out_start"] + s["out_end"]) / 2}
    return sorted(round(t, 6) for t in ts), sorted(round(t, 6) for t in os_ | {output_duration(plan) + 5})


out = []
for name, plan in CASES.items():
    s_ts, o_ts = samples(plan)
    out.append({"name": name, "plan": plan, "duration": output_duration(plan), "segments": segments(plan),
                "source_to_output": [[t, source_to_output(plan, t)] for t in s_ts],
                "output_to_source": [[t, output_to_source(plan, t)] for t in o_ts]})
dest = ROOT / "web" / "tests" / "fixtures" / "timeline_cases.json"
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(json.dumps(out, indent=1))
print(f"wrote {len(out)} cases, {sum(len(c['source_to_output']) + len(c['output_to_source']) for c in out)} mapped points -> {dest}")
