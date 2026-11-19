import subprocess
import os

os.makedirs('ailo-contrast-reel/renders/qc_stills_v6', exist_ok=True)
video_file = 'ailo-contrast-reel/renders/ailo_contrast_reel_v6_3d.mp4'

recipes = [
    (1.5, "Recipe1_Drone_Dive_Swoop"),
    (5.0, "Recipe2_Steep_Tilt_44deg_Glide"),
    (8.0, "Recipe3_Crash_Zoom_Layer_Explosion"),
    (12.5, "Recipe4_Dutch_Roll_16deg_Tension"),
    (16.0, "Recipe5_Orbital_Fly_Around_AILO"),
    (19.5, "Recipe6_Isometric_Aerial_Diorama"),
    (23.5, "Recipe7_Low_Angle_Cinema_Bars"),
    (27.5, "Recipe8_3D_Monolith_Stamp_CTA")
]

for t, name in recipes:
    out_file = f'ailo-contrast-reel/renders/qc_stills_v6/{t:.1f}s_{name}.jpg'
    cmd = [
        'ffmpeg', '-y',
        '-ss', str(t),
        '-i', video_file,
        '-vframes', '1',
        '-q:v', '2',
        out_file
    ]
    subprocess.run(cmd, capture_output=True)
    print(f"Captured {out_file}")

# Check black frames
cmd_black = [
    'ffmpeg', '-i', video_file,
    '-vf', 'blackdetect=d=0.2:pix_th=0.10',
    '-an', '-f', 'null', '-'
]
res_b = subprocess.run(cmd_black, capture_output=True, text=True)
black_lines = [l for l in res_b.stderr.split('\n') if 'black_start' in l]
print(f"\nBlack frame detections: {len(black_lines)}")
for bl in black_lines:
    print(" ", bl.strip())
