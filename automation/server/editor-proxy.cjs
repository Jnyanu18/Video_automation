'use strict';
// Forwards /api/editor/* from the (authenticated) dashboard to the AI editor service. The browser never talks to the editor
// directly. JSON is relayed as JSON; anything else (the sound-effect audio) is relayed as bytes.
const path = require('path');
const { HttpError, sendJson, readJson } = require('./http.cjs');

const WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);
const ALLOWED = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);

function createEditorProxy(cfg, fetchImpl) {
  const base = String(cfg.editorUrl || 'http://127.0.0.1:8793').replace(/\/+$/, '');
  const f = fetchImpl || fetch;

  return async function proxy(req, res, url) {
    const method = req.method;
    if (!ALLOWED.has(method)) throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    let body;
    if (WITH_BODY.has(method)) {
      const raw = await readJson(req, 262144);
      // A staged upload is referenced by id; only the server knows where it lives on disk.
      if (raw && typeof raw.uploadId === 'string' && /^[a-f0-9]{32}$/.test(raw.uploadId)) {
        raw.video_path = path.join(cfg.uploadDir, raw.uploadId + '.mp4');
      }
      body = JSON.stringify(raw);
    }
    let upstream;
    try {
      upstream = await f(base + url.pathname + (url.search || ''), {
        method: method === 'HEAD' ? 'GET' : method,
        headers: body !== undefined ? { 'content-type': 'application/json' } : {},
        body,
        signal: AbortSignal.timeout(cfg.editorTimeoutMs || 120000),
      });
    } catch (e) {
      return sendJson(res, 502, { ok: false, error: 'EDITOR_SERVICE_UNAVAILABLE', message: 'AI Editor service is not running on port 8793 (' + e.message + ')' });
    }
    const type = String(upstream.headers.get('content-type') || '');
    if (type.includes('application/json') || !type) {
      const json = await upstream.json().catch(() => ({ ok: false, error: 'INVALID_JSON', message: 'The editor service sent an unreadable response' }));
      return sendJson(res, upstream.status, json);
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      'content-type': type, 'content-length': buf.length, 'cache-control': 'private, max-age=3600', 'x-content-type-options': 'nosniff',
    });
    return res.end(method === 'HEAD' ? undefined : buf);
  };
}

module.exports = { createEditorProxy };
