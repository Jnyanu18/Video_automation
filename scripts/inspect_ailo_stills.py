import subprocess
import os

os.makedirs('export/ailo_qc_stills', exist_ok=True)
timestamps = [
    (1.0, "Act1_Hook_Question"),
    (3.5, "Act1_AILO_Logo_Reveal"),
    (7.0, "Act2_Raw_Footage_Drop"),
    (9.2, "Act2_Silence_Removal"),
    (11.2, "Act2_Beat_Sync_Drop"),
    (13.5, "Act3_Rough_Cut_Broll"),
    (15.5, "Act3_Viral_Captions"),
    (20.5, "Act3_Premiere_DaVinci_Dual_Brain"),
    (25.0, "Act4_Comment_AILO_CTA"),
    (28.5, "Act4_Final_Punchline")
]

for t, name in timestamps:
    out_file = f'export/ailo_qc_stills/{t:.1f}s_{name}.jpg'
    cmd = [
        'ffmpeg', '-y',
        '-ss', str(t),
        '-i', 'vishnu-studio/videos/ailo-launch/ailo_cinematic_reel.mp4',
        '-vframes', '1',
        '-q:v', '2',
        out_file
    ]
    subprocess.run(cmd, capture_output=True)
    print(f"Captured {out_file}")
