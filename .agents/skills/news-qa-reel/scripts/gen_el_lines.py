# OPTIONAL FILL: lines in the presenter's own ElevenLabs voice clone (paid; get approval and report characters used).
# Settings Madhav approved (2026-10-23): eleven_multilingual_v2, stability 0.45, similarity 1.0, style 0,
# speaker boost on, speed 1.1. Voice and key come from env vars and are never printed or stored:
#   ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID (his clone; or a DESIGNED voice id for an original character)
# usage: python scripts/gen_el_lines.py <lines.json> <out-dir> [--dry-run]
#   lines.json: [{"file": "c1-intro.mp3", "text": "On October 20th, the US banned DeepSeek from federal systems."}, ...]
# Existing files are skipped (no double spend). Whisper-verify every line afterwards (mis-said words get regenerated:
# "bubble" came back as "bauble" once). Lines must say only verified facts.
import json, os, subprocess, sys, urllib.request

lines_path, out = sys.argv[1], sys.argv[2]
dry = "--dry-run" in sys.argv
jobs = json.load(open(lines_path, encoding="utf-8"))
todo = [j for j in jobs if not os.path.exists(os.path.join(out, j["file"]))]
print(f"{len(todo)} lines, {sum(len(j['text']) for j in todo)} characters to generate")
if dry or not todo: sys.exit(0)

def env(name):
    v = os.environ.get(name)
    if not v and os.name == "nt":  # a Windows *user* env var set after this shell started
        v = subprocess.run(["powershell", "-NoProfile", "-Command", f"[Environment]::GetEnvironmentVariable('{name}','User')"],
                           capture_output=True, text=True).stdout.strip()
    if not v: sys.exit(f"missing env var {name}")
    return v

key, voice = env("ELEVENLABS_API_KEY"), env("ELEVENLABS_VOICE_ID")
settings = {"stability": float(os.environ.get("EL_STABILITY", 0.45)), "similarity_boost": 1.0, "style": 0,
            "use_speaker_boost": True, "speed": float(os.environ.get("EL_SPEED", 1.1))}
os.makedirs(out, exist_ok=True)
chars = 0
for j in todo:
    body = json.dumps({"text": j["text"], "model_id": "eleven_multilingual_v2", "voice_settings": settings}).encode()
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_192", data=body,
                                 headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    with urllib.request.urlopen(req, timeout=120) as r: open(os.path.join(out, j["file"]), "wb").write(r.read())
    chars += len(j["text"]); print("ok", j["file"], len(j["text"]))
print("characters sent", chars)
