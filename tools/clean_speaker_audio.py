import subprocess
import os

os.makedirs('raw footage/yc/audio', exist_ok=True)

# 1. Clean and enhance original voice
raw_video = 'raw footage/yc/speaker_source.mp4'
clean_voice = 'raw footage/yc/audio/clean_voice.wav'

# Audio filter chain:
# - highpass=80: eliminates low rumble/mic bumps
# - lowpass=10000: eliminates high frequency hiss
# - afftdn=nf=-24: FFT noise reduction for room echo
# - acompressor: smooth dynamic leveling for natural presence
# - volume=1.4: ensures clear prominence
af_chain = (
    "highpass=f=80,lowpass=f=10000,"
    "afftdn=nf=-24:tn=1,"
    "acompressor=threshold=-20dB:ratio=3:attack=5:release=50:makeup=2,"
    "volume=1.35"
)

cmd = [
    'ffmpeg', '-y',
    '-i', raw_video,
    '-af', af_chain,
    '-ar', '44100', '-ac', '2',
    clean_voice
]
subprocess.run(cmd, check=True)
print("Speech enhanced and cleaned successfully.")
