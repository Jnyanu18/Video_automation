'use strict';
// Loads a standalone diagram page in headless Chrome, seeks its GSAP timeline, and reports what is really on screen.
//   node anim_probe.cjs <page.html> <outDir> <chromePath> <timesJson> <panelSelector>
// Prints one JSON object: { ok, frames:[{t,file}], elements:[{id,type,x,y,w,h,textLen}], scriptErrors:[...], endState }
const path = require('path');
const fs = require('fs');

(async () => {
  const [page_, outDir, chrome, timesJson, sel] = process.argv.slice(2);
  const puppeteer = require(path.join(__dirname, '..', 'app', 'node_modules', 'puppeteer-core'));
  const times = JSON.parse(timesJson);
  fs.mkdirSync(outDir, { recursive: true });
  const log = (m) => process.stderr.write(['[probe] ', m, String.fromCharCode(10)].join(''));
  log('launch');
  const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--allow-file-access-from-files', '--no-sandbox'] });
  const out = { ok: false, frames: [], elements: [], scriptErrors: [] };
  try {
    log('newPage');
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => out.scriptErrors.push(String(e.message).slice(0, 200)));
    await page.goto('file:///' + page_.replace(/\\/g, '/'));
    await new Promise((r) => setTimeout(r, 400));
    const has = await page.evaluate(() => !!(window.__timelines && window.__timelines.edit));
    if (!has) { out.scriptErrors.push('the animation script did not register a timeline'); console.log(JSON.stringify(out)); return; }
    log('timeline ok');
    const panel = await page.$(sel);
    const box = await panel.boundingBox();
    log('panel ' + JSON.stringify(box));
    for (const t of times) {
      await page.evaluate((tt) => { window.__timelines.edit.seek(tt, false); return 1; }, t);  // never return the timeline: it is huge and circular
      await new Promise((r) => setTimeout(r, 60));
      const file = path.join(outDir, `t${String(t).replace('.', '_')}.png`);
      await page.screenshot({ path: file, clip: { x: box.x, y: box.y, width: box.width, height: box.height }, captureBeyondViewport: false });
      out.frames.push({ t, file });
    }
    // geometry at the last requested time (everything has entered)
    out.elements = await page.evaluate((s) => {
      const svg = document.querySelector(s + ' svg');
      const r = [];
      if (!svg) return r;
      svg.querySelectorAll('g[data-el]').forEach((g) => {
        const b = g.getBBox();
        const txt = g.querySelector('text');
        r.push({ id: g.getAttribute('data-el'), type: g.getAttribute('data-type'), x: b.x, y: b.y, w: b.width, h: b.height,
                 textLen: txt ? txt.getComputedTextLength() : null, text: txt ? txt.textContent : null, size: txt ? parseFloat(txt.getAttribute('font-size')) : null });
      });
      return r;
    }, sel);
    out.ok = true;
  } catch (e) {
    out.scriptErrors.push('probe failed: ' + String(e.message).slice(0, 200));
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(out));
  process.exit(0);
})();
