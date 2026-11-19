import cv2
import os
import json
from scenedetect import detect, ContentDetector

video_path = 'raw footage/event_source.mp4'
scene_list = detect(video_path, ContentDetector(threshold=27.0))

print('Total scenes detected:', len(scene_list))
os.makedirs('raw footage/scene_analysis', exist_ok=True)

cap = cv2.VideoCapture(video_path)
fps = cap.get(cv2.CAP_PROP_FPS)

scenes_data = []
for i, scene in enumerate(scene_list):
    start_sec = scene[0].get_seconds()
    end_sec = scene[1].get_seconds()
    dur = end_sec - start_sec
    mid_sec = (start_sec + end_sec) / 2.0
    
    cap.set(cv2.CAP_PROP_POS_MSEC, mid_sec * 1000)
    ret, frame = cap.read()
    thumb_path = f'raw footage/scene_analysis/scene_{i:02d}_{start_sec:.1f}s.jpg'
    if ret:
        cv2.imwrite(thumb_path, frame)
    
    scenes_data.append({
        'scene_id': i,
        'start': round(start_sec, 2),
        'end': round(end_sec, 2),
        'duration': round(dur, 2),
        'thumb': thumb_path
    })

print(f"Captured {len(scenes_data)} scenes.")
for s in scenes_data:
    print(f"Scene {s['scene_id']:02d}: {s['start']:5.2f}s - {s['end']:5.2f}s ({s['duration']:4.2f}s)")

with open('raw footage/scene_analysis/scenes_detected.json', 'w') as f:
    json.dump(scenes_data, f, indent=2)
