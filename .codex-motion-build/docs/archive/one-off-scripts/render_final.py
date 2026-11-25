import subprocess
import os

os.makedirs('export/event', exist_ok=True)
os.makedirs('export/event/qc_frames', exist_ok=True)

# 1. RENDER LOW-RES PREVIEW (540x960)
print("Rendering Low-Resolution Preview...")
preview_out = 'export/event/preview_aftermovie.mp4'
cmd_preview = [
    'ffmpeg', '-y',
    '-i', 'raw footage/video_track_30s.mp4',
    '-c:v', 'libvpx-vp9', '-i', 'raw footage/overlay.webm',
    '-i', 'raw footage/audio/cinematic_soundtrack.wav',
    '-filter_complex',
    '[0:v][1:v]overlay=0:0:shortest=1[comp];[comp]scale=540:960[v]',
    '-map', '[v]',
    '-map', '2:a',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24',
    '-c:a', 'aac', '-b:a', '128k',
    '-t', '29.8',
    preview_out
]
subprocess.run(cmd_preview, check=True)
print("Preview rendered successfully.")

# 2. RENDER MASTER 1080x1920 30 FPS FINAL
print("Rendering Master 1080x1920 Video...")
master_out = 'export/event/Dubai_Diamond_Conference_Aftermovie_1080x1920.mp4'
cmd_master = [
    'ffmpeg', '-y',
    '-i', 'raw footage/video_track_30s.mp4',
    '-c:v', 'libvpx-vp9', '-i', 'raw footage/overlay.webm',
    '-i', 'raw footage/audio/cinematic_soundtrack.wav',
    '-filter_complex',
    '[0:v][1:v]overlay=0:0:shortest=1[v]',
    '-map', '[v]',
    '-map', '2:a',
    '-c:v', 'libx264', '-preset', 'fast', '-profile:v', 'high', '-level', '4.2', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '320k',
    '-movflags', '+faststart',
    '-t', '29.8',
    master_out
]
subprocess.run(cmd_master, check=True)
print("Master video rendered successfully.")

# 3. EXTRACT QC VERIFICATION FRAMES
timestamps = [2.0, 11.5, 18.0, 27.0]
for ts in timestamps:
    qc_frame = f'export/event/qc_frames/frame_{int(ts)}s.jpg'
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
