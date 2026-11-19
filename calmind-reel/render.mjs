// node render.mjs --stills t1 t2 ... | --preview | --final
import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderMedia, renderStill} from '@remotion/renderer';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync} from 'node:fs';

const root = fileURLToPath(new URL('.', import.meta.url));
const out = resolve(root, 'out');
mkdirSync(out, {recursive: true});
const CHROME = process.env.CHROME_PATH ?? resolve(root, '../reference-motion-director-v1.6/reference-motion-director/starter/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe');
const mode = process.argv[2] ?? '--final';
const inputProps = {blur: mode === '--final'};

const serveUrl = await bundle({entryPoint: resolve(root, 'src/index.ts'), publicDir: resolve(root, 'public'), outDir: resolve(root, '.bundle')});
const browser = await openBrowser('chrome', {browserExecutable: CHROME});
const composition = await selectComposition({serveUrl, id: 'CalmindReel', puppeteerInstance: browser, inputProps});

if (mode === '--stills') {
  for (const s of process.argv.slice(3).map(Number)) {
    const frame = Math.min(899, Math.round(s * 60));
    await renderStill({serveUrl, composition, puppeteerInstance: browser, inputProps, frame, output: resolve(out, `still-${s.toFixed(2)}.png`), scale: 0.5, imageFormat: 'png'});
  }
} else {
  const preview = mode === '--preview';
  let last = -1;
  await renderMedia({
    serveUrl, composition, puppeteerInstance: browser, inputProps,
    codec: 'h264', audioCodec: 'aac', audioBitrate: '256k', pixelFormat: 'yuv420p', colorSpace: 'bt709',
    imageFormat: 'jpeg', jpegQuality: 95, crf: preview ? 22 : 16, scale: preview ? 0.5 : 1, concurrency: 4,
    outputLocation: resolve(out, preview ? 'calmind-reel-preview.mp4' : 'CALMIND_App_Launch_Reel.mp4'),
    onProgress: ({progress}) => { const p = Math.floor(progress * 10); if (p !== last) { last = p; console.log(`${p * 10}%`); } },
  });
}
await browser.close({silent: true});
console.log('done', mode);
