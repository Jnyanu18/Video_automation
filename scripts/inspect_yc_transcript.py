import json

with open('raw footage/yc/speaker_source.json', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total duration: {data.get('duration', 0):.2f}s")
print("\n--- SEGMENTS ---")
for s in data['segments']:
    print(f"[{s['start']:05.2f} - {s['end']:05.2f}]: {s['text'].strip()}")
