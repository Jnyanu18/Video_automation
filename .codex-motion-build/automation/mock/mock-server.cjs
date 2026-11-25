'use strict';
// Zero-dependency mock of Airtable, Apify, OpenAI, HeyGen, Blotato and a notification sink. Every response is synthetic.
const http = require('http');
const core = require('../lib/core.js');

const TOKENS = { airtable: 'Bearer sim-airtable', apify: 'Bearer sim-apify', openai: 'Bearer sim-openai', heygen: 'sim-heygen', blotato: 'sim-blotato' };
const TABLE = 'Reels';
const SELECTS = {
  Status: core.STATES, FailedFromState: core.STATES, TranscriptSource: ['apify', 'stt', 'none'], PublishAdapter: ['mock', 'blotato', 'meta'], SourceType: ['reel', 'upload'],
};
const NUMBERS = ['SourceDuration', 'ContentAttempts', 'RetryCount', 'VideoDuration', 'VideoAttempt', 'PollAttempts', 'RegenerationCount', 'PublishPollAttempts', 'UploadSizeBytes'];
const COMPUTED = ['CreatedTime', 'ModifiedTime'];
const FIELDS = new Set(Object.values(core.AIRTABLE_FIELD_MAP).concat(COMPUTED));

const BASE_TRANSCRIPT = 'Wake up early drink a glass of water stretch for ten minutes and write down your top three goals before you check your phone';
const GOOD = {
  script: 'Small habits compound quietly. Choose one tiny action you can repeat every day, tie it to something you already do, and track it for two weeks. When it feels automatic, add a second habit on top of the first. Progress looks slow at first, then suddenly obvious, because steady effort beats occasional intensity. Start today, keep the bar low, and let consistency do the heavy lifting for you.',
  caption: 'Tiny habits, big results. Save this for your next reset.',
  overlay: 'Tiny habits win',
  hashtags: ['habits', 'consistency', 'selfimprovement'],
};

const MOCK_AVATARS = [
  { id: 'avatar_mock_anna', name: 'Anna (studio)', avatar_type: 'studio_avatar', group_id: 'g1', preview_image_url: 'https://cdn.mock-heygen.invalid/avatar/anna.jpg', preview_video_url: 'https://cdn.mock-heygen.invalid/avatar/anna.mp4', gender: 'female', default_voice_id: 'voice_mock_en_f', status: 'active' },
  { id: 'avatar_mock_ben', name: 'Ben (casual)', avatar_type: 'photo_avatar', group_id: 'g2', preview_image_url: 'https://cdn.mock-heygen.invalid/avatar/ben.jpg', preview_video_url: null, gender: 'male', default_voice_id: 'voice_mock_en_m', status: 'active' },
];
const MOCK_VOICES = [
  { voice_id: 'voice_mock_en_f', mode: 'public', name: 'Emma (English)', language: 'English', status: 'ACTIVE', preview_audio_url: 'https://cdn.mock-heygen.invalid/voice/emma.mp3' },
  { voice_id: 'voice_mock_en_m', mode: 'public', name: 'Oliver (English)', language: 'English', status: 'ACTIVE', preview_audio_url: 'https://cdn.mock-heygen.invalid/voice/oliver.mp3' },
  { voice_id: 'voice_mock_my_clone', mode: 'private', name: 'My cloned voice', language: 'English', status: 'ACTIVE', preview_audio_url: null },
];

function createMock() {
  const heygenDefaults = () => ({ videos: new Map(), idem: new Map(), pollsToFinish: 2, outcome: 'complete', duration: 24 });
  const blotatoDefaults = () => ({ media: new Map(), posts: new Map(), pollsToFinish: 2, outcome: 'publish' });
  const s = { records: new Map(), calls: [], faults: {}, notifications: [], chatRequests: [], sttRequests: [], seq: 0, lastMs: 0, latencyMs: 0, heygen: heygenDefaults(), blotato: blotatoDefaults() };
  let baseUrl = '';

  const count = (svc) => s.calls.filter((c) => c.svc === svc).length;
  const takeFault = (name) => {
    const f = s.faults[name];
    if (!f || f.times <= 0) return null;
    f.times -= 1;
    return f;
  };
  const nowIso = () => {
    s.lastMs = Math.max(s.lastMs + 1, Date.now());
    return new Date(s.lastMs).toISOString();
  };

  function validateFields(fields, creating) {
    for (const [k, v] of Object.entries(fields)) {
      if (!FIELDS.has(k)) return { error: 'UNKNOWN_FIELD_NAME', message: `Unknown field name: "${k}"` };
      if (COMPUTED.includes(k)) return { error: 'INVALID_VALUE_FOR_COLUMN', message: `Field "${k}" cannot accept a value because the field is computed` };
      if (v === null || v === '') continue;
      if (SELECTS[k] && !SELECTS[k].includes(v)) return { error: 'INVALID_MULTIPLE_CHOICE_OPTIONS', message: `Insufficient permissions to create new select option "${v}"` };
      if (NUMBERS.includes(k) && typeof v !== 'number') return { error: 'INVALID_VALUE_FOR_COLUMN', message: `Field ${k} cannot accept the provided value` };
      if (k === 'ExtractionDone' && typeof v !== 'boolean') return { error: 'INVALID_VALUE_FOR_COLUMN', message: 'Field ExtractionDone must be boolean' };
    }
    if (creating && !fields.ReelKey) return { error: 'INVALID_VALUE_FOR_COLUMN', message: 'ReelKey required' };
    return null;
  }

  function applyFields(rec, fields) {
    for (const [k, v] of Object.entries(fields)) {
      if (v === null || v === '') delete rec.fields[k];
      else rec.fields[k] = v;
    }
    rec.fields.ModifiedTime = nowIso();
  }

  function splitTop(str) {
    const parts = [];
    let depth = 0;
    let q = false;
    let cur = '';
    for (const ch of str) {
      if (ch === "'") q = !q;
      if (!q && ch === '(') depth++;
      if (!q && ch === ')') depth--;
      if (!q && depth === 0 && ch === ',') { parts.push(cur); cur = ''; } else cur += ch;
    }
    parts.push(cur);
    return parts;
  }

  function compileFormula(f) {
    const t = f.trim();
    const fn = /^(AND|OR)\((.*)\)$/s.exec(t);
    if (fn) {
      const subs = splitTop(fn[2]).map(compileFormula);
      return (r) => (fn[1] === 'AND' ? subs.every((x) => x(r)) : subs.some((x) => x(r)));
    }
    const m = /^\{(\w+)\}\s*=\s*'((?:[^'\\]|\\.)*)'$/.exec(t);
    if (!m) throw new Error('INVALID_FILTER_BY_FORMULA');
    return (r) => String(r.fields[m[1]] === undefined ? '' : r.fields[m[1]]) === m[2];
  }

  const send = (res, status, body, headers = {}) => {
    const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
    res.writeHead(status, { 'content-type': typeof body === 'string' || Buffer.isBuffer(body) ? 'text/plain' : 'application/json', ...headers });
    res.end(payload);
  };
  const airtableErr = (res, status, error, message) => send(res, status, { error: { type: error, message } });

  function airtable(req, res, url, body) {
    s.calls.push({ svc: 'airtable', method: req.method, path: url.pathname, body });
    if (req.headers.authorization !== TOKENS.airtable) return airtableErr(res, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    const m = /^\/v0\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/.exec(url.pathname);
    if (!m || decodeURIComponent(m[2]) !== TABLE) return airtableErr(res, 404, 'TABLE_NOT_FOUND', 'Table not found');
    const id = m[3];
    if (!id && req.method === 'GET') {
      const f = takeFault('airtable.list');
      if (f) return send(res, f.status, { error: { type: 'FAULT', message: 'injected' } });
      let rows = [...s.records.values()];
      const formula = url.searchParams.get('filterByFormula');
      if (formula) {
        try { const pred = compileFormula(formula); rows = rows.filter(pred); } catch (e) { return airtableErr(res, 422, 'INVALID_FILTER_BY_FORMULA', formula); }
      }
      const sf = url.searchParams.get('sort[0][field]');
      if (sf) {
        const dir = url.searchParams.get('sort[0][direction]') === 'desc' ? -1 : 1;
        rows.sort((a, b) => dir * (String(a.fields[sf] || a.createdTime).localeCompare(String(b.fields[sf] || b.createdTime)) || a.id.localeCompare(b.id)));
      }
      const max = Number(url.searchParams.get('maxRecords') || 0);
      if (max) rows = rows.slice(0, max);
      // Airtable pages at 100 rows (pageSize may lower it) and hands back an opaque offset token.
      const pageSize = Math.min(100, Number(url.searchParams.get('pageSize') || 100) || 100);
      const start = Number(/^itr(\d+)$/.exec(url.searchParams.get('offset') || '')?.[1] || 0);
      const page = rows.slice(start, start + pageSize);
      return send(res, 200, start + pageSize < rows.length ? { records: page, offset: 'itr' + (start + pageSize) } : { records: page });
    }
    if (!id && req.method === 'POST') {
      const f = takeFault('airtable.create');
      if (f) return send(res, f.status, { error: { type: 'FAULT', message: 'injected' } });
      const fields = body && body.fields;
      if (!fields || typeof fields !== 'object') return airtableErr(res, 422, 'INVALID_REQUEST_BODY', 'fields required');
      const bad = validateFields(fields, true);
      if (bad) return airtableErr(res, 422, bad.error, bad.message);
      const rec = { id: 'rec' + String(++s.seq).padStart(8, '0') + 'X', createdTime: nowIso(), fields: {} };
      applyFields(rec, fields);
      rec.fields.CreatedTime = rec.createdTime;
      s.records.set(rec.id, rec);
      return send(res, 200, rec);
    }
    const rec = s.records.get(id);
    if (!rec) return airtableErr(res, 404, 'NOT_FOUND', 'Record not found');
    if (req.method === 'GET') return send(res, 200, rec);
    if (req.method === 'DELETE') { s.records.delete(id); return send(res, 200, { id, deleted: true }); }
    if (req.method === 'PATCH') {
      const fields = body && body.fields;
      if (!fields || typeof fields !== 'object') return airtableErr(res, 422, 'INVALID_REQUEST_BODY', 'fields required');
      const bad = validateFields(fields, false);
      if (bad) return airtableErr(res, 422, bad.error, bad.message);
      applyFields(rec, fields);
      return send(res, 200, rec);
    }
    return airtableErr(res, 405, 'METHOD_NOT_ALLOWED', req.method);
  }

  function apifyItem(sc, inputUrl) {
    const item = {
      inputUrl, id: '3' + sc.length, type: 'Video', shortCode: sc, caption: 'Morning routine tips', hashtags: [], url: `https://www.instagram.com/reel/${sc}/`,
      commentsCount: 10, videoUrl: `${baseUrl}/media/video/${sc}.mp4`, audioUrl: `${baseUrl}/media/audio/${sc}.mp3`, videoDuration: 28,
      ownerUsername: 'sourcecreator', productType: 'clips', transcript: BASE_TRANSCRIPT,
    };
    if (sc.includes('NOTRANSSHORT')) { delete item.transcript; item.caption = 'Cool reel'; }
    else if (sc.includes('NOTRANS')) { delete item.transcript; item.caption = 'Morning routine tips that helped me stay consistent with workouts and focus every day'; }
    if (sc.includes('LONGVID')) item.videoDuration = 999;
    if (sc.includes('NOMEDIA')) { delete item.videoUrl; delete item.audioUrl; }
    if (sc.includes('MISMATCH')) item.shortCode = 'OTHER12345';
    for (const marker of ['COPYCAT', 'BADJSON', 'RETRYONCE', 'REFUSAL']) {
      if (sc.includes(marker)) item.transcript = `${BASE_TRANSCRIPT} MOCKLLM_${marker}`;
    }
    return item;
  }

  function apify(req, res, url, body) {
    s.calls.push({ svc: 'apify', method: req.method, path: url.pathname, body });
    if (req.headers.authorization !== TOKENS.apify) return send(res, 401, { error: { type: 'user-or-token-not-found', message: 'User was not found or authentication token is not valid' } });
    if (url.pathname === '/v2/users/me' && req.method === 'GET') {
      const pf = takeFault('apify.probe');
      if (pf) return send(res, pf.status, { error: { type: 'FAULT', message: 'injected' } });
      return send(res, 200, { data: { username: 'mock-apify-user' } });
    }
    if (url.pathname !== '/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items' || req.method !== 'POST') return send(res, 404, { error: { type: 'record-not-found' } });
    const f = takeFault('apify');
    if (f) return send(res, f.status, { error: { type: 'FAULT', message: 'injected' } });
    const target = body && Array.isArray(body.username) ? body.username[0] : null;
    const m = target && /^https:\/\/www\.instagram\.com\/reel\/([A-Za-z0-9_-]+)\/$/.exec(target);
    if (!m) return send(res, 400, { error: { type: 'invalid-input', message: 'username must contain a reel URL' } });
    if (m[1].includes('PRIVATE')) return send(res, 201, []);
    return send(res, 201, [apifyItem(m[1], target)]);
  }

  function chat(req, res, body) {
    s.chatRequests.push(body);
    const f = takeFault('openai.chat');
    if (f) return send(res, f.status, { error: { message: 'injected', type: 'fault' } });
    const rf = body && body.response_format;
    if (!body || !body.model || !Array.isArray(body.messages) || !rf || rf.type !== 'json_schema' || !rf.json_schema || rf.json_schema.strict !== true) {
      return send(res, 400, { error: { message: 'Invalid request: response_format.json_schema.strict required', type: 'invalid_request_error' } });
    }
    const prompt = body.messages.map((m) => m.content).join('\n');
    const retrying = prompt.includes('Fix these problems');
    const wrap = (message, finish = 'stop') => send(res, 200, { id: 'chatcmpl-mock', object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', ...message }, finish_reason: finish }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } });
    if (prompt.includes('MOCKLLM_REFUSAL')) return wrap({ content: null, refusal: 'I cannot help with that.' });
    if (prompt.includes('MOCKLLM_BADJSON')) return wrap({ content: 'Sure! Here is your script: not json' });
    if (prompt.includes('MOCKLLM_COPY')) return wrap({ content: JSON.stringify({ ...GOOD, script: `${BASE_TRANSCRIPT} `.repeat(3).trim() }) });
    if (prompt.includes('MOCKLLM_RETRYONCE') && !retrying) return wrap({ content: JSON.stringify({ ...GOOD, script: 'Too short.' }) });
    return wrap({ content: JSON.stringify(GOOD) });
  }

  function openai(req, res, url, body, raw) {
    s.calls.push({ svc: 'openai', method: req.method, path: url.pathname });
    if (req.headers.authorization !== TOKENS.openai) return send(res, 401, { error: { message: 'Incorrect API key provided', type: 'invalid_request_error' } });
    if (url.pathname === '/v1/models' && req.method === 'GET') {
      const pf = takeFault('openai.probe');
      if (pf) return send(res, pf.status, { error: { message: 'injected', type: 'fault' } });
      return send(res, 200, { object: 'list', data: [{ id: 'gpt-4o-mini', object: 'model' }] });
    }
    if (url.pathname === '/v1/chat/completions' && req.method === 'POST') return chat(req, res, body);
    if (url.pathname === '/v1/audio/transcriptions' && req.method === 'POST') {
      const f = takeFault('openai.stt');
      if (f) return send(res, f.status, { error: { message: 'injected', type: 'fault' } });
      const text = raw.toString('latin1');
      if (!String(req.headers['content-type']).startsWith('multipart/form-data') || !text.includes('name="file"') || !text.includes('name="model"')) {
        return send(res, 400, { error: { message: 'multipart file and model required', type: 'invalid_request_error' } });
      }
      s.sttRequests.push({ bytes: raw.length });
      return send(res, 200, { text: 'This is a spoken transcript produced by the mock speech to text service about building a simple morning routine' });
    }
    return send(res, 404, { error: { message: 'unknown route' } });
  }

  function heygenView(v) {
    const base = { id: v.id, video_id: v.id, status: 'waiting', title: v.body.title };
    if (v.polls === 0) return base;
    if (v.outcome === 'never' || v.polls < v.pollsToFinish) return { ...base, status: 'processing' };
    if (v.outcome === 'fail') return { ...base, status: 'failed', failure_code: 'avatar_unavailable', failure_message: 'Avatar is not available for rendering' };
    return { ...base, status: 'completed', video_url: `https://cdn.mock-heygen.invalid/video/${v.id}.mp4`, thumbnail_url: `https://cdn.mock-heygen.invalid/thumb/${v.id}.jpg`, duration: v.duration };
  }

  function heygen(req, res, url, body) {
    s.calls.push({ svc: 'heygen', method: req.method, path: url.pathname, idempotencyKey: req.headers['idempotency-key'], body });
    const err = (status, code, message) => send(res, status, { error: { code, message } });
    if (req.headers['x-api-key'] !== TOKENS.heygen) return err(401, 'unauthorized', 'Invalid API key');
    const h = s.heygen;
    if (url.pathname === '/v3/users/me' && req.method === 'GET') {
      const pf = takeFault('heygen.probe');
      if (pf) return err(pf.status, 'fault', 'injected');
      return send(res, 200, { data: { username: 'mock-heygen-user', billing_type: 'wallet' } });
    }
    if (url.pathname === '/v3/avatars/looks' && req.method === 'GET') {
      const f = takeFault('heygen.options');
      if (f) return err(f.status, 'fault', 'injected');
      return send(res, 200, { data: MOCK_AVATARS, has_more: false, next_token: null });
    }
    if (url.pathname === '/v3/models/audio/voices' && req.method === 'GET') {
      const f = takeFault('heygen.options');
      if (f) return err(f.status, 'fault', 'injected');
      const type = url.searchParams.get('type');
      return send(res, 200, { data: MOCK_VOICES.filter((v) => (type === 'private' ? v.mode === 'private' : v.mode !== 'private')), has_more: false, next_token: null });
    }
    if (url.pathname === '/v3/videos' && req.method === 'POST') {
      const f = takeFault('heygen.create');
      if (f) return err(f.status, 'fault', 'injected');
      const b = body || {};
      const bad = [];
      if (b.type !== 'avatar') bad.push('type');
      for (const k of ['avatar_id', 'voice_id', 'script']) if (typeof b[k] !== 'string' || !b[k]) bad.push(k);
      if (!['16:9', '9:16'].includes(b.aspect_ratio)) bad.push('aspect_ratio');
      if (b.resolution !== undefined && !['720p', '1080p', '4k'].includes(b.resolution)) bad.push('resolution');
      if (bad.length) return err(400, 'invalid_parameter', 'Invalid: ' + bad.join(', '));
      const key = req.headers['idempotency-key'];
      if (key !== undefined && !/^[A-Za-z0-9_\-:.]{1,255}$/.test(key)) return err(400, 'invalid_parameter', 'Idempotency-Key format');
      if (key && h.idem.has(key)) return send(res, 200, { data: { video_id: h.idem.get(key).id, status: 'waiting' } });
      const v = { id: 'vid_' + String(h.videos.size + 1).padStart(4, '0'), body: b, polls: 0, outcome: h.outcome, pollsToFinish: h.pollsToFinish, duration: h.duration, key };
      h.videos.set(v.id, v);
      if (key) h.idem.set(key, v);
      const lost = takeFault('heygen.create.lost');
      if (lost) return err(lost.status, 'fault', 'job created but the response was lost');
      return send(res, 200, { data: { video_id: v.id, status: 'waiting' } });
    }
    const m = /^\/v3\/videos\/([^/]+)$/.exec(url.pathname);
    if (m && req.method === 'GET') {
      const f = takeFault('heygen.poll');
      if (f) return err(f.status, 'fault', 'injected');
      const v = h.videos.get(m[1]);
      if (!v) return err(404, 'not_found', 'Video not found');
      v.polls += 1;
      return send(res, 200, { data: heygenView(v) });
    }
    return err(404, 'not_found', 'unknown route');
  }

  // Blotato (shapes from the published OpenAPI): POST /v2/media, POST /v2/posts (no idempotency key), GET /v2/posts/{id}.
  function blotato(req, res, url, body) {
    s.calls.push({ svc: 'blotato', method: req.method, path: url.pathname, body });
    const err = (status, message, extra) => send(res, status, { message, ...(extra || {}) });
    const faulty = (name) => {
      const f = takeFault(name);
      if (!f) return false;
      err(f.status, 'injected', f.status === 403 ? { subscriptionStatus: 'inactive', action: 'upgrade' } : {});
      return true;
    };
    if (req.headers['blotato-api-key'] !== TOKENS.blotato) return err(401, 'Invalid API key');
    const b = s.blotato;
    const isHttps = (u) => typeof u === 'string' && /^https:\/\/[^/]+\//.test(u);
    if (url.pathname === '/v2/users/me/accounts' && req.method === 'GET') {
      if (faulty('blotato.probe')) return null;
      return send(res, 200, { items: [{ id: 'acc_mock_1', platform: 'instagram', fullname: 'Mock Brand', username: '@mock_brand' }, { id: 'acc_mock_tt', platform: 'tiktok', fullname: 'Mock Brand', username: '@mock_brand' }].filter((a) => !url.searchParams.get('platform') || a.platform === url.searchParams.get('platform')) });
    }
    if (url.pathname === '/v2/media' && req.method === 'POST') {
      if (faulty('blotato.media')) return null;
      if (!body || !isHttps(body.url)) return err(422, 'url must be a public https URL');
      const id = 'media_' + String(b.media.size + 1).padStart(4, '0');
      const rec = { id, source: body.url, url: `https://mock-blotato.test/media/${id}.mp4` };
      b.media.set(rec.url, rec);
      return send(res, 201, { url: rec.url, id });
    }
    if (url.pathname === '/v2/posts' && req.method === 'POST') {
      if (faulty('blotato.post')) return null;
      const p = body && body.post;
      const bad = [];
      if (!p || typeof p.accountId !== 'string' || !p.accountId) bad.push('post.accountId');
      const c = p && p.content;
      if (!c || typeof c.text !== 'string' || c.platform !== 'instagram') bad.push('post.content');
      else if (!Array.isArray(c.mediaUrls) || !c.mediaUrls.length || !c.mediaUrls.every((u) => b.media.has(u))) bad.push('post.content.mediaUrls (must be Blotato-hosted media)');
      const t = p && p.target;
      if (!t || t.targetType !== 'instagram' || !['reel', 'story', 'image', 'carousel'].includes(t.mediaType)) bad.push('post.target');
      if (bad.length) return err(422, 'Validation failed: ' + bad.join(', '));
      const rec = { id: 'sub_' + String(b.posts.size + 1).padStart(4, '0'), body, polls: 0, outcome: b.outcome, pollsToFinish: b.pollsToFinish };
      b.posts.set(rec.id, rec);
      const lost = takeFault('blotato.post.lost');
      if (lost) return err(lost.status, 'post was created but the response was lost');
      return send(res, 201, { postSubmissionId: rec.id });
    }
    const m = /^\/v2\/posts\/([^/]+)$/.exec(url.pathname);
    if (m && req.method === 'GET') {
      if (faulty('blotato.status')) return null;
      const p = b.posts.get(m[1]);
      if (!p) return err(404, 'Post submission not found');
      p.polls += 1;
      const base = { postSubmissionId: p.id };
      if (p.outcome === 'never' || p.polls < p.pollsToFinish) return send(res, 200, { ...base, status: 'in-progress' });
      if (p.outcome === 'fail') return send(res, 200, { ...base, status: 'failed', errorMessage: 'Instagram rejected the media' });
      return send(res, 200, { ...base, status: 'published', publicUrl: `https://www.instagram.com/reel/MOCK${p.id.slice(4)}/` });
    }
    return err(404, 'unknown route');
  }

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      const raw = Buffer.concat(chunks);
      const url = new URL(req.url, 'http://mock');
      let body = null;
      if (String(req.headers['content-type'] || '').includes('application/json') && raw.length) {
        try { body = JSON.parse(raw.toString('utf8')); } catch (e) { return send(res, 400, { error: { message: 'invalid json' } }); }
      }
      if (s.latencyMs) await new Promise((r) => setTimeout(r, Math.random() * s.latencyMs));
      try {
        if (url.pathname.startsWith('/v0/')) return airtable(req, res, url, body);
        if (url.pathname.startsWith('/v2/acts/') || url.pathname === '/v2/users/me') return apify(req, res, url, body);
        if (url.pathname === '/v2/media' || url.pathname.startsWith('/v2/posts') || url.pathname === '/v2/users/me/accounts') return blotato(req, res, url, body);
        if (url.pathname.startsWith('/v1/')) return openai(req, res, url, body, raw);
        if (url.pathname.startsWith('/v3/')) return heygen(req, res, url, body);
        if (url.pathname.startsWith('/media/audio/')) {
          s.calls.push({ svc: 'media', method: req.method, path: url.pathname });
          const f = takeFault('media.audio');
          if (f) return send(res, f.status, 'injected');
          return send(res, 200, Buffer.alloc(2048, 1), { 'content-type': 'audio/mpeg' });
        }
        if (url.pathname === '/notify' && req.method === 'POST') {
          s.calls.push({ svc: 'notify', method: 'POST', path: '/notify' });
          const f = takeFault('notify');
          if (f) return send(res, f.status, { error: 'injected' });
          s.notifications.push(body);
          return send(res, 200, { ok: true });
        }
        return send(res, 404, { error: 'not found' });
      } catch (e) {
        return send(res, 500, { error: String(e && e.message) });
      }
    });
  });

  return {
    state: s,
    count,
    records: () => [...s.records.values()],
    reset() {
      s.records.clear(); s.calls.length = 0; s.faults = {}; s.notifications.length = 0; s.chatRequests.length = 0; s.sttRequests.length = 0; s.seq = 0; s.latencyMs = 0; s.heygen = heygenDefaults(); s.blotato = blotatoDefaults();
    },
    fault(name, status, times = 1) { s.faults[name] = { status, times }; },
    listen: (port = 0) => new Promise((resolve) => server.listen(port, '127.0.0.1', () => { baseUrl = `http://127.0.0.1:${server.address().port}`; resolve(baseUrl); })),
    close: () => new Promise((resolve) => { server.closeAllConnections && server.closeAllConnections(); server.close(resolve); }),
    get url() { return baseUrl; },
  };
}

if (require.main === module) {
  const m = createMock();
  m.listen(Number(process.env.MOCK_PORT || 4010)).then((u) => console.log('mock services listening on ' + u + ' (synthetic data only)'));
}

module.exports = { createMock, TOKENS, GOOD, BASE_TRANSCRIPT };
