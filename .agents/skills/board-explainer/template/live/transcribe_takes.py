# Transcribe the DJI mic WAVs with word timestamps (faster-whisper large-v3, CPU; English with Hindi asides).
import json, os, sys
from faster_whisper import WhisperModel
m = WhisperModel('large-v3', device='cpu', compute_type='int8')
for name, path in [(a.split('=')[0], a.split('=')[1]) for a in sys.argv[1:]]:
    segs, info = m.transcribe(path, word_timestamps=True, vad_filter=True, initial_prompt=os.environ.get('WHISPER_PROMPT', None))
    out = [{'s': round(s.start, 2), 'e': round(s.end, 2), 'text': s.text.strip(), 'words': [{'w': w.word.strip(), 's': round(w.start, 3), 'e': round(w.end, 3), 'p': round(w.probability, 2)} for w in s.words]} for s in segs]
    json.dump(out, open(f'transcripts/{name}.json', 'w', encoding='utf8'), ensure_ascii=False, indent=0)
    with open(f'transcripts/{name}.txt', 'w', encoding='utf8') as fh:
        for s in out: fh.write(f"[{s['s']:7.2f}-{s['e']:7.2f}] {s['text']}\n")
    print(name, info.language, len(out), 'segments', flush=True)
