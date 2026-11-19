# Patch splice (quantum v3; used when full re-renders kept failing on a nearly full C: drive):
# re-render only the changed frame range, then splice it into the last good full render in ONE encode.
#  video = base render (frames outside the patch) + a re-rendered patch segment, encoded once;
#  audio = public/vo.wav + public/bed.wav summed exactly as Remotion does (gain 1 each), two-pass
#          linear loudnorm to -14 LUFS + oversampled limiter (same chain as render.sh), AAC 48k.
# usage: py finalize.py <base.mp4> <patch.mp4> <patch_first_frame> <out.mp4> [crf] [tmpdir]
import json, os, subprocess, sys
base, patch, p0, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
crf = sys.argv[5] if len(sys.argv) > 5 else "14"  # no VBV cap here: check size <= 300 MB; else re-encode via render_ig.sh logic
tmp = sys.argv[6] if len(sys.argv) > 6 else os.path.dirname(os.path.abspath(out))
here = os.path.dirname(os.path.abspath(__file__))
run = lambda a: subprocess.run(a, check=True, capture_output=True, text=True)

def nframes(f):
    r = run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", f])
    return int(r.stdout.strip())

N = nframes(base)  # total frames of the base render
DUR = N / 30
pn = nframes(patch)
p1 = p0 + pn  # first base frame after the patch
mix = os.path.join(tmp, "mix.wav"); aud = os.path.join(tmp, "final-audio.wav")
run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(here, "public", "vo.wav"), "-i", os.path.join(here, "public", "bed.wav"), "-filter_complex",
     f"[0:a]aresample=48000,aformat=channel_layouts=stereo[a0];[1:a]aresample=48000,aformat=channel_layouts=stereo[a1];[a0][a1]amix=inputs=2:normalize=0:duration=longest,apad,atrim=0:{DUR:.6f}", "-c:a", "pcm_f32le", mix])
r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", mix, "-af", "loudnorm=I=-14:TP=-2:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
j = r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1]; m = json.loads(j)
print("pre-norm", m["input_i"], "LUFS", m["input_tp"], "dBTP")
af = (f"loudnorm=I=-14:TP=-2:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,"
      "aresample=192000,alimiter=limit=0.75:attack=1:release=50:level=false,aresample=48000")
run(["ffmpeg", "-v", "error", "-y", "-i", mix, "-af", af, "-ac", "2", "-c:a", "pcm_s16le", aud])
vf = (f"[0:v]trim=start_frame=0:end_frame={p0},setpts=PTS-STARTPTS[a];[1:v]setpts=PTS-STARTPTS[b];"
      f"[0:v]trim=start_frame={p1}:end_frame={N},setpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=1:a=0,fps=30,format=yuv420p[v]")
run(["ffmpeg", "-v", "error", "-y", "-i", base, "-i", patch, "-i", aud, "-filter_complex", vf, "-map", "[v]", "-map", "2:a",
     "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", crf, "-pix_fmt", "yuv420p",
     "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
     "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-movflags", "+faststart", "-frames:v", str(N), out])
print("patch frames", p0, "-", p1 - 1, "->", out)
