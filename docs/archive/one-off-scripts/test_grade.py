import subprocess
import os

os.makedirs('export/test', exist_ok=True)

# Test 16:9 cinematic grade on Shot 1 (Macro diamond)
cmd_16x9 = [
    'ffmpeg', '-y',
    '-ss', '1.40', '-t', '1.36',
    '-i', 'raw footage/event_source.mp4',
    '-vf', (
        "curves=all='0/0 0.15/0.12 0.5/0.5 0.82/0.85 1/0.98',"
        "eq=saturation=1.06:contrast=1.04:brightness=0.01,"
        "colorbalance=rs=0.02:gs=0.01:bs=-0.02:rm=0.03:gm=0.01:bm=-0.02,"
        "unsharp=3:3:0.6:3:3:0.0,"
        "crop=1920:804:0:138,pad=1920:1080:0:138:black"
    ),
    '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p',
    'export/test/test_shot1_16x9.mp4'
]

print("Running 16:9 test...")
res = subprocess.run(cmd_16x9, capture_output=True, text=True)
print("16:9 Return code:", res.returncode)
if res.returncode != 0:
    print(res.stderr[-500:])

# Test 9:16 vertical grade on Shot 6 (Drop impact)
cmd_9x16 = [
    'ffmpeg', '-y',
    '-ss', '32.88', '-t', '0.94',
    '-i', 'raw footage/event_source.mp4',
    '-vf', (
        "curves=all='0/0 0.15/0.12 0.5/0.5 0.82/0.85 1/0.98',"
        "eq=saturation=1.06:contrast=1.04:brightness=0.01,"
        "colorbalance=rs=0.02:gs=0.01:bs=-0.02:rm=0.03:gm=0.01:bm=-0.02,"
        "unsharp=3:3:0.6:3:3:0.0,"
        "crop=608:1080:656:0,scale=1080:1920:flags=lanczos"
    ),
    '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p',
    'export/test/test_shot6_9x16.mp4'
]

print("Running 9:16 test...")
res2 = subprocess.run(cmd_9x16, capture_output=True, text=True)
print("9:16 Return code:", res2.returncode)
if res2.returncode != 0:
    print(res2.stderr[-500:])
