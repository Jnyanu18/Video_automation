// Shared render CLI. See README.md for the full surface.
//   node render.mjs --stills <seconds...> [--format png|jpeg] [--width <px>]
//   node render.mjs --preview [--name f.mp4]
//   node render.mjs --final   [--name f.mp4] [--json]
//   add  --project <dir>  to render a film project (default: this kit's examples/sample-film)
//
// How a project resolves the kit: a project holds only src/film.tsx (+ public/, score.py, plan.md). This file
// bundles the kit's own src/Root.tsx and, via a webpack alias, points `@film` at the project's src/film.tsx and
// `@kit` at src/kit. Module lookup for react/remotion falls back to the kit's node_modules. Nothing is copied.
import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderMedia, renderStill} from '@remotion/renderer';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync, existsSync, cpSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const kit = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
const json = args.includes('--json');
// Machine-readable mode: stdout carries exactly one JSON object; everything else goes to stderr.
const log = (...a) => (json ? console.error(...a) : console.log(...a));
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const VALUE_FLAGS = ['--name', '--format', '--width', '--project', '--chunks'];
// --chunks N: render N frame ranges (each retried up to 3x), join them losslessly, mux one audio render.
// Long footage renders survive transient failures (e.g. Chrome's net::ERR_NETWORK_CHANGED on localhost).
// RESUME=1 keeps finished chunks. CONCURRENCY and OFFTHREAD_THREADS tune Remotion.
const chunks = Math.max(1, Number(flag('--chunks') ?? 1));

const mode = ['--stills', '--preview', '--final'].find((m) => args.includes(m)) ?? '--final';
const name = flag('--name') ?? 'film.mp4';
const format = (flag('--format') ?? 'png').toLowerCase().replace('jpg', 'jpeg');
const widthPx = flag('--width') ? Number(flag('--width')) : undefined;
if (!['png', 'jpeg'].includes(format)) throw new Error(`--format must be png or jpeg, got "${format}"`);
if (widthPx !== undefined && !(widthPx > 0)) throw new Error('--width must be a positive number');

const projectArg = flag('--project');
const project = projectArg ? resolve(process.cwd(), projectArg) : kit;
const filmEntry = projectArg ? join(project, 'src', 'film.tsx') : join(kit, 'examples', 'sample-film.tsx');
if (!existsSync(filmEntry)) throw new Error(`film entry not found: ${filmEntry}`);

const out = resolve(project, 'out');
mkdirSync(resolve(out, 'stills'), {recursive: true});

// Public dir: a project's own public/ overlaid on the kit's shared assets. The kit itself uses public/ directly.
//
// Every shared asset is copied, not just the Geist fonts: kit components reference
// other files too (core.tsx uses grain.png), and copying fonts alone made any
// project render die with a 404 on grain.png rather than a readable error.
// soundtrack.wav is excluded because it is per-film output that score.py writes;
// inheriting the kit's would silently score a project with the wrong audio.
const SHARED_SKIP = /^soundtrack\.wav$/i;
let publicDir = resolve(kit, 'public');
if (projectArg) {
  publicDir = resolve(out, '.public');
  rmSync(publicDir, {recursive: true, force: true});
  mkdirSync(publicDir, {recursive: true});
  for (const f of readdirSync(resolve(kit, 'public'))) {
    if (!SHARED_SKIP.test(f)) cpSync(resolve(kit, 'public', f), resolve(publicDir, f), {recursive: true});
  }
  if (existsSync(resolve(project, 'public'))) cpSync(resolve(project, 'public'), publicDir, {recursive: true});
}

const fail = (e) => {
  if (json) console.log(JSON.stringify({path: null, duration: null, fps: null, width: null, height: null, lufs: null, peak: null, error: String(e?.message ?? e)}));
  else console.error(e);
  process.exit(1);
};

let browser;
try {
  const serveUrl = await bundle({
    entryPoint: resolve(kit, 'src/Root.tsx'), publicDir, outDir: resolve(project, '.bundle'),
    webpackOverride: (c) => ({
      ...c,
      resolve: {
        ...c.resolve,
        alias: {...c.resolve?.alias, '@film': filmEntry, '@kit': resolve(kit, 'src/kit')},
        modules: [...(c.resolve?.modules ?? ['node_modules']), resolve(kit, 'node_modules')],
      },
    }),
  });
  browser = await openBrowser('chrome', {browserExecutable: process.env.CHROME_PATH});
  const inputProps = {blur: mode === '--final'};
  const composition = await selectComposition({serveUrl, id: 'Film', puppeteerInstance: browser, inputProps});

  if (mode === '--stills') {
    const skip = new Set();
    args.forEach((a, i) => { if (VALUE_FLAGS.includes(a)) skip.add(i + 1); });
    const times = args.map((a, i) => [a, i]).filter(([a, i]) => !a.startsWith('--') && !skip.has(i)).map(([a]) => Number(a));
    const scale = widthPx ? widthPx / composition.width : 0.5;
    for (const s of times) {
      const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
      const output = resolve(out, 'stills', `t${s.toFixed(2)}.${format === 'jpeg' ? 'jpg' : 'png'}`);
      await renderStill({serveUrl, composition, puppeteerInstance: browser, inputProps, frame, output, scale, imageFormat: format, ...(format === 'jpeg' ? {jpegQuality: 80} : {})});
      log(output);
    }
  } else {
    const preview = mode === '--preview';
    const output = resolve(out, preview ? name.replace(/\.mp4$/, '-preview.mp4') : name);
    let lastLogged = -1;
    const base = {
      serveUrl, composition, puppeteerInstance: browser, inputProps,
      codec: 'h264', audioCodec: 'aac', audioBitrate: '256k', pixelFormat: 'yuv420p', colorSpace: 'bt709',
      imageFormat: 'jpeg', jpegQuality: 95, crf: preview ? 22 : 16, scale: preview ? 0.5 : 1,
      concurrency: Number(process.env.CONCURRENCY ?? 4),
      ...(process.env.OFFTHREAD_THREADS ? {offthreadVideoThreads: Number(process.env.OFFTHREAD_THREADS)} : {}),
      onProgress: ({renderedFrames}) => {
        const step = Math.floor(renderedFrames / 120);
        if (step !== lastLogged) { lastLogged = step; log(`  rendered ${renderedFrames} frames (${new Date().toLocaleTimeString()})`); }
      },
    };
    if (chunks === 1) {
      await renderMedia({...base, outputLocation: output});
    } else {
      const N = composition.durationInFrames, size = Math.ceil(N / chunks), dir = resolve(out, '.chunks'), parts = [];
      if (!process.env.RESUME) rmSync(dir, {recursive: true, force: true});
      mkdirSync(dir, {recursive: true});
      for (let i = 0; i * size < N; i++) {
        const a = i * size, b = Math.min(N, (i + 1) * size) - 1, part = resolve(dir, `part${String(i).padStart(2, '0')}.mp4`);
        parts.push(part);
        if (process.env.RESUME && existsSync(part)) { log(`chunk ${i + 1}: kept`); continue; }
        for (let attempt = 1; ; attempt++) {
          try {
            lastLogged = -1;
            await renderMedia({...base, frameRange: [a, b], muted: true, outputLocation: part});
            log(`chunk ${i + 1}/${Math.ceil(N / size)} frames ${a}-${b} done (${new Date().toLocaleTimeString()})`);
            break;
          } catch (e) {
            rmSync(part, {force: true});
            if (attempt >= 3) throw e;
            log(`chunk ${i + 1} attempt ${attempt} failed: ${String(e?.message ?? e).slice(0, 200)} — retrying`);
          }
        }
      }
      const wav = resolve(dir, 'audio.wav'), list = resolve(dir, 'list.txt');
      await renderMedia({serveUrl, composition, puppeteerInstance: browser, inputProps, codec: 'wav', outputLocation: wav});
      writeFileSync(list, parts.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
      const mux = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-i', wav, '-map', '0:v', '-map', '1:a',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', output], {encoding: 'utf8'});
      if (mux.status !== 0) throw new Error(`joining chunks failed: ${mux.stderr?.slice(-400)}`);
    }
    if (json) {
      const result = {path: output, duration: composition.durationInFrames / composition.fps, fps: composition.fps, width: composition.width, height: composition.height, lufs: null, peak: null};
      // Loudness is measured from the rendered file by gate.py (the single ffmpeg loudnorm implementation).
      const g = spawnSync(process.env.PYTHON ?? 'python', [resolve(kit, 'gate.py'), output, '--json'], {encoding: 'utf8'});
      try {
        const m = JSON.parse(g.stdout.trim().split('\n').pop());
        result.lufs = m.lufs ?? null; result.peak = m.peak ?? null;
        if (m.error) result.error = m.error;
      } catch {
        result.error = `loudness measurement failed: ${g.error?.message ?? g.stderr?.slice(-300) ?? 'no output'}`;
      }
      console.log(JSON.stringify(result));
    } else {
      console.log(output);
    }
  }
} catch (e) {
  await browser?.close({silent: true}).catch(() => {});
  fail(e);
}
await browser?.close({silent: true});
