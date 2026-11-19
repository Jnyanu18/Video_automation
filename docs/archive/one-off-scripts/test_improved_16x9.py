import subprocess

vf = (
    "[0:v]split=2[v_bg][v_fg];"
    # Background: vibrant ambient blurred light
    "[v_bg]scale=1920:3413:flags=fast_bilinear,crop=1920:1080:0:1166,gblur=sigma=50,eq=brightness=0.05:saturation=1.65[bg_blur];"
    # Foreground: 608x1080 centered
    "[v_fg]scale=608:1080:flags=lanczos[fg_scaled];"
    "[bg_blur][fg_scaled]overlay=(W-w)/2:(H-h)/2[comp];"
    "[comp]curves=all='0/0 0.15/0.12 0.5/0.5 0.85/0.88 1/0.97',"
    "eq=saturation=1.06:contrast=1.04:brightness=0.01,"
    "colorbalance=rs=0.01:gs=0.02:bs=-0.01:rm=0.02:gm=0.03:bm=0.01,"
    "unsharp=3:3:0.5:3:3:0.0,"
    "noise=c1s=3:c0f=u,"
    # Add subtle border around the phone frame (656 to 1264)
    "drawbox=x=655:y=0:w=610:h=1080:color=white@0.12:t=1,"
    "fade=t=out:st=29.2:d=0.8[vout]"
)

cmd = [
    'ffmpeg', '-y',
    '-ss', '3.0', '-t', '2.0',
    '-i', 'vishnu-studio/videos/ailo-launch/ailo_cinematic_reel.mp4',
    '-filter_complex', vf,
    '-map', '[vout]',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p',
    'export/test/test_improved_16x9.mp4'
]

subprocess.run(cmd, check=True)
print("Rendered improved 16:9 test")

# Extract frame
cmd_frame = [
    'ffmpeg', '-y', '-ss', '0.5',
    '-i', 'export/test/test_improved_16x9.mp4',
    '-vframes', '1',
    'export/test/test_improved_frame.jpg'
]
subprocess.run(cmd_frame, check=True)
print("Extracted frame")
