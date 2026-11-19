# Optional fills (only with approval; his real take always wins)

All three were tried in the batch. The final "flawless" version uses **none of them**: every word is his real
voice. Use a fill only when a needed line truly doesn't exist in any take, and get approval for the paid action.

## ElevenLabs line in his clone voice (`scripts/gen_el_lines.py`)
- Settings he approved: `eleven_multilingual_v2`, stability **0.45**, similarity **1.0**, style **0**, speaker boost
  **on**, speed **1.1**. Voice id from `ELEVENLABS_VOICE_ID`, key from `ELEVENLABS_API_KEY` (never printed or saved).
- Report characters used (account balance before/after). Run `--dry-run` first.
- Whisper-verify every line and regenerate mis-said ones ("bauble", a wrong year).
- Clarity chain + level match to his own spans before placing (`highpass 75, -1.5 dB @260, +2 dB @3.2k,
  3:1 comp`, then gain to his measured LUFS).
- Only verified facts; never put words in his mouth he would not say.
- **Never under idle footage**: his silent "listening" loop under a cloned line looked like "not my face talking".
  A clone line needs either the HeyGen twin on screen, or his real cut-out with no lip movement expected (e.g. a
  news intro over full-frame graphics before he appears), or nothing.

## HeyGen twin (short question bursts)
- Train a digital twin from the SAME take (same clothes, room, framing): a 1080x1920 cut of ~170 s of him
  talking, audio advanced to fix any lip offset, under the API's 200 MiB cap; consent per the HeyGen flow.
  Avatar id from `HEYGEN_AVATAR_ID`.
- Render the lines with **Avatar V** (faces the camera, keeps the framing); Avatar III looked raw and its framing
  jumped. Keep bursts to one sentence (3-4 s).
- Matte it exactly like his take: scale/pad to 1440x2560 to match the proxy framing, `scripts/matte.sh twin.mp4
  public/matte/twin-m1440.webm`, find each line's offset by audio cross-correlation (0.99+), and add EDL segments
  `{out, src: offset, len, twin: true}`; the presenter plays `twin-m1440.webm` for them in the same spot.
- He liked "the twin asks, the real me answers" as a format, but then re-recorded the questions himself, which
  is better.

## Original-character questioner
- He asked for a celebrity voice (Amitabh Bachchan, Gandhi): **declined**. Personality rights are protected
  (e.g. a 2023 Delhi High Court order for Amitabh Bachchan) and ElevenLabs forbids cloning without consent.
- Instead: an ORIGINAL character with a **designed** voice (ElevenLabs Voice Design; id in an env var), drawn in the
  world's style, generic (the batch's "Dadaji": white moustache, grey hair, cloth cap, kurta and sleeveless jacket;
  explicitly not bald with round glasses and a shawl, not a French beard). Name tag on screen, jaw flaps on twos
  driven by `voLevel` only while his lines play. Never labelled as real or famous.
- With a character, he listens on screen; avoid long idle stretches (see above).
