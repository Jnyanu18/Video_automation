import subprocess
import os

os.makedirs('export/education', exist_ok=True)
os.makedirs('export/education/qc_frames', exist_ok=True)

# 1. RENDER LOW-RES PREVIEW (540x960)
print("Rendering preview...")
preview_out = 'export/education/preview_percentage_masterclass.mp4'
cmd_preview = [
    'ffmpeg', '-y',
    '-i', 'raw footage/education/animated_video.mp4',
    '-i', 'raw footage/education/audio/master_audio_60s.wav',
    '-vf', 'scale=540:960',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24',
    '-c:a', 'aac', '-b:a', '128k',
    '-t', '60.0',
    preview_out
]
subprocess.run(cmd_preview, check=True)
print("Preview rendered.")

# 2. RENDER FINAL MASTER (1080x1920 30 FPS)
print("Rendering final master...")
master_out = 'export/education/percentage_masterclass_60s.mp4'
cmd_master = [
    'ffmpeg', '-y',
    '-i', 'raw footage/education/animated_video.mp4',
    '-i', 'raw footage/education/audio/master_audio_60s.wav',
    '-c:v', 'libx264', '-preset', 'fast', '-profile:v', 'high', '-level', '4.2', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '320k',
    '-movflags', '+faststart',
    '-t', '60.0',
    master_out
]
subprocess.run(cmd_master, check=True)
print("Master rendered successfully.")

# 3. EXTRACT QC FRAMES
timestamps = [3.0, 8.5, 18.0, 30.0, 44.0, 56.0]
for ts in timestamps:
    qc_frame = f'export/education/qc_frames/frame_{int(ts)}s.jpg'
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
