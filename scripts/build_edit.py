import subprocess
import os

os.makedirs('raw footage/cuts', exist_ok=True)
os.makedirs('export/event', exist_ok=True)

# 10 dynamic cuts covering the 30-second arc
clips = [
    (0.1, 2.3),   # Clip 1: Atlantis exterior (2.2s)
    (14.4, 16.9), # Clip 2: Chandelier & entrance (2.5s)
    (20.9, 23.9), # Clip 3: VIP greeting & handshakes (3.0s)
    (27.4, 30.0), # Clip 4: Auditorium stage reveal (2.6s)
    (31.8, 34.5), # Clip 5: LED diamond screen & speaker (2.7s)
    (38.4, 41.6), # Clip 6: Stage spotlight sweep (3.2s)
    (44.8, 48.1), # Clip 7: Panel discussion & applause (3.3s)
    (55.8, 59.1), # Clip 8: Speaker gesture & delegates (3.3s)
    (63.5, 66.9), # Clip 9: Vibrant beam lights & audience (3.4s)
    (74.3, 78.1)  # Clip 10: Grand stage finale (3.8s)
]

concat_lines = []
for i, (st, et) in enumerate(clips):
    dur = round(et - st, 3)
    out_file = f'raw footage/cuts/clip_{i:02d}.mp4'
    
    # Dynamic center crop with slight scale and rich commercial color grade
    vf = (
        'crop=ih*9/16:ih:(iw-ow)/2:0,'
        'scale=1080:1920:flags=lanczos,'
        'eq=contrast=1.16:brightness=0.02:saturation=1.22,'
        'fps=30'
    )
    cmd = [
        'ffmpeg', '-y', '-ss', str(st), '-i', 'raw footage/event_source.mp4',
        '-t', str(dur),
        '-vf', vf,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
        '-an', out_file
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    concat_lines.append(f"file 'cuts/clip_{i:02d}.mp4'")
    print(f"Rendered clip_{i:02d}: {dur}s")

with open('raw footage/concat.txt', 'w') as f:
    f.write('\n'.join(concat_lines))

print("All 10 clips prepared and listed in raw footage/concat.txt")

# Concatenate all clips into a unified 30s video track
cmd_cat = [
    'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
    '-i', 'raw footage/concat.txt',
    '-c', 'copy',
    'raw footage/video_track_30s.mp4'
]
subprocess.run(cmd_cat, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print("video_track_30s.mp4 created successfully.")
