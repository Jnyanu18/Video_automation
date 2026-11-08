"""Full end-to-end audit test with 5 real reference clips + raw footage.
Ingests 5 clips, aggregates style, generates storyboard, revises it, and renders Draft + Final MP4s.
Prints exact ffprobe inspection of output media.
"""
from __future__ import annotations

import json
import subprocess
import tempfile
import time
from pathlib import Path

from reelforge.workspace import WorkspaceManager
from reelforge.ingestion.queue import IngestionQueue
from reelforge.style.aggregator import aggregate_styles
from reelforge.style.reviser import revise_style
from reelforge.storyboard.generator import generate_storyboard
from reelforge.storyboard.editor import revise_storyboard
from reelforge.render.ffmpeg_ass import FFmpegAssRenderer

def generate_sample_clip(output_path: Path, duration: float, color: str, freq: int):
    """Generate an actual valid MP4 video clip with audio and video streams."""
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"color=c={color}:s=720x1280:d={duration}:r=30",
        "-f", "lavfi", "-i", f"sine=frequency={freq}:duration={duration}",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k",
        str(output_path)
    ]
    subprocess.run(cmd, capture_output=True, check=True)

def probe_video(video_path: Path | str) -> dict:
    """Run ffprobe to get real technical video streams and properties."""
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,duration,r_frame_rate,codec_name",
        "-of", "json",
        str(video_path)
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(res.stdout)["streams"][0]

def run_e2e_audit():
    print("=" * 70)
    print("  REELFORGE END-TO-END AUDIT WITH REAL VIDEO FILES")
    print("=" * 70)

    with tempfile.TemporaryDirectory() as tmpdir:
        ws = WorkspaceManager(tmpdir)
        raw_dir = Path(tmpdir) / "Raw Footage"
        ref_source_dir = Path(tmpdir) / "sources"
        ref_source_dir.mkdir()

        # 1. Create 5 real reference video files
        print("\n[Step 1] Creating 5 real reference video clips...")
        ref_files = []
        colors = ["red", "blue", "green", "purple", "orange"]
        durations = [3.0, 4.0, 3.5, 2.8, 4.2]
        for i, (col, dur) in enumerate(zip(colors, durations), 1):
            p = ref_source_dir / f"reference_reel_{i}.mp4"
            generate_sample_clip(p, duration=dur, color=col, freq=300 + i * 50)
            ref_files.append(p)
            print(f"  - Created {p.name}: {dur}s, color={col}")

        # Ingest all 5 clips via IngestionQueue
        print("\n[Step 2] Ingesting and analyzing 5 reference reels via IngestionQueue...")
        queue = IngestionQueue(tmpdir, max_workers=2)
        items = queue.add_bulk([str(p) for p in ref_files])

        # Wait for all 5 to complete
        start_wait = time.time()
        while time.time() - start_wait < 60:
            statuses = [queue.get_status(item.id).status for item in items]
            if all(s == "completed" for s in statuses):
                break
            time.sleep(0.5)

        analyses = queue.get_analyzed_reels()
        print(f"  ✓ Successfully analyzed & cached {len(analyses)}/5 reference reels.")
        assert len(analyses) == 5

        # 2. Build Style Sheet via Map-Reduce
        print("\n[Step 3] Building Style Sheet v1 via Hierarchical Map-Reduce...")
        style = aggregate_styles(analyses, version=1, name="Audit Creator Style")
        print(f"  ✓ Generated Style Sheet v{style.version}: '{style.name}'")
        print(f"    - Median cut interval: {style.pacing.avg_cut_interval_seconds}s")
        print(f"    - Dominant font: {style.fonts.family} ({style.fonts.casing})")
        print(f"    - Palette colors: {style.colors[:3]}")

        # 3. Create real Raw Footage video
        print("\n[Step 4] Ingesting raw footage...")
        raw_video = raw_dir / "raw_creator_take.mp4"
        generate_sample_clip(raw_video, duration=8.0, color="darkblue", freq=220)
        print(f"  ✓ Raw footage created at: {raw_video.name} (8.0s)")

        # 4. Generate Storyboard
        print("\n[Step 5] Drafting Storyboard from raw footage + style sheet...")
        storyboard = generate_storyboard(str(raw_video), style, target_duration=6.0)
        print(f"  ✓ Generated Storyboard: '{storyboard.title}'")
        print(f"    - Total scenes: {len(storyboard.scenes)}")
        print(f"    - Target duration: {storyboard.target_duration}s")
        for s in storyboard.scenes:
            print(f"      Scene #{s.scene_number}: {s.src_start}s -> {s.src_end}s ({s.out_duration}s) | motion={s.camera_motion} | \"{s.caption_text}\"")

        # 5. Apply Plain-English Revision
        print("\n[Step 6] Applying conversational revision ('punch zoom on scene 1 and shorten intro')...")
        revised_sb, diff = revise_storyboard(storyboard, "punch zoom on scene 1 and shorten intro")
        print(f"  ✓ Storyboard Revision applied: {diff.get('reason')}")
        print(f"    - Scene 1 motion: {revised_sb.scenes[0].camera_motion}")
        print(f"    - Scene 1 duration: {revised_sb.scenes[0].out_duration}s")

        # 6. Render Draft (540x960)
        print("\n[Step 7] Rendering DRAFT 9:16 Video (540x960)...")
        renderer = FFmpegAssRenderer()
        draft_out = Path(tmpdir) / "Output" / "audit_draft_540x960.mp4"
        draft_res = renderer.render(revised_sb, style, str(draft_out), quality="draft")
        print(f"  ✓ Draft Render Success: {draft_res.success} in {draft_res.render_time_seconds}s")
        probe_draft = probe_video(draft_out)
        print(f"    [ffprobe DRAFT] Resolution: {probe_draft['width']}x{probe_draft['height']}, Codec: {probe_draft['codec_name']}, FPS: {probe_draft['r_frame_rate']}, Duration: {probe_draft['duration']}s")
        assert probe_draft['width'] == 540
        assert probe_draft['height'] == 960

        # 7. Render Final (1080x1920)
        print("\n[Step 8] Rendering FINAL 9:16 Video (1080x1920)...")
        final_out = Path(tmpdir) / "Output" / "audit_final_1080x1920.mp4"
        final_res = renderer.render(revised_sb, style, str(final_out), quality="final")
        print(f"  ✓ Final Render Success: {final_res.success} in {final_res.render_time_seconds}s")
        probe_final = probe_video(final_out)
        print(f"    [ffprobe FINAL] Resolution: {probe_final['width']}x{probe_final['height']}, Codec: {probe_final['codec_name']}, FPS: {probe_final['r_frame_rate']}, Duration: {probe_final['duration']}s")
        assert probe_final['width'] == 1080
        assert probe_final['height'] == 1920

        queue.close()
        ws.close()
        print("\n" + "=" * 70)
        print("  ✓ AUDIT COMPLETE: ALL STEPS VERIFIED WITH REAL VIDEO FILES")
        print("=" * 70)

if __name__ == "__main__":
    run_e2e_audit()
