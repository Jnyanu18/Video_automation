import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))


def ff(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


@pytest.fixture(scope="session")
def media(tmp_path_factory):
    """tone 0-2s | silence 2-4s | tone 4-6s ; video red 0-3s, blue 3-6s (hard cut at 3.0)."""
    d = tmp_path_factory.mktemp("media")
    ff("-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
       "-f", "lavfi", "-i", "sine=frequency=660:duration=2",
       "-filter_complex", "[1]atrim=0:2[s];[0][s][2]concat=n=3:v=0:a=1[a]", "-map", "[a]", str(d / "a.wav"))
    ff("-f", "lavfi", "-i", "color=c=red:s=320x240:r=25:d=3", "-f", "lavfi", "-i", "color=c=blue:s=320x240:r=25:d=3",
       "-filter_complex", "[0][1]concat=n=2:v=1:a=0[v]", "-map", "[v]", str(d / "v.mp4"))
    ff("-i", str(d / "v.mp4"), "-i", str(d / "a.wav"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
       "-shortest", str(d / "av.mp4"))
    shutil.copy(d / "v.mp4", d / "noaudio.mp4")
    # trailing silence: tone 0-1s then silence to 3s
    ff("-f", "lavfi", "-i", "sine=frequency=440:duration=1", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
       "-filter_complex", "[1]atrim=0:2[s];[0][s]concat=n=2:v=0:a=1[a]", "-map", "[a]", str(d / "tail.wav"))
    ff("-f", "lavfi", "-i", "color=c=gray:s=160x120:r=25:d=3", "-i", str(d / "tail.wav"), "-shortest",
       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", str(d / "tail.mp4"))
    fixture = d / "words.json"
    fixture.write_text(json.dumps({"language": "en", "words": [
        {"word": "Hello", "start": 0.1, "end": 0.5}, {"word": "world.", "start": 0.6, "end": 1.0},
        {"word": "Second", "start": 4.2, "end": 4.6}, {"word": "bit", "start": 4.7, "end": 5.0}]}))
    return {"dir": d, "av": d / "av.mp4", "noaudio": d / "noaudio.mp4", "tail": d / "tail.mp4", "words": fixture}


@pytest.fixture(scope="session")
def face_video(tmp_path_factory):
    """Real face (skimage astronaut) panning left->right over a gray 1280x720 background, 6s."""
    skimage = pytest.importorskip("skimage")
    import cv2
    from skimage import data

    d = tmp_path_factory.mktemp("face")
    cv2.imwrite(str(d / "face.png"), cv2.cvtColor(data.astronaut(), cv2.COLOR_RGB2BGR))
    ff("-f", "lavfi", "-i", "color=c=gray:s=1280x720:r=10:d=6", "-loop", "1", "-r", "10", "-i", str(d / "face.png"),
       "-filter_complex", "[0][1]overlay=x='60+t*120':y=100:shortest=1", "-c:v", "libx264", "-pix_fmt", "yuv420p",
       str(d / "face.mp4"))
    return d / "face.mp4"


@pytest.fixture
def plan():
    return {"version": 1, "source": {"path": "", "duration": 0}, "keep": []}
