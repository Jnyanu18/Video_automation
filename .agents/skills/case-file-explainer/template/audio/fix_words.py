# edge-tts returns "March 2024" as one boundary; split it so captions/cues address each word.
import json, os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'words.json')
W = json.load(open(p)); out = []
for w in W:
    if w['w'] == 'March 2024':
        m = round(w['s'] + (w['e'] - w['s']) * 0.4, 3)
        out += [{'w': 'March', 's': w['s'], 'e': m}, {'w': '2024', 's': m, 'e': w['e']}]
    else:
        out.append(w)
json.dump(out, open(p, 'w'), indent=0); print(len(out), out[:3])
