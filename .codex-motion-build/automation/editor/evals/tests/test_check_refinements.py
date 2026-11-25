"""On-screen text, karaoke reading tolerance, and speech-level loudness comparison."""
import numpy as np

from evals.checks import DEFAULTS, check_captions, check_loudness_jumps, check_sendability_cta, check_three_second_hook


def cap(i, text, s, e, **kw):
    return {"id": f"c{i}", "text": text, "start": s, "end": e, **kw}


def test_on_screen_title_counts_as_the_share_trigger_and_early_text():
    plan = {"captions": [cap(1, "Plain talk", 5, 8)], "overlays": [
        {"kind": "title", "start": 0.0, "end": 2.0, "params": {"text": "AI is easy. Trust is hard."}},
        {"kind": "title", "start": 28.0, "end": 30.0, "params": {"text": "Send this to a founder"}}]}
    assert check_sendability_cta(plan, [(0, 30)])["score"] == 1.0
    assert check_three_second_hook(plan, [(0, 30)], None)["status"] == "pass"


def test_karaoke_lines_get_wider_reading_tolerance_than_plain_captions():
    words = [{"word": "w", "start": 0, "end": 1}]
    line = cap(1, "x" * 28, 0.0, 1.0)  # 28 characters per second
    plain = check_captions([{**line, "style": "clean"}], DEFAULTS)[1]
    karaoke = check_captions([{**line, "style": "karaoke", "words": words}], DEFAULTS)[1]
    assert plain["status"] == "fail" and karaoke["status"] == "warn"
    very_fast = check_captions([{**cap(2, "x" * 40, 0.0, 1.0), "style": "karaoke", "words": words}], DEFAULTS)[1]
    assert very_fast["status"] == "fail"  # still has a ceiling


def test_loudness_check_compares_speech_not_silent_padding():
    sr = 16000
    t = np.arange(int(sr * 6)) / sr
    voice = 0.5 * np.sin(2 * np.pi * 200 * t)
    x = voice.copy()
    x[int(1.9 * sr):int(2.0 * sr)] = 0.0005  # a near-silent tail right before the cut: a pause, not a level jump
    assert check_loudness_jumps([(0.0, 2.0), (3.0, 6.0)], x, sr, 6.0, DEFAULTS)["status"] == "pass"
    y = voice.copy()
    y[int(3.0 * sr):] *= 0.1  # speech that really is 20 dB quieter after the cut (still well above the silence floor)
    assert check_loudness_jumps([(0.0, 2.0), (3.0, 6.0)], y, sr, 6.0, DEFAULTS)["status"] == "fail"
