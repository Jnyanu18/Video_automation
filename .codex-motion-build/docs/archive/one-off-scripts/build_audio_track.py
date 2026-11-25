import numpy as np
import wave, math, os, subprocess

sr = 44100
dur = 60.0
total_samples = int(sr * dur)
voice_track = np.zeros(total_samples, dtype=np.float32)

# Start times for each section in seconds
section_starts = {
    "sec1_hook": 0.0,
    "sec2_definition": 6.0,
    "sec3_formula": 12.0,
    "sec4_shortcuts": 22.0,
    "sec5_golden": 38.5,
    "sec6_recap": 49.5
}

# Load each MP3 into WAV PCM and place into voice_track
for sec_id, st in section_starts.items():
    mp3_file = f"raw footage/education/audio/{sec_id}.mp3"
    wav_file = f"raw footage/education/audio/{sec_id}.wav"
    subprocess.run(['ffmpeg', '-y', '-i', mp3_file, '-ar', str(sr), '-ac', '1', wav_file], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    with wave.open(wav_file, 'rb') as wf:
        n = wf.getnframes()
        data = np.frombuffer(wf.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0
        
    s_idx = int(st * sr)
    e_idx = min(s_idx + len(data), total_samples)
    voice_track[s_idx:e_idx] += data[:e_idx - s_idx]

# Synthesize pleasant study / lo-fi background music (electric piano / Rhodes chord progression)
music_track = np.zeros(total_samples, dtype=np.float32)
# Progression in D-major (peaceful, focus, educational)
# Dmaj7 -> Gmaj7 -> F#m7 -> Bm7
chords = [
    [146.83, 220.0, 277.18, 329.63], # Dmaj7
    [196.00, 246.94, 293.66, 369.99], # Gmaj7
    [185.00, 220.0, 277.18, 329.63], # F#m7
    [123.47, 185.0, 220.0, 293.66]   # Bm7
]

loop_len = 8.0 # 2s per chord
for i in range(int(dur / loop_len) + 1):
    base_t = i * loop_len
    for c_idx, freqs in enumerate(chords):
        c_st = base_t + c_idx * 2.0
        c_dur = 2.0
        s_idx = int(c_st * sr)
        e_idx = min(int((c_st + c_dur) * sr), total_samples)
        if s_idx >= total_samples: break
        
        t = np.linspace(0, (e_idx - s_idx) / sr, e_idx - s_idx)
        chord_wave = np.zeros(e_idx - s_idx, dtype=np.float32)
        for f in freqs:
            # Gentle electric piano bell / warmth
            chord_wave += (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 0.8)
            
        music_track[s_idx:e_idx] += chord_wave * 0.08

# Synthesize sound effects (pops, chimes, dings)
sfx_track = np.zeros(total_samples, dtype=np.float32)

def add_chime(hit_time, freq=880.0):
    idx = int(hit_time * sr)
    ch_dur = 0.8
    ch_len = int(ch_dur * sr)
    if idx + ch_len <= total_samples:
        t = np.linspace(0, ch_dur, ch_len)
        s = np.sin(2 * np.pi * freq * t) * np.exp(-t * 5.0)
        sfx_track[idx:idx+ch_len] += s * 0.25

def add_pop(hit_time):
    idx = int(hit_time * sr)
    p_dur = 0.08
    p_len = int(p_dur * sr)
    if idx + p_len <= total_samples:
        t = np.linspace(0, p_dur, p_len)
        s = np.sin(2 * np.pi * 320 * (1 - t/p_dur) * t) * np.exp(-t * 35.0)
        sfx_track[idx:idx+p_len] += s * 0.20

# SFX placements:
add_chime(3.5, 1046.5) # Hook reveal (₹200 discount)
add_pop(7.5)           # 25% grid fill
add_chime(20.5, 1174.6) # 40% answer
add_pop(26.0)          # 10% card
add_pop(29.0)          # 5% card
add_chime(36.5, 1318.5) # 30 answer
add_chime(48.0, 1046.5) # 20 golden trick answer
add_chime(58.0, 880.0)  # Master percentages

# Master mix: Voice (1.0), Music (-20dB ~ 0.1), SFX (0.4)
final_audio = voice_track * 0.95 + music_track * 0.12 + sfx_track * 0.35

# Soft peak limiter
max_val = np.max(np.abs(final_audio))
if max_val > 0.95:
    final_audio = final_audio / max_val * 0.95

audio_int16 = (final_audio * 32767).astype(np.int16)
stereo = np.column_stack((audio_int16, audio_int16))

with wave.open('raw footage/education/audio/master_audio_60s.wav', 'wb') as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(sr)
    wf.writeframes(stereo.tobytes())

print("master_audio_60s.wav generated: exactly 60.0s @ 44.1kHz stereo.")
