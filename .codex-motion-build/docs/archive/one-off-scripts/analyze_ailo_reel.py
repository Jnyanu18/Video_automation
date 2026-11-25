import subprocess
import json
import librosa
import numpy as np

video_path = 'vishnu-studio/videos/ailo-launch/ailo_cinematic_reel.mp4'

# 1. Probe video and audio
cmd_probe = ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', video_path]
res = subprocess.run(cmd_probe, capture_output=True, text=True)
info = json.loads(res.stdout)

v = next(s for s in info['streams'] if s['codec_type'] == 'video')
a = next(s for s in info['streams'] if s['codec_type'] == 'audio')
print(f"Video: {v['width']}x{v['height']} @ {v['r_frame_rate']} fps, Dur={float(info['format']['duration']):.2f}s")
print(f"Audio: {a['sample_rate']}Hz, {a['channels']} channels, Codec={a['codec_name']}")

# 2. Extract audio and analyze speech onsets and silence
cmd_wav = ['ffmpeg', '-y', '-i', video_path, '-vn', '-ac', '1', '-ar', '16000', 'export/test/ailo_audio.wav']
subprocess.run(cmd_wav, check=True)

y, sr = librosa.load('export/test/ailo_audio.wav', sr=16000)
rms = librosa.feature.rms(y=y)[0]
times = librosa.times_like(rms, sr=sr)
print(f"Audio RMS Mean: {np.mean(rms):.4f}, Max: {np.max(rms):.4f}")

# Check key sentence timestamps from words.json
with open('vishnu-studio/videos/ailo-launch/words.json') as f:
    words = json.load(f)

print(f"Total words: {len(words)}")
print(f"First word: '{words[0]['w']}' @ {words[0]['start']:.2f}s")
print(f"Last word: '{words[-1]['w']}' @ {words[-1]['end']:.2f}s")
