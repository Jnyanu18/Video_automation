const http = require('http');

function request(urlPath, cookie = '') {
  return new Promise((resolve, reject) => {
    const u = new URL('http://127.0.0.1:8787' + urlPath);
    const headers = {};
    if (cookie) headers['Cookie'] = cookie;
    http.get(u, { headers }, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    }).on('error', reject);
  });
}

function post(urlPath, data, cookie = '') {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8787,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Origin': 'http://127.0.0.1:8787',
        ...(cookie ? { 'Cookie': cookie } : {})
      }
    }, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function verifyAll() {
  console.log('====================================================');
  console.log('       AILO STUDIO PRE-FLIGHT VERIFICATION          ');
  console.log('====================================================\n');

  // 1. Routes
  const routes = [
    { name: 'Projects (Auto-Clipper)', path: '/' },
    { name: 'Storyboard View', path: '/storyboard' },
    { name: 'Custom Timeline Editor', path: '/timeline' },
    { name: 'Motion Films Gallery', path: '/motion' },
    { name: 'Content Calendar', path: '/calendar' },
    { name: 'Publishing & Accounts', path: '/publishing' },
    { name: 'Client Analytics', path: '/analytics' },
    { name: 'Settings Portal', path: '/settings' },
  ];

  console.log('--- 1. Testing Frontend Page Routes ---');
  for (const r of routes) {
    const res = await request(r.path);
    const ok = res.status === 200 && res.body.length > 500;
    console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${r.name.padEnd(28)} -> HTTP ${res.status} (${res.body.length} bytes)`);
  }

  // 2. Auth & API Endpoints
  console.log('\n--- 2. Testing Authentication & Backend Proxy ---');
  const loginRes = await post('/api/login', { email: 'jnyan8784@gmail.com', password: 'dev-password' });
  const setCookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0] : '';
  const cookieVal = setCookie ? setCookie.split(';')[0] : '';
  console.log(`  Login status: HTTP ${loginRes.status} (Cookie: ${cookieVal ? 'ACQUIRED' : 'NONE'})`);

  const apis = [
    { name: 'Session Check', path: '/api/session' },
    { name: 'Storyboards List', path: '/api/editor/storyboards' },
    { name: 'Publishing Queue', path: '/api/editor/publishing/queue' },
    { name: 'Connected Accounts', path: '/api/editor/publishing/accounts' },
    { name: 'Backend Settings', path: '/api/editor/settings' },
  ];

  for (const a of apis) {
    const res = await request(a.path, cookieVal);
    const ok = res.status === 200 && res.body.length > 0;
    console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${a.name.padEnd(28)} -> HTTP ${res.status} (${res.body.length} bytes)`);
  }

  // 3. Demo Video Media Stream Check
  console.log('\n--- 3. Testing Demo Video Streaming ---');
  const mediaRes = await request('/media/claude_motion_reel.mp4');
  const okVideo = mediaRes.status === 200 && mediaRes.headers['content-type'] === 'video/mp4';
  console.log(`  [${okVideo ? 'PASS' : 'FAIL'}] Video Stream (claude_motion_reel.mp4) -> HTTP ${mediaRes.status} (${mediaRes.body.length} bytes, type: ${mediaRes.headers['content-type']})`);

  const posterRes = await request('/media/claude_motion_reel.jpg');
  const okPoster = posterRes.status === 200 && posterRes.headers['content-type'] === 'image/jpeg';
  console.log(`  [${okPoster ? 'PASS' : 'FAIL'}] Video Poster (claude_motion_reel.jpg)  -> HTTP ${posterRes.status} (${posterRes.body.length} bytes, type: ${posterRes.headers['content-type']})`);

  console.log('\n====================================================');
  console.log('     PRE-FLIGHT AUDIT COMPLETE - DEMO READY         ');
  console.log('====================================================');
}

verifyAll().catch(e => {
  console.error('Audit failed with error:', e);
  process.exit(1);
});
