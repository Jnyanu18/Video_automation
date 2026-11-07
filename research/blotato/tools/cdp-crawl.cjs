// Read-only page walker over CDP: GET navigations only; non-GET calls to backend.blotato.com are blocked and logged.
// Usage: node cdp-crawl.cjs links | node cdp-crawl.cjs crawl <outDir> <shotDir> <prefix> <path> [<path>...]
const fs = require('fs');
const path = require('path');
const BASE = 'https://my.blotato.com';
const redact = s => String(s ?? '').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>');
const slug = p => (p.replace(/^\//, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'root');

async function connect() {
  const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
  const t = targets.find(x => x.type === 'page' && x.url.startsWith(BASE));
  if (!t) throw new Error('no blotato page');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(); const handlers = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else handlers.forEach(h => h(m));
  });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
  return { ws, send, ev, on: h => handlers.push(h) };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const DOM_SUMMARY = `(() => {
  const vis = e => e.offsetParent !== null;
  const txt = e => (e.innerText || e.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 80);
  return {
    url: location.href, title: document.title,
    headings: [...document.querySelectorAll('h1,h2,h3,h4')].filter(vis).map(txt).slice(0, 40),
    links: [...document.querySelectorAll('a[href]')].filter(vis).map(a => ({ t: txt(a), h: a.getAttribute('href') })).slice(0, 120),
    buttons: [...document.querySelectorAll('button,[role=button],[role=tab],[role=menuitem]')].filter(vis).map(txt).filter(Boolean).slice(0, 80),
    inputs: [...document.querySelectorAll('input,textarea,select,[contenteditable=true]')].filter(vis).map(i => ({ tag: i.tagName.toLowerCase(), type: i.type || '', ph: i.placeholder || '', aria: i.getAttribute('aria-label') || '' })).slice(0, 40),
    tables: document.querySelectorAll('table,[role=table],[role=grid]').length,
    text: (document.body.innerText || '').slice(0, 4000)
  };
})()`;

(async () => {
  const [mode, ...rest] = process.argv.slice(2);
  const c = await connect();
  if (mode === 'links') {
    const d = await c.ev(DOM_SUMMARY);
    console.log(JSON.stringify({ url: d.url, links: d.links, buttons: d.buttons }, null, 1));
    c.ws.close(); return;
  }
  const [outDir, shotDir, prefix, ...paths] = rest;
  fs.mkdirSync(outDir, { recursive: true }); fs.mkdirSync(shotDir, { recursive: true });
  await c.send('Page.enable'); await c.send('Network.enable'); await c.send('Runtime.enable');
  await c.send('Fetch.enable', { patterns: [{ urlPattern: 'https://backend.blotato.com/*', requestStage: 'Request' }] });
  let net = [], blocked = [], wsOpened = [], wsFrames = [];
  const reqs = new Map();
  c.on(m => {
    const p = m.params || {};
    if (m.method === 'Fetch.requestPaused') {
      const r = p.request;
      if (r.method !== 'GET' && r.method !== 'OPTIONS' && r.method !== 'HEAD') {
        blocked.push({ method: r.method, url: redact(r.url) });
        c.send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' });
      } else c.send('Fetch.continueRequest', { requestId: p.requestId });
    } else if (m.method === 'Network.requestWillBeSent') {
      reqs.set(p.requestId, { method: p.request.method, url: redact(p.request.url), type: p.type });
    } else if (m.method === 'Network.responseReceived') {
      const r = reqs.get(p.requestId); if (r) { r.status = p.response.status; r.mime = p.response.mimeType; }
    } else if (m.method === 'Network.webSocketCreated') wsOpened.push(redact(p.url));
    else if (m.method === 'Network.webSocketFrameReceived' && wsFrames.length < 60) {
      try { const j = JSON.parse(p.response.payloadData); wsFrames.push({ dir: 'in', keys: Object.keys(j).slice(0, 8), type: j.type || j.event || j.name || null }); } catch { wsFrames.push({ dir: 'in', len: p.response.payloadData.length }); }
    } else if (m.method === 'Network.webSocketFrameSent' && wsFrames.length < 60) {
      try { const j = JSON.parse(p.response.payloadData); wsFrames.push({ dir: 'out', keys: Object.keys(j).slice(0, 8), type: j.type || j.event || j.name || null }); } catch { wsFrames.push({ dir: 'out', len: p.response.payloadData.length }); }
    }
  });
  let n = 0;
  for (const p of paths) {
    reqs.clear(); blocked = []; wsOpened = []; wsFrames = [];
    n++;
    await c.send('Page.navigate', { url: BASE + p });
    await sleep(7000);
    const d = await c.ev(DOM_SUMMARY);
    const shot = await c.send('Page.captureScreenshot', { format: 'png' });
    const name = `${prefix}${String(n).padStart(2, '0')}-${slug(p)}`;
    fs.writeFileSync(path.join(shotDir, name + '.png'), Buffer.from(shot.result.data, 'base64'));
    const api = [...reqs.values()].filter(r => /backend\.blotato\.com|geometry\.blotato\.com|blotato\.io|mcp\.blotato/.test(r.url) && r.type !== 'Image');
    d.text = redact(d.text); d.links = d.links.map(l => ({ ...l, t: redact(l.t) }));
    const out = { requested: p, ...d, api, blocked_non_get: blocked, websockets: wsOpened, ws_frames: wsFrames, screenshot: name + '.png' };
    fs.writeFileSync(path.join(outDir, name + '.json'), JSON.stringify(out, null, 1));
    console.log(`${p} -> ${d.url} | title=${d.title} | api=${api.length} blocked=${blocked.length} | ${name}`);
  }
  await c.send('Fetch.disable');
  c.ws.close();
})().catch(e => { console.error(e.message); process.exit(1); });
