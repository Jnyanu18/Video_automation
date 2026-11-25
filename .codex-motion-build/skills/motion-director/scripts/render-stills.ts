/* Render many QA stills from one bundle.
 *
 * `render.ts --still` bundles the project again for every frame, which is fine for a
 * single check and far too slow for the director's look-and-fix pass (16 frames meant
 * 16 bundles). This bundles once, selects the composition once, then renders each
 * requested frame. It writes JPEGs so the frames can be handed straight to a model as
 * image blocks.
 *
 *   node render-stills.mjs <project.json> <outDir> <frame...> [--browser PATH] [--scale 0.5]
 *
 * Prints one JSON line: {"stills":[{"frame":N,"path":"..."}],"fps":F,"durationInFrames":D}
 */
import {existsSync, mkdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateProject} from '../starter/src/schema';
import {createRequire} from 'node:module';

const require = createRequire(new URL('../starter/package.json', import.meta.url));
const {bundle} = require('@remotion/bundler');
const {selectComposition, renderStill} = require('@remotion/renderer');


const [file, outDir, ...rest] = process.argv.slice(2);
if (!file || !outDir) {
  throw new Error('Usage: npx tsx render-stills.ts <project.json> <outDir> <frame...> [--browser PATH] [--scale S]');
}
const flagAt = (key) => {const i = rest.indexOf(key); return i < 0 ? undefined : rest[i + 1];};
const browserExecutable = flagAt('--browser');
const scale = Number(flagAt('--scale') ?? 0.5);
const frames = rest.filter((a) => /^\d+$/.test(a)).map(Number);
if (!frames.length) throw new Error('give at least one frame number');
if (frames.length > 16) throw new Error('at most 16 stills per call');

const project = validateProject(JSON.parse(readFileSync(file, 'utf8')), {final: false});

const starter = fileURLToPath(new URL('../starter/', import.meta.url));
for (const a of project.assets) {
  if (a.src.startsWith('https://')) throw new Error('Stage approved assets locally before rendering: ' + a.src);
  if (!existsSync(resolve(starter, 'public', a.src))) throw new Error(`Asset missing: ${a.src}`);
}
for (const f of frames) {
  if (f < 0 || f >= project.canvas.durationInFrames) {
    throw new Error(`frame ${f} is outside the composition (0..${project.canvas.durationInFrames - 1})`);
  }
}

mkdirSync(resolve(outDir), {recursive: true});
const serveUrl = await bundle({
  entryPoint: resolve(starter, 'src/index.ts'),
  publicDir: resolve(starter, 'public'),
  outDir: resolve(starter, '.bundle'),
});
const inputProps = {project};
const composition = await selectComposition({serveUrl, id: 'ReferenceMotion', inputProps, browserExecutable});

const stills = [];
for (const frame of frames) {
  const out = resolve(outDir, `f${String(frame).padStart(5, '0')}.jpg`);
  await renderStill({
    serveUrl, composition, inputProps, browserExecutable, frame,
    output: out, imageFormat: 'jpeg', jpegQuality: 80, scale,
  });
  stills.push({frame, path: out});
}
console.log(JSON.stringify({stills, fps: project.canvas.fps, durationInFrames: project.canvas.durationInFrames}));
