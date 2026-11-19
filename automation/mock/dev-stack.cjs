'use strict';
// Local development stack: mock providers + simulated n8n (runs the real generated workflows) + the dashboard backend.
// Nothing here talks to a real service and nothing can publish to Instagram. Do not use in production.
const os = require('os');
const path = require('path');
const fs = require('fs');
const { createMock } = require('./mock-server.cjs');
const { createSimN8n } = require('./sim-n8n-server.cjs');
const { loadConfig } = require('../server/config.cjs');
const { createApp } = require('../server/app.cjs');

const PASSWORD = process.env.DEV_PASSWORD || 'dev-password';

async function main() {
  const mock = createMock();
  const mockUrl = await mock.listen(Number(process.env.DEV_MOCK_PORT) || 0);
  const sim = createSimN8n({ mockUrl, waitScale: Number(process.env.DEV_WAIT_SCALE) || 0.2 });
  const simUrl = await sim.listen(Number(process.env.DEV_N8N_PORT) || 0);
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reels-dev-uploads-'));
  const cfg = loadConfig({
    PORT: process.env.PORT || '8787', HOST: '127.0.0.1', DASHBOARD_PASSWORD: PASSWORD, SESSION_SECRET: 'dev-session-secret-dev-session-secret-0000',
    N8N_WEBHOOK_BASE: simUrl, N8N_INTAKE_TOKEN: sim.tokens.intake, N8N_APPROVAL_TOKEN: sim.tokens.approval, N8N_INTERNAL_TOKEN: sim.tokens.internal,
    AIRTABLE_BASE_URL: mockUrl, AIRTABLE_BASE_ID: 'appSIM', AIRTABLE_TABLE: 'Reels', AIRTABLE_READ_TOKEN: 'sim-airtable',
    PUBLIC_BASE_URL: process.env.DEV_PUBLIC_BASE_URL || 'https://reels.example.test', UPLOAD_DIR: uploadDir,
    WEB_DIR: process.env.WEB_DIR || path.join(__dirname, '..', 'web', 'dist'), COOKIE_SECURE: 'false',
    LIVE_POLL_ACTIVE_MS: '1500', LIVE_POLL_IDLE_MS: '4000', ...Object.fromEntries(Object.entries(sim.env).filter(([k]) => /^(MIN|MAX)_/.test(k))),
  });
  cfg.problems.forEach((p) => console.error('[config] ' + p));
  if (cfg.problems.length) process.exit(1);
  const app = createApp(cfg);
  const addr = await app.listen();
  console.log(`Dev stack ready (mock providers only)\n  Dashboard API: http://${addr.address}:${addr.port}\n  Password: ${PASSWORD}\n  Mock Airtable/providers: ${mockUrl}\n  Simulated n8n: ${simUrl}`);
  const stop = async () => {
    await app.close();
    await sim.close();
    await mock.close();
    fs.rmSync(uploadDir, { recursive: true, force: true });
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
