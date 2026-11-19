import json

with open('vishnu-studio/videos/ailo-launch/words.json') as f:
    words = json.load(f)

for w in words:
    if 8.5 <= w['start'] <= 13.5:
        print(f"{w['w']}: {w['start']:.2f}s - {w['end']:.2f}s")
