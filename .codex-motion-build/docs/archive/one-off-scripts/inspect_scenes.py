import os
import json
import cv2

with open('raw footage/scene_analysis/scenes_metrics.json') as f:
    scenes = json.load(f)

# Try loading YOLO model for content classification
try:
    from ultralytics import YOLO
    model = YOLO('yolov8n.pt')
    has_yolo = True
except Exception as e:
    print(f"YOLO not loaded: {e}")
    has_yolo = False

for s in scenes:
    img = cv2.imread(s['thumb'])
    labels = []
    if has_yolo and img is not None:
        results = model(img, verbose=False)
        for r in results:
            for c in r.boxes.cls:
                labels.append(model.names[int(c)])
    s['labels'] = list(set(labels))

with open('raw footage/scene_analysis/scenes_enriched.json', 'w') as f:
    json.dump(scenes, f, indent=2)

print("\n--- ALL 64 SCENES SUMMARY ---")
for s in scenes:
    label_str = ", ".join(s['labels']) if s.get('labels') else "visual"
    print(f"Scene {s['scene_id']:02d} | {s['start']:5.2f}s - {s['end']:5.2f}s ({s['duration']:4.2f}s) | Br={s['brightness']:5.1f} Ct={s['contrast']:4.1f} | Objects: {label_str}")
