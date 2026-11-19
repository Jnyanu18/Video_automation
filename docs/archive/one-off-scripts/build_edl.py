import json

# Target timeline: 30.00 seconds total
# Beat markers from librosa:
# Drop: 10.80s
# Act 1 (Hook): 0.00s - 4.50s (4.50s)
# Act 2 (Buildup): 4.50s - 10.80s (6.30s)
# Act 3 (Peak): 10.80s - 23.45s (12.65s)
# Act 4 (Resolution): 23.45s - 30.00s (6.55s)

timeline = [
    # --- ACT 1: THE HOOK ---
    {
        "shot": 1,
        "act": "Act 1: The Hook",
        "description": "Macro sparkle on rough & cut diamond exhibition",
        "src_start": 1.40,
        "src_end": 2.76, # 1.36s
        "timeline_start": 0.00,
        "timeline_end": 2.20,
        "duration": 2.20,
        "speed": 0.62, # Subtle slow motion
        "motion": "slow_push_in",
        "sound_design": "Subtle luxury chime / deep sub riser"
    },
    {
        "shot": 2,
        "act": "Act 1: The Hook",
        "description": "Exhibition showcase display case reveal",
        "src_start": 2.76,
        "src_end": 4.48, # 1.72s
        "timeline_start": 2.20,
        "timeline_end": 4.50,
        "duration": 2.30,
        "speed": 0.75,
        "motion": "pan_right",
        "sound_design": "Atmospheric synth pad"
    },
    # --- ACT 2: THE BUILDUP ---
    {
        "shot": 3,
        "act": "Act 2: The Buildup",
        "description": "Grand venue entrance & registration glide",
        "src_start": 5.92,
        "src_end": 8.00, # 2.08s
        "timeline_start": 4.50,
        "timeline_end": 6.51, # Rhythmic onset at 6.51s
        "duration": 2.01,
        "speed": 1.03,
        "motion": "forward_glide",
        "sound_design": "First percussion tick / pulse"
    },
    {
        "shot": 4,
        "act": "Act 2: The Buildup",
        "description": "Keynote speaker stage presence / podium entrance",
        "src_start": 12.20,
        "src_end": 13.85, # 1.65s
        "timeline_start": 6.51,
        "timeline_end": 8.16, # Rhythmic onset at 8.16s
        "duration": 1.65,
        "speed": 1.00,
        "motion": "low_angle_tilt",
        "sound_design": "Building snare roll / rising sweep"
    },
    {
        "shot": 5,
        "act": "Act 2: The Buildup",
        "description": "VIP audience anticipation / low-light auditorium",
        "src_start": 27.44,
        "src_end": 29.60, # 2.16s
        "timeline_start": 8.16,
        "timeline_end": 10.80, # The drop hit!
        "duration": 2.64,
        "speed": 0.82, # Speed ramp towards 10.8s
        "motion": "slow_push",
        "sound_design": "Crescendo riser + sub drop pre-silence"
    },
    # --- ACT 3: THE PEAK (DROP) ---
    {
        "shot": 6,
        "act": "Act 3: The Peak",
        "description": "DROP IMPACT: Glistening diamond showcase close-up",
        "src_start": 32.88,
        "src_end": 33.82, # 0.94s
        "timeline_start": 10.80,
        "timeline_end": 11.74, # 2 beats
        "duration": 0.94,
        "speed": 1.00,
        "motion": "hard_cut_impact",
        "sound_design": "Massive 808 kick / brass impact"
    },
    {
        "shot": 7,
        "act": "Act 3: The Peak",
        "description": "Dynamic stage LED visual backdrop",
        "src_start": 37.24,
        "src_end": 38.17, # 0.93s
        "timeline_start": 11.74,
        "timeline_end": 12.67, # 2 beats
        "duration": 0.93,
        "speed": 1.00,
        "motion": "whip_in",
        "sound_design": "Heavy beat pulse"
    },
    {
        "shot": 8,
        "act": "Act 3: The Peak",
        "description": "Keynote speaker emphatic presentation gesture",
        "src_start": 43.76,
        "src_end": 44.70, # 0.94s
        "timeline_start": 12.67,
        "timeline_end": 13.61, # 2 beats
        "duration": 0.94,
        "speed": 1.00,
        "motion": "dynamic_pan",
        "sound_design": "Snare crack"
    },
    {
        "shot": 9,
        "act": "Act 3: The Peak",
        "description": "VIP exhibition floor networking & exchange",
        "src_start": 50.32,
        "src_end": 51.44, # 1.12s
        "timeline_start": 13.61,
        "timeline_end": 15.49, # 4 beats (1.88s)
        "duration": 1.88,
        "speed": 0.60, # High aesthetic slow motion
        "motion": "tracking_right",
        "sound_design": "Deep rhythmic bass groove"
    },
    {
        "shot": 10,
        "act": "Act 3: The Peak",
        "description": "Grand audience banquet hall / 19+ delegates wide shot",
        "src_start": 51.44,
        "src_end": 53.31, # 1.87s
        "timeline_start": 15.49,
        "timeline_end": 17.36, # 4 beats (1.87s)
        "duration": 1.87,
        "speed": 1.00,
        "motion": "grand_sweep",
        "sound_design": "Full symphonic synth brass"
    },
    {
        "shot": 11,
        "act": "Act 3: The Peak",
        "description": "Executive panel discussion on stage",
        "src_start": 64.56,
        "src_end": 66.44, # 1.88s
        "timeline_start": 17.36,
        "timeline_end": 19.24, # 4 beats (1.88s)
        "duration": 1.88,
        "speed": 1.00,
        "motion": "push_in",
        "sound_design": "Secondary rhythmic breakdown"
    },
    {
        "shot": 12,
        "act": "Act 3: The Peak",
        "description": "VIP diamond inspection & business partnership",
        "src_start": 73.24,
        "src_end": 74.32, # 1.08s
        "timeline_start": 19.24,
        "timeline_end": 21.11, # 4 beats (1.87s)
        "duration": 1.87,
        "speed": 0.58, # Cinematic slow motion
        "motion": "smooth_orbit",
        "sound_design": "Percussive fill"
    },
    {
        "shot": 13,
        "act": "Act 3: The Peak",
        "description": "Standing ovation / conference hall applause climax",
        "src_start": 81.32,
        "src_end": 82.52, # 1.20s
        "timeline_start": 21.11,
        "timeline_end": 23.45, # 5 beats (2.34s)
        "duration": 2.34,
        "speed": 0.51, # Glorious slow-motion applause
        "motion": "slow_pull_back",
        "sound_design": "Subtle live crowd cheer mixed with musical climax"
    },
    # --- ACT 4: THE RESOLUTION ---
    {
        "shot": 14,
        "act": "Act 4: The Resolution",
        "description": "Majestic wide stage vista of Dubai Diamond Conference",
        "src_start": 13.00,
        "src_end": 14.40, # 1.40s
        "timeline_start": 23.45,
        "timeline_end": 27.50, # 4.05s
        "duration": 4.05,
        "speed": 0.35, # Ultra-slow motion majestic glide
        "motion": "slow_dolly_out",
        "sound_design": "Decaying synth pad / warm piano tail"
    },
    {
        "shot": 15,
        "act": "Act 4: The Resolution",
        "description": "Official Dubai Diamond Conference brand lockup & outro",
        "src_start": 82.52,
        "src_end": 84.76, # 2.24s
        "timeline_start": 27.50,
        "timeline_end": 30.00, # 2.50s
        "duration": 2.50,
        "speed": 0.90,
        "motion": "slow_dissolve_to_black",
        "sound_design": "Sub bass rumble to complete silence"
    }
]

total_dur = sum(s["duration"] for s in timeline)
print(f"Total shots: {len(timeline)}")
print(f"Total runtime: {total_dur:.2f}s (Target: 30.00s)")

with open('raw footage/cinematic_edl.json', 'w') as f:
    json.dump(timeline, f, indent=2)

print("Saved raw footage/cinematic_edl.json")
