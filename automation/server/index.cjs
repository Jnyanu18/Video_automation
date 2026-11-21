'use strict';
const { loadConfig } = require('./config.cjs');
const { createApp } = require('./app.cjs');
const { loadEnvFiles } = require('./env.cjs');

// Layer any local env files under the real environment, so `npm run server` picks up
// server/.env. In Docker the values arrive as real env vars and these files are absent.
const { env, loaded } = loadEnvFiles(process.env);
loaded.forEach((f) => console.log('[config] loaded ' + f));
const cfg = loadConfig(env);
cfg.warnings.forEach((w) => console.warn('[config] ' + w));
if (cfg.problems.length) {
  cfg.problems.forEach((p) => console.error('[config] ' + p));
  process.exit(1);
}
const app = createApp(cfg);
app.listen().then((addr) => console.log(`Dashboard backend listening on http://${addr.address}:${addr.port}`));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => app.close().then(() => process.exit(0)));
