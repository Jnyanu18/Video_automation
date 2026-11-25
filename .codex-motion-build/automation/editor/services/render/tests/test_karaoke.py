"""Word-by-word karaoke captions: composition HTML, remap of word timings, and a real render."""
import subprocess

import cv2
import numpy as np
import pytest

from services.render import render_preview_info
from services.render.composition import build_composition
from tools.edit import TOOLS as EDIT
from tools.edit.timeline import remap_to_output

WORDS = [{"word": "alpha", "start": 0.2, "end": 0.8}, {"word": "beta", "start": 0.8, "end": 1.4},
         {"word": "gamma", "start": 1.4, "end": 2.0}]


def karaoke_plan(src, words=WORDS, dur=2.4):
    plan = {"version": 1, "source": {"path": str(src), "duration": dur, "width": 640, "height": 360, "fps": 30},
            "output": {"width": 640, "height": 360, "fps": 30}, "keep": [{"id": "k1", "start": 0, "end": dur}],
            "captions": [], "reframe": {"mode": "none", "track": []}, "overlays": [], "style_ref": None, "notes": ""}
    return EDIT["set_captions"]["fn"](plan, words=words, style="karaoke", max_words=3)["plan"]


@pytest.fixture(scope="module")
def dark_clip(tmp_path_factory):
    p = tmp_path_factory.mktemp("k") / "dark.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=0x202040:s=640x360:r=30:d=2.4",
                    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo:d=2.4", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-shortest", str(p)], check=True)
    return p


def test_set_captions_keeps_word_timings(dark_clip):
    cap = karaoke_plan(dark_clip)["captions"][0]
    assert cap["style"] == "karaoke" and [w["word"] for w in cap["words"]] == ["alpha", "beta", "gamma"]


def test_composition_has_one_span_and_two_tweens_per_word(tmp_path, dark_clip):
    cap = remap_to_output(karaoke_plan(dark_clip))["captions"]
    warns = build_composition(tmp_path / "proj", dark_clip, 2.4, cap, [], 640, 360, 30)
    html = (tmp_path / "proj" / "index.html").read_text()
    assert warns == []
    assert all(f'id="cap0w{k}"' in html for k in range(3))
    assert html.count('tl.to("#cap0w1"') == 2                       # light up, then back to white
    assert 'tl.to("#cap0w1",{color:"#ffd400",scale:1.08,duration:0.06,ease:"power2.out"},0.800)' in html


def test_karaoke_without_words_falls_back_with_warning(tmp_path, dark_clip):
    caps = [{"id": "c1", "text": "no timings here", "start": 0.2, "end": 1.5, "style": "karaoke"}]
    warns = build_composition(tmp_path / "p", dark_clip, 2.4, caps, [], 640, 360, 30)
    assert any("needs word timings" in w for w in warns)
    assert 'class="w"' not in (tmp_path / "p" / "index.html").read_text()


def test_word_timings_follow_cuts_and_speed(dark_clip):
    plan = karaoke_plan(dark_clip)
    plan["keep"] = [{"id": "k1", "start": 0.0, "end": 1.1}, {"id": "k2", "start": 1.3, "end": 2.4}]  # cut inside "beta" and after
    plan["speed"] = [{"id": "s1", "start": 1.3, "end": 2.4, "factor": 2.0}]
    caps = remap_to_output(plan)["captions"]
    by = {c["id"]: c for c in caps}
    first, second = by["c1"], by["c1~2"]
    assert [(w["word"], w["start"], w["end"]) for w in first["words"]] == [("alpha", 0.2, 0.8), ("beta", 0.8, 1.1)]
    # second piece: "beta" tail 1.3-1.4 (0.05 s at 2x), "gamma" 1.4-2.0 (0.3 s at 2x), starting at out 1.1
    assert [(w["word"], round(w["start"], 3), round(w["end"], 3)) for w in second["words"]] == [
        ("beta", 1.1, 1.15), ("gamma", 1.15, 1.45)]
    for c in caps:
        assert all(c["start"] - 1e-6 <= w["start"] < w["end"] <= c["end"] + 1e-6 for w in c["words"])


def yellow_centroid_x(frame):
    b, g, r = frame[..., 0], frame[..., 1], frame[..., 2]
    m = (r > 200) & (g > 170) & (b < 110)
    return (float(np.nonzero(m)[1].mean()), int(m.sum())) if m.sum() > 30 else (None, int(m.sum()))


def frame_at(path, t):
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(path), "-frames:v", "1", "-f", "image2pipe",
                        "-vcodec", "png", "-"], capture_output=True, check=True)
    return cv2.imdecode(np.frombuffer(r.stdout, np.uint8), cv2.IMREAD_COLOR)


def test_real_render_highlight_moves_word_by_word(tmp_path, dark_clip):
    out = render_preview_info(karaoke_plan(dark_clip), tmp_path)["path"]
    xs = []
    for t in (0.55, 1.15, 1.75):  # middle of alpha, beta, gamma
        cx, n = yellow_centroid_x(frame_at(out, t))
        assert cx is not None, f"no highlighted word visible at t={t} ({n} yellow px)"
        xs.append(cx)
    assert xs[0] < xs[1] < xs[2], xs                              # the lit word moves left to right along the line
    assert xs[2] - xs[0] > 60
    before = yellow_centroid_x(frame_at(out, 0.1))[0]             # caption not on yet
    assert before is None
    assert yellow_centroid_x(frame_at(out, 2.2))[0] is None       # caption gone
