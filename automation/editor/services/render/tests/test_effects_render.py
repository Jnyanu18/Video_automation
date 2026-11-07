"""Real renders of the Phase 1 effects (ffmpeg only, no browser): compare output with the timeline math and with frames/levels."""
import re
import subprocess

import cv2
import numpy as np
import pytest

from services.render import render_preview_info
from services.render.audio import measure_loudness
from services.render.cut import probe
from tools.audio import TOOLS as AUDIO
from tools.edit.timeline import output_duration
from tools.effects import TOOLS as FX

W, H = 640, 360  # preview output size for a 640x360 source


@pytest.fixture(scope="module")
def clip(tmp_path_factory):
    """12 s: moving test pattern (every frame is unique) + a 1500 Hz 'voice' that speaks 0-4 s and 8-12 s."""
    p = tmp_path_factory.mktemp("fx") / "clip.mp4"
    gate = "volume='if(between(t,0,4)+between(t,8,12),0.6,0)':eval=frame"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"testsrc2=size={W}x{H}:rate=30:duration=12",
                    "-f", "lavfi", "-i", "sine=f=1500:duration=12", "-af", gate, "-c:v", "libx264", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-shortest", str(p)], check=True)
    return p


def make_plan(clip, keep=((0, 12),)):
    return {"version": 1, "source": {"path": str(clip), "duration": 12.0, "width": W, "height": H, "fps": 30},
            "output": {"width": W, "height": H, "fps": 30},
            "keep": [{"id": f"k{i}", "start": s, "end": e} for i, (s, e) in enumerate(keep)],
            "captions": [], "reframe": {"mode": "none", "track": []}, "overlays": [], "style_ref": None, "notes": ""}


def fx(plan, tool, **kw):
    return FX[tool]["fn"](plan, **kw)["plan"]


def au(plan, tool, **kw):
    return AUDIO[tool]["fn"](plan, **kw)["plan"]


def render(plan, tmp_path):
    info = render_preview_info(plan, tmp_path)
    return info["path"]


def frame(path, t):
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(path), "-frames:v", "1", "-f", "image2pipe",
                        "-vcodec", "png", "-"], capture_output=True, check=True)
    return cv2.imdecode(np.frombuffer(r.stdout, np.uint8), cv2.IMREAD_COLOR).astype(np.float32)


def diff(a, b):
    return float(np.abs(a - b).mean())


def level_db(path, t0, d, band=None):
    af = (f"bandpass=f={band}:width_type=h:w=20," if band else "") + "volumedetect"
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-ss", str(t0), "-t", str(d), "-i", str(path), "-af", af,
                        "-f", "null", "-"], capture_output=True, text=True)
    return float(re.search(r"mean_volume: (-?[\d.]+) dB", r.stderr).group(1))


def test_speed_duration_and_content(clip, tmp_path):
    plan = fx(fx(make_plan(clip), "set_speed", start=4, end=8, factor=2.0), "set_speed", start=10, end=11, factor=0.5)
    out = render(plan, tmp_path)
    assert output_duration(plan) == 11.0
    assert probe(out)["duration"] == pytest.approx(11.0, abs=0.1)
    # output t=5.0 shows source t=6.0 (2x region started at out 4.0); output t=9.0 is source 9.0 (slow-mo starts at src 10)
    # NB: a frame count is not enough: check the picture is the right source moment, not a neighbouring one.
    for t_out, t_src in ((5.0, 6.0), (7.0, 9.0), (9.0, 10.5)):
        got = frame(out, t_out)
        ref = cv2.resize(frame(clip, t_src), (W, H))
        wrong = cv2.resize(frame(clip, t_src + 1.0), (W, H))
        assert diff(got, ref) < diff(got, wrong) * 0.6, (t_out, t_src, diff(got, ref), diff(got, wrong))


def test_speed_audio_stays_in_sync_and_pitch_preserved(clip, tmp_path):
    plan = fx(make_plan(clip), "set_speed", start=0, end=4, factor=2.0)  # voice 0-4 -> 0-2 ; silence 4-8 -> 2-6; voice 8-12 -> 6-10
    out = render(plan, tmp_path)
    assert level_db(out, 0.2, 1.5) > -45 and level_db(out, 2.5, 3.0) < -80 and level_db(out, 6.5, 3.0) > -45
    on_band, off_band = level_db(out, 0.3, 1.2, 1500), level_db(out, 0.3, 1.2, 3000)
    assert on_band - off_band > 30  # still at 1500 Hz (not shifted to 3000 Hz like a naive 2x resample would be)


def test_zoom_punches_in_at_peak_and_not_outside(clip, tmp_path):
    plan = fx(make_plan(clip), "add_zoom", start=3, end=9, scale=2.0, ramp=1.0)
    out = render(plan, tmp_path)
    plain = render(make_plan(clip), tmp_path / "plain")
    assert diff(frame(out, 1.0), frame(plain, 1.0)) < 6          # outside the zoom: identical picture
    peak, ref = frame(out, 6.0), frame(plain, 6.0)
    assert diff(peak, ref) > 25                                  # zoomed: picture differs a lot
    cx0, cy0 = W // 4, H // 4                                    # 2x zoom == centre half of the plain frame, enlarged
    expect = cv2.resize(ref[cy0:cy0 + H // 2, cx0:cx0 + W // 2], (W, H), interpolation=cv2.INTER_CUBIC)
    assert diff(peak, expect) < 12, diff(peak, expect)
    assert probe(out)["duration"] == pytest.approx(12.0, abs=0.1)


def test_color_grade_presets_change_color(clip, tmp_path):
    ref = frame(render(make_plan(clip), tmp_path / "n"), 2.0)
    bw = frame(render(fx(make_plan(clip), "set_color_grade", preset="bw"), tmp_path / "bw"), 2.0)
    warm = frame(render(fx(make_plan(clip), "set_color_grade", preset="warm"), tmp_path / "warm"), 2.0)
    assert float(np.abs(bw[..., 0] - bw[..., 2]).mean()) < 4 and float(np.abs(ref[..., 0] - ref[..., 2]).mean()) > 20  # BGR
    assert (warm[..., 2].mean() - warm[..., 0].mean()) > (ref[..., 2].mean() - ref[..., 0].mean()) + 3  # more red than blue
    bright = frame(render(fx(make_plan(clip), "set_color_grade", exposure=1.0), tmp_path / "ex"), 2.0)
    dark = frame(render(fx(make_plan(clip), "set_color_grade", exposure=-1.0), tmp_path / "ex-"), 2.0)
    assert bright.mean() > ref.mean() + 3   # the saturated test pattern clips at 255, so brightening shows less than darkening
    assert dark.mean() < ref.mean() * 0.7


def test_color_grade_with_lut_file(clip, tmp_path):
    lut = tmp_path / "invert.cube"
    pts = [(r, g, b) for b in (0, 1) for g in (0, 1) for r in (0, 1)]
    lut.write_text("LUT_3D_SIZE 2\n" + "\n".join(f"{1 - r} {1 - g} {1 - b}" for r, g, b in pts))
    ref = frame(render(make_plan(clip), tmp_path / "n"), 2.0)
    inv = frame(render(fx(make_plan(clip), "set_color_grade", lut=str(lut)), tmp_path / "lut"), 2.0)
    assert diff(inv, 255 - ref) < 20


@pytest.mark.parametrize("kind", ["crossfade", "wipe-left", "slide-left", "fade-black"])
def test_transition_duration_and_midframe(clip, tmp_path, kind):
    plan = fx(make_plan(clip, [(0, 4), (8, 12)]), "add_transition", kind=kind, duration=1.0, boundary=0)
    out = render(plan, tmp_path)
    assert output_duration(plan) == 7.0
    assert probe(out)["duration"] == pytest.approx(7.0, abs=0.1)
    mid = frame(out, 3.5)  # middle of the overlap (out 3.0 .. 4.0)
    a, b = cv2.resize(frame(clip, 3.5), (W, H)), cv2.resize(frame(clip, 8.5), (W, H))
    assert diff(mid, a) > 5 and diff(mid, b) > 5            # neither clip on its own
    assert diff(frame(out, 1.0), cv2.resize(frame(clip, 1.0), (W, H))) < 6    # before the overlap: clip 1
    assert diff(frame(out, 5.0), cv2.resize(frame(clip, 10.0), (W, H))) < 6   # after: clip 2 (starts at out 3.0 = src 8.0)
    assert probe(out)["has_audio"]


def test_transition_combined_with_speed_zoom_grade_and_cut(clip, tmp_path):
    plan = make_plan(clip, [(0, 4), (8, 12)])
    plan = fx(plan, "add_transition", kind="slide-left", duration=0.5, all=True)
    plan = fx(plan, "set_speed", start=0, end=2, factor=2.0)
    plan = fx(plan, "add_zoom", start=9, end=11, scale=1.4)
    plan = fx(plan, "set_color_grade", preset="vintage", contrast=1.1)
    out = render(plan, tmp_path)
    assert probe(out)["duration"] == pytest.approx(output_duration(plan), abs=0.12)


def test_music_ducking_depth(clip, tmp_path):
    base = au(make_plan(clip), "add_music", generate="calm", volume_db=-14, workdir=str(tmp_path))
    plain = render(base, tmp_path / "a")
    ducked = render(au(base, "duck_music_under_speech", amount_db=12), tmp_path / "b")
    # the music's 110 Hz tone, measured while the (1500 Hz) voice speaks vs in the silent gap
    d_plain = level_db(plain, 5.0, 2.0, 110) - level_db(plain, 1.0, 2.0, 110)
    d_duck = level_db(ducked, 5.0, 2.0, 110) - level_db(ducked, 1.0, 2.0, 110)
    assert abs(d_plain) < 2
    assert 8 < d_duck < 16, d_duck
    assert level_db(ducked, 5.0, 2.0, 110) > -60  # music is still audible in the gap
    assert probe(ducked)["duration"] == pytest.approx(12.0, abs=0.1)


def test_music_fades_and_start_offset(clip, tmp_path):
    plan = au(make_plan(clip), "add_music", generate="ambient", volume_db=-10, start=5, fade_in=0.5, fade_out=1.0, workdir=str(tmp_path))
    out = render(plan, tmp_path / "o")
    # measured inside the voice-free gap (4-8 s): silent before start=5, music after it
    assert level_db(out, 4.2, 0.6, 82.4) < level_db(out, 6.0, 1.0, 82.4) - 20
    assert level_db(out, 11.5, 0.5, 82.4) < level_db(out, 6.0, 1.0, 82.4) - 3   # fading out over the last second


def test_mute_segments_are_silent_and_follow_speed(clip, tmp_path):
    plan = au(make_plan(clip), "mute_segments", ranges=[{"start": 1.0, "end": 3.0}])
    out = render(plan, tmp_path / "m")
    assert level_db(out, 1.2, 1.6) < -80 and level_db(out, 8.5, 2.0) > -45
    sped = fx(au(make_plan(clip), "mute_segments", ranges=[{"start": 9.0, "end": 10.0}]), "set_speed", start=0, end=4, factor=2.0)
    out = render(sped, tmp_path / "s")  # source 9-10 s is output 7-8 s
    assert level_db(out, 7.1, 0.8) < -80 and level_db(out, 8.5, 1.0) > -45 and level_db(out, 6.2, 0.6) > -45


@pytest.mark.parametrize("target", [-16, -23])
def test_loudness_hits_target(clip, tmp_path, target):
    plan = au(make_plan(clip), "normalize_loudness", target_lufs=target)
    out = render(plan, tmp_path)
    assert measure_loudness(out)["lufs"] == pytest.approx(target, abs=1.0)


def test_everything_together_music_duck_mute_loudness_after_cut(clip, tmp_path):
    plan = make_plan(clip, [(0, 4), (8, 12)])
    plan = au(plan, "add_music", generate="calm", volume_db=-14, workdir=str(tmp_path))
    plan = au(plan, "duck_music_under_speech", amount_db=12)
    plan = au(plan, "mute_segments", ranges=[{"start": 9.0, "end": 10.0}])  # output 5-6 after the cut
    plan = au(plan, "normalize_loudness", target_lufs=-16)
    out = render(plan, tmp_path / "all")
    assert probe(out)["duration"] == pytest.approx(8.0, abs=0.1)
    assert measure_loudness(out)["lufs"] == pytest.approx(-16, abs=1.0)
    assert level_db(out, 5.1, 0.8, 1500) < -70 and level_db(out, 6.5, 1.0, 1500) > -40  # voice muted only 5-6 s
