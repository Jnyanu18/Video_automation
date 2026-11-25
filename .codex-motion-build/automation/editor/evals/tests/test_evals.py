import json
import os
import shutil

import pytest

from evals import baseline_plan, evaluate, render_scorecard, run_golden
from evals.__main__ import main as cli_main
from styles import synth


@pytest.fixture(scope="module")
def vid(tmp_path_factory):
    return synth.make_std_video(str(tmp_path_factory.mktemp("e") / "src.mp4"))


def get(rep, name):
    return next(c for c in rep["checks"] if c["name"] == name)


GOOD = [(0.0, 2.0), (3.0, 5.0), (5.5, 7.0)]  # cuts exactly on speech/silence (= word) boundaries


def good_captions():
    return [{"id": "c1", "text": "hello there everyone", "start": 0.2, "end": 1.8, "style": "clean"},
            {"id": "c2", "text": "send this to a friend", "start": 5.0, "end": 6.4, "style": "clean"}]


def test_good_plan_passes(vid):
    plan = synth.std_plan(vid, GOOD, captions=good_captions())
    rep = evaluate(vid, plan, synth.std_words())
    assert rep["overall"] == "PASS", render_scorecard(rep)
    assert get(rep, "duration_reduction")["value"] > 0.2
    assert get(rep, "no_cut_mid_word")["status"] == "pass"
    assert "OVERALL PASS" in render_scorecard(rep)


def test_cut_mid_word_detected(vid):
    # words are 0.4s on a 0.4 grid; 1.0 is inside the word [0.8, 1.2]; 3.1 is inside [3.0+0.4*0.. ] too
    plan = synth.std_plan(vid, [(0.0, 1.0), (3.0, 7.0)])
    rep = evaluate(vid, plan, synth.std_words())
    ch = get(rep, "no_cut_mid_word")
    assert ch["status"] == "fail" and ch["value"] == 1
    assert rep["overall"] == "FAIL"


def test_cut_on_word_boundary_ok(vid):
    plan = synth.std_plan(vid, [(0.0, 1.2), (3.0, 7.0)])
    assert get(evaluate(vid, plan, synth.std_words()), "no_cut_mid_word")["status"] == "pass"


def test_no_transcript_skips_midword(vid):
    rep = evaluate(vid, synth.std_plan(vid, [(0, 7)]))
    assert get(rep, "no_cut_mid_word")["status"] == "skipped"


def test_short_segment_fails(vid):
    plan = synth.std_plan(vid, [(0.0, 2.0), (3.0, 3.3), (4.0, 7.0)])
    ch = get(evaluate(vid, plan), "min_segment")
    assert ch["status"] == "fail" and ch["value"] == 1


def test_touching_keeps_are_merged_not_cuts(vid):
    plan = synth.std_plan(vid, [(0.0, 0.3), (0.3, 7.0)])
    rep = evaluate(vid, plan)
    assert get(rep, "min_segment")["status"] == "pass"


def test_caption_checks(vid):
    caps = [
        {"id": "c1", "text": "x" * 120, "start": 0, "end": 10, "style": "clean"},                 # too long
        {"id": "c2", "text": "this is much too fast to read", "start": 0, "end": 0.5, "style": "clean"},  # cps 58
    ]
    rep = evaluate(vid, synth.std_plan(vid, [(0, 7)], captions=caps))
    assert get(rep, "caption_length")["status"] == "warn"
    assert get(rep, "caption_reading_speed")["status"] == "fail"
    ok = evaluate(vid, synth.std_plan(vid, [(0, 7)], captions=good_captions()))
    assert get(ok, "caption_reading_speed")["status"] == "pass"


def test_silence_remaining(vid):
    full = get(evaluate(vid, synth.std_plan(vid, [(0, 7)])), "silence_remaining")
    assert full["status"] != "pass"          # 1.0s + 0.5s silences kept
    assert "longest 1.0" in full["detail"] or "longest 0.9" in full["detail"] or "longest 1.1" in full["detail"]
    tight = get(evaluate(vid, synth.std_plan(vid, GOOD)), "silence_remaining")
    assert tight["status"] == "pass"


def test_duration_reduction(vid):
    ch = get(evaluate(vid, synth.std_plan(vid, [(0, 3.5)])), "duration_reduction")
    assert abs(ch["value"] - 0.5) < 0.01
    over = synth.std_plan(vid, [(0, 7)])
    over["keep"].append({"id": "k2", "start": 0, "end": 7})  # overlap merges away -> still 0 removed
    assert get(evaluate(vid, over), "duration_reduction")["value"] == 0


def test_loudness_jump(tmp_path):
    loud_quiet = [("tone", 2.0, 0.5), ("silence", 1.0, 0), ("tone", 2.0, 0.03), ("silence", 0.5, 0), ("tone", 1.5, 0.5)]
    v = synth.make_std_video(str(tmp_path / "lq.mp4"), audio=loud_quiet)
    rep = evaluate(v, synth.std_plan(v, [(0.0, 1.9), (3.1, 4.9), (5.6, 7.0)]))
    ch = get(rep, "loudness_jumps")
    assert ch["status"] == "fail" and ch["value"] > 10
    same = evaluate(v, synth.std_plan(v, [(0.0, 1.9), (5.6, 7.0)]))   # loud -> loud
    assert get(same, "loudness_jumps")["status"] == "pass"


def test_video_without_audio(tmp_path):
    v = synth.make_video(str(tmp_path / "mute.mp4"), None, [2.0, 2.0])
    rep = evaluate(v, synth.std_plan(v, [(0, 3)]))
    assert get(rep, "silence_remaining")["status"] == "skipped"
    assert get(rep, "loudness_jumps")["status"] == "skipped"


def test_style_max_pause_tightens_limit(vid):
    plan = synth.std_plan(vid, [(0.0, 2.2), (2.8, 7.0)])   # keeps ~0.2s+0.2s of the 1.0s silence + the 0.5s one
    lenient = get(evaluate(vid, plan), "silence_remaining")
    assert lenient["status"] in ("pass", "warn")
    style = {"edit_params": {"max_pause": 0.3}}
    strict = get(evaluate(vid, plan, style=style), "silence_remaining")
    assert strict["status"] != "pass"


def test_baseline_plan_is_clean(vid):
    plan = baseline_plan(vid)
    assert all(k["end"] - k["start"] >= 0.4 for k in plan["keep"])
    rep = evaluate(vid, plan)
    assert get(rep, "min_segment")["status"] == "pass"
    assert get(rep, "duration_reduction")["value"] > 0.05


def test_golden_runner_and_cli(vid, tmp_path, capsys):
    d = tmp_path / "golden"
    d.mkdir()
    shutil.copy(vid, d / "a.mp4")
    shutil.copy(vid, d / "b.mp4")
    json.dump(synth.std_words(), open(d / "b.transcript.json", "w"))
    json.dump(synth.std_plan("b.mp4", [(0.0, 1.0), (3.0, 7.0)]), open(d / "b.plan.json", "w"))  # mid-word
    (d / "notes.txt").write_text("ignored")
    s = run_golden(str(d), verbose=False)
    by = {os.path.basename(r["video"]): r for r in s["results"]}
    assert s["count"] == 2 and set(by) == {"a.mp4", "b.mp4"}
    assert by["a.mp4"]["plan_origin"] == "baseline" and by["b.mp4"]["plan_origin"] == "sidecar"
    assert by["b.mp4"]["overall"] == "FAIL" and by["a.mp4"]["overall"] != "FAIL"
    assert s["failed"] == 1 and os.path.exists(s["report_path"])
    assert cli_main(["golden", str(d), "--strict"]) == 1
    assert "GOLDEN SET" in capsys.readouterr().out
    p = tmp_path / "plan.json"
    json.dump(synth.std_plan(vid, GOOD), open(p, "w"))
    assert cli_main(["score", vid, str(p)]) == 0
    assert "Scorecard" in capsys.readouterr().out


def test_golden_survives_broken_video(tmp_path):
    (tmp_path / "bad.mp4").write_bytes(b"not a video")
    s = run_golden(str(tmp_path), verbose=False)
    assert s["results"][0]["overall"] in ("ERROR", "FAIL")
