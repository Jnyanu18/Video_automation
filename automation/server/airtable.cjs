'use strict';
// Read-only Airtable client for the dashboard (list/get). All writes go through n8n webhooks, never from here.

class UpstreamError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function createAirtable(cfg, fetchImpl) {
  const f = fetchImpl || fetch;
  const a = cfg.airtable;
  const configured = () => !!(a.token && a.baseId && a.table);
  const url = (suffix) => `${a.baseUrl}/v0/${encodeURIComponent(a.baseId)}/${encodeURIComponent(a.table)}${suffix || ''}`;

  async function request(u) {
    if (!configured()) throw new UpstreamError(503, 'AIRTABLE_NOT_CONFIGURED', 'Airtable read access is not configured');
    let last;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await f(u, { headers: { authorization: 'Bearer ' + a.token }, signal: AbortSignal.timeout(15000) });
        if (res.status === 404) return { notFound: true };
        if (res.status === 401 || res.status === 403) throw new UpstreamError(502, 'AIRTABLE_AUTH_FAILED', 'Airtable rejected the read token');
        if (res.status === 429 || res.status >= 500) {
          last = new UpstreamError(502, 'AIRTABLE_UNAVAILABLE', 'Airtable returned HTTP ' + res.status);
          await wait(300 * attempt);
          continue;
        }
        if (!res.ok) throw new UpstreamError(502, 'AIRTABLE_ERROR', 'Airtable returned HTTP ' + res.status);
        return await res.json();
      } catch (e) {
        if (e instanceof UpstreamError && e.code !== 'AIRTABLE_UNAVAILABLE') throw e;
        last = e instanceof UpstreamError ? e : new UpstreamError(502, 'AIRTABLE_UNREACHABLE', 'Airtable could not be reached');
        await wait(300 * attempt);
      }
    }
    throw last;
  }

  async function listAll() {
    const records = [];
    let offset;
    let truncated = false;
    do {
      const q = new URLSearchParams({ pageSize: '100' });
      if (offset) q.set('offset', offset);
      const page = await request(url('?' + q.toString()));
      if (page.notFound) throw new UpstreamError(502, 'AIRTABLE_TABLE_NOT_FOUND', 'Airtable base or table not found');
      records.push(...(page.records || []));
      offset = page.offset;
      if (offset && records.length >= a.maxRecords) {
        truncated = true;
        break;
      }
    } while (offset);
    return { records, truncated };
  }

  async function get(id) {
    if (!/^rec[A-Za-z0-9]{6,30}$/.test(String(id))) return null;
    const r = await request(url('/' + id));
    return r.notFound ? null : r;
  }

  async function ping() {
    const r = await request(url('?pageSize=1'));
    if (r.notFound) throw new UpstreamError(502, 'AIRTABLE_TABLE_NOT_FOUND', 'Airtable base or table not found');
    return true;
  }

  return { configured, listAll, get, ping };
}

module.exports = { createAirtable, UpstreamError };
