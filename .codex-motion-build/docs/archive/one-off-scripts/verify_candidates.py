import cv2
import json

# Check the exact scene timestamps from scenes_detected.json
with open('raw footage/scene_analysis/scenes_detected.json') as f:
    scenes = json.load(f)

scenes_by_id = {s['scene_id']: s for s in scenes}

# Let's verify our candidates:
candidates = [
    (1, "Act 1: Diamond Macro Sparkle"),
    (2, "Act 1: Diamond Showcase Display"),
    (4, "Act 2: Grand Venue Walkway / Establish"),
    (6, "Act 2: Keynote Speaker Stage Presence"),
    (18, "Act 2: VIP Audience Low-Light Atmosphere"),
    (22, "Act 3: Peak Diamond Close-Up"),
    (26, "Act 3: Stage Screen / Conference LED"),
    (31, "Act 3: Speaker Gesture & Discussion"),
    (37, "Act 3: Networking / Exhibition Floor"),
    (38, "Act 3: Grand Hall / 19+ Audience Faces"),
    (48, "Act 3: Keynote Panel / Presentation"),
    (55, "Act 3: VIP Interaction / Business Exchange"),
    (62, "Act 3: Climax / Applause"),
    (63, "Act 4: Conference End Graphic")
]

print("Verifying candidates:")
for cid, desc in candidates:
    s = scenes_by_id.get(cid)
    if s:
        print(f"Scene {cid:02d}: {s['start']:5.2f}s - {s['end']:5.2f}s ({s['duration']:4.2f}s) -> {desc}")
