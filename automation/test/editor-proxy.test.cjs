'use strict';
// The dashboard's /api/editor/* proxy against a fake editor service (real HTTP, no Python needed).
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadConfig } = require('../server/config.cjs');
const { createApp } = require('../server/app.cjs');

const PASSWORD = 'correct horse battery staple';
const seen = [];
let editor;
let app;
let base;
let cookie;
let csrf;
let tmp;

function fakeEditor() {
  return http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString();
      seen.push({ method: req.method, url: req.url, body });
      if (req.url.startsWith('/api/editor/sfx/')) {
        res.writeHead(200, { 'content-type': 'audio/wav' });
        return res.end(Buffer.from('RIFFfakewavdata'));
      }
      if (req.url === '/api/editor/boom') {
        res.writeHead(409, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'NOT_APPROVED', message: 'Approve first' }));
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, echo: body ? JSON.parse(body) : null, method: req.method }));
    });
  });
}

const call = (method, p, body, extra) => fetch(base + p, {
  method,
  headers: Object.assign({ cookie, 'x-csrf-token': csrf }, body !== undefined ? { 'content-type': 'application/json' } : {}, extra || {}),
  body: body !== undefined ? JSON.stringify(body) : undefined,
});

test.before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'editor-proxy-'));
  editor = fakeEditor();
  await new Promise((r) => editor.listen(0, '127.0.0.1', r));
  const cfg = loadConfig({
    PORT: '0', HOST: '127.0.0.1', DASHBOARD_PASSWORD: PASSWORD, SESSION_SECRET: 's'.repeat(48),
    EDITOR_URL: 'http://127.0.0.1:' + editor.address().port, UPLOAD_DIR: path.join(tmp, 'up'), WEB_DIR: tmp,
  });
  cfg.quiet = true;
  app = createApp(cfg);
  const addr = await app.listen();
  base = 'http://127.0.0.1:' + addr.port;
  const r = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: PASSWORD }) });
  cookie = r.headers.get('set-cookie').split(';')[0];
  csrf = (await r.json()).csrfToken;
  app.uploadDir = cfg.uploadDir;
});
test.after(async () => {
  await app.close();
  await new Promise((r) => editor.close(r));
});

test('requires a session', async () => {
  const r = await fetch(base + '/api/editor/overview');
  assert.equal(r.status, 401);
});

test('relays GET, POST, PATCH and DELETE with their bodies and query strings', async () => {
  seen.length = 0;
  assert.equal((await (await call('GET', '/api/editor/storyboards?x=1')).json()).method, 'GET');
  assert.deepEqual((await (await call('POST', '/api/editor/series/generate', { title: 'T' })).json()).echo, { title: 'T' });
  assert.deepEqual((await (await call('PATCH', '/api/editor/series/s/episodes/2', { hook: 'H' })).json()).echo, { hook: 'H' });
  assert.equal((await (await call('DELETE', '/api/editor/storyboard/sb_1')).json()).method, 'DELETE');
  assert.deepEqual(seen.map((s) => s.method + ' ' + s.url), [
    'GET /api/editor/storyboards?x=1', 'POST /api/editor/series/generate', 'PATCH /api/editor/series/s/episodes/2', 'DELETE /api/editor/storyboard/sb_1',
  ]);
});

test('state-changing editor calls need the CSRF token', async () => {
  const r = await fetch(base + '/api/editor/storyboard/sb_1', { method: 'DELETE', headers: { cookie } });
  assert.equal(r.status, 403);
});

test('upstream status codes and error bodies are preserved', async () => {
  const r = await call('GET', '/api/editor/boom');
  assert.equal(r.status, 409);
  assert.deepEqual(await r.json(), { ok: false, error: 'NOT_APPROVED', message: 'Approve first' });
});

test('binary responses (sound effects) are relayed as bytes with their content type', async () => {
  const r = await call('GET', '/api/editor/sfx/whoosh.wav');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'audio/wav');
  assert.equal(Buffer.from(await r.arrayBuffer()).toString(), 'RIFFfakewavdata');
});

test('an uploadId is translated to the server-side file path and never trusted from the browser', async () => {
  seen.length = 0;
  const id = 'a'.repeat(32);
  await call('POST', '/api/editor/storyboard/create', { uploadId: id, video_path: '/etc/passwd' });
  const sent = JSON.parse(seen[0].body);
  assert.equal(sent.video_path, path.join(path.resolve(tmp, 'up'), id + '.mp4'));
});

test('a stopped editor gives a clear 502', async () => {
  const cfg = loadConfig({ PORT: '0', HOST: '127.0.0.1', DASHBOARD_PASSWORD: PASSWORD, SESSION_SECRET: 's'.repeat(48), EDITOR_URL: 'http://127.0.0.1:9', UPLOAD_DIR: path.join(tmp, 'up2'), WEB_DIR: tmp });
  cfg.quiet = true;
  const a = createApp(cfg);
  const addr = await a.listen();
  const b = 'http://127.0.0.1:' + addr.port;
  const l = await fetch(b + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: PASSWORD }) });
  const r = await fetch(b + '/api/editor/overview', { headers: { cookie: l.headers.get('set-cookie').split(';')[0] } });
  assert.equal(r.status, 502);
  assert.equal((await r.json()).error, 'EDITOR_SERVICE_UNAVAILABLE');
  await a.close();
});
