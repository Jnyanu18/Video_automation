# Machine config for the bash scripts (sourced by render_ig.sh, render.sh, qa.sh, snap.sh,
# presenter/rebuild.sh). Keep in sync with pipeline_config.py.
# ===================== MACHINE CONFIG: EDIT THESE PER MACHINE / PROJECT =====================
PY=${PY:-python}  # real Python (never python3)
CUDA_PY=${CUDA_PY:-<CUDA_VENV_PYTHON>}                        # torch + CUDA venv for the GPU matte
HEAVY=${HEAVY:-<HEAVY_TEMP_DIR>/slug}                                         # big temp files, on a roomy disk
HEAVY_WIN=${HEAVY_WIN:-'<HEAVY_TEMP_DIR_WINDOWS_FORM>'}                               # same folder, Windows form
# ============================================================================================
mkdir -p "$HEAVY"
export TMP="$HEAVY_WIN" TEMP="$HEAVY_WIN" TMPDIR="$HEAVY_WIN"   # Remotion/Chrome temp off the system disk
