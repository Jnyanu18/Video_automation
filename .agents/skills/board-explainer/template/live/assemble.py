# Master timeline: plan order, F = his take 0162 (mic WAV on the video clock), V = ElevenLabs v4 lines.
# Each voice type is cleaned and normalised as a whole (-16 LUFS), then placed with gaps. Writes:
#   film/public/vo_master.wav, film/src/timeline.json (segments + word timings in master time)
import json, subprocess, os, wave, numpy as np
SR = 48000; GAP = 0.35; GAP_SWITCH = 0.45
PLAN = json.load(open('plan.json', encoding='utf8')); SEG = json.load(open('segments.json'))
WORDS = [w for s in json.load(open('transcripts/0162.json', encoding='utf8')) for w in s['words']]
WAV = os.environ.get('TAKE_WAV', 'src/take.WAV')  # the camera's separate mic track (DJI .WAV), on the video clock
def pcm(path, ss=None, to=None, af=None):
    cmd = ['ffmpeg', '-v', 'error'] + (['-ss', f'{ss:.3f}', '-to', f'{to:.3f}'] if ss is not None else []) + ['-i', path] + (['-af', af] if af else []) + ['-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, '<f4').astype(np.float64)
def lufs(x):
    tmp = '_tmp.wav'; write(tmp, x)
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', tmp, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    os.remove(tmp); return float(e[e.rfind('Summary:'):].split('I:')[1].split()[0])
def write(p, x):
    with wave.open(p, 'wb') as o:
        o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
F_CHAIN = 'highpass=f=75,afftdn=nr=10:nf=-50,equalizer=f=260:t=q:w=1.0:g=-1.5,equalizer=f=3200:t=q:w=1.0:g=1.5,acompressor=threshold=-22dB:ratio=2.5:attack=10:release=120:makeup=1'
V_CHAIN = 'highpass=f=75,equalizer=f=260:t=q:w=1.0:g=-1.5,equalizer=f=3200:t=q:w=1.0:g=2,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=120:makeup=1'
pieces = []
for p in PLAN:
    if p['who'] == 'F':
        a, b = SEG[p['id']]; x = pcm(WAV, a, b, F_CHAIN)
        ws = [{'w': w['w'], 's': w['s'] - a, 'e': w['e'] - a} for w in WORDS if a <= w['s'] and w['e'] <= b + 0.05]
        pieces.append({'id': p['id'], 'who': 'F', 'x': x, 'words': ws, 'src_in': a, 'src_out': b, 'full': p.get('full', False)})
    else:
        meta = json.load(open(f"vo/{p['id']}.json", encoding='utf8')); al = meta['alignment']
        ws, cur = [], None
        for c, s, e in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']):
            if c.isspace():
                if cur: ws.append(cur); cur = None
                continue
            cur = cur or {'w': '', 's': s, 'e': e}; cur['w'] += c; cur['e'] = e
        if cur: ws.append(cur)
        a, b = max(0, ws[0]['s'] - 0.05), ws[-1]['e'] + 0.15
        x = pcm(f"vo/{p['id']}.mp3", af=V_CHAIN)[int(a * SR):int(b * SR)]
        pieces.append({'id': p['id'], 'who': 'V', 'x': x, 'words': [{'w': w['w'], 's': w['s'] - a, 'e': w['e'] - a} for w in ws]})
# per-type loudness match to -16 LUFS
for who in ('F', 'V'):
    allx = np.concatenate([q['x'] for q in pieces if q['who'] == who]); g = 10 ** ((-16 - lufs(allx)) / 20)
    for q in pieces:
        if q['who'] == who: q['x'] = q['x'] * g
    print(who, 'gain dB', round(20 * np.log10(g), 1))
t, out, segs = 0.25, [np.zeros(int(0.25 * SR))], []
for i, q in enumerate(pieces):
    if i:
        g = GAP_SWITCH if q['who'] != pieces[i - 1]['who'] else GAP
        out.append(np.zeros(int(g * SR))); t += g
    fade = np.ones(len(q['x'])); n = int(0.012 * SR); fade[:n] = np.linspace(0, 1, n); fade[-n:] = np.linspace(1, 0, n)
    out.append(q['x'] * fade); d = len(q['x']) / SR
    seg = {'id': q['id'], 'who': q['who'], 't0': round(t, 3), 't1': round(t + d, 3), 'words': [{'w': w['w'], 's': round(t + w['s'], 3), 'e': round(t + w['e'], 3)} for w in q['words']]}
    if q['who'] == 'F': seg.update({'src_in': q['src_in'], 'src_out': q['src_out'], 'full': q['full']})
    segs.append(seg); t += d
out.append(np.zeros(int(1.5 * SR))); y = np.concatenate(out)
os.makedirs('../film-board/public', exist_ok=True); os.makedirs('../film-board/src', exist_ok=True)
write('../film-board/public/vo_master.wav', y * 0.98)
json.dump({'total': round(len(y) / SR, 3), 'segments': segs}, open('../film-board/src/timeline.json', 'w', encoding='utf8'), ensure_ascii=False, indent=0)
fdur = sum(s['t1'] - s['t0'] for s in segs if s['who'] == 'F'); vdur = sum(s['t1'] - s['t0'] for s in segs if s['who'] == 'V')
print(f'total {len(y)/SR:.1f}s  face {fdur:.1f}s  voice-over {vdur:.1f}s  segments {len(segs)}')
