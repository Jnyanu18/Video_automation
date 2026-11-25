'use strict';
// Forwards /api/editor/* from the (authenticated) dashboard to the AI editor service. The browser never talks to the editor
// directly. JSON is relayed as JSON; anything else (the sound-effect audio) is relayed as bytes.
//
// Account isolation: the engine routes on the X-Studio-User header. NOTHING from the browser's headers is
// forwarded - the request to the engine is built from scratch here - so an inbound X-Studio-User is dropped and
// the value the engine sees always comes from the signed session cookie.
const path = require('path');
const { HttpError, sendJson, readJson } = require('./http.cjs');

const USER_ID_RE = /^[a-z0-9][a-z0-9_-]{2,39}$/;
const WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);
const ALLOWED = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);

function createEditorProxy(cfg, fetchImpl) {
  const base = String(cfg.editorUrl || 'http://127.0.0.1:8793').replace(/\/+$/, '');
  const f = fetchImpl || fetch;

  return async function proxy(req, res, url, session) {
    const method = req.method;
    if (!ALLOWED.has(method)) throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    const userId = session && session.uid;
    if (!USER_ID_RE.test(String(userId || ''))) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue');
    let body;
    const audioUpload = method === 'POST' && url.pathname === '/api/editor/agent/audio';
    if (WITH_BODY.has(method)) {
      if (audioUpload) {
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 50 * 1024 * 1024) throw new HttpError(413, 'FILE_TOO_LARGE', 'Audio must be under 50 MB');
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
        if (!size) throw new HttpError(400, 'EMPTY_FILE', 'Choose an audio file');
      } else {
        const raw = await readJson(req, 262144);
        // A staged upload is referenced by id; only the server knows where it lives on disk - inside this
        // account's own upload folder, so an id belonging to another account resolves to a path that is not there.
        if (raw && typeof raw.uploadId === 'string' && /^[a-f0-9]{32}$/.test(raw.uploadId)) {
          raw.video_path = path.join(cfg.uploadDir, 'users', userId, raw.uploadId + '.mp4');
        }
        body = JSON.stringify(raw);
      }
    }
    let upstream;
    try {
      upstream = await f(base + url.pathname + (url.search || ''), {
        method: method === 'HEAD' ? 'GET' : method,
        headers: Object.assign({ 'x-studio-user': userId }, body !== undefined ? {
          'content-type': audioUpload ? String(req.headers['content-type'] || 'application/octet-stream') : 'application/json',
          ...(audioUpload ? { 'x-file-name': String(req.headers['x-file-name'] || '') } : {}),
        } : {}),
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
