import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))


@pytest.fixture(scope="session")
def sample(tmp_path_factory):
    """6s 640x360 30fps synthetic clip with a moving box and a tone."""
    d = tmp_path_factory.mktemp("sample")
    p = d / "in.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=s=640x360:r=30:d=6",
                    "-f", "lavfi", "-i", "sine=f=440:d=6", "-c:v", "libx264", "-preset", "ultrafast",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", str(p)], check=True)
    return p


@pytest.fixture
def plan(sample):
    return {
        "version": 1,
        "source": {"path": str(sample), "duration": 6.0, "width": 640, "height": 360, "fps": 30},
        "output": {"width": 360, "height": 640, "fps": 30},
        "keep": [{"id": "k1", "start": 0.0, "end": 1.5}, {"id": "k2", "start": 3.0, "end": 4.5}],
        "captions": [{"id": "c1", "text": "hello world", "start": 0.2, "end": 1.2, "style": "bold-pop"},
                     {"id": "c2", "text": "in the cut", "start": 3.2, "end": 4.0, "style": "clean"},
                     {"id": "c3", "text": "removed", "start": 2.0, "end": 2.8}],
        "reframe": {"mode": "face-follow", "track": [{"t": 0.0, "cx": 0.3, "cy": 0.5}, {"t": 6.0, "cx": 0.8, "cy": 0.5}]},
        "overlays": [{"id": "o1", "kind": "lower-third", "start": 3.5, "end": 4.4,
                      "asset": "", "params": {"name": "Jane Doe", "title": "CEO"}}],
        "style_ref": None, "notes": "",
    }


def pytest_configure(config):
    config.addinivalue_line("markers", "slow: renders real video with the Revideo caption renderer")


@pytest.fixture
def fake_remotion(monkeypatch):
    """Stand-in for the caption renderer (services/render/revideo.py; the fixture keeps its old name): the cut video
    is the 'rendered' file, so no browser runs. Records every call in the returned list."""
    import shutil
    from services.render import render as R

    calls: list[dict] = []

    def fake(proj, cut_video, duration, captions, overlays, w, h, fps, *, out_mp4, style=None, timeout=900):
        calls.append({"captions": captions, "overlays": overlays, "w": w, "h": h, "fps": fps, "duration": duration})
        shutil.copy(cut_video, out_mp4)
        return Path(out_mp4), []

    monkeypatch.setattr(R, "build_composition", fake)
    return calls
