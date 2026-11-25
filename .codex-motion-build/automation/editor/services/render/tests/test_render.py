import json
import subprocess
from pathlib import Path

from services.render import render_final, render_preview
from services.render.composition import build_composition
from services.render.cut import build_video_filter, probe
from services.render.timeline import _fallback_remap, remap_to_output


def test_remap_fallback(plan):
    r = _fallback_remap(plan)
    assert [c["id"] for c in r["captions"]] == ["c1", "c2"]  # c3 is cut away
    assert r["captions"][1]["start"] == 1.7 and r["captions"][1]["end"] == 2.5  # 1.5 offset
    assert r["overlays"][0]["start"] == 2.0
    assert remap_to_output(plan)["captions"][0]["text"] == "hello world"  # lazy import falls back OK


def test_remap_clips_straddling(plan):
    plan["captions"] = [{"id": "x", "text": "t", "start": 1.0, "end": 3.5}]
    c = _fallback_remap(plan)["captions"]
    assert [(i["start"], i["end"]) for i in c] == [(1.0, 2.0)]  # 1.0-1.5 + 3.0-3.5 merged


def test_filter_face_follow(plan):
    f = build_video_filter(plan, plan["keep"][0], 360, 640, 30)
    assert "crop=202:360" in f and "between(t," in f and "pad" not in f


def test_none_mode_pads(plan):
    plan["reframe"] = {"mode": "none", "track": []}
    assert "pad=360:640" in build_video_filter(plan, plan["keep"][0], 360, 640, 30)


def test_composition_local_gsap_and_clips(plan, tmp_path):
    cut = tmp_path / "c.mp4"
    cut.write_bytes(b"x")
    w = build_composition(tmp_path / "p", cut, 3.0, _fallback_remap(plan)["captions"],
                          _fallback_remap(plan)["overlays"], 360, 640, 30)
    html = (tmp_path / "p" / "index.html").read_text()
    assert 'src="vendor/gsap.min.js"' in html and "http" not in html.replace("</", "")
    assert (tmp_path / "p" / "vendor" / "gsap.min.js").stat().st_size > 10000
    assert html.count('class="clip cap"') == 2 and 'data-has-audio="true"' in html and not w


def test_preview_end_to_end(plan, tmp_path):
    p = render_preview(plan, tmp_path)
    i = probe(p)
    assert abs(i["duration"] - 3.0) < 0.15 and i["has_audio"]
    assert (i["width"], i["height"]) == (360, 640) or i["width"] <= 360
    assert i["width"] * 16 // 9 in range(i["height"] - 4, i["height"] + 5)


def test_final_ffmpeg_only_frame_accurate(plan, tmp_path):
    plan["captions"], plan["overlays"] = [], []
    plan["keep"] = [{"id": "k", "start": 1.0, "end": 2.0}]
    p = render_final(plan, tmp_path)
    out = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v", "-show_entries",
                          "stream=nb_read_frames,width,height", "-of", "json", p], capture_output=True, text=True)
    s = json.loads(out.stdout)["streams"][0]
    assert s["nb_read_frames"] == "30" and (s["width"], s["height"]) == (360, 640)


def test_final_with_captions(plan, tmp_path):
    p = render_final(plan, tmp_path)
    i = probe(p)
    assert abs(i["duration"] - 3.0) < 0.15 and (i["width"], i["height"]) == (360, 640)
    # captions actually burned in: frame at 0.5s differs from the plain cut
    plain = tmp_path / "final_cut.mp4"
    a, b = tmp_path / "a.png", tmp_path / "b.png"
    for src, dst in ((p, a), (plain, b)):
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", "0.6", "-i", str(src), "-frames:v", "1", str(dst)], check=True)
    assert a.read_bytes() != b.read_bytes()
