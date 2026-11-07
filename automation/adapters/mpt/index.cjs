'use strict';
// Starts the MoneyPrinterTurbo adapter on 127.0.0.1:8791. Env: MPT_URL (http://127.0.0.1:8080), MPT_API_KEY (the [app] api_key in
// MoneyPrinterTurbo's config.toml), ADAPTER_TOKEN (the value of the "HeyGen API Key" credential in n8n, header x-api-key),
// PUBLIC_BASE_URL (public https origin of the dashboard backend), RENDER_DIR (shared with the backend), MPT_VIDEO_SOURCE
// (pexels|pixabay|local), MPT_LOCAL_MATERIALS (comma separated file names in MoneyPrinterTurbo's storage/local_videos).
const path = require('path');
const { createMptAdapter } = require('./adapter.cjs');

const root = path.resolve(__dirname, '..', '..');
const apiKey = process.env.MPT_API_KEY;
if (!apiKey) { console.error('Set MPT_API_KEY (the [app] api_key from MoneyPrinterTurbo config.toml).'); process.exit(1); }
if (process.env.NODE_ENV === 'production' && !process.env.ADAPTER_TOKEN) { console.error('ADAPTER_TOKEN is required in production.'); process.exit(1); }
const port = Number(process.env.MPT_ADAPTER_PORT || 8791);
const { server } = createMptAdapter({
  mptUrl: process.env.MPT_URL, mptApiKey: apiKey, token: process.env.ADAPTER_TOKEN || '', publicBaseUrl: process.env.PUBLIC_BASE_URL,
  renderDir: process.env.RENDER_DIR || path.join(root, 'runtime', 'renders'), videoSource: process.env.MPT_VIDEO_SOURCE || 'pexels',
  voice: process.env.MPT_VOICE, localMaterials: String(process.env.MPT_LOCAL_MATERIALS || '').split(',').map((s) => s.trim()).filter(Boolean),
});
server.listen(port, '127.0.0.1', () => console.log('MoneyPrinterTurbo adapter on http://127.0.0.1:' + port));
