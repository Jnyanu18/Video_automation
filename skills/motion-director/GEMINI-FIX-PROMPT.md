# TASK: Fix, verify and test the motion-director build

You are a careful build engineer. You are fixing four defects found in an audit of the
`motion-director` skill, then proving the whole build works by running it. Work on the real
filesystem. Do not simulate, do not describe what you "would" do — run the commands and paste
the real output.

---

## ENVIRONMENT

| Thing | Value |
|---|---|
| OS | Windows 11. Shell: PowerShell. A Git Bash is also available. |
| Project root | `J:\ai editor\motion-director` |
| Kit (Remotion + Python audio) | `J:\ai editor\motion-director\kit` |
| Node deps | already installed in `kit\node_modules` — **do not run `npm install`** |
| Chrome for Remotion | already downloaded and cached — **do not re-download** |
| Python | on PATH, with `numpy`, `scipy`, `Pillow` installed |
| ffmpeg / ffprobe | on PATH |
| Claude skills dir | `C:\Users\jnyan\.claude\skills` |

Paths contain a space (`ai editor`). **Always quote every path.**

---

## HARD RULES

1. **Never invent output.** Every "PASS" you report must be backed by real command output that you
   paste. If you did not run it, say "NOT RUN".
2. **Apply the edits exactly as written below.** The old and new text is given verbatim. Do not
   rewrite surrounding code, do not reformat, do not "improve" anything that is not listed.
3. **Stop and report** if a verification step fails and the fix is not obvious from the error.
   A half-finished honest report is worth more than a green one you guessed at.
4. **Do not touch** `src/film.tsx`, `src/kit/*.tsx`, or any `references/*.md` except the one line
   named in TASK 4.
5. **Do not attempt the creative eval briefs** in `evals/briefs.md`. That is a separate job for a
   different model. Your job is only: fix, verify, test.
6. Budget: TASK 8's full render takes about **3 minutes**. Let it finish. Do not kill it.

---

## BACKGROUND: what was found

An audit rendered the kit and measured the output. Result: the build is real and works —
TypeScript compiles clean, all four demo sections render correctly, the full 1080×1920 film
encodes. But four defects were found:

- **D1** The delivered `.mp4` measures **−1.4 dBTP** true peak. The project's own gate
  (`references/critic-rubric.md` line 69) requires **≤ −1.5 dBFS**. The audio is normalised to
  exactly −1.5 in the `.wav`, and then the AAC encode pushes it over. Every film will fail this.
- **D2** Loudness lands at **−13.1 LUFS**, not the −14 target. It is inside the ±1 tolerance but
  sitting on its edge. Cause: `scorelib.py` uses a **single-pass** `loudnorm`, which is a dynamic
  estimate and is unreliable on short clips.
- **D3** **Nothing measures the gate.** `score.py` prints only "written". The loudness and peak
  checks exist as prose in a rubric that a human or model is trusted to perform by hand. D1
  survived precisely because nothing checked.
- **D4** The skill is **not installed**. It lives in the project folder only, so Claude Code
  cannot load or trigger it.

---

## TASK 1 — Baseline (prove the starting state)

Run these and paste the output. This is the "before" measurement; do not fix anything yet.

```powershell
cd "J:\ai editor\motion-director\kit"
ffmpeg -nostats -hide_banner -i "public\soundtrack.wav" -af loudnorm=print_format=summary -f null - 2>&1 | Select-String "Input Integrated|Input True Peak"
```

Expected (approximately): `-13.1 LUFS`, `-1.5 dBTP`. Record what you actually get.

---

## TASK 2 — Fix D1 + D2: two-pass loudness normalisation

File: `J:\ai editor\motion-director\kit\scorelib.py`

### 2a. Imports

Find this block near the top:

```python
from pathlib import Path
import subprocess
import wave
```

Replace it with:

```python
from pathlib import Path
import json
import re
import subprocess
import wave
```

### 2b. The docstring line

Find:

```python
    s.finalize('public/soundtrack.wav')      # loudnorm to -14 LUFS, TP -1.5
```

Replace with:

```python
    s.finalize('public/soundtrack.wav')      # two-pass loudnorm to -14 LUFS, TP -2.0
```

### 2c. The default true-peak target

Find:

```python
    def finalize(self, path, lufs=-14, tp=-1.5, fade_out=.35, grain_png=True):
```

Replace with:

```python
    def finalize(self, path, lufs=-14, tp=-2.0, fade_out=.35, grain_png=True):
```

**Why −2.0 and not −1.5:** the gate of ≤ −1.5 applies to the *delivered* `.mp4`. Lossy AAC
encoding raises true peak by a few tenths of a dB. Targeting −2.0 in the mix leaves the headroom
for that, so the encoded file lands under the gate. **Do not change the gate itself to −1.4.**

### 2d. Single pass → two pass

Find this (it is one `subprocess.run` call spanning two lines):

```python
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-af', f'loudnorm=I={lufs}:TP={tp}:LRA=9',
                        '-ar', '48000', '-c:a', 'pcm_s16le', str(path)], check=True)
```

Replace it with exactly this:

```python
        # Two-pass loudnorm: pass 1 measures the file, pass 2 applies that measurement linearly.
        # Single-pass loudnorm is a streaming estimate and misses the target on short clips.
        probe = subprocess.run(['ffmpeg', '-nostats', '-hide_banner', '-i', str(raw), '-af',
                                f'loudnorm=I={lufs}:TP={tp}:LRA=9:print_format=json',
                                '-f', 'null', '-'], capture_output=True, text=True, check=True)
        blocks = re.findall(r'\{[^{}]*"input_i"[^{}]*\}', probe.stderr, re.S)
        if not blocks:
            raise RuntimeError('loudnorm pass 1 produced no JSON:\n' + probe.stderr[-1000:])
        m = json.loads(blocks[-1])
        af = (f"loudnorm=I={lufs}:TP={tp}:LRA=9"
              f":measured_I={m['input_i']}:measured_TP={m['input_tp']}"
              f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}"
              f":offset={m['target_offset']}:linear=true")
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-af', af,
                        '-ar', '48000', '-c:a', 'pcm_s16le', str(path)], check=True)
```

Keep the indentation exactly as shown (8 spaces — it is inside a method).

---

## TASK 3 — Fix D3: an automated gate that can actually fail

### 3a. Create the gate script

Create a **new** file `J:\ai editor\motion-director\kit\gate.py` with exactly this content:

```python
"""Audio delivery gate. Measures a media file and exits non-zero if it misses the spec.

    python gate.py out/film.mp4
    python gate.py public/soundtrack.wav --lufs -14 --tol 1.0 --tp -1.5

Spec comes from references/critic-rubric.md: -14 LUFS +/- 1 integrated, true peak <= -1.5 dBFS.
"""
import argparse
import json
import re
import subprocess
import sys


def measure(path):
    p = subprocess.run(['ffmpeg', '-nostats', '-hide_banner', '-i', str(path),
                        '-af', 'loudnorm=print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit(f'FAIL  ffmpeg could not read {path}\n{p.stderr[-800:]}')
    blocks = re.findall(r'\{[^{}]*"input_i"[^{}]*\}', p.stderr, re.S)
    if not blocks:
        sys.exit(f'FAIL  loudnorm produced no JSON for {path}')
    return json.loads(blocks[-1])


ap = argparse.ArgumentParser()
ap.add_argument('media')
ap.add_argument('--lufs', type=float, default=-14.0)
ap.add_argument('--tol', type=float, default=1.0)
ap.add_argument('--tp', type=float, default=-1.5)
a = ap.parse_args()

d = measure(a.media)
raw_i, raw_tp = str(d['input_i']), str(d['input_tp'])
if 'inf' in raw_i.lower() or 'inf' in raw_tp.lower():
    sys.exit(f'FAIL  {a.media} is silent or unmeasurable (I={raw_i}, TP={raw_tp})')
i, tp = float(raw_i), float(raw_tp)

fails = []
if abs(i - a.lufs) > a.tol:
    fails.append(f'integrated {i:+.2f} LUFS is outside {a.lufs:+.1f} +/- {a.tol}')
if tp > a.tp:
    fails.append(f'true peak {tp:+.2f} dBTP exceeds {a.tp:+.1f}')

print(f'{a.media}:  {i:+.2f} LUFS   true peak {tp:+.2f} dBTP   '
      f'(target {a.lufs:+.1f} +/- {a.tol}, TP <= {a.tp:+.1f})')
for f in fails:
    print('FAIL  ' + f)
print('PASS' if not fails else 'GATE FAILED')
sys.exit(1 if fails else 0)
```

### 3b. Make `score.py` self-check

File: `J:\ai editor\motion-director\kit\score.py`. Find the last two lines:

```python
s.finalize(Path(__file__).parent / 'public' / 'soundtrack.wav')
print('public/soundtrack.wav written')
```

Replace with:

```python
wav = Path(__file__).parent / 'public' / 'soundtrack.wav'
s.finalize(wav)
print(f'{wav} written')
sys.exit(subprocess.call([sys.executable, str(Path(__file__).parent / 'gate.py'), str(wav),
                          '--tp', '-1.8']))
```

Then add these two imports at the top of `score.py`, directly under the existing
`from pathlib import Path` line:

```python
import subprocess
import sys
```

(The wav is checked at `--tp -1.8` rather than −1.5 because it is the pre-encode master and is
deliberately normalised to −2.0; the delivered mp4 is the thing that must clear −1.5.)

### 3c. Register the gate as a script

File: `J:\ai editor\motion-director\kit\package.json`. In the `"scripts"` block, find:

```json
    "render": "node render.mjs"
```

Replace with:

```json
    "render": "node render.mjs",
    "gate": "python gate.py"
```

---

## TASK 4 — Record the headroom rule where the director will read it

File: `J:\ai editor\motion-director\references\sound-design.md`, line 11. Find:

```
5. **Loudness gate:** −14 LUFS integrated (±1), true peak ≤ −1.5 dBFS. A film with only small sound effects (peaks around −20 dB) fails the gate.
```

Replace with:

```
5. **Loudness gate:** −14 LUFS integrated (±1), true peak ≤ −1.5 dBFS, **measured on the delivered .mp4** with `python kit/gate.py out/<name>.mp4`. Mix to TP −2.0 so the AAC encode still lands under −1.5. A film with only small sound effects (peaks around −20 dB) fails the gate.
```

Change nothing else in that file.

---

## TASK 5 — Fix D4: install the skill

The skill must be loadable by Claude Code from `C:\Users\jnyan\.claude\skills`, while staying
editable at its real home. Use a directory junction so there is one source of truth.

```powershell
cmd /c mklink /J "C:\Users\jnyan\.claude\skills\motion-director" "J:\ai editor\motion-director"
```

Verify:

```powershell
Test-Path "C:\Users\jnyan\.claude\skills\motion-director\SKILL.md"
Get-Content "C:\Users\jnyan\.claude\skills\motion-director\SKILL.md" -TotalCount 3
```

Pass = `True`, and the frontmatter shows `name: motion-director`.

If `mklink` fails (it will say "Access is denied" or "Local volumes are required"), fall back to a
mirrored copy that excludes build junk, and say clearly in your report that you used a copy, not a
junction, because a copy means edits in the two places will drift:

```powershell
robocopy "J:\ai editor\motion-director" "C:\Users\jnyan\.claude\skills\motion-director" /MIR /XD node_modules out .bundle /NFL /NDL /NJH /NJS
```

**Never copy `node_modules`, `out`, or `.bundle`.**

---

## TASK 6 — Create the missing eval log

`evals/briefs.md` tells the reader to record results in `evals/history.md`, which does not exist.
Create `J:\ai editor\motion-director\evals\history.md` with exactly:

```markdown
# Eval history

One row per blind-brief run. See `briefs.md` for the briefs and the scoring method.
A skill change ships only if the average concept and final scores do not drop.

| date | brief # | skill version | concept /30 | final (hook/clarity/rhythm/craft/brand) | gate pass? | QA rounds | cost $ | notes |
|---|---|---|---|---|---|---|---|---|
| _no runs yet_ | | | | | | | | |
```

---

## TASK 7 — Regression check: the JSON-props bug must stay fixed

Remotion passes composition props to the renderer as JSON, which silently strips functions. The
film config holds functions (`render` per section), so it must be imported inside the Root module,
never passed as a prop. This was a real bug that was already fixed. Prove it is still fixed.

```powershell
cd "J:\ai editor\motion-director\kit"
Get-Content "src\Root.tsx"
```

Assert all three:
1. The file contains `import {film} from './film';`
2. `defaultProps` contains only JSON-safe primitives — it should read `defaultProps={{blur: true}}`
3. The string `cfg` does **not** appear inside `defaultProps` or in any `inputProps`

If any assertion fails, **stop** and report it. Do not fix it yourself.

---

## TASK 8 — Full verification run

Run all of these in order, from `J:\ai editor\motion-director\kit`. Paste real output for each.

### 8a. TypeScript

```powershell
npx tsc --noEmit
echo "exit=$LASTEXITCODE"
```
**Pass:** `exit=0`, no output.

### 8b. Rebuild the score — this now gates itself

```powershell
python score.py
echo "exit=$LASTEXITCODE"
```
**Pass:** `exit=0` and a printed line ending in `PASS`. The integrated figure should now be within
about **0.3 LU** of −14.0 (two-pass is much tighter than the ±1 tolerance).

This exact recipe was tested on this exact audio before you were given it. It produced
**−14.00 LUFS, true peak −2.4 dBTP**. If your numbers are close to those, the fix is correct.
A true peak below the −2.0 target is expected and fine: linear mode sets the gain from the
loudness offset, and the peak lands wherever it lands as long as it is under the ceiling.

**If it fails:** paste the full output. Do not loosen the tolerance to make it pass.

### 8c. Stills — four frames, one per section

```powershell
node render.mjs --stills 0.3 2.0 4.1 6.2
```
**Pass:** four PNG paths printed under `out\stills\`.

Then prove the frames are real images, not blank:

```powershell
python -c "import glob;from PIL import Image,ImageStat;[print(p, Image.open(p).size, round(ImageStat.Stat(Image.open(p).convert('L')).stddev[0],1)) for p in sorted(glob.glob('out/stills/*.png'))]"
```
**Pass:** each is `(540, 960)` and has a standard deviation **above 10** (a blank frame scores
near 0). Then open all four and look at them. Expect, in order: huge word mark with pill chips;
a black triangle on blue with "TRIANGLE."; blue metaball blobs inverting the word "LIQUID."; a
phone mockup with circular ring text and "KIT".

### 8d. Final render — motion blur and audio (~3 minutes)

```powershell
node render.mjs --final --name verify.mp4
```
**Pass:** prints `...\out\verify.mp4`.

### 8e. Probe the delivered file

```powershell
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate,channels -of default=nw=1 "out\verify.mp4"
```
**Pass, all of:** `width=1080`, `height=1920`, `r_frame_rate=60/1`, video `codec_name=h264`,
an audio stream `codec_name=aac` with `channels=2`, `duration` between `7.45` and `7.55`,
`size` above `1000000`.

### 8f. The gate, on the delivered mp4 — this is the one D1 failed

```powershell
python gate.py "out\verify.mp4"
echo "exit=$LASTEXITCODE"
```
**Pass:** `exit=0`, printed `PASS`, true peak **≤ −1.5 dBTP** and integrated within ±1 of −14.
This is the single most important check in this whole job. Before the fix it reported −1.4 dBTP
and would have failed. If it still exceeds −1.5, lower the `tp` default in `scorelib.py` to −2.5,
re-run TASK 8b and 8d, and report that you had to.

---

## FINAL REPORT

End with exactly this table, filled in, and nothing optimistic that the output does not support:

```
| # | Item                                   | Result | Evidence |
|---|----------------------------------------|--------|----------|
| 1 | Baseline measured                      |        | before: __ LUFS / __ dBTP |
| 2 | D1+D2 two-pass loudnorm applied        |        |          |
| 3 | D3 gate.py created + wired into score  |        |          |
| 4 | sound-design.md headroom rule          |        |          |
| 5 | D4 skill installed (junction or copy?) |        |          |
| 6 | evals/history.md created               |        |          |
| 7 | JSON-props regression still fixed      |        |          |
| 8a| tsc --noEmit                           |        | exit=    |
| 8b| score.py self-gate                     |        | __ LUFS / __ dBTP |
| 8c| 4 stills rendered + non-blank + viewed |        | stddevs: |
| 8d| full render                            |        | duration |
| 8e| ffprobe assertions                     |        |          |
| 8f| gate on verify.mp4                     |        | __ LUFS / __ dBTP, exit= |
```

Then, in plain prose:
- **Anything you could not fix**, and why.
- **Anything you changed that was not in this prompt**, and why.
- **Anything that looked wrong but was out of scope** — note it, do not fix it.

Do not claim the skill "works" or "is production ready". You are testing that the machinery runs
and the audio meets spec. Whether the films are any good is a separate, human judgement that has
not been made yet.
