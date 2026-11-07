'use strict';
// Postiz adapter: exposes the three Blotato-shaped calls workflow 05 makes (stage media, create post, poll post) and
// translates them to a Postiz public API (self-hosted or cloud). Binds to localhost; zero dependencies (Node 18+).
//
//   GET  /v2/users/me/accounts        -> { items:[{id,platform:'instagram',username,fullname}] }
//   POST /v2/media {url}              -> { id, url }   url is an opaque https://postiz.media/<handle> carrying the Postiz upload
//   POST /v2/posts {post:{...}}       -> { postSubmissionId }
//   GET  /v2/posts/:id                -> { status:'published'|'in-progress'|'failed', publicUrl?, errorMessage? }
//
// Postiz facts used (docs.postiz.com): Authorization header with the bare key; GET /integrations; POST /upload (multipart `file`);
// POST /posts (type now, settings.__type instagram, post_type post = reel for a single video); GET /posts?startDate&endDate
// (state QUEUE|PUBLISHED|ERROR|DRAFT, releaseURL, error). Unverified against a live instance: the /upload response shape.

const http = require('http');
const crypto = require('crypto');

const MEDIA_HOST = 'postiz.media';
const MAX_BODY = 64 * 1024;

function b64url(obj) { return Buffer.from(JSON.stringify(obj)).toString('base64url'); }
function unb64url(s) { return JSON.parse(Buffer.from(String(s), 'base64url').toString('utf8')); }

function mediaHandleUrl(upload) { return 'https://' + MEDIA_HOST + '/' + b64url({ id: upload.id, path: upload.path }); }

function parseMediaHandle(url) {
  const m = /^https:\/\/postiz\.media\/([A-Za-z0-9_-]{4,2000})$/.exec(String(url || ''));
  if (!m) return null;
  try {
    const o = unb64url(m[1]);
    if (o && typeof o.path === 'string' && typeof o.id === 'string') return o;
  } catch (e) { /* fall through */ }
  return null;
}

// Pure mapping from the Blotato-shaped create body to the Postiz create body.
function toPostizPost(blotatoBody, integrationType, nowIso) {
  const post = blotatoBody && blotatoBody.post;
  if (!post || !post.accountId || !post.content || typeof post.content.text !== 'string') return { ok: false, error: 'POST_BODY_INVALID' };
  const urls = Array.isArray(post.content.mediaUrls) ? post.content.mediaUrls : [];
  if (urls.length !== 1) return { ok: false, error: 'EXACTLY_ONE_VIDEO_REQUIRED' };
  const media = parseMediaHandle(urls[0]);
  if (!media) return { ok: false, error: 'MEDIA_NOT_STAGED_THROUGH_ADAPTER' };
  return {
    ok: true,
    body: {
      type: 'now', date: nowIso, shortLink: false, tags: [],
      posts: [{
        integration: { id: String(post.accountId) },
        value: [{ content: post.content.text, image: [{ id: media.id, path: media.path }] }],
        settings: { __type: integrationType || 'instagram', post_type: 'post' },
      }],
    },
  };
}

// Maps a Postiz post (from GET /posts) to the Blotato-shaped status document.
function toBlotatoStatus(p) {
  if (!p) return { status: 'in-progress' };
  if (p.state === 'PUBLISHED') return { status: 'published', publicUrl: typeof p.releaseURL === 'string' ? p.releaseURL : undefined };
  if (p.state === 'ERROR') return { status: 'failed', errorMessage: String(p.error || 'Postiz reported an error').slice(0, 300) };
  return { status: 'in-progress' };
}

function createPostizAdapter(opts, fetchImpl) {
  const f = fetchImpl || fetch;
  const api = String(opts.apiUrl || '').replace(/\/+$/, '');
  const key = String(opts.apiKey || '');
  const token = String(opts.token || '');
  const cacheMs = (opts.statusCacheSeconds === undefined ? 60 : Number(opts.statusCacheSeconds)) * 1000;
  const maxBytes = (opts.maxUploadMb || 100) * 1048576;
  let postsCache = { at: 0, posts: null };
  let integrationsCache = { at: 0, list: null };

  async function postiz(path, init) {
    const headers = Object.assign({ Authorization: key }, (init && init.headers) || {});
    return f(api + path, Object.assign({}, init, { headers, signal: AbortSignal.timeout(init && init.timeout || 60000) }));
  }

  async function integrations() {
    if (integrationsCache.list && Date.now() - integrationsCache.at < 30000) return integrationsCache.list;
    const r = await postiz('/integrations');
    if (!r.ok) throw Object.assign(new Error('Postiz integrations ' + r.status), { status: r.status });
    const list = await r.json();
    integrationsCache = { at: Date.now(), list: Array.isArray(list) ? list : [] };
    return integrationsCache.list;
  }

  async function listPosts() {
    if (postsCache.posts && Date.now() - postsCache.at < cacheMs) return postsCache.posts;
    const start = new Date(Date.now() - 3 * 86400000).toISOString();
    const end = new Date(Date.now() + 86400000).toISOString();
    const r = await postiz('/posts?startDate=' + encodeURIComponent(start) + '&endDate=' + encodeURIComponent(end));
    if (!r.ok) throw Object.assign(new Error('Postiz posts ' + r.status), { status: r.status });
    const data = await r.json();
    postsCache = { at: Date.now(), posts: Array.isArray(data && data.posts) ? data.posts : [] };
    return postsCache.posts;
  }

  async function stageMedia(url) {
    if (!/^https?:\/\//i.test(String(url || ''))) return { status: 400, body: { error: 'URL_INVALID' } };
    const src = await f(url, { signal: AbortSignal.timeout(120000) });
    if (!src.ok) return { status: 502, body: { error: 'SOURCE_DOWNLOAD_FAILED', message: 'Source video returned HTTP ' + src.status } };
    const len = Number(src.headers.get('content-length') || 0);
    if (len > maxBytes) return { status: 413, body: { error: 'SOURCE_TOO_LARGE' } };
    const buf = Buffer.from(await src.arrayBuffer());
    if (buf.length > maxBytes) return { status: 413, body: { error: 'SOURCE_TOO_LARGE' } };
    const form = new FormData();
    form.append('file', new Blob([buf], { type: 'video/mp4' }), 'reel-' + crypto.randomBytes(4).toString('hex') + '.mp4');
    const up = await postiz('/upload', { method: 'POST', body: form, timeout: 180000 });
    if (!up.ok) return { status: up.status >= 500 ? 502 : up.status, body: { error: 'POSTIZ_UPLOAD_FAILED', message: 'Postiz upload returned HTTP ' + up.status } };
    const u = await up.json();
    if (!u || typeof u.path !== 'string' || !u.id) return { status: 502, body: { error: 'POSTIZ_UPLOAD_UNEXPECTED', message: 'Postiz upload response had no id/path' } };
    const handle = mediaHandleUrl({ id: String(u.id), path: u.path });
    return { status: 200, body: { id: String(u.id), url: handle } };
  }

  async function createPost(body) {
    let list;
    try { list = await integrations(); } catch (e) { return { status: 502, body: { error: 'POSTIZ_UNREACHABLE', message: e.message } }; }
    const accountId = body && body.post && body.post.accountId;
    const integ = list.find((i) => i && String(i.id) === String(accountId));
    if (!integ) return { status: 404, body: { error: 'ACCOUNT_NOT_FOUND', message: 'No Postiz integration with that id' } };
    if (integ.disabled) return { status: 400, body: { error: 'ACCOUNT_DISABLED', message: 'The Postiz channel is disabled' } };
    const type = String(integ.identifier || integ.providerIdentifier || 'instagram');
    const mapped = toPostizPost(body, type, new Date().toISOString());
    if (!mapped.ok) return { status: 400, body: { error: mapped.error } };
    // No retry here: creating a post is not idempotent. A network error after sending is reported as a 5xx (ambiguous).
    const r = await postiz('/posts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(mapped.body) });
    if (!r.ok) return { status: r.status, body: { error: 'POSTIZ_CREATE_FAILED', message: 'Postiz create returned HTTP ' + r.status } };
    const out = await r.json();
    const first = Array.isArray(out) ? out[0] : out;
    const id = first && first.postId;
    if (typeof id !== 'string' || !id) return { status: 502, body: { error: 'POSTIZ_CREATE_UNEXPECTED', message: 'Postiz create response had no postId' } };
    postsCache = { at: 0, posts: null };
    return { status: 200, body: { postSubmissionId: id } };
  }

  async function postStatus(id) {
    let posts;
    try { posts = await listPosts(); } catch (e) { return { status: e.status === 429 ? 429 : 502, body: { error: 'POSTIZ_STATUS_FAILED', message: e.message } }; }
    const p = posts.find((x) => x && String(x.id) === String(id));
    return { status: 200, body: toBlotatoStatus(p) };
  }

  async function accounts() {
    let list;
    try { list = await integrations(); } catch (e) { return { status: e.status === 401 ? 401 : 502, body: { error: 'POSTIZ_UNREACHABLE', message: e.message } }; }
    const items = list.filter((i) => i && /^instagram/.test(String(i.identifier || i.providerIdentifier || '')) && !i.disabled)
      .map((i) => ({ id: String(i.id), platform: 'instagram', username: String(i.display || i.profile || i.name || ''), fullname: String(i.name || '') }));
    return { status: 200, body: { items } };
  }

  function readJson(req) {
    return new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
      req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(Object.assign(new Error('bad json'), { status: 400 })); } });
      req.on('error', reject);
    });
  }

  const server = http.createServer(async (req, res) => {
    const send = (r) => { res.writeHead(r.status, { 'content-type': 'application/json' }); res.end(JSON.stringify(r.body)); };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/healthz') return send({ status: 200, body: { ok: true } });
      if (token && req.headers.authorization !== token) return send({ status: 401, body: { error: 'UNAUTHORIZED' } });
      const p = url.pathname;
      if (req.method === 'GET' && p === '/v2/users/me/accounts') return send(await accounts());
      if (req.method === 'POST' && p === '/v2/media') { const b = await readJson(req); return send(await stageMedia(b.url)); }
      if (req.method === 'POST' && p === '/v2/posts') return send(await createPost(await readJson(req)));
      const m = /^\/v2\/posts\/([A-Za-z0-9_-]{1,100})$/.exec(p);
      if (req.method === 'GET' && m) return send(await postStatus(m[1]));
      return send({ status: 404, body: { error: 'NOT_FOUND' } });
    } catch (e) {
      return send({ status: e.status || 502, body: { error: 'ADAPTER_ERROR', message: String(e.message).slice(0, 200) } });
    }
  });

  return { server, toPostizPost, toBlotatoStatus };
}

module.exports = { createPostizAdapter, toPostizPost, toBlotatoStatus, parseMediaHandle, mediaHandleUrl, MEDIA_HOST };
