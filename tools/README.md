# tools

Scripts kept because they are worth running again. Everything else that used to
live in `scripts/` is in `docs/archive/one-off-scripts/` - 32 files written for
specific past jobs, several of whose input files no longer exist. They were
archived rather than deleted because they are the only record of how those
client videos were made.

**Be honest about what these are:** all three were written as one-off job
scripts with hardcoded input paths, and they still have them. They are kept for
the *recipe* inside each one, not because they are general-purpose. Run them
from the workspace root (`J:i editor`), since their relative paths assume it.

| Tool | What it does | Caveat |
|---|---|---|
| `clean_speaker_audio.py` | ffmpeg voice-cleanup filter chain: highpass 80 Hz to kill rumble, lowpass 10 kHz to kill hiss, then compression and normalisation. The filter chain is the valuable part. | Input path is hardcoded to `raw footage/yc/speaker_source.mp4`. Edit it, or lift the chain. |
| `get_audio_beats.py` | librosa beat and onset tracking; prints tempo, beat times and drops as JSON. Useful for cutting a film to a track. | Input path hardcoded to `raw footage/audio/cinematic_soundtrack.wav`. |
| `sfx.py` | Looks up the 40 pre-cleared CC0 sound effects by name and returns absolute paths. | Resolves `../assets/sfx` relative to this file, i.e. `J:i editor/assets/sfx`. That folder exists. Note the video engine keeps its *own* copy at `automation/editor/assets/sfx` and finds that one first. |

## cleanup/

`tools/cleanup/` holds the disk-cleanup scripts and, more importantly, the
`undo-*.csv` logs. **Do not run anything in there casually.** An early version
of `apply.py` moved 1,624 files of live engine source into quarantine; the undo
logs are what made the recovery possible, so keep every one of them.

To reverse a cleanup run: `python tools/cleanup/restore.py` (dry run), then `--go`.
