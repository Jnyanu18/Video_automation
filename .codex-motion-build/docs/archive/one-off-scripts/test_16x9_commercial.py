import subprocess
import os

os.makedirs('export/test', exist_ok=True)

# Test 16:9 commercial layout:
# [0:v] split into background [bg] and foreground [fg]
# [bg]: scale to 1920:3413, crop to 1920:1080, gblur=sigma=45, eq=brightness=-0.3:saturation=1.3
# [fg]: scale to 608:1080 (fit height), pad with border/shadow or overlay directly centered at (1920-608)/2 = 656
# Overlaid with overlay=(W-w)/2:(H-h)/2

vf = (
    "[0:v]split=2[v_bg][v_fg];"
    "[v_bg]scale=1920:3413:flags=fast_bilinear,crop=1920:1080:0:1166,gblur=sigma=40,eq=brightness=-0.28:saturation=1.3[bg_blur];"
    "[v_fg]scale=608:1080:flags=lanczos[fg_scaled];"
    "[bg_blur][fg_scaled]overlay=(W-w)/2:(H-h)/2[comp];"
    "[comp]curves=all='0/0 0.15/0.12 0.5/0.5 0.85/0.88 1/0.97',"
    "eq=saturation=1.05:contrast=1.03:brightness=0.01,"
    "colorbalance=rs=0.01:gs=0.02:bs=-0.01:rm=0.02:gm=0.03:bm=0.01,"
    "unsharp=3:3:0.5:3:3:0.0,"
    "noise=c1s=3:c0f=u,"
    "crop=1920:804:0:138,pad=1920:1080:0:138:black,setsar=1[outv]"
)

cmd = [
    'ffmpeg', '-y',
    '-ss', '10.0', '-t', '2.0',
    '-i', 'vishnu-studio/videos/ailo-launch/ailo_cinematic_reel.mp4',
    '-filter_complex', vf,
    '-map', '[outv]',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p',
    'export/test/test_16x9_sample.mp4'
]

print("Rendering 16:9 commercial test...")
res = subprocess.run(cmd, capture_output=True, text=True)
print("Return code:", res.returncode)
if res.returncode != 0:
    print(res.stderr[-400:])
else:
    print("Success! export/test/test_16x9_sample.mp4")
