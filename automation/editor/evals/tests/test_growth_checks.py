"""The growth checks must be able to fail: they are measured, not decorative."""
from evals.checks import check_sendability_cta, check_three_second_hook


def W(*items):
    return [{"word": w, "start": s, "end": e} for w, s, e in items]


def cap(i, text, s, e):
    return {"id": f"c{i}", "text": text, "start": s, "end": e}


def test_hook_fails_on_long_dead_air():
    r = check_three_second_hook({"captions": [cap(1, "hi", 2.5, 3)]}, [(0.0, 20.0)], W(("Stop", 2.4, 2.7)))
    assert r["status"] == "fail" and r["value"] == 2.4


def test_hook_warns_between_thresholds_and_passes_when_tight():
    warn = check_three_second_hook({"captions": []}, [(0.0, 9.0)], W(("Stop", 0.9, 1.2)))
    assert warn["status"] == "warn"
    ok = check_three_second_hook({"captions": [cap(1, "Stop building", 0.1, 1.0)]}, [(0.0, 9.0)], W(("Stop", 0.2, 0.5)))
    assert ok["status"] == "pass" and ok["score"] == 1.0


def test_hook_measures_from_first_kept_frame_not_file_start():
    # source has 5s of rambling cut away; the edit starts right on the first word
    r = check_three_second_hook({"captions": []}, [(5.0, 15.0)], W(("Stop", 5.1, 5.4)))
    assert r["status"] == "pass"


def test_hook_cliche_warns_and_nothing_to_judge_is_skipped():
    r = check_three_second_hook({"captions": []}, [(0.0, 9.0)], W(("Hey", 0.1, 0.3), ("guys", 0.3, 0.6)))
    assert r["status"] == "warn" and "hey guys" in r["detail"]
    assert check_three_second_hook({"captions": []}, [(0.0, 9.0)], None)["status"] == "skipped"


def test_sendability_needs_a_real_trigger_near_the_end():
    caps = [cap(1, "Most founders build too early", 0, 3), cap(2, "Ask for prepayment first", 10, 13),
            cap(3, "Send this to your cofounder", 25, 28)]
    assert check_sendability_cta({"captions": caps}, [(0, 30)])["score"] == 1.0
    early = [cap(1, "Save this for later", 0, 2), cap(2, "Body one", 10, 13), cap(3, "Body two", 25, 28)]
    r = check_sendability_cta({"captions": early}, [(0, 30)])
    assert r["status"] == "pass" and r["score"] < 1.0
    none = check_sendability_cta({"captions": [cap(1, "Nothing here", 0, 2), cap(2, "Still nothing", 20, 22)]}, [(0, 30)])
    assert none["status"] == "warn"
    assert check_sendability_cta({"captions": []}, [(0, 30)])["status"] == "skipped"
