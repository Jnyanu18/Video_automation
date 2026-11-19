import subprocess
import json
import os

print("Running Whisper to extract word-level captions...")
whisper_exe = r"C:\Users\jnyan\AppData\Local\pipx\pipx\venvs\openai-whisper\Scripts\whisper.exe"
audio_file = "raw footage/education/audio/master_audio_60s.wav"
out_dir = "raw footage/education/audio"

cmd = [
    whisper_exe,
    audio_file,
    "--model", "tiny",
    "--output_dir", out_dir,
    "--output_format", "json",
    "--word_timestamps", "True"
]
subprocess.run(cmd, check=True)
print("Whisper transcription with word timestamps complete.")
