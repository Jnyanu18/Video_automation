"""cut_silences must follow the speech, not just the audio level."""
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


def test_cut_never_touches_a_word_the_audio_detector_missed(tmp_path):
    # the detector says 4.0-6.0 is silent, but a quiet word sits at 5.0-5.3
    write_words(tmp_path, [(3.0, 3.9), (5.0, 5.3), (6.1, 6.5)])
    r = cut(PLAN, [(4.0, 6.0)], min_silence=0.25, padding=0.05, workdir=str(tmp_path))
    keep = normalize_keep(r["plan"]["keep"])
    for a, b in [(3.0, 3.9), (5.0, 5.3), (6.1, 6.5)]:
        assert any(s <= a and e >= b for s, e in keep), f"word {a}-{b} was cut: {keep}"
    assert r["result"]["snapped_to_words"] is True and r["result"]["removed"] > 0.5


def test_no_slivers_are_left_between_close_silences(tmp_path):
    write_words(tmp_path, [(0.0, 0.9), (4.0, 4.8)])
    r = cut(PLAN, [(1.0, 2.0), (2.1, 3.9)], min_silence=0.25, padding=0.05, workdir=str(tmp_path))
    spans = normalize_keep(r["plan"]["keep"])
    assert all(e - s >= 0.3 for s, e in spans if s > 0 and e < 20), spans
    assert len(spans) == 2  # the 0.1 s speechless island between the two silences is gone


def test_without_a_transcript_it_warns_instead_of_pretending(tmp_path):
    r = cut(PLAN, [(4.0, 6.0)], min_silence=0.25, workdir=str(tmp_path))
    assert any("transcribe" in w for w in r["warnings"]) and r["result"]["snapped_to_words"] is False


def test_snap_can_be_turned_off(tmp_path):
    write_words(tmp_path, [(5.0, 5.3)])
    r = cut(PLAN, [(4.0, 6.0)], min_silence=0.25, padding=0.0, workdir=str(tmp_path), snap_to_words=False)
    assert normalize_keep(r["plan"]["keep"]) == [(0.0, 4.0), (6.0, 20.0)]


def W(*items):
    return [{"word": w, "start": s, "end": e} for w, s, e in items]


def test_flash_by_captions_are_joined_to_a_close_neighbour():
    words = W(("Big", 0.0, 0.2), ("companies", 0.2, 0.6), ("like", 0.65, 0.8), ("AWS", 0.8, 1.2), ("build", 1.25, 1.6),
              ("their", 1.6, 1.8), ("own", 1.8, 2.1))
    groups = _group_words(words, max_words=2, max_gap=0.6, max_chars=42, min_dur=0.8)
    assert all(g["end"] - g["start"] >= 0.8 for g in groups[:-1])
    assert [w["word"] for g in groups for w in g["words"]] == [w["word"] for w in words]  # no word lost or reordered


def test_a_lone_short_caption_after_a_long_pause_is_kept():
    words = W(("Hello", 0.0, 0.4), ("there", 5.0, 5.3))
    assert len(_group_words(words, max_words=4, max_gap=0.6, max_chars=42, min_dur=0.8)) == 2
