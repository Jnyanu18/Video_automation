import subprocess
import os

os.makedirs('export/test', exist_ok=True)

# 1. Voice track from video: vishnu-studio/videos/ailo-launch/ailo_cinematic_reel.mp4
# 2. Soundtrack: raw footage/audio/cinematic_soundtrack.wav

# Let's create an audio mix with sidechain ducking:
# Voice (input 0) has volume 1.05 and broadcast presence eq
# Music (input 1) is at volume 0.22, ducked to 0.12 when voice speaks
# Fade out smoothly at 28.5s - 30.0s

audio_filter = (
    "[0:a]volume=1.1,equalizer=f=3200:t=q:w=1.2:g=2.2,asplit=2[voice_main][voice_sc];"
    "[1:a]volume=0.24,afade=t=in:st=0:d=0.5,afade=t=out:st=28.5:d=1.5[music_raw];"
    "[music_raw][voice_sc]sidechaincompress=threshold=0.08:ratio=3:attack=20:release=250[music_ducked];"
    "[voice_main][music_ducked]amix=inputs=2:duration=first:dropout_transition=2[aout]"
)

cmd = [
    'ffmpeg', '-y',
    '-i', 'vishnu-studio/videos/ailo-launch/ailo_cinematic_reel.mp4',
    '-i', 'raw footage/audio/cinematic_soundtrack.wav',
    '-filter_complex', audio_filter,
    '-map', '[aout]',
    '-c:a', 'aac', '-b:a', '320k',
    '-t', '30.00',
    'export/test/test_mixed_audio.aac'
]

print("Rendering test audio mix...")
res = subprocess.run(cmd, capture_output=True, text=True)
print("Return code:", res.returncode)
if res.returncode != 0:
    print(res.stderr[-400:])
else:
    print("Test audio mix generated successfully: export/test/test_mixed_audio.aac")
