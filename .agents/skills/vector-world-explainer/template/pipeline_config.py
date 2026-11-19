# Machine + project config for every Python tool in this film folder (spine/, presenter/, audio/).
# The film folder is a copy of the skill's template/ at <project>/film/. Everything else is derived.
#
# ===================== MACHINE CONFIG: EDIT THESE PER MACHINE / PROJECT =====================
# The only machine paths in the template live here and in config.sh. Keep the two in sync.
# Set them through environment variables or edit the defaults below.
import os as _os
RAW_DIR = _os.environ.get("RAW_DIR", r"<RAW_TAKES_DIR>")                 # camera card / raw takes. READ ONLY: never write here.
TAKE_GLOB = "DJI_*_{n:04d}_D"                 # one take = <stem>.MP4 + <stem>.WAV (DJI mic), n = take number
TAKES = list(range(129, 138))                 # take numbers recorded for this film (every one is judged)
SRC_W, SRC_H = 1512, 2688                     # take frame size (DJI 9:16; ffprobe it)
SRC_FPS = 30000 / 1001                        # take frame rate (29.97)
HEAVY = _os.environ.get("HEAVY", r"<HEAVY_TEMP_DIR>/<slug>")            # big temp files (ProRes mattes, Remotion temp). Use a disk with plenty of free space.
CUDA_PY = _os.environ.get("CUDA_PY", r"<CUDA_VENV_PYTHON>")  # torch cu128 venv (RTX 5070) for presenter/matte.py
YUNET = _os.environ.get("YUNET", r"<MODELS_DIR>/yunet.onnx")        # OpenCV face_detection_yunet_2023mar.onnx (gaze/measure)
SFX_LIB = _os.environ.get("SFX_LIB", r"<SFX_LIBRARY_DIR>")  # CC0 sfx library (catalog.json)
# ============================================================================================

import glob, os

FILM = os.path.dirname(os.path.abspath(__file__))      # <project>/film
PROJECT = os.path.dirname(FILM)                        # <project>
SPINE = os.path.join(FILM, "spine")                    # spine scripts + outputs
TAKES_DIR = os.path.join(SPINE, "takes")               # t<n>.words.json, gaze.json, sync.json, proc/
VO_REC = os.path.join(PROJECT, "audio", "vo-real.wav")  # gap-cut voice-over recording (spine/gapcut.py)
VO_REC_WORDS = os.path.join(PROJECT, "audio", "vo-real.words.json")  # its words (gapcut.py, then hand fixes)
SPINE_WAV = os.path.join(SPINE, "vo-spine.wav")        # the spliced spine -> copied to public/vo.wav
SPLICE_MAP = os.path.join(SPINE, "splice-map.json")
MATTE = os.path.join(HEAVY, "matte")                   # ProRes 4444 masters w<k>.mov + w<k>.json + geom.json


def _one(pattern):
    hits = glob.glob(pattern)
    if len(hits) != 1:
        raise FileNotFoundError(f"{pattern}: {len(hits)} matches")
    return hits[0]


def take_mp4(n):
    return _one(os.path.join(RAW_DIR, TAKE_GLOB.format(n=int(n)) + ".MP4"))


def take_wav(n):
    return _one(os.path.join(RAW_DIR, TAKE_GLOB.format(n=int(n)) + ".WAV"))


for d in (TAKES_DIR,):
    os.makedirs(d, exist_ok=True)
