"""Script to build 20-file corpus for Phase 2 verification and throughput benchmarking.

Generates 20 files across 4 cameras (CAM_A, CAM_B, CAM_C, CAM_D) at realistic resolutions (4K and 1080p).
Includes:
- Real spoken audio (with ground truth)
- Music audio
- Ambient/noise audio
- Shared audio sync offsets across cameras
- Video content with faces and scene changes
"""

import os
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path("J:/ai editor")
CUTS_DIR = BASE_DIR / "raw footage" / "cuts"
YC_DIR = BASE_DIR / "raw footage" / "yc"
EDU_DIR = BASE_DIR / "raw footage" / "education" / "audio"
AUDIO_DIR = BASE_DIR / "raw footage" / "audio"
OUT_DIR = BASE_DIR / "raw footage" / "corpus_20"


def build_corpus():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for cam in ["CAM_A", "CAM_B", "CAM_C", "CAM_D"]:
        (OUT_DIR / cam).mkdir(parents=True, exist_ok=True)

    # 1. Base video assets
    speaker_mp4 = YC_DIR / "speaker_source.mp4"
    speech_wav = EDU_DIR / "master_audio_60s.wav"
    music_wav = AUDIO_DIR / "cinematic_soundtrack.wav"

    # We want 20 files: 5 per camera
    # CAM_A: files 1-5
    # CAM_B: files 1-5 (synced with A with offset 5.0s)
    # CAM_C: files 1-5 (4K resolution)
    # CAM_D: files 1-5 (music and ambient)

    # File duration: 30.0s each -> 20 * 30.0 = 600.0s total source
    configs = [
        # CAM_A (Speech & faces, 1080x1920)
        ("CAM_A", "cam_a_01.mp4", 0.0, 30.0, "1080:1920", speech_wav, 0.0, speaker_mp4, 0.0),
        ("CAM_A", "cam_a_02.mp4", 0.0, 30.0, "1080:1920", speech_wav, 30.0, speaker_mp4, 30.0),
        ("CAM_A", "cam_a_03.mp4", 0.0, 30.0, "1080:1920", music_wav, 0.0, CUTS_DIR / "clip_04.mp4", 0.0),
        ("CAM_A", "cam_a_04.mp4", 0.0, 30.0, "1080:1920", music_wav, 30.0, CUTS_DIR / "clip_05.mp4", 0.0),
        ("CAM_A", "cam_a_05.mp4", 0.0, 30.0, "1080:1920", None, 0.0, CUTS_DIR / "clip_08.mp4", 0.0),

        # CAM_B (Overlapping with CAM_A for sync test, offset by 5s)
        ("CAM_B", "cam_b_01.mp4", 0.0, 30.0, "1080:1920", speech_wav, 5.0, speaker_mp4, 5.0),
        ("CAM_B", "cam_b_02.mp4", 0.0, 30.0, "1080:1920", speech_wav, 35.0, speaker_mp4, 25.0),
        ("CAM_B", "cam_b_03.mp4", 0.0, 30.0, "1080:1920", music_wav, 5.0, CUTS_DIR / "clip_04.mp4", 0.0),
        ("CAM_B", "cam_b_04.mp4", 0.0, 30.0, "1080:1920", music_wav, 35.0, CUTS_DIR / "clip_05.mp4", 0.0),
        ("CAM_B", "cam_b_05.mp4", 0.0, 30.0, "1080:1920", None, 0.0, CUTS_DIR / "clip_08.mp4", 0.0),

        # CAM_C (4K realistic resolution: 3840x2160)
        ("CAM_C", "cam_c_01.mp4", 0.0, 30.0, "3840:2160", speech_wav, 10.0, speaker_mp4, 10.0),
        ("CAM_C", "cam_c_02.mp4", 0.0, 30.0, "3840:2160", speech_wav, 20.0, speaker_mp4, 20.0),
        ("CAM_C", "cam_c_03.mp4", 0.0, 30.0, "3840:2160", music_wav, 10.0, CUTS_DIR / "clip_01.mp4", 0.0),
        ("CAM_C", "cam_c_04.mp4", 0.0, 30.0, "3840:2160", music_wav, 40.0, CUTS_DIR / "clip_02.mp4", 0.0),
        ("CAM_C", "cam_c_05.mp4", 0.0, 30.0, "3840:2160", None, 0.0, CUTS_DIR / "clip_03.mp4", 0.0),

        # CAM_D (4K & 1080p mixed, speech + dialogue + noise)
        ("CAM_D", "cam_d_01.mp4", 0.0, 30.0, "3840:2160", speech_wav, 0.0, speaker_mp4, 0.0),
        ("CAM_D", "cam_d_02.mp4", 0.0, 30.0, "1920:1080", speech_wav, 15.0, speaker_mp4, 15.0),
        ("CAM_D", "cam_d_03.mp4", 0.0, 30.0, "1920:1080", music_wav, 15.0, CUTS_DIR / "clip_06.mp4", 0.0),
        ("CAM_D", "cam_d_04.mp4", 0.0, 30.0, "1920:1080", music_wav, 45.0, CUTS_DIR / "clip_07.mp4", 0.0),
        ("CAM_D", "cam_d_05.mp4", 0.0, 30.0, "1920:1080", None, 0.0, CUTS_DIR / "clip_09.mp4", 0.0),
    ]

    print(f"Generating {len(configs)} corpus files in {OUT_DIR}...")
    for cam, filename, start_t, dur, scale, audio_src, audio_offset, video_src, video_offset in configs:
        out_file = OUT_DIR / cam / filename
        if out_file.exists() and out_file.stat().st_size > 10000:
            print(f"  [cached] {cam}/{filename}")
            continue

        print(f"  Encoding {cam}/{filename} ({scale}, dur={dur}s)...")
        # Build ffmpeg command
        cmd = ["ffmpeg", "-y"]
        # Video input with loop if needed
        cmd.extend(["-stream_loop", "-1", "-ss", f"{video_offset:.2f}", "-i", str(video_src)])

        # Audio input
        if audio_src and Path(audio_src).exists():
            cmd.extend(["-stream_loop", "-1", "-ss", f"{audio_offset:.2f}", "-i", str(audio_src)])
        else:
            # Synthetic noise / silence bed
            cmd.extend(["-f", "lavfi", "-i", "anoisesrc=r=48000:a=0.01"])

        w, h = scale.split(":")
        vf = f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,setsar=1"

        cmd.extend([
            "-t", f"{dur:.2f}",
            "-vf", vf,
            "-r", "25",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "26",
            "-c:a", "aac",
            "-b:a", "128k",
            "-shortest",
            str(out_file)
        ])

        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            print(f"Failed to encode {out_file}: {res.stderr[-300:]}", file=sys.stderr)
            raise RuntimeError(f"FFmpeg error: {res.stderr[-300:]}")

    print("Corpus generation complete!")


if __name__ == "__main__":
    build_corpus()
