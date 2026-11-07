'use strict';
// Calls the n8n webhooks. Tokens live only in this process; the browser never sees them or the n8n URL.

function createN8n(cfg, fetchImpl) {
  const f = fetchImpl || fetch;
  const n = cfg.n8n;

  const configured = (kind) => !!(n.base && n.tokens[kind]);

  async function call(kind, path, body) {
    if (!n.base) return { status: 503, body: { ok: false, error: 'N8N_NOT_CONFIGURED', message: 'N8N_WEBHOOK_BASE is not set' } };
    if (!n.tokens[kind]) return { status: 503, body: { ok: false, error: 'N8N_TOKEN_MISSING', message: 'The ' + kind + ' webhook token is not set' } };
    let res;
    try {
      res = await f(`${n.base}/webhook/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-Reels-Token': n.tokens[kind] },
        body: JSON.stringify(body || {}),
        signal: AbortSignal.timeout(n.timeoutMs),
      });
    } catch (e) {
      const timeout = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
      return { status: 502, body: { ok: false, error: timeout ? 'N8N_TIMEOUT' : 'N8N_UNREACHABLE', message: timeout ? 'n8n did not answer in time' : 'n8n could not be reached' } };
    }
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (e) {
      json = null;
    }
    if (res.status === 401 || res.status === 403) return { status: 502, body: { ok: false, error: 'N8N_AUTH_FAILED', message: 'n8n rejected the webhook token' } };
    if (res.status === 404 && (!json || !json.error)) return { status: 502, body: { ok: false, error: 'N8N_WORKFLOW_NOT_ACTIVE', message: 'Webhook "' + path + '" is not registered. Import and activate the workflows.' } };
    if (!json || typeof json !== 'object') return { status: 502, body: { ok: false, error: 'N8N_BAD_RESPONSE', message: 'n8n returned an unexpected response (HTTP ' + res.status + ')' } };
    return { status: res.status, body: json };
  }

  return { call, configured };
}

module.exports = { createN8n };
