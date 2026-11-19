import os
import json
import subprocess
import shutil

os.makedirs('export/work_16x9', exist_ok=True)
os.makedirs('export/work_9x16', exist_ok=True)
os.makedirs('export', exist_ok=True)

with open('raw footage/cinematic_edl.json') as f:
    edl = json.load(f)

source_video = 'raw footage/event_source.mp4'
soundtrack = 'raw footage/audio/cinematic_soundtrack.wav'

# Color grading filter common to both formats
color_grade = (
    "curves=all='0/0 0.15/0.12 0.5/0.5 0.82/0.85 1/0.98',"
    "eq=saturation=1.06:contrast=1.04:brightness=0.01,"
    "colorbalance=rs=0.02:gs=0.01:bs=-0.02:rm=0.03:gm=0.01:bm=-0.02,"
    "unsharp=3:3:0.6:3:3:0.0"
)

# 1. Render all shots for 16:9 Master
print("=== RENDERING 16:9 CINEMATIC MASTER SHOTS ===")
list_16x9 = []

for shot in edl:
    sid = shot['shot']
    src_start = shot['src_start']
    src_dur = shot['src_end'] - shot['src_start']
    target_dur = shot['duration']
    speed = shot['speed']
    out_file = f"export/work_16x9/shot_{sid:02d}.mp4"
    list_16x9.append(f"file '{os.path.abspath(out_file).replace(os.sep, '/')}'")
    
    # Speed multiplier for setpts is 1.0 / speed
    pts_factor = 1.0 / speed
    
    # Optional fade to black on the very last shot
    fade_filter = ""
    if sid == len(edl):
        fade_start = max(0.0, target_dur - 0.8)
        fade_filter = f",fade=t=out:st={fade_start:.2f}:d=0.8"
    
    vf = (
        f"setpts={pts_factor:.4f}*PTS,"
        f"fps=30,"
        f"{color_grade},"
        f"crop=1920:804:0:138,pad=1920:1080:0:138:black,setsar=1"
        f"{fade_filter}"
    )
    
    cmd = [
        'ffmpeg', '-y',
        '-ss', f"{src_start:.3f}",
        '-t', f"{src_dur:.3f}",
        '-i', source_video,
        '-vf', vf,
        '-t', f"{target_dur:.3f}", # Exact trim to beat length
        '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p',
        '-an',
        out_file
    ]
    
    print(f"Rendering 16:9 Shot {sid:02d} ({shot['act']}): {target_dur:.2f}s...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error in shot {sid}:", res.stderr[-400:])
        raise RuntimeError(f"Shot {sid} failed")

# Write concat list
with open('export/work_16x9/concat_list.txt', 'w') as f:
    f.write("\n".join(list_16x9))

# Concat video stream
concat_16x9_video = 'export/work_16x9/concat_video.mp4'
cmd_concat = [
    'ffmpeg', '-y',
    '-f', 'concat', '-safe', '0',
    '-i', 'export/work_16x9/concat_list.txt',
    '-c', 'copy',
    concat_16x9_video
]
print("Concatenating 16:9 video...")
subprocess.run(cmd_concat, check=True)

# 2. Render all shots for 9:16 Vertical Reel
print("\n=== RENDERING 9:16 VERTICAL REEL SHOTS ===")
list_9x16 = []

for shot in edl:
    sid = shot['shot']
    src_start = shot['src_start']
    src_dur = shot['src_end'] - shot['src_start']
    target_dur = shot['duration']
    speed = shot['speed']
    out_file = f"export/work_9x16/shot_{sid:02d}.mp4"
    list_9x16.append(f"file '{os.path.abspath(out_file).replace(os.sep, '/')}'")
    
    pts_factor = 1.0 / speed
    
    fade_filter = ""
    if sid == len(edl):
        fade_start = max(0.0, target_dur - 0.8)
        fade_filter = f",fade=t=out:st={fade_start:.2f}:d=0.8"
    
    vf = (
        f"setpts={pts_factor:.4f}*PTS,"
        f"fps=30,"
        f"{color_grade},"
        f"crop=608:1080:656:0,scale=1080:1920:flags=lanczos,setsar=1"
        f"{fade_filter}"
    )
    
    cmd = [
        'ffmpeg', '-y',
        '-ss', f"{src_start:.3f}",
        '-t', f"{src_dur:.3f}",
        '-i', source_video,
        '-vf', vf,
        '-t', f"{target_dur:.3f}",
        '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p',
        '-an',
        out_file
    ]
    
    print(f"Rendering 9:16 Shot {sid:02d} ({shot['act']}): {target_dur:.2f}s...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Error in 9:16 shot {sid}:", res.stderr[-400:])
        raise RuntimeError(f"9:16 Shot {sid} failed")

# Write concat list for 9:16
with open('export/work_9x16/concat_list.txt', 'w') as f:
    f.write("\n".join(list_9x16))

concat_9x16_video = 'export/work_9x16/concat_video.mp4'
cmd_concat_9x16 = [
    'ffmpeg', '-y',
    '-f', 'concat', '-safe', '0',
    '-i', 'export/work_9x16/concat_list.txt',
    '-c', 'copy',
    concat_9x16_video
]
print("Concatenating 9:16 video...")
subprocess.run(cmd_concat_9x16, check=True)

# 3. Audio Mastering: Soundtrack + Subtle Room Atmosphere + Master Fades
# Master audio filter: fade in at 0.0s for 0.4s, fade out at 28.2s for 1.8s
audio_filter = "afade=t=in:st=0:d=0.4,afade=t=out:st=28.2:d=1.8"

# Multiplex 16:9 Master
final_16x9 = 'export/dubai_diamond_cinematic_1080p.mp4'
cmd_mux_16x9 = [
    'ffmpeg', '-y',
    '-i', concat_16x9_video,
    '-i', soundtrack,
    '-filter_complex', f"[1:a]{audio_filter}[aout]",
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '320k',
    '-shortest',
    final_16x9
]
print("\nMuxing 16:9 Master MP4...")
subprocess.run(cmd_mux_16x9, check=True)
print(f"Exported: {final_16x9}")

# Multiplex 9:16 Reel
final_9x16 = 'export/dubai_diamond_cinematic_reel_9x16.mp4'
cmd_mux_9x16 = [
    'ffmpeg', '-y',
    '-i', concat_9x16_video,
    '-i', soundtrack,
    '-filter_complex', f"[1:a]{audio_filter}[aout]",
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '320k',
    '-shortest',
    final_9x16
]
print("Muxing 9:16 Reel MP4...")
subprocess.run(cmd_mux_9x16, check=True)
print(f"Exported: {final_9x16}")

print("\n=== RENDERING COMPLETE ===")
