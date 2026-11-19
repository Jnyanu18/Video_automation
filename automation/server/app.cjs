'use strict';
// Dashboard backend: serves the built web app and a JSON API. Reads Airtable (read-only token) and performs every
// write through the n8n webhooks. No provider key and no webhook token ever reaches the browser.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const core = require('../lib/core.js');
const { HttpError, sendJson, readJson, parseCookies, clientIp } = require('./http.cjs');
const { createAuth } = require('./auth.cjs');
const { createAirtable, UpstreamError } = require('./airtable.cjs');
const { createN8n } = require('./n8n.cjs');
const { createUploads } = require('./uploads.cjs');
const { createStore, createHub } = require('./events.cjs');
const views = require('./views.cjs');
const { createEditorProxy } = require('./editor-proxy.cjs');

const ACTIONS = ['edit', 'approve', 'reject', 'regenerate', 'retry', 'publish', 'resume'];
const ID_RE = /^rec[A-Za-z0-9]{6,30}$/;

const PRESETS = {
  niches: ['Fitness and wellness', 'Personal finance', 'Productivity', 'Marketing and business', 'Tech and AI', 'Food and cooking', 'Travel', 'Fashion and beauty', 'Real estate', 'Education'],
  brandVoices: ['Professional', 'Friendly', 'Playful', 'Authoritative', 'Inspirational', 'Educational'],
};

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8', '.map': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8',
};

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'self'; img-src 'self' https: data:; media-src 'self' https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};

function createApp(cfg, deps) {
  deps = deps || {};
  const airtable = createAirtable(cfg, deps.fetch);
  const n8n = createN8n(cfg, deps.fetch);
  const auth = createAuth(cfg);
  const uploads = createUploads(cfg);
  const editorProxy = createEditorProxy(cfg, deps.fetch);
  const store = createStore(cfg, airtable);
  const hub = createHub(cfg, store);
  const inflight = new Set();
  const recentPublish = new Map();
  const cache = { status: null, options: null };
  let staging = 0;

  const csrfOk = (session, req) => {
    const t = String(req.headers['x-csrf-token'] || '');
    return t.length === session.csrf.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(session.csrf));
  };
  const originOk = (req) => {
    const o = req.headers.origin;
    if (!o) return true;
    try {
      return new URL(o).host === req.headers.host;
    } catch (e) {
      return false;
    }
  };
  const fail = (status, error, message, extra) => { throw new HttpError(status, error, message, extra); };
  const withLock = async (key, fn) => {
    if (inflight.has(key)) fail(409, 'ACTION_IN_PROGRESS', 'Another request for this item is still running');
    inflight.add(key);
    try {
      return await fn();
    } finally {
      inflight.delete(key);
    }
  };

  // ---------------------------------------------------------------- status / options (via n8n, cached briefly)
  async function getStatus(force) {
    if (!force && cache.status && Date.now() - cache.status.at < 30000) return cache.status.value;
    const r = await n8n.call('internal', 'reels/status', {});
    const value = r.status === 200 && r.body && r.body.integrations ? { ok: true, body: r.body } : { ok: false, error: r.body && r.body.error, message: r.body && r.body.message, status: r.status };
    cache.status = { at: Date.now(), value };
    return value;
  }

  async function getOptions(force) {
    if (!force && cache.options && Date.now() - cache.options.at < 300000) return cache.options.value;
    const r = await n8n.call('internal', 'reels/options', {});
    const value = r.status === 200 && r.body && Array.isArray(r.body.avatars) ? { ok: true, body: r.body } : { ok: false, error: r.body && r.body.error, message: r.body && r.body.message, status: r.status };
    if (value.ok) cache.options = { at: Date.now(), value };
    return value;
  }

  async function checkCreativeChoices(options, needAvatar) {
    if (needAvatar && !options.avatarId) {
      const st = await getStatus(false);
      if (st.ok && st.body.settings && !st.body.settings.defaultAvatarConfigured) fail(400, 'AVATAR_REQUIRED', 'Choose an AI avatar: no default avatar is configured', { errors: ['AVATAR_REQUIRED'] });
    }
    if (needAvatar && !options.voiceId) {
      const st = await getStatus(false);
      if (st.ok && st.body.settings && !st.body.settings.defaultVoiceConfigured) fail(400, 'VOICE_REQUIRED', 'Choose a voice: no default voice is configured', { errors: ['VOICE_REQUIRED'] });
    }
    if (!options.avatarId && !options.voiceId) return;
    let o = await getOptions(false);
    if (!o.ok) return;
    const miss = (o2) => ({
      avatar: options.avatarId && !o2.body.hasMoreAvatars && o2.body.avatars.length > 0 && !o2.body.avatars.some((a) => a.id === options.avatarId),
      voice: options.voiceId && !o2.body.hasMoreVoices && o2.body.voices.length > 0 && !o2.body.voices.some((v) => v.id === options.voiceId),
    });
    let m = miss(o);
    if (m.avatar || m.voice) {
      o = await getOptions(true);
      if (!o.ok) return;
      m = miss(o);
    }
    if (m.avatar) fail(400, 'AVATAR_NOT_FOUND', 'That avatar is not available in the connected HeyGen account', { errors: ['AVATAR_NOT_FOUND'] });
    if (m.voice) fail(400, 'VOICE_NOT_FOUND', 'That voice is not available in the connected HeyGen account', { errors: ['VOICE_NOT_FOUND'] });
  }

  // ---------------------------------------------------------------- handlers
  async function login(req, res) {
    const ip = clientIp(req, cfg.trustProxy);
    const wait = auth.throttle(ip, Date.now());
    if (wait) return sendJson(res, 429, { ok: false, error: 'TOO_MANY_ATTEMPTS', message: 'Too many failed attempts. Try again later.', retryAfterSec: wait }, { 'retry-after': String(wait) });
    const body = await readJson(req, 2048);
    if (!auth.checkPassword(body.password)) {
      auth.failed(ip, Date.now());
      await new Promise((r) => setTimeout(r, 300));
      return sendJson(res, 401, { ok: false, error: 'INVALID_CREDENTIALS', message: 'Incorrect password' });
    }
    auth.clearFailures(ip);
    const name = typeof body.name === 'string' && /^[\p{L}\p{N} ._-]{1,40}$/u.test(body.name.trim()) ? body.name.trim() : 'dashboard';
    const { token, session } = auth.issue(name, Date.now());
    return sendJson(res, 200, { ok: true, user: { name }, csrfToken: session.csrf }, { 'set-cookie': auth.cookie(token, cfg.sessionHours * 3600) });
  }

  async function summary(res) {
    const l = await store.list();
    const now = Date.now();
    return sendJson(res, 200, Object.assign({ ok: true, truncated: l.truncated, fetchedAt: new Date(l.at).toISOString() }, views.summarize(l.records, cfg, now), { recent: views.recentActivity(l.records, cfg, now, 10) }));
  }

  async function listReels(res, q) {
    const l = await store.list();
    const now = Date.now();
    let rows = l.records.map((r) => views.toRow(r, cfg, now));
    const counts = {};
    rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    const statuses = String(q.get('status') || '').split(',').filter((s) => core.STATES.indexOf(s) !== -1);
    const source = q.get('source');
    const text = String(q.get('q') || '').trim().toLowerCase().slice(0, 100);
    if (statuses.length) rows = rows.filter((r) => statuses.indexOf(r.status) !== -1);
    if (source === 'reel' || source === 'upload') rows = rows.filter((r) => r.sourceType === source);
    if (text) rows = rows.filter((r) => [r.title, r.key, r.niche, r.caption, r.reelUrl, r.submittedBy].join(' ').toLowerCase().includes(text));
    rows.sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0));
    const pageSize = Math.min(100, Math.max(1, parseInt(q.get('pageSize'), 10) || 20));
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    const page = Math.min(pages, Math.max(1, parseInt(q.get('page'), 10) || 1));
    return sendJson(res, 200, { ok: true, items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize, pages, counts, truncated: l.truncated });
  }

  async function getReel(res, id) {
    if (!ID_RE.test(id)) fail(404, 'NOT_FOUND', 'Reel not found');
    const rec = await airtable.get(id);
    if (!rec) fail(404, 'NOT_FOUND', 'Reel not found');
    return sendJson(res, 200, { ok: true, reel: views.toDetail(rec, cfg, Date.now()) });
  }

  async function submitReel(req, res, session) {
    const body = await readJson(req);
    const norm = core.normalizeReelUrl(body.url);
    if (!norm.ok) fail(400, 'INVALID_URL', 'Enter a public Instagram Reel URL such as https://www.instagram.com/reel/XXXXXXXXXXX/', { errors: [norm.error] });
    const opts = core.normalizeSubmitOptions(body);
    if (!opts.ok) fail(400, 'INVALID_OPTIONS', 'Some options are invalid', { errors: opts.errors });
    return withLock('submit:' + norm.key, async () => {
      await checkCreativeChoices(opts.options, true);
      const r = await n8n.call('intake', 'reels/intake', Object.assign({ url: norm.url, submittedBy: session.name }, opts.options));
      if (r.status < 300) hub.poke();
      return sendJson(res, r.status, r.body);
    });
  }

  async function stageUpload(req, res) {
    if (!/^https:\/\//.test(cfg.publicBaseUrl)) fail(503, 'UPLOADS_NOT_CONFIGURED', 'Video upload needs PUBLIC_BASE_URL set to the public https address of this server (Blotato must be able to download the file)');
    const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (['video/mp4', 'video/quicktime', 'application/octet-stream'].indexOf(type) === -1) fail(415, 'FILE_TYPE_UNSUPPORTED', 'Only MP4 or MOV video files can be uploaded');
    if (staging >= 2) fail(429, 'TOO_MANY_UPLOADS', 'Another upload is in progress. Try again in a moment.');
    staging += 1;
    try {
      const m = await uploads.stage(req, req.headers['x-file-name']);
      const errs = [];
      if (m.durationSeconds < cfg.core.minVideoSeconds) errs.push('VIDEO_TOO_SHORT');
      if (m.durationSeconds > cfg.core.maxVideoSeconds) errs.push('VIDEO_TOO_LONG');
      if (errs.length) {
        await uploads.remove(m.id);
        fail(422, 'VIDEO_DURATION_OUT_OF_RANGE', `The video must be between ${cfg.core.minVideoSeconds} and ${cfg.core.maxVideoSeconds} seconds`, { errors: errs, durationSeconds: m.durationSeconds });
      }
      return sendJson(res, 201, { ok: true, upload: { uploadId: m.id, fileName: m.fileName, sizeBytes: m.sizeBytes, durationSeconds: m.durationSeconds, mimeType: m.mimeType, previewUrl: '/api/uploads/' + m.id + '/preview' } });
    } finally {
      staging -= 1;
    }
  }

  async function previewStaged(req, res, id) {
    // Staged (not yet submitted) files are previewed through an authenticated route only.
    const meta = uploads.meta(id);
    if (!meta) fail(404, 'NOT_FOUND', 'Upload not found');
    const p = path.join(cfg.uploadDir, id + '.mp4');
    const st = await fs.promises.stat(p).catch(() => null);
    if (!st) fail(404, 'NOT_FOUND', 'Upload not found');
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
    let start = 0;
    let end = st.size - 1;
    let status = 200;
    const headers = { 'content-type': meta.mimeType, 'accept-ranges': 'bytes', 'cache-control': 'private, no-store' };
    if (m && (m[1] || m[2])) {
      if (m[1]) {
        start = Number(m[1]);
        if (m[2]) end = Math.min(end, Number(m[2]));
      } else start = Math.max(0, st.size - Number(m[2]));
      if (start > end) {
        res.writeHead(416, { 'content-range': 'bytes */' + st.size });
        return res.end();
      }
      status = 206;
      headers['content-range'] = `bytes ${start}-${end}/${st.size}`;
    }
    headers['content-length'] = end - start + 1;
    res.writeHead(status, headers);
    return fs.createReadStream(p, { start, end }).on('error', () => res.destroy()).pipe(res);
  }

  async function submitUpload(req, res, session) {
    const body = await readJson(req);
    const uploadId = String(body.uploadId || '');
    let meta = uploads.meta(uploadId);
    if (!meta) meta = await uploads.describeRender(uploadId);
    if (!meta) fail(404, 'UPLOAD_NOT_FOUND', 'The uploaded file was not found. Upload it again.');
    if (cfg.publicBaseUrl && !/^https?:\/\//.test(cfg.publicBaseUrl)) fail(503, 'UPLOADS_NOT_CONFIGURED', 'PUBLIC_BASE_URL is not configured');

    const payload = {
      fileName: meta.fileName, sizeBytes: meta.sizeBytes, mimeType: meta.mimeType, sha256: meta.sha256, durationSeconds: meta.durationSeconds,
      videoUrl: `${cfg.publicBaseUrl}/${meta.isRender ? 'render' : 'media'}/${meta.id}.mp4`, caption: body.caption, overlay: body.overlay === undefined ? '' : body.overlay, hashtags: body.hashtags === undefined ? [] : body.hashtags,
      niche: body.niche, brandVoice: body.brandVoice, brandVoiceNotes: body.brandVoiceNotes, submittedBy: session.name,
    };
    const local = core.buildUploadRecord(payload, cfg.core, new Date().toISOString());
    if (!local.ok) fail(400, 'INVALID_UPLOAD', 'Some details are invalid', { errors: local.errors });
    return withLock('upload:' + uploadId, async () => {
      if (!meta.isRender) uploads.setSubmitted(uploadId, true);
      const r = await n8n.call('internal', 'reels/upload', payload);
      const created = r.status === 201;
      const dup = r.status === 200 && r.body && r.body.duplicate === true;
      if (created) hub.poke();
      else if (dup) { if (!meta.isRender) await uploads.remove(uploadId); }
      else if (!meta.isRender && !(r.body && r.body.error === 'N8N_TIMEOUT')) uploads.setSubmitted(uploadId, false);
      return sendJson(res, r.status, r.body);
    });
  }

  async function doAction(req, res, session, id, action) {
    if (!ID_RE.test(id)) fail(404, 'NOT_FOUND', 'Reel not found');
    if (ACTIONS.indexOf(action) === -1) fail(404, 'NOT_FOUND', 'Unknown action');
    const body = await readJson(req);
    return withLock('record:' + id, async () => {
      const payload = { recordId: id, action, actor: session.name };
      ['expectedFingerprint', 'script', 'caption', 'overlay', 'hashtags', 'reason', 'note'].forEach((k) => { if (body[k] !== undefined) payload[k] = body[k]; });
      if (action === 'resume') {
        const rec = await airtable.get(id);
        if (!rec) fail(404, 'NOT_FOUND', 'Reel not found');
        const r = core.recordFromAirtable(rec);
        if (r.status !== 'APPROVED') fail(409, 'INVALID_STATE', 'Only an approved reel that stalled before video generation can be resumed', { currentStatus: r.status });
        payload.action = 'approve';
        payload.expectedFingerprint = r.approvedFingerprint;
      }
      if (payload.action === 'publish') {
        const last = recentPublish.get(id);
        if (last && Date.now() - last < 15000) fail(409, 'PUBLISH_ALREADY_REQUESTED', 'A publish request for this reel was just sent');
      }
      const v = core.validateApprovalRequest(payload);
      if (!v.ok) fail(400, 'INVALID_REQUEST', 'The request is invalid', { errors: v.errors });
      const r = await n8n.call('approval', 'reels/approval', payload);
      if (r.status < 300) {
        if (payload.action === 'publish' && !(r.body && r.body.duplicate)) recentPublish.set(id, Date.now());
        hub.poke();
      }
      return sendJson(res, r.status, r.body);
    });
  }

  async function settings(res, q) {
    const force = q.get('refresh') === '1' && !(cache.status && Date.now() - cache.status.at < 5000);
    const [st, airtableOk] = await Promise.all([
      getStatus(force),
      airtable.ping().then(() => ({ status: 'connected' }), (e) => ({ status: 'error', code: e.code || 'AIRTABLE_ERROR', message: e.message })),
    ]);
    return sendJson(res, 200, {
      ok: true,
      workflows: st.ok ? { ok: true, checkedAt: st.body.checkedAt, integrations: st.body.integrations, settings: st.body.settings } : { ok: false, error: st.error || 'N8N_ERROR', message: st.message || 'The workflow status could not be read' },
      backend: {
        airtableRead: airtableOk,
        webhooks: { n8nBaseConfigured: !!cfg.n8n.base, intakeToken: !!cfg.n8n.tokens.intake, approvalToken: !!cfg.n8n.tokens.approval, internalToken: !!cfg.n8n.tokens.internal },
        uploads: { enabled: /^https:\/\//.test(cfg.publicBaseUrl), maxUploadMb: Math.round(cfg.maxUploadBytes / 1048576), minSeconds: cfg.core.minVideoSeconds, maxSeconds: cfg.core.maxVideoSeconds },
        liveUpdates: { mode: 'server-sent-events', activePollSeconds: cfg.pollActiveMs / 1000, idlePollSeconds: cfg.pollIdleMs / 1000, connectedClients: hub.size() },
      },
    });
  }

  async function options(res, q) {
    const o = await getOptions(q.get('refresh') === '1');
    if (!o.ok) return sendJson(res, 200, { ok: false, error: o.error || 'OPTIONS_UNAVAILABLE', message: o.message || 'HeyGen options could not be loaded', presets: PRESETS });
    return sendJson(res, 200, Object.assign({}, o.body, { presets: PRESETS }));
  }

  // ---------------------------------------------------------------- routing
  async function api(req, res, url) {
    const method = req.method;
    const p = url.pathname;
    if (method !== 'GET' && method !== 'HEAD' && !originOk(req)) fail(403, 'BAD_ORIGIN', 'Cross-origin request refused');
    if (p === '/api/login' && method === 'POST') return login(req, res);

    const session = auth.read(parseCookies(req.headers.cookie)[auth.COOKIE], Date.now());
    if (p === '/api/session' && method === 'GET') return sendJson(res, 200, session ? { ok: true, authenticated: true, user: { name: session.name }, csrfToken: session.csrf } : { ok: true, authenticated: false });
    if (!session) fail(401, 'UNAUTHENTICATED', 'Sign in to continue');
    if (method !== 'GET' && method !== 'HEAD' && !csrfOk(session, req)) fail(403, 'CSRF_FAILED', 'Reload the page and try again');

    if (p === '/api/logout' && method === 'POST') {
      auth.revoke(session);
      return sendJson(res, 200, { ok: true }, { 'set-cookie': auth.cookie('', 0) });
    }
    if (p.startsWith('/api/editor/')) return editorProxy(req, res, url);
    if (method === 'GET') {
      if (p === '/api/summary') return summary(res);
      if (p === '/api/reels') return listReels(res, url.searchParams);
      if (p === '/api/settings') return settings(res, url.searchParams);
      if (p === '/api/options') return options(res, url.searchParams);
      if (p === '/api/events') {
        if (!hub.add(req, res)) fail(429, 'TOO_MANY_STREAMS', 'Too many open dashboards');
        return undefined;
      }
      let m = /^\/api\/reels\/([^/]+)$/.exec(p);
      if (m) return getReel(res, m[1]);
      m = /^\/api\/uploads\/([a-f0-9]{32})\/preview$/.exec(p);
      if (m) return previewStaged(req, res, m[1]);
    }
    if (method === 'POST') {
      if (p === '/api/reels') return submitReel(req, res, session);
      if (p === '/api/reels/upload') return submitUpload(req, res, session);
      if (p === '/api/uploads') return stageUpload(req, res);
      const m = /^\/api\/reels\/([^/]+)\/([a-z]+)$/.exec(p);
      if (m) return doAction(req, res, session, m[1], m[2]);
    }
    return fail(404, 'NOT_FOUND', 'Unknown endpoint');
  }

  function serveStatic(req, res, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
    let rel;
    try {
      rel = decodeURIComponent(url.pathname);
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: 'BAD_PATH' });
    }
    let file = path.normalize(path.join(cfg.webDir, rel));
    const inside = (f) => f === cfg.webDir || f.startsWith(cfg.webDir + path.sep);
    if (!inside(file)) return sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
    let st = fs.statSync(file, { throwIfNoEntry: false });
    if (!st || st.isDirectory()) {
      if (path.extname(rel)) return sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
      file = path.join(cfg.webDir, 'index.html');
      st = fs.statSync(file, { throwIfNoEntry: false });
    }
    if (!st) {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('The dashboard files are missing. Expected web/dist/index.html (or set WEB_DIR).');
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream', 'content-length': st.size,
      'cache-control': rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(file).pipe(res);
  }

  const server = http.createServer(async (req, res) => {
    Object.keys(SECURITY_HEADERS).forEach((k) => res.setHeader(k, SECURITY_HEADERS[k]));
    try {
      const url = new URL(req.url, 'http://localhost');
      const media = /^\/media\/([a-f0-9]{32})\.mp4$/.exec(url.pathname);
      if (media && (req.method === 'GET' || req.method === 'HEAD')) {
        res.removeHeader('content-security-policy');
        if (!uploads.serve(media[1], req, res)) sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
        return;
      }
      const render = /^\/render\/([a-f0-9]{32})\.mp4$/.exec(url.pathname);
      if (render && (req.method === 'GET' || req.method === 'HEAD')) {
        res.removeHeader('content-security-policy');
        if (!uploads.serveRender(render[1], req, res)) sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
        return;
      }
      if (url.pathname === '/healthz') return sendJson(res, 200, { ok: true });
      if (url.pathname.startsWith('/api/')) {
        await api(req, res, url);
        return;
      }
      serveStatic(req, res, url);
    } catch (e) {
      if (e instanceof HttpError) sendJson(res, e.status, Object.assign({ ok: false, error: e.code, message: e.message }, e.extra));
      else if (e instanceof UpstreamError) sendJson(res, e.status, { ok: false, error: e.code, message: e.message });
      else {
        if (!cfg.quiet) console.error('Unhandled error:', e && e.message);
        sendJson(res, 500, { ok: false, error: 'INTERNAL_ERROR', message: 'Something went wrong on the server' });
      }
    }
  });
  server.requestTimeout = 0; // uploads can be long; the byte-size cap bounds them
  server.headersTimeout = 20000;

  const cleaner = setInterval(() => uploads.cleanup(24 * 3600000).catch(() => null), 3600000);
  cleaner.unref();

  return {
    server, hub, uploads,
    listen: () => new Promise((resolve) => server.listen(cfg.port, cfg.host, () => resolve(server.address()))),
    close: () => new Promise((resolve) => { hub.close(); clearInterval(cleaner); server.closeAllConnections && server.closeAllConnections(); server.close(() => resolve()); }),
  };
}

module.exports = { createApp };
