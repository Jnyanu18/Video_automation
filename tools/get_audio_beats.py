import librosa
import numpy as np
import json

audio_path = 'raw footage/audio/cinematic_soundtrack.wav'
y, sr = librosa.load(audio_path, sr=None)
duration = librosa.get_duration(y=y, sr=sr)

tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
beat_times = librosa.frames_to_time(beats, sr=sr)

onset_env = librosa.onset.onset_strength(y=y, sr=sr)
onset_frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)
onset_times = librosa.frames_to_time(onset_frames, sr=sr)

# Energy per 0.25s slice
hop_len = int(sr * 0.25)
rms = librosa.feature.rms(y=y, frame_length=hop_len*2, hop_length=hop_len)[0]
rms_times = np.arange(len(rms)) * 0.25

print(f"Audio Duration: {duration:.2f}s | Detected BPM: {float(tempo):.2f}")
print(f"Total Beats: {len(beat_times)}")
print(f"Key beats around drop (10s - 14s):")
for b in beat_times:
    if 9.5 <= b <= 14.0:
        print(f"  Beat @ {b:.2f}s")

# Let's save the beat grid to json for the editor script
audio_data = {
    "duration": round(float(duration), 2),
    "bpm": round(float(tempo), 2),
    "beats": [round(float(b), 3) for b in beat_times],
    "onsets": [round(float(o), 3) for o in onset_times]
}

with open('raw footage/audio/audio_analysis.json', 'w') as f:
    json.dump(audio_data, f, indent=2)

print("Saved audio_analysis.json")
