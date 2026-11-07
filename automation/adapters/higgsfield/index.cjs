'use strict';
// Starts the Higgsfield adapter on 127.0.0.1:8794. Env:
// HIGGSFIELD_API_KEY (KEY_ID:KEY_SECRET or API token)
// HIGGSFIELD_BASE_URL (defaults to https://api.higgsfield.ai)
// HIGGSFIELD_MODEL (defaults to kling-v3)
// HIGGSFIELD_DURATION (defaults to 5)
// ADAPTER_TOKEN (x-api-key expected from n8n / HeyGen caller)
// PUBLIC_BASE_URL (public https origin)
// RENDER_DIR (runtime/renders directory)
const path = require('path');
const { createHiggsfieldAdapter } = require('./adapter.cjs');

const root = path.resolve(__dirname, '..', '..');
const apiKey = process.env.HIGGSFIELD_API_KEY;
if (!apiKey) {
  console.warn('HIGGSFIELD_API_KEY is not set; Higgsfield adapter calls will fail authentication.');
}
const port = Number(process.env.HIGGSFIELD_ADAPTER_PORT || 8794);
const { server } = createHiggsfieldAdapter({
  apiKey: apiKey || '',
  baseUrl: process.env.HIGGSFIELD_BASE_URL || 'https://api.higgsfield.ai',
  model: process.env.HIGGSFIELD_MODEL || 'kling-v3',
  duration: Number(process.env.HIGGSFIELD_DURATION || 5),
  token: process.env.ADAPTER_TOKEN || '',
  publicBaseUrl: process.env.PUBLIC_BASE_URL,
  renderDir: process.env.RENDER_DIR || path.join(root, 'runtime', 'renders'),
});

server.listen(port, '127.0.0.1', () => console.log('Higgsfield adapter on http://127.0.0.1:' + port));
