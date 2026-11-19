# ElevenLabs REST TTS with timestamps (clone_strength isn't in the MCP tool). Key comes from the
# ELEVENLABS_API_KEY env var and is never printed or written. The voice comes from ELEVENLABS_VOICE_ID
# (your own voice clone). scripts/lines.json = [{"id": "en01", "lang": "en", "text": "..."}, ...].
# usage: el_tts.py <id> [<id> ...] | all-en | all-hi
import base64, json, os, sys, urllib.request, urllib.error
VOICE = os.environ['ELEVENLABS_VOICE_ID']
SETTINGS = {'stability': 0.33, 'similarity_boost': 1.0, 'clone_strength': 0.75, 'use_speaker_boost': True, 'style': 0.0}
L = {x['id']: x for x in json.load(open('scripts/lines.json', encoding='utf8'))}
ids = sys.argv[1:]
if ids == ['all-en']: ids = [i for i in L if i.startswith('en')]
if ids == ['all-hi']: ids = [i for i in L if i.startswith('hi')]
os.makedirs('audio/lines', exist_ok=True)
for i in ids:
    x = L[i]
    body = json.dumps({'text': x['text'], 'model_id': 'eleven_v4', 'language_code': x['lang'], 'voice_settings': SETTINGS}).encode()
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_192',
                                 data=body, headers={'xi-api-key': os.environ['ELEVENLABS_API_KEY'], 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            d = json.load(r); hdr = {k.lower(): v for k, v in r.headers.items()}
    except urllib.error.HTTPError as e:
        print(i, 'HTTP', e.code, e.read()[:400].decode('utf8', 'replace')); sys.exit(1)
    open(f'audio/lines/{i}.mp3', 'wb').write(base64.b64decode(d['audio_base64']))
    json.dump({'text': x['text'], 'alignment': d.get('alignment'), 'settings': SETTINGS, 'model': 'eleven_v4', 'lang': x['lang'],
               'character_cost': hdr.get('character-cost') or hdr.get('x-character-count'), 'request_id': hdr.get('request-id')},
              open(f'audio/lines/{i}.json', 'w', encoding='utf8'), ensure_ascii=False)
    al = d.get('alignment') or {}
    print(i, 'ok', 'chars', len(x['text']), 'billed', hdr.get('character-cost') or hdr.get('x-character-count'), 'dur', round((al.get('character_end_times_seconds') or [0])[-1], 2))
