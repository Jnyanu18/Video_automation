"""Edge slivers, speechless scraps, and caption linger."""
import json

from tools.edit import TOOLS
from tools.edit.captions import _group_words
from tools.edit.timeline import normalize_keep

PLAN = {"version": 1, "source": {"path": "x.mp4", "duration": 20.0, "width": 640, "height": 360, "fps": 30},
        "output": {"width": 360, "height": 640, "fps": 30}, "keep": [{"id": "k1", "start": 0, "end": 20}],
        "captions": [], "reframe": {"mode": "none", "track": []}, "overlays": [], "style_ref": None, "notes": ""}


def cut(plan, silences, **kw):
    return TOOLS["cut_silences"]["fn"](plan, silences=[{"start": a, "end": b} for a, b in silences], **kw)


def write_words(tmp_path, words):
    (tmp_path / "transcript.json").write_text(json.dumps({"words": [{"word": "w", "start": a, "end": b} for a, b in words]}))


def W(*items):
    return [{"word": w, "start": s, "end": e} for w, s, e in items]


def test_silence_at_the_file_edges_is_cut_to_the_edge_without_slivers():
    r = cut(PLAN, [(0.0, 0.4), (19.5, 20.0)], min_silence=0.25, padding=0.05)
    (a, b), = normalize_keep(r["plan"]["keep"])
    assert abs(a - 0.35) < 1e-6 and abs(b - 19.55) < 1e-6  # padding only on the speech side, none at the file edges


def test_a_speechless_scrap_after_the_last_word_is_dropped(tmp_path):
    write_words(tmp_path, [(1.0, 1.5), (19.0, 19.4)])
    r = cut(PLAN, [(2.0, 18.0), (19.5, 19.8)], min_silence=0.25, padding=0.05, workdir=str(tmp_path))
    spans = normalize_keep(r["plan"]["keep"])
    assert all(e - s >= 0.3 for s, e in spans)
    assert any(s <= 19.0 and e >= 19.4 for s, e in spans)  # the last word is intact


def test_lines_linger_into_the_pause_but_never_into_the_next_line():
    words = W(("Absolutely", 0.0, 0.3), ("incredible", 0.3, 0.6), ("breakthroughs.", 0.6, 0.9), ("Next", 3.0, 3.3), ("one", 3.3, 3.6), ("now", 3.6, 3.9))
    g = _group_words(words, max_words=3, max_gap=0.6, max_chars=42, min_dur=0.8)
    assert 0.9 < g[0]["end"] <= 1.3 and g[0]["end"] < g[1]["start"] - 0.02


def test_continuous_speech_is_not_stretched_into_the_next_line():
    words = W(("one", 0.0, 0.3), ("two.", 0.3, 0.6), ("three", 0.62, 0.9), ("four.", 0.9, 1.2))
    g = _group_words(words, max_words=2, max_gap=0.6, max_chars=42, min_dur=0.2)
    assert g[0]["end"] == 0.6 and g[0]["end"] < g[1]["start"]  # no room before the next line: it is not stretched
