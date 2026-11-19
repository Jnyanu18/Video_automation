'use strict';
// Higgsfield Video Adapter: exposes the HeyGen-shaped calls workflow 04 makes
// and generates cinematic vertical 9:16 videos via Higgsfield AI (api.higgsfield.ai).
//
//   GET  /healthz         -> { ok: true }
//   GET  /v3/users/me     -> { data:{ username } }                       health probe
//   POST /v3/videos       -> { data:{ video_id } }                       starts a generation
//   GET  /v3/videos/:id   -> { data:{ status, video_url, duration, thumbnail_url, failure_message } }
//
// video_url is PUBLIC_BASE_URL/render/<32 hex>.mp4: the finished file is downloaded into RENDER_DIR.
// Zero dependencies (Node 18+). ffprobe is used for the exact duration when available.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const MAX_BODY = 64 * 1024;

function authHeader(apiKey) {
  if (!apiKey) return '';
  if (/^Key\s+/i.test(apiKey)) return apiKey;
  return 'Key ' + apiKey;
}

// Pure mapping from HeyGen-shaped request body to Higgsfield task body.
function toHiggsfieldTask(body, opts) {
  opts = opts || {};
  const prompt = (typeof body.visual_prompt === 'string' && body.visual_prompt.trim())
    || (typeof body.script === 'string' && body.script.trim())
    || '';
  if (!prompt) return { ok: false, error: 'PROMPT_MISSING' };

  const task = {
    model: opts.model || 'kling-v3',
    prompt: prompt,
    aspect_ratio: '9:16',
    duration: opts.duration ? Number(opts.duration) : 5,
  };
  return { ok: true, task };
}

function createHiggsfieldAdapter(opts, fetchImpl) {
  opts = opts || {};
  const f = fetchImpl || fetch;
  const baseUrl = String(opts.baseUrl || 'https://api.higgsfield.ai').replace(/\/+$/, '');
  const publicBase = String(opts.publicBaseUrl || '').replace(/\/+$/, '');
  const renderDir = path.resolve(opts.renderDir || './runtime/renders');
  fs.mkdirSync(renderDir, { recursive: true });
  const jobsFile = path.join(renderDir, '.higgsfield-jobs.json');
  let jobs = {};
  try { jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8')); } catch (e) { jobs = {}; }
  const save = () => fs.writeFileSync(jobsFile, JSON.stringify(jobs));
  const inflight = new Map();

  const hfFetch = (p, init) => f(baseUrl + p, Object.assign({}, init, {
    headers: Object.assign({
      'authorization': authHeader(opts.apiKey || ''),
      'content-type': 'application/json',
    }, (init && init.headers) || {}),
    signal: AbortSignal.timeout((init && init.timeout) || 45000),
  }));

  function probeDuration(file, fallback) {
    try {
      const r = spawnSync(opts.ffprobe || 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8', timeout: 20000 });
      const d = Number(String(r.stdout || '').trim());
      return d > 0 ? Math.round(d * 10) / 10 : (fallback || 5);
    } catch (e) {
      return fallback || 5;
    }
  }

  async function create(body, idemKey) {
    if (idemKey && jobs['k:' + idemKey]) {
      return { status: 200, body: { data: { video_id: jobs['k:' + idemKey] } } };
    }
    const mapped = toHiggsfieldTask(body || {}, opts);
    if (!mapped.ok) return { status: 400, body: { error: mapped.error, message: mapped.error } };

    const r = await hfFetch('/v1/text-to-video', {
      method: 'POST',
      body: JSON.stringify(mapped.task),
    });
    if (r.status === 401 || r.status === 403) {
      return { status: 401, body: { error: 'HIGGSFIELD_AUTH_FAILED', message: 'Higgsfield rejected API credentials' } };
    }
    if (!r.ok) {
      return { status: r.status >= 500 ? 502 : r.status, body: { error: 'HIGGSFIELD_CREATE_FAILED', message: 'Higgsfield returned HTTP ' + r.status } };
    }

    const out = await r.json();
    const id = (out && (out.request_id || out.id || (out.data && out.data.request_id)));
    if (typeof id !== 'string' || !id) {
      return { status: 502, body: { error: 'HIGGSFIELD_CREATE_UNEXPECTED', message: 'No request_id in the Higgsfield response' } };
    }
    if (idemKey) { jobs['k:' + idemKey] = id; save(); }
    return { status: 200, body: { data: { video_id: id } } };
  }

  async function finalize(taskId, remoteVideoUrl) {
    if (jobs['r:' + taskId]) return jobs['r:' + taskId];
    if (inflight.has(taskId)) return inflight.get(taskId);
    const work = (async () => {
      if (!publicBase) throw Object.assign(new Error('PUBLIC_BASE_URL is not set, so the video has no public address'), { code: 'NO_PUBLIC_BASE_URL' });
      if (!remoteVideoUrl) throw Object.assign(new Error('Higgsfield reported completion without a video_url'), { code: 'HIGGSFIELD_NO_VIDEO_URL' });

      const dl = await f(remoteVideoUrl, { signal: AbortSignal.timeout(180000) });
      if (!dl.ok) throw Object.assign(new Error('Could not download render from Higgsfield (HTTP ' + dl.status + ')'), { code: 'HIGGSFIELD_DOWNLOAD_FAILED' });

      const id = crypto.randomBytes(16).toString('hex');
      const dest = path.join(renderDir, id + '.mp4');
      fs.writeFileSync(dest + '.part', Buffer.from(await dl.arrayBuffer()));
      fs.renameSync(dest + '.part', dest);

      const info = { id, duration: probeDuration(dest, opts.duration || 5) };
      jobs['r:' + taskId] = info; save();
      return info;
    })();
    inflight.set(taskId, work);
    try { return await work; } finally { inflight.delete(taskId); }
  }

  async function status(taskId) {
    let r = await hfFetch('/v1/requests/' + encodeURIComponent(taskId) + '/status');
    if (r.status === 404) {
      r = await hfFetch('/v1/requests/' + encodeURIComponent(taskId));
    }
    if (r.status === 404) return { status: 404, body: { error: 'NOT_FOUND', message: 'Unknown request id' } };
    if (!r.ok) return { status: 502, body: { error: 'HIGGSFIELD_STATUS_FAILED', message: 'Higgsfield returned HTTP ' + r.status } };

    const data = (await r.json()) || {};
    const st = String(data.status || (data.data && data.data.status) || '').toLowerCase();

    if (st === 'failed' || st === 'error') {
      const msg = data.error || (data.data && data.data.error) || data.message || 'Higgsfield generation failed';
      return { status: 200, body: { data: { status: 'failed', failure_code: 'HIGGSFIELD_FAILED', failure_message: String(msg).slice(0, 300) } } };
    }

    if (st === 'completed' || st === 'succeeded' || st === 'success') {
      const vUrl = data.video_url || (data.result && data.result.video_url) || (data.output && data.output.video_url) || (data.data && data.data.video_url);
      try {
        const info = await finalize(taskId, vUrl);
        return {
          status: 200,
          body: {
            data: {
              status: 'completed',
              video_url: publicBase + '/render/' + info.id + '.mp4',
              duration: info.duration,
              thumbnail_url: ''
            }
          }
        };
      } catch (e) {
        return { status: 200, body: { data: { status: 'failed', failure_code: e.code || 'HIGGSFIELD_FINALIZE_FAILED', failure_message: String(e.message).slice(0, 300) } } };
      }
    }

    // Default is in-progress / queued
    const progress = Number(data.progress || (data.data && data.data.progress) || 30);
    return { status: 200, body: { data: { status: 'processing', progress } } };
  }

  async function me() {
    try {
      const r = await hfFetch('/v1/models', { timeout: 10000 });
      if (r.status === 401 || r.status === 403) {
        return { status: 401, body: { error: 'HIGGSFIELD_AUTH_FAILED', message: 'Higgsfield rejected the API key' } };
      }
      if (!r.ok) {
        return { status: 502, body: { error: 'HIGGSFIELD_UNHEALTHY', message: 'Higgsfield returned HTTP ' + r.status } };
      }
      return { status: 200, body: { data: { username: 'higgsfield' } } };
    } catch (e) {
      return { status: 502, body: { error: 'HIGGSFIELD_UNREACHABLE', message: 'Cannot reach Higgsfield at ' + baseUrl } };
    }
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
      const p = new URL(req.url, 'http://localhost').pathname;
      if (p === '/healthz') return send({ status: 200, body: { ok: true } });
      if (opts.token && req.headers['x-api-key'] !== opts.token) return send({ status: 401, body: { error: 'UNAUTHORIZED', message: 'Bad adapter token' } });
      if (req.method === 'GET' && p === '/v3/users/me') return send(await me());
      if (req.method === 'POST' && p === '/v3/videos') return send(await create(await readJson(req), req.headers['idempotency-key']));
      const m = /^\/v3\/videos\/([A-Za-z0-9_-]{4,100})$/.exec(p);
      if (req.method === 'GET' && m) return send(await status(m[1]));
      return send({ status: 404, body: { error: 'NOT_FOUND' } });
    } catch (e) {
      return send({ status: e.status || 502, body: { error: 'ADAPTER_ERROR', message: String(e.message).slice(0, 200) } });
    }
  });

  return { server, toHiggsfieldTask };
}

module.exports = { createHiggsfieldAdapter, toHiggsfieldTask, authHeader };
