import tempfile
from pathlib import Path
from reelforge.workspace import WorkspaceManager
from reelforge.doctor import run_doctor
from reelforge.installer import ToolInstaller

def test_workspace_manager_initializes_structure():
    with tempfile.TemporaryDirectory() as tmpdir:
        wm = WorkspaceManager(tmpdir)
        try:
            st = wm.status()
            assert st["exists"] is True
            assert st["raw_footage_count"] == 0
            assert st["reference_count"] == 0
            assert st["output_count"] == 0

            # Create a mock raw video file
            mock_raw = Path(tmpdir) / "Raw Footage" / "sample.mp4"
            mock_raw.write_bytes(b"mock video data")
            
            st2 = wm.status()
            assert st2["raw_footage_count"] == 1
            assert "sample.mp4" in st2["raw_files"]
        finally:
            wm.close()

def test_doctor_runs_and_returns_checklist():
    doc = run_doctor()
    assert "ok" in doc
    assert "tools" in doc
    assert len(doc["tools"]) >= 4
    tool_names = [t["name"] for t in doc["tools"]]
    assert "FFmpeg & FFprobe" in tool_names

def test_installer_requires_confirmation():
    plan = ToolInstaller.plan()
    assert "needed" in plan
    # Execute without confirm must return needs_confirmation = True if needed
    if plan["needed"]:
        res = ToolInstaller.execute(confirm=False)
        assert res["needs_confirmation"] is True
        assert len(res["planned_commands"]) > 0
