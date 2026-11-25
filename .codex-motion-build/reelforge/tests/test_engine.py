"""End-to-end integration and smoke tests for ReelForge."""
import tempfile
import time
from pathlib import Path
import pytest

from reelforge.workspace import WorkspaceManager
from reelforge.doctor import run_doctor
from reelforge.installer import ToolInstaller
from reelforge.schemas.analysis import ReelAnalysis, SceneCut, PaletteColor, AudioMetrics, VisionStyleMetrics
from reelforge.schemas.style import StyleSheet
from reelforge.schemas.storyboard import StoryboardPlan, StoryboardScene
from reelforge.style.aggregator import aggregate_styles
from reelforge.style.reviser import revise_style
from reelforge.storyboard.generator import generate_storyboard
from reelforge.storyboard.editor import revise_storyboard, StoryboardHistory
from reelforge.render.ffmpeg_ass import FFmpegAssRenderer

def make_dummy_analysis(reel_id: str, cut_interval: float = 1.8, wpm: float = 175.0) -> ReelAnalysis:
    return ReelAnalysis(
        reel_id=reel_id,
        duration=15.0,
        width=1080,
        height=1920,
        fps=30.0,
        cuts=[SceneCut(start=(i-1)*cut_interval, end=i*cut_interval, duration=cut_interval) for i in range(1, int(15 / cut_interval))],
        avg_cut_interval=cut_interval,
        palette=[PaletteColor(hex="#FFDD00", rgb=(255, 221, 0), percentage=40.0)],
        audio=AudioMetrics(integrated_lufs=-14.2, speech_wpm=wpm),
        transcript=[],
        full_transcript_text="Dummy transcript for reel",
        vision_style=VisionStyleMetrics(font_families=["Inter"], colors=["#FFDD00"]),
        analyzed_at=time.time()
    )

def test_map_reduce_style_aggregator_scales():
    """Verify hierarchical map-reduce can aggregate 50+ reels with bounded memory."""
    analyses = [make_dummy_analysis(f"reel_{i}", cut_interval=1.5 + (i % 5) * 0.2) for i in range(55)]
    style = aggregate_styles(analyses, batch_size=10)
    
    assert style.version == 1
    assert style.reels_analyzed_count == 55
    assert 1.4 <= style.pacing.avg_cut_interval_seconds <= 2.5
    assert len(style.colors) > 0

def test_style_sheet_plain_english_reviser():
    """Verify style sheet revision produces a valid incremented version and diff."""
    base_style = StyleSheet(version=1)
    revised, diff = revise_style(base_style, "make the cut interval faster and color yellow")
    
    assert revised.version == 2
    assert "change_reason" in diff

def test_storyboard_generation_and_history():
    """Verify storyboard generation, revision, and undo/redo history."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a small valid test video using ffmpeg
        video_path = Path(tmpdir) / "sample_raw.mp4"
        import subprocess
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc=duration=4:size=320x240:rate=30",
            "-f", "lavfi", "-i", "sine=frequency=1000:duration=4",
            "-c:v", "libx264", "-c:a", "aac", str(video_path)
        ], capture_output=True, check=True)

        style = StyleSheet()
        plan = generate_storyboard(str(video_path), style, target_duration=3.6)
        
        assert len(plan.scenes) >= 2
        assert plan.original_duration >= 3.9
        assert plan.scenes[0].scene_number == 1

        # Test revisions
        history = StoryboardHistory(plan)
        assert history.can_undo is False

        updated, diff = revise_storyboard(history.current, "shorten intro scene")
        history.push(updated)
        assert history.can_undo is True
        assert len(history.current.scenes) > 0

        # Undo
        previous = history.undo()
        assert previous is not None
        assert history.can_undo is False
        assert history.can_redo is True

def test_ffmpeg_renderer_draft_mode():
    """Verify deterministic 9:16 rendering with ASS subtitles."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        raw_video = tmp / "raw.mp4"
        out_video = tmp / "rendered_output.mp4"

        # Generate a 3-second colored test pattern video with sine audio
        import subprocess
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi", "-i", "testsrc=duration=3:size=360x640:rate=24",
            "-f", "lavfi", "-i", "sine=frequency=440:duration=3",
            "-c:v", "libx264", "-c:a", "aac", str(raw_video)
        ], capture_output=True, check=True)

        style = StyleSheet()
        scenes = [
            StoryboardScene(
                scene_number=1,
                src_start=0.0,
                src_end=1.2,
                out_duration=1.2,
                caption_text="HOOK: Viral AI Video",
                camera_motion="punch_zoom_1.15x",
                transition="hard_cut"
            ),
            StoryboardScene(
                scene_number=2,
                src_start=1.2,
                src_end=2.5,
                out_duration=1.3,
                caption_text="CTA: Follow for more",
                camera_motion="center",
                transition="hard_cut"
            )
        ]
        plan = StoryboardPlan(
            title="Test Render",
            raw_video_path=str(raw_video),
            original_duration=3.0,
            target_duration=2.5,
            scenes=scenes
        )

        renderer = FFmpegAssRenderer()
        result = renderer.render(plan, style, str(out_video), quality="draft")

        assert result.success is True
        assert Path(result.output_path).exists()
        assert result.resolution == "540x960"
        assert result.duration > 0.0
