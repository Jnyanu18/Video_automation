'use strict';
// Cloud production/demo stack for Render and container deployments.
// Combines simulated n8n workflow engine, mock providers, and the GrowthOS dashboard backend.
// Binds to 0.0.0.0 on the dynamically assigned platform $PORT (Render defaults to 10000).

const os = require('os');
const path = require('path');
const fs = require('fs');
const { createMock } = require('../mock/mock-server.cjs');
const { createSimN8n } = require('../mock/sim-n8n-server.cjs');
const { loadConfig } = require('./config.cjs');
const { createApp } = require('./app.cjs');
const { createUsers } = require('./users.cjs');

const PASSWORD = process.env.DASHBOARD_PASSWORD || process.env.DEV_PASSWORD || 'dev-password';
const PORT = process.env.PORT || '10000';
const HOST = '0.0.0.0';

async function main() {
  console.log(`[cloud-stack] Initializing GrowthOS Cloud Server on ${HOST}:${PORT}...`);

  // Ensure directories exist
  const uploadDir = process.env.UPLOAD_DIR || '/tmp/storage';
  const usersDir = process.env.EDITOR_USERS_DIR || '/tmp/users';
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(usersDir, { recursive: true });

  // Ensure users.json exists and is seeded with verified active accounts
  const usersFile = process.env.USERS_FILE || path.join(uploadDir, 'users.json');
  const seedFile = path.join(__dirname, 'seed-users.json');
  if (!fs.existsSync(usersFile) && fs.existsSync(seedFile)) {
    try {
      fs.copyFileSync(seedFile, usersFile);
      console.log('[cloud-stack] Initialized users from seed-users.json');
    } catch (_) {}
  }
  const userMgr = createUsers({ usersFile, uploadDir });
  
  if (userMgr.count() === 0) {
    console.log('[cloud-stack] No users found in users.json — seeding default accounts...');
    try {
      userMgr.create('jnyan8784@gmail.com', 'dev-password', 'Jnyan');
      userMgr.create('demo@example.com', 'dev-password', 'Demo User');
      console.log('[cloud-stack] Successfully seeded jnyan8784@gmail.com & demo@example.com (password: dev-password)');
    } catch (err) {
      console.error('[cloud-stack] Error seeding users:', err.message);
    }
  } else {
    // Ensure the passwords for standard accounts match dev-password
    try { userMgr.setPassword('jnyan8784@gmail.com', 'dev-password'); } catch (_) {}
    try { userMgr.setPassword('demo@example.com', 'dev-password'); } catch (_) {}
  }

  // 1. Start mock provider server on loopback
  const mock = createMock();
  const mockUrl = await mock.listen(Number(process.env.DEV_MOCK_PORT) || 0);

  // 2. Start simulated n8n workflow engine on loopback
  const sim = createSimN8n({ mockUrl, waitScale: Number(process.env.DEV_WAIT_SCALE) || 0.2 });
  const simUrl = await sim.listen(Number(process.env.DEV_N8N_PORT) || 0);

  // 3. Load dashboard backend configuration
  const publicBase = process.env.PUBLIC_BASE_URL || (process.env.RENDER_EXTERNAL_URL || `http://${HOST}:${PORT}`);
  const cfg = loadConfig({
    PORT: PORT,
    HOST: HOST,
    DASHBOARD_PASSWORD: PASSWORD,
    SESSION_SECRET: process.env.SESSION_SECRET || 'growthos-cloud-session-secret-32-chars-long-secure-key',
    USERS_FILE: usersFile,
    UPLOAD_DIR: uploadDir,
    EDITOR_USERS_DIR: usersDir,
    EDITOR_URL: process.env.EDITOR_URL || 'http://127.0.0.1:8793',
    N8N_WEBHOOK_BASE: simUrl,
    N8N_INTAKE_TOKEN: sim.tokens.intake,
    N8N_APPROVAL_TOKEN: sim.tokens.approval,
    N8N_INTERNAL_TOKEN: sim.tokens.internal,
    AIRTABLE_BASE_URL: mockUrl,
    AIRTABLE_BASE_ID: 'appSIM',
    AIRTABLE_TABLE: 'Reels',
    AIRTABLE_READ_TOKEN: 'sim-airtable',
    PUBLIC_BASE_URL: publicBase,
    WEB_DIR: process.env.WEB_DIR || path.join(__dirname, '..', 'web', 'dist'),
    COOKIE_SECURE: process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE : 'false',
    TRUST_PROXY: 'true',
    LIVE_POLL_ACTIVE_MS: '2000',
    LIVE_POLL_IDLE_MS: '5000',
    ...Object.fromEntries(Object.entries(sim.env).filter(([k]) => /^(MIN|MAX)_/.test(k))),
  });

  if (cfg.problems && cfg.problems.length > 0) {
    console.error('[cloud-stack] Configuration problems:');
    cfg.problems.forEach((p) => console.error('  - ' + p));
    process.exit(1);
  }

  // 4. Create and start HTTP app
  const app = createApp(cfg);
  const addr = await app.listen();
  console.log(`\n======================================================`);
  console.log(` GrowthOS Cloud Server is LIVE on http://${HOST}:${addr.port}`);
  console.log(` Operator Account: jnyan8784@gmail.com`);
  console.log(` Fallback Password: ${PASSWORD}`);
  console.log(` Web Root: ${cfg.webDir}`);
  console.log(` FastAPI Engine: ${cfg.editorUrl}`);
  console.log(`======================================================\n`);

  const stop = async () => {
    console.log('[cloud-stack] Stopping services...');
    await app.close().catch(() => {});
    await sim.close().catch(() => {});
    await mock.close().catch(() => {});
    process.exit(0);
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error('[cloud-stack] Fatal startup error:', err);
  process.exit(1);
});
