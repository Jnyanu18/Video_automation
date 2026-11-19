import subprocess
import os

os.makedirs('export', exist_ok=True)

video_src = 'vishnu-studio/videos/ailo-launch/ailo_cinematic_reel.mp4'
music_src = 'raw footage/audio/cinematic_soundtrack.wav'

final_16x9 = 'export/ailo_cinematic_commercial_1080p.mp4'
final_9x16 = 'export/ailo_cinematic_reel_9x16.mp4'

# Common color grade and film texture
film_grade = (
    "curves=all='0/0 0.15/0.12 0.5/0.5 0.85/0.88 1/0.97',"
    "eq=saturation=1.06:contrast=1.03:brightness=0.01,"
    "colorbalance=rs=0.01:gs=0.02:bs=-0.01:rm=0.02:gm=0.03:bm=0.01,"
    "unsharp=3:3:0.5:3:3:0.0,"
    "noise=c1s=3:c0f=u,"
    "fade=t=out:st=29.2:d=0.8"
)

# Audio filter with sidechain ducking and vocal presence EQ
# Voice (input 0) has highpass at 75Hz and presence boost at 3.2kHz
# Music (input 1) is ducked smoothly during speech, swelling during pauses and on the 10.8s drop!
audio_filter = (
    "[0:a]volume=1.08,highpass=f=75,equalizer=f=3200:t=q:w=1.2:g=2.2,asplit=2[v_main][v_sc];"
    "[1:a]volume=0.24,afade=t=in:st=0:d=0.4,afade=t=out:st=28.5:d=1.5[m_raw];"
    "[m_raw][v_sc]sidechaincompress=threshold=0.08:ratio=3.5:attack=15:release=220[m_ducked];"
    "[v_main][m_ducked]amix=inputs=2:duration=first:dropout_transition=2[aout]"
)

# 1. RENDER 9:16 VERTICAL SOCIAL REEL
print("=== 1. RENDERING 9:16 VERTICAL SOCIAL REEL ===")
vf_9x16 = f"{film_grade},setsar=1"

cmd_9x16 = [
    'ffmpeg', '-y',
    '-i', video_src,
    '-i', music_src,
    '-filter_complex', f"[0:v]{vf_9x16}[vout];{audio_filter}",
    '-map', '[vout]',
    '-map', '[aout]',
    '-t', '30.00',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '320k',
    final_9x16
]

print("Executing 9:16 master render...")
subprocess.run(cmd_9x16, check=True)
print(f"Exported: {final_9x16} ({os.path.getsize(final_9x16):,} bytes)")

# 2. RENDER 16:9 CINEMATIC COMMERCIAL MASTER (FAST HIGH-FIDELITY GLOW)
print("\n=== 2. RENDERING 16:9 CINEMATIC COMMERCIAL MASTER ===")
vf_16x9 = (
    "[0:v]split=2[v_bg][v_fg];"
    # Fast 2-stage glow: downscale -> blur -> upscale to 1920x1080
    "[v_bg]scale=480:853:flags=fast_bilinear,gblur=sigma=18,scale=1920:1080:flags=lanczos,eq=brightness=0.06:saturation=1.65[bg_blur];"
    "[v_fg]scale=608:1080:flags=lanczos[fg_scaled];"
    "[bg_blur][fg_scaled]overlay=(W-w)/2:(H-h)/2[comp];"
    f"[comp]{film_grade},"
    "drawbox=x=655:y=0:w=610:h=1080:color=white@0.10:t=1,"
    "setsar=1[vout]"
)

cmd_16x9 = [
    'ffmpeg', '-y',
    '-i', video_src,
    '-i', music_src,
    '-filter_complex', f"{vf_16x9};{audio_filter}",
    '-map', '[vout]',
    '-map', '[aout]',
    '-t', '30.00',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '320k',
    final_16x9
]

print("Executing 16:9 master render...")
subprocess.run(cmd_16x9, check=True)
print(f"Exported: {final_16x9} ({os.path.getsize(final_16x9):,} bytes)")

print("\n=== RENDERING COMPLETE ===")
