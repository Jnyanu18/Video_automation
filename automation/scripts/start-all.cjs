'use strict';
// Starts n8n, the Postiz adapter (when configured) and the dashboard backend with .env.local. Ctrl+C stops all of them.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { ROOT, ENV_FILE, N8N_BIN, N8N_HOME, loadEnv, childEnv } = require('./lib.cjs');

if (!fs.existsSync(ENV_FILE)) { console.error('No .env.local. Run: npm run setup:local'); process.exit(1); }
const env = loadEnv();
const procs = [];

function start(name, args, extraEnv, cwd, cmd) {
  const p = spawn(cmd || process.execPath, args, { cwd: cwd || ROOT, env: childEnv(extraEnv), stdio: ['ignore', 'pipe', 'pipe'] });
  const tag = '[' + name + '] ';
  const pipe = (s, out) => s.on('data', (d) => String(d).split(/\r?\n/).filter(Boolean).forEach((l) => out.write(tag + l + '\n')));
  pipe(p.stdout, process.stdout); pipe(p.stderr, process.stderr);
  p.on('exit', (c) => { console.log(tag + 'exited ' + c); if (!stopping) shutdown(1); });
  procs.push(p);
  return p;
}

let stopping = false;
function shutdown(code) { stopping = true; procs.forEach((p) => { try { p.kill(); } catch (e) { /* gone */ } }); setTimeout(() => process.exit(code || 0), 500); }
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

if (fs.existsSync(N8N_BIN)) {
  start('n8n', [N8N_BIN, 'start'], { N8N_USER_FOLDER: N8N_HOME, N8N_HOST: '127.0.0.1', N8N_PORT: env.N8N_PORT || '5678', N8N_DIAGNOSTICS_ENABLED: 'false', N8N_PERSONALIZATION_ENABLED: 'false' });
} else console.warn('n8n not installed (npm run n8n:install). Starting without it.');

if (env.PUBLISH_ADAPTER === 'postiz') {
  if (env.POSTIZ_API_URL && env.POSTIZ_API_KEY) start('postiz-adapter', [path.join(ROOT, 'adapters', 'postiz', 'index.cjs')], { ADAPTER_PORT: '8790' });
  else console.warn('PUBLISH_ADAPTER=postiz but POSTIZ_API_URL/POSTIZ_API_KEY are empty; publishing will report an error until you fill them in .env.local.');
}
// MoneyPrinterTurbo itself (Python), when MPT_DIR points at its checkout with a .venv (uv sync). Skipped if it is already running elsewhere.
const mptPy = env.MPT_DIR && path.join(env.MPT_DIR, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python');
if (mptPy && fs.existsSync(mptPy)) start('mpt', ['main.py'], {}, env.MPT_DIR, mptPy);
if (env.MPT_API_KEY) start('mpt-adapter', [path.join(ROOT, 'adapters', 'mpt', 'index.cjs')], {});
else console.warn('MPT_API_KEY is empty; video generation will report an error until MoneyPrinterTurbo is configured in .env.local.');
start('public-media', [path.join(ROOT, 'scripts', 'public-media.cjs')], {});
start('backend', [path.join(ROOT, 'server', 'index.cjs')], {});
setTimeout(() => console.log('\nDashboard: http://127.0.0.1:' + (env.PORT || 8787) + '   n8n editor: http://127.0.0.1:' + (env.N8N_PORT || 5678)), 1500);
