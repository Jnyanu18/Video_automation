'use strict';
// Shared helpers for setup-local.cjs and start-all.cjs.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env.local');
const N8N_DIR = path.join(ROOT, 'runtime', 'n8n');
const N8N_BIN = path.join(N8N_DIR, 'node_modules', 'n8n', 'bin', 'n8n');
const N8N_HOME = path.join(ROOT, 'runtime', 'n8n-data'); // N8N_USER_FOLDER: n8n stores its own .n8n folder inside this

function parseEnv(text) {
  const out = {};
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
  return out;
}

function loadEnv() {
  return fs.existsSync(ENV_FILE) ? parseEnv(fs.readFileSync(ENV_FILE, 'utf8')) : {};
}

// Variables a child process needs: our .env.local layered over the current environment.
function childEnv(extra) {
  return Object.assign({}, process.env, loadEnv(), extra || {});
}

module.exports = { ROOT, ENV_FILE, N8N_DIR, N8N_BIN, N8N_HOME, parseEnv, loadEnv, childEnv };
