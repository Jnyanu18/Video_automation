import subprocess
import os

os.makedirs('export/yc', exist_ok=True)
os.makedirs('export/yc/qc_frames', exist_ok=True)

speaker_src = 'raw footage/yc/speaker_source.mp4'
overlay_src = 'raw footage/yc/overlay.webm'
audio_src = 'raw footage/yc/audio/master_audio_mixed.wav'
master_out = 'export/yc/AskVerb_YC2027_Product_Presentation_1080x1920.mp4'
preview_out = 'export/yc/preview_AskVerb_YC2027.mp4'

# Filtergraph for dynamic context-aware split screen:
# - Full-screen speaker when t < 5.2 or t >= 48.0
# - Split-screen (top: dark SaaS UI, bottom: centered speaker) when 5.2 <= t < 48.0
# - Composite with HyperFrames motion graphics & captions
filter_complex = (
    # 1. Prepare full screen speaker (1080x1920)
    "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30[full_spk];"
    # 2. Prepare bottom 55% speaker (1080x1056)
    "[0:v]crop=in_w:in_w*(1056/1080):0:80,scale=1080:1056,fps=30[btm_spk];"
    # 3. Create dark slate base canvas (1080x1920)
    "color=c=0x080D1A:s=1080x1920:d=60.99:r=30[bg];"
    # 4. Place bottom speaker onto canvas during 5.2s to 48.0s
    "[bg][btm_spk]overlay=0:864:enable='between(t,5.2,48.0)'[split_comp];"
    # 5. Place full speaker when not in split screen (0-5.2s and 48.0-60.99s)
    "[split_comp][full_spk]overlay=0:0:enable='not(between(t,5.2,48.0))'[video_base];"
    # 6. Composite transparent HyperFrames UI & synchronized captions
    "[video_base][1:v]overlay=0:0:shortest=1[v_out]"
)

# 1. RENDER MASTER 1080x1920 30 FPS
print("Rendering Master Video (1080x1920 30 FPS)...")
cmd_master = [
    'ffmpeg', '-y',
    '-i', speaker_src,
    '-c:v', 'libvpx-vp9', '-i', overlay_src,
    '-i', audio_src,
    '-filter_complex', filter_complex,
    '-map', '[v_out]',
    '-map', '2:a',
    '-c:v', 'libx264', '-preset', 'fast', '-profile:v', 'high', '-level', '4.2', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '320k',
    '-movflags', '+faststart',
    '-t', '60.9',
    master_out
]
subprocess.run(cmd_master, check=True)
print("Master video rendered.")

# 2. RENDER LOW-RES PREVIEW (540x960)
print("Rendering Fast Preview (540x960)...")
cmd_preview = [
    'ffmpeg', '-y',
    '-i', master_out,
    '-vf', 'scale=540:960',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24',
    '-c:a', 'copy',
    preview_out
]
subprocess.run(cmd_preview, check=True)
print("Preview rendered.")

# 3. EXTRACT QUALITY CHECK FRAMES
# - 2s: Full-screen intro
# - 8s: TradePilot split screen
# - 18s: The Trust Gap split screen
# - 34s: AskVerb live preview diff split screen
# - 45s: Traction stat split screen
# - 53s: Zero-click future full screen
timestamps = [2.0, 8.5, 18.0, 34.0, 45.0, 53.0]
for ts in timestamps:
    qc_frame = f'export/yc/qc_frames/frame_{int(ts)}s.jpg'
    cmd_qc = [
        'ffmpeg', '-y',
        '-ss', str(ts),
        '-i', master_out,
        '-vframes', '1',
        '-q:v', '2',
        qc_frame
    ]
    subprocess.run(cmd_qc, check=True)

print("Quality check verification frames extracted.")
