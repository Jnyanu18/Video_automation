# DeepFilterNet3 speech denoise: in.wav out.wav [atten_lim_db]. Stereo in -> processed per channel, 48 kHz out.
# Run with the python of an ISOLATED venv (DeepFilterNet pins torch/torchaudio versions that clash with other tools):
#   python -m venv dfn && dfn/Scripts/pip install deepfilternet      (Linux/macOS: dfn/bin/pip)
#   DFN_PYTHON=<abs path>/dfn/Scripts/python.exe                     (build_spine.py reads this env var)
# atten_lim_db = 20 (the news batch setting) removes steady hiss/static (noise floor -46.9 -> -62.4 dBFS on one take)
# without the underwater sound of an unlimited pass. Re-transcribe afterwards (97.5% word match on that take).
import sys
from df.enhance import enhance, init_df, load_audio, save_audio

src, dst = sys.argv[1], sys.argv[2]
lim = float(sys.argv[3]) if len(sys.argv) > 3 else 20
model, state, _ = init_df()
audio, _ = load_audio(src, sr=state.sr())
out = enhance(model, state, audio, atten_lim_db=lim)
save_audio(dst, out, state.sr())
print("ok", dst, tuple(out.shape), "limit", lim)
