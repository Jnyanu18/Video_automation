'use strict';
// The only thing exposed to the internet: finished videos. Point a tunnel (e.g. cloudflared) at this port instead of the dashboard.
//   GET /render/<32 hex>.mp4   rendered videos from RENDER_DIR (served here, with Range support)
//   GET /media/<32 hex>.mp4    uploaded videos, proxied to the dashboard backend (which only serves submitted uploads)
// Everything else is 404, so the dashboard, API and login page are never reachable through this port.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('./lib.cjs');

const env = Object.assign({}, loadEnv(), process.env);
const ROOT = path.resolve(__dirname, '..');
const renderDir = path.resolve(env.RENDER_DIR || path.join(ROOT, 'runtime', 'renders'));
const backend = { host: '127.0.0.1', port: Number(env.PORT || 8787) };
const port = Number(env.PUBLIC_MEDIA_PORT || 8792);

function serveFile(req, res, file) {
  let st;
  try { st = fs.statSync(file); } catch (e) { return false; }
  const headers = { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=3600', 'x-content-type-options': 'nosniff' };
  let start = 0; let end = st.size - 1; let status = 200;
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
  if (m && (m[1] || m[2])) {
    if (m[1]) { start = Number(m[1]); if (m[2]) end = Math.min(end, Number(m[2])); } else start = Math.max(0, st.size - Number(m[2]));
    if (start > end || start >= st.size) { res.writeHead(416, { 'content-range': 'bytes */' + st.size }); res.end(); return true; }
    status = 206; headers['content-range'] = `bytes ${start}-${end}/${st.size}`;
  }
  headers['content-length'] = end - start + 1;
  res.writeHead(status, headers);
  if (req.method === 'HEAD') { res.end(); return true; }
  fs.createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
  return true;
}

const server = http.createServer((req, res) => {
  const notFound = () => { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not found'); };
  if (req.method !== 'GET' && req.method !== 'HEAD') return notFound();
  const url = new URL(req.url, 'http://localhost');
  const render = /^\/render\/([a-f0-9]{32})\.mp4$/.exec(url.pathname);
  if (render) return serveFile(req, res, path.join(renderDir, render[1] + '.mp4')) || notFound();
  const media = /^\/media\/([a-f0-9]{32})\.mp4$/.exec(url.pathname);
  if (media) {
    const headers = {}; if (req.headers.range) headers.range = req.headers.range;
    const up = http.request({ ...backend, path: url.pathname, method: req.method, headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    up.on('error', () => { if (!res.headersSent) { res.writeHead(502); } res.end(); });
    return up.end();
  }
  return notFound();
});
server.listen(port, '127.0.0.1', () => console.log('Public media server on http://127.0.0.1:' + port + ' (serves only /render and /media video files)'));
