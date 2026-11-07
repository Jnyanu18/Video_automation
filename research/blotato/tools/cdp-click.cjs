// Clicks UI controls by visible text on the live page; non-GET backend calls are blocked and logged.
// Usage: node cdp-click.cjs <shotPath|-> <button text> [<button text>...]
const fs = require('fs');
const redact = s => String(s ?? '').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>');
(async () => {
  const [shot, ...labels] = process.argv.slice(2);
  const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
  const t = targets.find(x => x.type === 'page' && x.url.startsWith('https://my.blotato.com'));
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(); const blocked = []; const gets = [];
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Fetch.requestPaused') {
      const r = m.params.request;
      if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method)) { blocked.push(r.method + ' ' + redact(r.url)); send('Fetch.failRequest', { requestId: m.params.requestId, errorReason: 'BlockedByClient' }); }
      else { gets.push(r.url.replace(/\?.*/, '')); send('Fetch.continueRequest', { requestId: m.params.requestId }); }
    }
  });
  const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.result?.value;
  await send('Fetch.enable', { patterns: [{ urlPattern: 'https://backend.blotato.com/*', requestStage: 'Request' }] });
  for (const label of labels) {
    const ok = await ev(`(()=>{const l=${JSON.stringify(label)};const b=[...document.querySelectorAll('button,[role=button],a')].find(b=>b.offsetParent!==null&&(b.innerText||'').trim()===l);if(!b)return false;b.click();return true})()`);
    await new Promise(r => setTimeout(r, 2500));
    console.log('clicked', label, ok);
  }
  const d = await ev(`(()=>({url:location.href,menu:[...document.querySelectorAll('[role=menuitem],[role=menu] a,[role=menu] button,[role=dialog] *')].filter(e=>e.offsetParent!==null).map(e=>({t:(e.innerText||'').trim().slice(0,80),h:e.getAttribute('href')})).filter(x=>x.t).slice(0,40),nav:[...document.querySelectorAll('nav a, aside a')].map(a=>a.innerText.trim()+' '+a.getAttribute('href')).slice(0,30)}))()`);
  console.log(JSON.stringify(d, null, 1));
  console.log('blocked_writes', JSON.stringify(blocked), 'gets', JSON.stringify([...new Set(gets)]));
  if (shot !== '-') { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(shot, Buffer.from(s.result.data, 'base64')); }
  await send('Fetch.disable'); ws.close();
})().catch(e => { console.error(e.message); process.exit(1); });
