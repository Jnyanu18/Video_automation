// node render.mjs beats|audio|full [outDir]
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';

const ROOT = path.resolve('.'), MODE = process.argv[2] || 'beats', OUT = path.resolve(process.argv[3] || 'out');
const E = process.env, PAGE = E.PAGE || 'index.html', VW = +(E.VW || 1080), VH = +(E.VH || 1920);
const NAME = E.NAME || 'AILO_Signal_Path_15s.mp4', BEAT = +(E.BEAT || 0.5), NB = +(E.NB || 30), FRAMES = +(E.FRAMES || 900);
const TYPES = { '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png' };

const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('PAGEERR', e.message));
// Footage fork: let the browser paint freshly referenced images before each capture.
const prep = t => page.evaluate(t => (window.prepare ? window.prepare(t) : true), t);
const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
await page.goto(`http://127.0.0.1:${srv.address().port}/${PAGE}`);
await page.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
fs.mkdirSync(OUT, { recursive: true });

if (MODE === 'beats') {
  const T = [0, ...Array.from({ length: NB }, (_, b) => b * BEAT + BEAT * 0.6), (FRAMES - 1) / 60];
  for (const [i, t] of T.entries()) { await prep(t); await page.evaluate(t => window.seek(t), t); await settle(); await page.screenshot({ path: path.join(OUT, `b${String(i).padStart(2, '0')}.png`) }); }
} else if (MODE === 'audio') {
  const b64 = await page.evaluate(() => window.renderAudio());
  fs.writeFileSync(path.join(OUT, 'audio.wav'), Buffer.from(b64, 'base64'));
} else if (MODE === 'full') {
  // 3 subframes per 60fps frame (180-degree shutter), blended with tmix, then muxed with the WAV
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', '180', '-i', 'pipe:0', '-i', path.join(OUT, 'audio.wav'),
    '-filter_complex', "[0:v]tmix=frames=3:weights='1 1 1',select='eq(mod(n\\,3)\\,2)',setpts=N/(60*TB)[v];[1:a]loudnorm=I=-14:TP=-1.5:LRA=9,aresample=48000[a]",
    '-map', '[v]', '-map', '[a]', '-r', '60', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', path.join(OUT, NAME)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let k = 0; k < FRAMES; k++) for (let j = 0; j < 3; j++) {
    const tt = k / 60 + (j - 1) / 240; await prep(tt); await page.evaluate(t => window.seek(t), tt); await settle();
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (j === 0 && k % 150 === 0) console.log(`frame ${k}/${FRAMES}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await browser.close(); srv.close();
