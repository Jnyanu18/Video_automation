# ElevenLabs REST with-timestamps, eleven_v4 + clone_strength (per Madhav, Oct 23). Key from env, never printed.
import base64, json, os, sys, urllib.request, urllib.error
VOICE = os.environ['ELEVENLABS_VOICE_ID']  # your professional voice clone
SETTINGS = {'stability': 0.33, 'similarity_boost': 1.0, 'clone_strength': 0.75, 'use_speaker_boost': True, 'style': 0.0}
P = {p['id']: p for p in json.load(open('plan.json', encoding='utf8')) if p['who'] == 'V'}
ids = list(P) if sys.argv[1:] == ['all'] else sys.argv[1:]
for i in ids:
    body = json.dumps({'text': P[i]['text'], 'model_id': 'eleven_v4', 'language_code': 'en', 'voice_settings': SETTINGS}).encode()
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_192', data=body,
                                 headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY'], 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            d = json.load(r); h = {k.lower(): v for k, v in r.headers.items()}
    except urllib.error.HTTPError as e:
        print(i, 'HTTP', e.code, e.read()[:300].decode('utf8', 'replace')); sys.exit(1)
    open(f'vo/{i}.mp3', 'wb').write(base64.b64decode(d['audio_base64']))
    json.dump({'text': P[i]['text'], 'alignment': d['alignment'], 'settings': SETTINGS, 'model': 'eleven_v4', 'character_cost': h.get('character-cost')}, open(f'vo/{i}.json', 'w', encoding='utf8'))
    print(i, 'ok billed', h.get('character-cost'), 'dur', round(d['alignment']['character_end_times_seconds'][-1], 2), flush=True)
