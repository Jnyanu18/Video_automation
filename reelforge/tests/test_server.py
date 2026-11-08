"""Test FastAPI server endpoints and chat conversation routing."""
import tempfile
from pathlib import Path
from fastapi.testclient import TestClient
from reelforge.server.app import app, state

client = TestClient(app)

def test_server_workspace_and_doctor():
    with tempfile.TemporaryDirectory() as tmpdir:
        state.set_workspace(tmpdir)
        try:
            # 1. Get workspace
            res = client.get("/api/workspace")
            assert res.status_code == 200
            data = res.json()
            assert data["exists"] is True

            # 2. Get doctor
            res_doc = client.get("/api/doctor")
            assert res_doc.status_code == 200
            doc = res_doc.json()
            assert "tools" in doc

            # 3. Chat routing: doctor
            res_chat = client.post("/api/chat", json={"message": "check doctor"})
            assert res_chat.status_code == 200
            cdata = res_chat.json()
            assert cdata["type"] == "doctor_report"

            # 4. Chat routing: install tools
            res_install = client.post("/api/chat", json={"message": "install tools"})
            assert res_install.status_code == 200
            idata = res_install.json()
            assert idata["type"] == "action_required"
            assert idata["needs_confirmation"] is True
        finally:
            state.workspace_mgr.close()

def test_server_chat_style_and_storyboard():
    with tempfile.TemporaryDirectory() as tmpdir:
        state.set_workspace(tmpdir)
        try:
            # Create a mock raw video file
            raw_file = Path(tmpdir) / "Raw Footage" / "sample_clip.mp4"
            import subprocess
            subprocess.run([
                "ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc=duration=3:size=320x240:rate=24",
                "-f", "lavfi", "-i", "sine=frequency=440:duration=3",
                "-c:v", "libx264", "-c:a", "aac", str(raw_file)
            ], capture_output=True, check=True)

            # 1. Chat asking for storyboard
            res_sb = client.post("/api/chat", json={"message": "create a storyboard for this raw video"})
            assert res_sb.status_code == 200
            sb_data = res_sb.json()
            assert sb_data["type"] == "storyboard_created"
            assert "storyboard" in sb_data
            assert len(sb_data["storyboard"]["scenes"]) >= 2

            # 2. Chat revising storyboard
            res_rev = client.post("/api/chat", json={"message": "shorten the intro scene"})
            assert res_rev.status_code == 200
            rev_data = res_rev.json()
            assert rev_data["type"] == "storyboard_revised"
        finally:
            state.workspace_mgr.close()
