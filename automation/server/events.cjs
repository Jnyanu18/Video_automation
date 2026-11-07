'use strict';
// Record cache plus Server-Sent Events hub. The server polls Airtable (which has no push) only while at least one
// dashboard is connected, and pushes changes to browsers, so browsers never poll.
const core = require('../lib/core.js');

function createStore(cfg, airtable) {
  let cache = null;
  let inflight = null;

  async function load() {
    const r = await airtable.listAll();
    cache = { records: r.records, truncated: r.truncated, at: Date.now() };
    return cache;
  }

  async function list(opts) {
    const force = !!(opts && opts.force);
    if (!force && cache && Date.now() - cache.at < cfg.cacheMs) return cache;
    if (inflight && !force) return inflight;
    if (inflight && force) await inflight.catch(() => null);
    if (!inflight) inflight = load().finally(() => { inflight = null; });
    return inflight;
  }

  return { list, invalidate: () => { cache = null; } };
}

const signature = (rec) => {
  const f = rec.fields || {};
  return [f.Status, f.ModifiedTime, f.LastActionAt, f.HeyGenStatus, f.PublishStatus, f.PollAttempts, f.PublishPollAttempts, f.RetryCount].join('|');
};

function createHub(cfg, store) {
  const clients = new Set();
  const MAX_CLIENTS = 20;
  let timer = null;
  let beat = null;
  let known = null;
  let failures = 0;
  let running = false;
  let again = false;

  const write = (res, event, data) => {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      clients.delete(res);
    }
  };
  const broadcast = (event, data) => clients.forEach((res) => write(res, event, data));

  async function tick() {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      const l = await store.list({ force: true });
      const next = new Map(l.records.map((r) => [r.id, signature(r)]));
      if (known) {
        const changed = [];
        next.forEach((sig, id) => {
          if (!known.has(id)) changed.push({ id, kind: 'new' });
          else if (known.get(id) !== sig) changed.push({ id, kind: 'changed' });
        });
        known.forEach((sig, id) => { if (!next.has(id)) changed.push({ id, kind: 'removed' }); });
        if (changed.length) {
          const byId = new Map(l.records.map((r) => [r.id, r]));
          changed.forEach((c) => {
            const rec = byId.get(c.id);
            broadcast('reel', Object.assign(c, rec ? { status: rec.fields.Status } : {}));
          });
          broadcast('summary', { changed: changed.length });
        }
      }
      known = next;
      if (failures) broadcast('connection', { ok: true });
      failures = 0;
    } catch (e) {
      failures += 1;
      if (failures === 1) broadcast('connection', { ok: false, code: e.code || 'AIRTABLE_ERROR' });
    } finally {
      running = false;
      if (again) {
        again = false;
        setImmediate(() => tick());
      }
    }
  }

  function nextDelay() {
    const active = known && [...known.values()].some((s) => core.IN_PROGRESS_STATES.concat(['SUBMITTED', 'APPROVED', 'CONTENT_GENERATED', 'READY_TO_PUBLISH']).some((st) => s.startsWith(st + '|')));
    const base = active ? cfg.pollActiveMs : cfg.pollIdleMs;
    return failures ? Math.min(base * (1 + failures * 2), 120000) : base;
  }

  function loop() {
    timer = null;
    if (!clients.size) return;
    tick().finally(() => {
      if (clients.size && !timer) timer = setTimeout(loop, nextDelay());
    });
  }

  function start() {
    if (!timer && clients.size) timer = setTimeout(loop, 0);
    if (!beat) beat = setInterval(() => clients.forEach((res) => { try { res.write(': ping\n\n'); } catch (e) { clients.delete(res); } }), 25000);
  }

  function stopIfIdle() {
    if (clients.size) return;
    if (timer) clearTimeout(timer);
    if (beat) clearInterval(beat);
    timer = null;
    beat = null;
    known = null;
    failures = 0;
  }

  function add(req, res) {
    if (clients.size >= MAX_CLIENTS) return false;
    res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    res.write('retry: 5000\n\n');
    clients.add(res);
    write(res, 'hello', { ok: true });
    const done = () => {
      clients.delete(res);
      stopIfIdle();
    };
    req.on('close', done);
    res.on('error', done);
    start();
    return true;
  }

  // Called after a write through n8n so the dashboard sees the change without waiting for the next poll.
  function poke() {
    store.invalidate();
    if (clients.size) {
      const t = setTimeout(() => tick(), 1500);
      if (t.unref) t.unref();
    }
  }

  function close() {
    clients.forEach((res) => { try { res.end(); } catch (e) { /* closing */ } });
    clients.clear();
    stopIfIdle();
  }

  return { add, poke, close, size: () => clients.size };
}

module.exports = { createStore, createHub };
