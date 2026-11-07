'use strict';
// MoneyPrinterTurbo adapter: exposes the HeyGen-shaped calls workflow 04 already makes and renders a faceless vertical video
// (voiceover + stock footage + captions) with a local MoneyPrinterTurbo instance instead.
//
//   GET  /v3/users/me     -> { data:{ username } }                       health probe
//   POST /v3/videos       -> { data:{ video_id } }                       starts a render (Idempotency-Key replays the same job)
//   GET  /v3/videos/:id   -> { data:{ status, video_url, duration, thumbnail_url, failure_message } }
//
// video_url is PUBLIC_BASE_URL/render/<32 hex>.mp4: the finished file is copied into RENDER_DIR, which the dashboard backend serves.
// Zero dependencies (Node 18+). ffprobe is used for the exact duration when available.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const MAX_BODY = 64 * 1024;
const STOP = new Set('about above after again also because been before being between both could does doing down during each from have having here into just like more most much must only other over same should some such than that their them then there these they this those through under until very want were what when where which while will with would your you the and for are but not can all any out our has had was its how why who get got make made one two'.split(' '));

// Stock-footage search terms from the script when none are supplied: the most frequent meaningful words.
function keywordsFrom(script, n) {
  const count = new Map();
  for (const w of String(script || '').toLowerCase().match(/[a-z]{4,}/g) || []) if (!STOP.has(w)) count.set(w, (count.get(w) || 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n || 5).map((e) => e[0]);
}

// Pure mapping from the HeyGen-shaped create body to the MoneyPrinterTurbo task body.
function toMptTask(body, opts) {
  const script = typeof body.script === 'string' ? body.script.trim() : '';
  if (!script) return { ok: false, error: 'SCRIPT_MISSING' };
  const task = {
    video_subject: String(body.title || 'Reel').slice(0, 200),
    video_script: script,
    video_terms: keywordsFrom(script, 5),
    video_aspect: '9:16',
    video_source: opts.videoSource || 'pexels',
    voice_name: String(body.voice_id || opts.voice || 'en-US-AriaNeural'),
    subtitle_enabled: true,
    bgm_type: opts.bgm === false ? '' : 'random',
    video_count: 1,
  };
  if (task.video_source === 'local') {
    if (!opts.localMaterials || !opts.localMaterials.length) return { ok: false, error: 'LOCAL_MATERIALS_NOT_CONFIGURED' };
    task.video_materials = opts.localMaterials.map((f) => ({ provider: 'local', url: f, duration: 0 }));
  }
  return { ok: true, task };
}

function createMptAdapter(opts, fetchImpl) {
  const f = fetchImpl || fetch;
  const mpt = String(opts.mptUrl || 'http://127.0.0.1:8080').replace(/\/+$/, '');
  const publicBase = String(opts.publicBaseUrl || '').replace(/\/+$/, '');
  const renderDir = path.resolve(opts.renderDir);
  fs.mkdirSync(renderDir, { recursive: true });
  const jobsFile = path.join(renderDir, '.jobs.json');
  let jobs = {};
  try { jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8')); } catch (e) { jobs = {}; }
  const save = () => fs.writeFileSync(jobsFile, JSON.stringify(jobs));
  const inflight = new Map();

  const mptFetch = (p, init) => f(mpt + '/api/v1' + p, Object.assign({}, init, {
    headers: Object.assign({ 'x-api-key': opts.mptApiKey || '' }, (init && init.headers) || {}),
    signal: AbortSignal.timeout((init && init.timeout) || 30000),
  }));

  function probeDuration(file, fallback) {
    const r = spawnSync(opts.ffprobe || 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8', timeout: 20000 });
    const d = Number(String(r.stdout || '').trim());
    return d > 0 ? Math.round(d * 10) / 10 : fallback;
  }

  async function create(body, idemKey) {
    if (idemKey && jobs['k:' + idemKey]) return { status: 200, body: { data: { video_id: jobs['k:' + idemKey] } } };
    const mapped = toMptTask(body || {}, opts);
    if (!mapped.ok) return { status: 400, body: { error: mapped.error, message: mapped.error } };
    const r = await mptFetch('/videos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(mapped.task) });
    if (!r.ok) return { status: r.status >= 500 ? 502 : r.status, body: { error: 'MPT_CREATE_FAILED', message: 'MoneyPrinterTurbo returned HTTP ' + r.status } };
    const out = await r.json();
    const id = out && out.data && out.data.task_id;
    if (typeof id !== 'string' || !id) return { status: 502, body: { error: 'MPT_CREATE_UNEXPECTED', message: 'No task_id in the MoneyPrinterTurbo response' } };
    if (idemKey) { jobs['k:' + idemKey] = id; save(); }
    return { status: 200, body: { data: { video_id: id } } };
  }

  async function finalize(taskId, task) {
    if (jobs['r:' + taskId]) return jobs['r:' + taskId];
    if (inflight.has(taskId)) return inflight.get(taskId);
    const work = (async () => {
      if (!publicBase) throw Object.assign(new Error('PUBLIC_BASE_URL is not set, so the video has no public address'), { code: 'NO_PUBLIC_BASE_URL' });
      const rel = Array.isArray(task.videos) && task.videos[0] ? String(task.videos[0]) : '';
      const m = /^\/?tasks\/([A-Za-z0-9-]+)\/(final-\d+\.mp4)$/.exec(rel.replace(/^https?:\/\/[^/]+/, ''));
      if (!m || m[1] !== taskId) throw Object.assign(new Error('Unexpected output path from MoneyPrinterTurbo'), { code: 'MPT_OUTPUT_UNEXPECTED' });
      const dl = await mptFetch('/download/' + m[1] + '/' + m[2], { timeout: 180000 });
      if (!dl.ok) throw Object.assign(new Error('Could not download the render (HTTP ' + dl.status + ')'), { code: 'MPT_DOWNLOAD_FAILED' });
      const id = crypto.randomBytes(16).toString('hex');
      const dest = path.join(renderDir, id + '.mp4');
      fs.writeFileSync(dest + '.part', Buffer.from(await dl.arrayBuffer()));
      fs.renameSync(dest + '.part', dest);
      const info = { id, duration: probeDuration(dest, Number(task.audio_duration) || 0) };
      jobs['r:' + taskId] = info; save();
      return info;
    })();
    inflight.set(taskId, work);
    try { return await work; } finally { inflight.delete(taskId); }
  }

  async function status(taskId) {
    const r = await mptFetch('/tasks/' + encodeURIComponent(taskId));
    if (r.status === 404) return { status: 404, body: { error: 'NOT_FOUND', message: 'Unknown video id' } };
    if (!r.ok) return { status: 502, body: { error: 'MPT_STATUS_FAILED', message: 'MoneyPrinterTurbo returned HTTP ' + r.status } };
    const task = ((await r.json()) || {}).data || {};
    if (task.state === -1) return { status: 200, body: { data: { status: 'failed', failure_code: 'MPT_' + String(task.failed_stage || 'FAILED').toUpperCase(), failure_message: String(task.error || 'Render failed').slice(0, 300) } } };
    if (task.state !== 1) return { status: 200, body: { data: { status: 'processing', progress: task.progress } } };
    try {
      const info = await finalize(taskId, task);
      return { status: 200, body: { data: { status: 'completed', video_url: publicBase + '/render/' + info.id + '.mp4', duration: info.duration, thumbnail_url: '' } } };
    } catch (e) {
      return { status: 200, body: { data: { status: 'failed', failure_code: e.code || 'MPT_FINALIZE_FAILED', failure_message: String(e.message).slice(0, 300) } } };
    }
  }

  async function me() {
    try {
      const r = await mptFetch('/tasks', { timeout: 10000 });
      if (r.status === 401) return { status: 401, body: { error: 'MPT_AUTH_FAILED', message: 'MoneyPrinterTurbo rejected the API key' } };
      if (!r.ok) return { status: 502, body: { error: 'MPT_UNHEALTHY', message: 'MoneyPrinterTurbo returned HTTP ' + r.status } };
      return { status: 200, body: { data: { username: 'moneyprinterturbo' } } };
    } catch (e) {
      return { status: 502, body: { error: 'MPT_UNREACHABLE', message: 'Cannot reach MoneyPrinterTurbo at ' + mpt } };
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

  return { server, toMptTask };
}

module.exports = { createMptAdapter, toMptTask, keywordsFrom };
