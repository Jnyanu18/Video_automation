// node render.mjs --stills <seconds...> | --preview | --final [--name file.mp4]
import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderMedia, renderStill} from '@remotion/renderer';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync} from 'node:fs';

const root = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
const mode = args[0] ?? '--final';
const nameIdx = args.indexOf('--name');
const name = nameIdx >= 0 ? args[nameIdx + 1] : 'film.mp4';
const out = resolve(root, 'out');
mkdirSync(resolve(out, 'stills'), {recursive: true});

const serveUrl = await bundle({entryPoint: resolve(root, 'src/Root.tsx'), publicDir: resolve(root, 'public'), outDir: resolve(root, '.bundle')});
const browser = await openBrowser('chrome', {browserExecutable: process.env.CHROME_PATH});
const inputProps = {blur: mode === '--final'};
const composition = await selectComposition({serveUrl, id: 'Film', puppeteerInstance: browser, inputProps});

if (mode === '--stills') {
  const times = args.slice(1).filter((a) => !a.startsWith('--') && a !== name).map(Number);
  for (const s of times) {
    const frame = Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps));
    const output = resolve(out, 'stills', `t${s.toFixed(2)}.png`);
    await renderStill({serveUrl, composition, puppeteerInstance: browser, inputProps, frame, output, scale: 0.5, imageFormat: 'png'});
    console.log(output);
  }
} else {
  const preview = mode === '--preview';
  await renderMedia({
    serveUrl, composition, puppeteerInstance: browser, inputProps,
    codec: 'h264', audioCodec: 'aac', audioBitrate: '256k', pixelFormat: 'yuv420p', colorSpace: 'bt709',
    imageFormat: 'jpeg', jpegQuality: 95, crf: preview ? 22 : 16, scale: preview ? 0.5 : 1, concurrency: 4,
    outputLocation: resolve(out, preview ? name.replace(/\.mp4$/, '-preview.mp4') : name),
  });
  console.log(resolve(out, preview ? name.replace(/\.mp4$/, '-preview.mp4') : name));
}
await browser.close({silent: true});
