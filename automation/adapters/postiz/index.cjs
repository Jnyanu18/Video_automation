'use strict';
// Starts the Postiz adapter. Env: POSTIZ_API_URL (e.g. http://localhost:5000/api/public/v1 or https://api.postiz.com/public/v1),
// POSTIZ_API_KEY, ADAPTER_PORT (8790), ADAPTER_TOKEN (must equal the "Blotato API Key" credential value in n8n),
// POSTIZ_STATUS_CACHE_SECONDS (60; Postiz limits listing to 30 requests/hour), MAX_UPLOAD_MB (100).
const { createPostizAdapter } = require('./adapter.cjs');

const apiUrl = process.env.POSTIZ_API_URL;
const apiKey = process.env.POSTIZ_API_KEY;
if (!apiUrl || !apiKey) {
  console.error('Set POSTIZ_API_URL and POSTIZ_API_KEY (see adapters/postiz/env.example).');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && !process.env.ADAPTER_TOKEN) {
  console.error('ADAPTER_TOKEN is required in production.');
  process.exit(1);
}
const port = Number(process.env.ADAPTER_PORT || 8790);
const { server } = createPostizAdapter({
  apiUrl, apiKey, token: process.env.ADAPTER_TOKEN || '',
  statusCacheSeconds: process.env.POSTIZ_STATUS_CACHE_SECONDS, maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 100),
});
server.listen(port, '127.0.0.1', () => console.log('Postiz adapter on http://127.0.0.1:' + port + ' -> ' + apiUrl));
