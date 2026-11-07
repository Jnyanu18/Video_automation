'use strict';
// Backend configuration. Every secret comes from the environment; nothing here is ever sent to the browser.
const path = require('path');
const crypto = require('crypto');
const core = require('../lib/core.js');

const strip = (u) => String(u || '').replace(/\/+$/, '');

function loadConfig(env) {
  env = env || process.env;
  const num = (v, d) => (v === undefined || v === '' || isNaN(Number(v)) ? d : Number(v));
  const problems = [];
  const warnings = [];
  const isProd = env.NODE_ENV === 'production';
  const publicBaseUrl = strip(env.PUBLIC_BASE_URL);

  let sessionSecret = env.SESSION_SECRET || '';
  if (sessionSecret.length < 32) {
    if (isProd) problems.push('SESSION_SECRET must be at least 32 characters in production');
    else {
      sessionSecret = crypto.randomBytes(32).toString('hex');
      warnings.push('SESSION_SECRET not set: using a random one (sessions end when the server restarts)');
    }
  }
  if (!env.DASHBOARD_PASSWORD_HASH && !env.DASHBOARD_PASSWORD) problems.push('Set DASHBOARD_PASSWORD_HASH (run: npm run hash-password -- "<password>")');
  if (env.DASHBOARD_PASSWORD && isProd) problems.push('DASHBOARD_PASSWORD (plain text) is not allowed in production; use DASHBOARD_PASSWORD_HASH');
  if (env.DASHBOARD_PASSWORD && !isProd) warnings.push('Using plain DASHBOARD_PASSWORD (development only)');
  if (publicBaseUrl && !/^https?:\/\/[^\s/]+$/.test(publicBaseUrl)) problems.push('PUBLIC_BASE_URL must be an origin such as https://reels.example.com');

  const cfg = {
    port: num(env.PORT, 8787),
    host: env.HOST || '127.0.0.1',
    isProd,
    passwordHash: env.DASHBOARD_PASSWORD_HASH || '',
    passwordPlain: isProd ? '' : env.DASHBOARD_PASSWORD || '',
    sessionSecret,
    sessionHours: num(env.SESSION_HOURS, 12),
    cookieSecure: env.COOKIE_SECURE !== undefined ? String(env.COOKIE_SECURE) === 'true' : publicBaseUrl.startsWith('https://'),
    n8n: {
      base: strip(env.N8N_WEBHOOK_BASE),
      tokens: { intake: env.N8N_INTAKE_TOKEN || '', approval: env.N8N_APPROVAL_TOKEN || '', internal: env.N8N_INTERNAL_TOKEN || '' },
      timeoutMs: num(env.N8N_TIMEOUT_MS, 45000),
    },
    airtable: {
      baseUrl: strip(env.AIRTABLE_BASE_URL) || 'https://api.airtable.com',
      baseId: env.AIRTABLE_BASE_ID || '',
      table: env.AIRTABLE_TABLE || 'Reels',
      token: env.AIRTABLE_READ_TOKEN || '',
      maxRecords: num(env.HISTORY_MAX_RECORDS, 2000),
    },
    publicBaseUrl,
    uploadDir: path.resolve(env.UPLOAD_DIR || path.join(__dirname, 'storage')),
    renderDir: path.resolve(env.RENDER_DIR || path.join(__dirname, '..', 'runtime', 'renders')),
    webDir: path.resolve(env.WEB_DIR || path.join(__dirname, '..', 'web', 'dist')),
    maxUploadBytes: Math.round(num(env.MAX_UPLOAD_MB, 100) * 1048576),
    cacheMs: num(env.RECORD_CACHE_MS, 4000),
    pollActiveMs: num(env.LIVE_POLL_ACTIVE_MS, 5000),
    pollIdleMs: num(env.LIVE_POLL_IDLE_MS, 20000),
    trustProxy: String(env.TRUST_PROXY) === 'true',
    core: core.cfgFromEnv(env),
    problems,
    warnings,
  };
  return cfg;
}

module.exports = { loadConfig };
