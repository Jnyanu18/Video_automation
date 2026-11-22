// Navigates, performs UI steps, dumps visible dialog/page structure. Backend writes blocked unless --writes, and billing/key/account/delete paths are always blocked.
// Usage: node cdp-explore.cjs [--writes] <shotPath|-> <path|-> [click:<text> | fill:<placeholder>=<value> | wait:<ms> | shot:<file>]...
const fs = require('fs');
const redact = s => String(s ?? '').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>');
const DENY = /billing|stripe|checkout|subscription|api-key|apikey|api-setup|\/accounts|delete|logout|email|payment|credits\/buy/i;
(async () => {
  const args = process.argv.slice(2);
  const allowWrites = args[0] === '--writes'; if (allowWrites) args.shift();
  const [shot, path, ...steps] = args;
  const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
  const t = targets.find(x => x.type === 'page' && x.url.startsWith('https://my.blotato.com'));
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(); const blocked = []; const writes = []; const gets = new Set(); const pendingBodies = new Map();
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Fetch.requestPaused') {
      const p = m.params, r = p.request;
      if (p.responseStatusCode !== undefined) { // response stage for allowed writes
        send('Fetch.getResponseBody', { requestId: p.requestId }).then(b => {
          let shape = '';
          try { const txt = b.result.base64Encoded ? Buffer.from(b.result.body, 'base64').toString() : b.result.body; const j = JSON.parse(txt); shape = Array.isArray(j) ? 'array[' + j.length + ']' : Object.keys(j).join(','); } catch { shape = 'non-json'; }
          writes.push({ method: r.method, url: redact(r.url.replace(/\?.*/, '')), status: p.responseStatusCode, body_keys: shape, req_keys: reqKeys(r.postData) });
          send('Fetch.continueRequest', { requestId: p.requestId });
        }).catch(() => send('Fetch.continueRequest', { requestId: p.requestId }));
        return;
      }
      const isRead = ['GET', 'HEAD', 'OPTIONS'].includes(r.method);
      if (isRead) { gets.add(r.url.replace(/\?.*/, '')); send('Fetch.continueRequest', { requestId: p.requestId }); }
      else if (allowWrites && !DENY.test(r.url)) { send('Fetch.continueRequest', { requestId: p.requestId, interceptResponse: true }); }
      else { blocked.push(r.method + ' ' + redact(r.url.replace(/\?.*/, ''))); send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' }); }
    }
  });
  const reqKeys = pd => { try { const j = JSON.parse(pd); return Array.isArray(j) ? 'array' : Object.keys(j).join(','); } catch { return pd ? 'non-json' : ''; } };
  const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
  const snap = async file => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(s.result.data, 'base64')); };
  await send('Page.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: 'https://backend.blotato.com/*', requestStage: 'Request' }] });
  if (path !== '-') { await send('Page.navigate', { url: 'https://my.blotato.com' + path }); await new Promise(r => setTimeout(r, 7000)); }
  for (const st of steps) {
    const i = st.indexOf(':'), kind = st.slice(0, i), val = st.slice(i + 1);
    if (kind === 'click') {
      const ok = await ev(`(()=>{const l=${JSON.stringify(val)};const b=[...document.querySelectorAll('button,[role=button],[role=tab],[role=option],[role=menuitem],label,a')].find(b=>b.offsetParent!==null&&((b.innerText||'').trim()===l||b.getAttribute('aria-label')===l||b.title===l));if(!b)return false;b.click();return true})()`);
      console.log('click', JSON.stringify(val), ok); await new Promise(r => setTimeout(r, 2500));
    } else if (kind === 'fill') {
      const [ph, v] = [val.slice(0, val.indexOf('=')), val.slice(val.indexOf('=') + 1)];
      const ok = await ev(`(()=>{const e=[...document.querySelectorAll('input,textarea')].find(e=>e.offsetParent!==null&&(e.placeholder===${JSON.stringify(ph)}||e.getAttribute('aria-label')===${JSON.stringify(ph)}));if(!e)return false;const p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
      console.log('fill', JSON.stringify(ph), ok); await new Promise(r => setTimeout(r, 800));
    } else if (kind === 'wait') await new Promise(r => setTimeout(r, +val));
    else if (kind === 'js') console.log('js', JSON.stringify(await ev(val)));
    else if (kind === 'shot') await snap(val);
  }
  const d = await ev(`(()=>{const vis=e=>e.offsetParent!==null||e.getClientRects().length;const dlg=document.querySelector('[role=dialog]');const root=dlg||document.querySelector('main')||document.body;
    return {url:location.href,dialog:!!dlg,headings:[...root.querySelectorAll('h1,h2,h3,h4,legend,label')].filter(vis).map(e=>e.innerText.trim()).filter(Boolean).slice(0,60),
    inputs:[...root.querySelectorAll('input,textarea,select,[role=combobox],[role=switch]')].filter(vis).map(e=>({tag:e.tagName.toLowerCase(),type:e.type||e.getAttribute('role')||'',ph:e.placeholder||'',aria:e.getAttribute('aria-label')||'',val:(e.type==='password'?'':String(e.value||'').slice(0,40))})).slice(0,40),
    buttons:[...root.querySelectorAll('button,[role=tab],[role=option]')].filter(vis).map(b=>(b.innerText||b.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ').slice(0,60)).filter(Boolean).slice(0,70),
    text:(root.innerText||'').slice(0,2500)}})()`);
  console.log(redact(JSON.stringify(d, null, 1)));
  console.log('blocked', JSON.stringify(blocked)); console.log('writes_allowed', JSON.stringify(writes)); console.log('gets', JSON.stringify([...gets].filter(u => /backend\.blotato/.test(u))));
  if (shot !== '-') await snap(shot);
  await send('Fetch.disable'); ws.close();
})().catch(e => { console.error(e.message); process.exit(1); });
