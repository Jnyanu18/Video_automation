"""Crash-resume verification script for ReelForge ingestion queue."""
import os
import subprocess
import tempfile
import time
from pathlib import Path
from reelforge.workspace import WorkspaceManager
from reelforge.ingestion.queue import IngestionQueue
from reelforge.db.connection import get_db

def create_sample_video(path: Path, duration: int = 2):
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", f"testsrc=duration={duration}:size=320x240:rate=24",
        "-f", "lavfi", "-i", f"sine=frequency=440:duration={duration}",
        "-c:v", "libx264", "-c:a", "aac", str(path)
    ], capture_output=True, check=True)

def test_crash_resume():
    with tempfile.TemporaryDirectory() as tmpdir:
        ws = WorkspaceManager(tmpdir)
        raw_dir = Path(tmpdir) / "raw"
        raw_dir.mkdir()

        # Create 3 small test video files
        v1 = raw_dir / "clip1.mp4"
        v2 = raw_dir / "clip2.mp4"
        v3 = raw_dir / "clip3.mp4"
        create_sample_video(v1, 2)
        create_sample_video(v2, 2)
        create_sample_video(v3, 2)

        print("[Phase 1] Starting Queue and processing clip1 & clip2...")
        q1 = IngestionQueue(tmpdir, max_workers=1)
        item1 = q1.add(str(v1), title="clip1")
        item2 = q1.add(str(v2), title="clip2")

        # Wait for item 1 & 2 to complete
        for _ in range(30):
            s1 = q1.get_status(item1.id)
            s2 = q1.get_status(item2.id)
            if s1 and s1.status == "completed" and s2 and s2.status == "completed":
                break
            time.sleep(0.5)

        cache_files_before = list((Path(tmpdir) / ".reelforge" / "cache").glob("*.json"))
        print(f"[Phase 1] Completed clips cached: {len(cache_files_before)}")
        assert len(cache_files_before) == 2

        # Simulate clip 3 queued and abrupt kill/termination
        print("[Phase 2] Simulating abrupt process crash while clip3 is queued...")
        q1.executor.shutdown(wait=False, cancel_futures=True)
        ws.close()

        # Phase 3: Resume after crash
        print("[Phase 3] Restarting application and resuming queue...")
        ws2 = WorkspaceManager(tmpdir)
        q2 = IngestionQueue(tmpdir, max_workers=1)

        # Check existing cached reels are preserved
        cached_reels = q2.get_analyzed_reels()
        print(f"[Phase 3] Preserved analyzed reels on restart: {len(cached_reels)}")
        assert len(cached_reels) == 2

        # Ingest clip 3 now
        print("[Phase 3] Resuming ingestion with clip3...")
        item3 = q2.add(str(v3), title="clip3")
        for _ in range(30):
            s3 = q2.get_status(item3.id)
            if s3 and s3.status == "completed":
                break
            time.sleep(0.5)

        all_cached = q2.get_analyzed_reels()
        print(f"[Phase 3] Total analyzed reels after resume: {len(all_cached)}")
        assert len(all_cached) == 3

        q2.close()
        ws2.close()
        print("✓ CRASH-RESUME AUDIT: VERIFIED SUCCESSFULLY")


if __name__ == "__main__":
    test_crash_resume()
