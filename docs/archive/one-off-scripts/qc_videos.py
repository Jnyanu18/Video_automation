import subprocess
import json
import os

def probe(file_path):
    cmd = [
        'ffprobe', '-v', 'quiet', '-print_format', 'json',
        '-show_format', '-show_streams', file_path
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(res.stdout)

files = [
    'export/dubai_diamond_cinematic_1080p.mp4',
    'export/dubai_diamond_cinematic_reel_9x16.mp4'
]

print("=== 1. STREAM & DURATION PROBE ===")
for f in files:
    info = probe(f)
    v_stream = next(s for s in info['streams'] if s['codec_type'] == 'video')
    a_stream = next(s for s in info['streams'] if s['codec_type'] == 'audio')
    dur = float(info['format']['duration'])
    size_mb = os.path.getsize(f) / (1024 * 1024)
    print(f"\nFile: {f}")
    print(f"  Duration: {dur:.2f}s | Size: {size_mb:.2f} MB")
    print(f"  Video: {v_stream['codec_name']} {v_stream['width']}x{v_stream['height']} @ {v_stream['r_frame_rate']} fps, SAR: {v_stream.get('sample_aspect_ratio')}")
    print(f"  Audio: {a_stream['codec_name']} {a_stream['sample_rate']}Hz, {a_stream['channels']} channels, Bitrate: {int(a_stream.get('bit_rate', 0))/1000:.0f} kbps")

print("\n=== 2. BLACK FRAME & FREEZE DETECTION ===")
for f in files:
    cmd_black = [
        'ffmpeg', '-i', f,
        '-vf', 'blackdetect=d=0.2:pix_th=0.10',
        '-an', '-f', 'null', '-'
    ]
    res_b = subprocess.run(cmd_black, capture_output=True, text=True)
    black_lines = [l for l in res_b.stderr.split('\n') if 'black_start' in l]
    print(f"File {os.path.basename(f)} black frame detections: {len(black_lines)}")
    for bl in black_lines:
        print(f"  {bl.strip()}")

print("\n=== 3. EXTRACTING INSPECTION STILLS ===")
os.makedirs('export/qc_stills', exist_ok=True)
timestamps = [1.0, 3.5, 6.0, 9.5, 11.2, 14.5, 16.5, 18.5, 22.0, 25.0, 28.5]

for f in files:
    prefix = "16x9" if "1080p" in f else "9x16"
    for t in timestamps:
        out_still = f"export/qc_stills/{prefix}_{t:.1f}s.jpg"
        cmd_still = [
            'ffmpeg', '-y',
            '-ss', str(t),
            '-i', f,
            '-vframes', '1',
            '-q:v', '2',
            out_still
        ]
        subprocess.run(cmd_still, capture_output=True)

print("Generated inspection stills in export/qc_stills/")
