'use strict';
const { loadConfig } = require('./config.cjs');
const { createApp } = require('./app.cjs');

const cfg = loadConfig(process.env);
cfg.warnings.forEach((w) => console.warn('[config] ' + w));
if (cfg.problems.length) {
  cfg.problems.forEach((p) => console.error('[config] ' + p));
  process.exit(1);
}
const app = createApp(cfg);
app.listen().then((addr) => console.log(`Dashboard backend listening on http://${addr.address}:${addr.port}`));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => app.close().then(() => process.exit(0)));
