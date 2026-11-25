"""Custom music is staged per account and attached to the worker's job brief."""
import io
import json
import subprocess
import wave

from fastapi import FastAPI
from fastapi.testclient import TestClient

from studio import agent_bridge as bridge
from scripts.agent_worker import mix_custom_audio


def wav_bytes():
    output = io.BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(8000)
        audio.writeframes(b"\0\0" * 8000)
    return output.getvalue()


def test_custom_audio_reaches_job_and_is_account_scoped(tmp_path, monkeypatch):
    monkeypatch.setattr(bridge, "QUEUE_DIR", tmp_path / "queue")
    first, second = FastAPI(), FastAPI()
    bridge.register_agent_routes(first, "alice", None)
    bridge.register_agent_routes(second, "bob", None)
    alice, bob = TestClient(first), TestClient(second)
    uploaded = alice.post("/api/editor/agent/audio", content=wav_bytes(),
                          headers={"x-file-name": "my-track.wav", "content-type": "audio/wav"})
    assert uploaded.status_code == 201, uploaded.text
    audio_id = uploaded.json()["audio"]["id"]
    brief = {"kind": "motion", "prompt": "Animate the brand", "audio_upload_id": audio_id}
    assert bob.post("/api/editor/agent/jobs", json=brief).status_code == 400
    created = alice.post("/api/editor/agent/jobs", json=brief)
    assert created.status_code == 202, created.text
    job = bridge.read_job(created.json()["job"]["id"])
    assert job["audio_path"]
    assert (bridge.job_dir(job["id"]) / "custom_audio.wav").read_bytes() == wav_bytes()


def test_invalid_audio_is_rejected(tmp_path, monkeypatch):
    monkeypatch.setattr(bridge, "QUEUE_DIR", tmp_path / "queue")
    app = FastAPI()
    bridge.register_agent_routes(app, "alice", None)
    response = TestClient(app).post("/api/editor/agent/audio", content=b"not-a-track",
                                    headers={"x-file-name": "fake.mp3", "content-type": "audio/mpeg"})
    assert response.status_code == 422


def test_custom_music_is_in_finished_video(tmp_path):
    audio = tmp_path / "track.wav"
    audio.write_bytes(wav_bytes())
    video = tmp_path / "output.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=black:s=64x64:d=1",
                    "-c:v", "mpeg4", str(video)], check=True)
    mix_custom_audio(video, audio)
    info = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type", "-of", "json", str(video)],
                          capture_output=True, text=True, check=True)
    assert {stream["codec_type"] for stream in json.loads(info.stdout)["streams"]} == {"video", "audio"}
