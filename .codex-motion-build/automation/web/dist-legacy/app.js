/* Reels Automation dashboard. Plain JS, no build step. Talks only to the backend /api (see docs/backend-api.md). */
(function () {
  'use strict';

  var state = { csrf: null, user: null, es: null, refresh: null, options: null };
  var appEl = document.getElementById('app');

  // ---------- helpers ----------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) return c.forEach(function (x) { add(el, x); });
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function toast(msg, bad) {
    var t = h('div', { class: 'toast' + (bad ? ' bad' : '') }, msg);
    document.getElementById('toasts').appendChild(t);
    setTimeout(function () { t.remove(); }, bad ? 7000 : 3500);
  }
  function when(iso) { if (!iso) return ''; var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString(); }
  function badgeClass(s) {
    if (s === 'PUBLISHED' || s === 'VIDEO_COMPLETED' || s === 'connected') return 'b-ok';
    if (s === 'FAILED' || s === 'REJECTED' || s === 'error') return 'b-bad';
    if (s === 'AWAITING_APPROVAL' || s === 'unconfigured') return 'b-warn';
    return 'b-info';
  }
  function badge(s) { return h('span', { class: 'badge ' + badgeClass(s) }, String(s || '').replace(/_/g, ' ').toLowerCase()); }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  async function api(method, path, body, raw) {
    var headers = {};
    if (method !== 'GET') headers['X-CSRF-Token'] = state.csrf || '';
    var opts = { method: method, headers: headers, credentials: 'same-origin' };
    if (raw) { opts.body = raw.body; Object.assign(headers, raw.headers); }
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    var res, data;
    try { res = await fetch(path, opts); } catch (e) { throw apiErr(0, 'NETWORK', 'Cannot reach the server'); }
    try { data = await res.json(); } catch (e) { data = {}; }
    if (res.status === 401 && data.error === 'UNAUTHENTICATED') { state.user = null; showLogin(); throw apiErr(401, 'UNAUTHENTICATED', 'Signed out'); }
    if (!res.ok || data.ok === false) throw apiErr(res.status, data.error || 'ERROR', data.message || data.error || ('HTTP ' + res.status), data);
    return data;
  }
  function apiErr(status, code, message, data) { var e = new Error(message); e.status = status; e.code = code; e.data = data || {}; return e; }
  function errText(e) {
    var extra = e.data && e.data.errors && e.data.errors.length ? ': ' + e.data.errors.map(function (x) { return x.message || x; }).join('; ') : '';
    return e.message + extra;
  }
  async function act(btn, fn, okMsg) {
    if (btn) btn.disabled = true;
    try { var r = await fn(); if (okMsg) toast(okMsg); return r; }
    catch (e) { toast(errText(e), true); }
    finally { if (btn) btn.disabled = false; }
  }

  // ---------- session / live ----------
  async function boot() {
    try {
      var s = await api('GET', '/api/session');
      if (s.authenticated) { state.user = s.user; state.csrf = s.csrfToken; return startApp(); }
    } catch (e) { /* fall through */ }
    showLogin();
  }
  function showLogin() {
    stopLive();
    clear(appEl);
    var pw = h('input', { type: 'password', autocomplete: 'current-password', required: true });
    var nm = h('input', { type: 'text', autocomplete: 'name', placeholder: 'optional' });
    var err = h('div', { class: 'err' });
    var btn = h('button', { class: 'primary', type: 'submit' }, 'Sign in');
    var form = h('form', { class: 'card', onsubmit: async function (ev) {
      ev.preventDefault(); err.textContent = ''; btn.disabled = true;
      try {
        var r = await api('POST', '/api/login', { password: pw.value, name: nm.value || undefined });
        state.user = r.user; state.csrf = r.csrfToken; startApp();
      } catch (e) { err.textContent = errText(e); } finally { btn.disabled = false; }
    } }, h('h1', null, 'Reels Automation'),
      h('label', null, 'Password'), pw, h('label', null, 'Your name'), nm, h('div', { class: 'row', style: 'margin-top:14px' }, btn), err);
    appEl.appendChild(h('div', { class: 'login' }, form));
  }
  function startApp() { startLive(); render(); }
  function startLive() {
    stopLive();
    if (!window.EventSource) return;
    var es = new EventSource('/api/events');
    var go = debounce(function () { if (state.refresh) state.refresh(); }, 400);
    ['hello', 'reel', 'summary'].forEach(function (n) { es.addEventListener(n, go); });
    state.es = es;
  }
  function stopLive() { if (state.es) state.es.close(); state.es = null; }

  // ---------- shell + router ----------
  var NAV = [['#/', 'Dashboard'], ['#/reels', 'Reels'], ['#/new', 'New reel'], ['#/settings', 'Settings']];
  function route() { var p = (location.hash || '#/').split('?')[0]; return p; }
  function render() {
    if (!state.user) return;
    state.refresh = null;
    var main = h('main');
    var cur = route();
    var nav = NAV.map(function (n) {
      var on = n[0] === '#/' ? cur === '#/' : cur.indexOf(n[0]) === 0;
      return h('a', { href: n[0], class: on ? 'active' : '' }, n[1]);
    });
    clear(appEl);
    appEl.appendChild(h('div', { class: 'shell' },
      h('nav', { class: 'side' }, h('div', { class: 'brand' }, 'Reels Automation'), nav, h('div', { class: 'spacer' }),
        h('div', { class: 'who' }, state.user.name || 'user'),
        h('a', { href: '#', onclick: async function (ev) { ev.preventDefault(); try { await api('POST', '/api/logout', {}); } catch (e) { /* ignore */ } state.user = null; showLogin(); } }, 'Sign out')),
      main));
    var m = /^#\/reels\/(.+)$/.exec(cur);
    if (m) return viewReel(main, decodeURIComponent(m[1]));
    if (cur === '#/reels') return viewReels(main);
    if (cur === '#/new') return viewNew(main);
    if (cur === '#/settings') return viewSettings(main);
    return viewDashboard(main);
  }
  window.addEventListener('hashchange', render);

  // ---------- dashboard ----------
  var TILES = [['submitted', 'Submitted', ''], ['awaitingApproval', 'Awaiting approval', 'AWAITING_APPROVAL'], ['generating', 'Generating', ''],
    ['readyToPublish', 'Ready to publish', 'VIDEO_COMPLETED'], ['published', 'Published', 'PUBLISHED'], ['failed', 'Failed', 'FAILED'], ['rejected', 'Rejected', 'REJECTED']];
  function viewDashboard(main) {
    var body = h('div', null, h('p', { class: 'muted' }, 'Loading…'));
    main.appendChild(h('h1', null, 'Dashboard')); main.appendChild(body);
    async function load() {
      try {
        var s = await api('GET', '/api/summary');
        clear(body);
        if (s.stuck) body.appendChild(h('div', { class: 'banner' }, s.stuck + ' record(s) look stuck. Open them and use Retry or Resume.'));
        body.appendChild(h('div', { class: 'tiles' }, TILES.map(function (t) {
          return h('a', { class: 'tile', href: t[2] ? '#/reels?status=' + t[2] : '#/reels' }, h('b', null, s.totals[t[0]] || 0), h('span', null, t[1]));
        })));
        body.appendChild(h('div', { class: 'card' }, h('h2', null, 'Recent activity'),
          s.recent && s.recent.length ? reelTable(s.recent.map(function (r) { return { id: r.id, title: r.title, sourceType: r.sourceType, status: r.status, updatedAt: r.at, error: r.error }; }))
            : h('p', { class: 'muted' }, 'Nothing yet. Submit a reel from "New reel".')));
      } catch (e) { clear(body); body.appendChild(h('p', { class: 'err' }, errText(e))); }
    }
    state.refresh = load; load();
  }

  function reelTable(items) {
    return h('table', null, h('thead', null, h('tr', null, ['Title', 'Source', 'Status', 'Updated'].map(function (c) { return h('th', null, c); }))),
      h('tbody', null, items.map(function (r) {
        return h('tr', { class: 'click', onclick: function () { location.hash = '#/reels/' + encodeURIComponent(r.id); } },
          h('td', null, r.title || '(untitled)', r.error ? h('div', { class: 'err' }, String(r.error).slice(0, 120)) : null),
          h('td', null, r.sourceType || ''), h('td', null, badge(r.status), r.stuck ? h('span', { class: 'badge b-warn', style: 'margin-left:6px' }, 'stuck') : null), h('td', null, when(r.updatedAt)));
      })));
  }

  // ---------- reels list ----------
  var STATUSES = ['SUBMITTED', 'AWAITING_APPROVAL', 'APPROVED', 'VIDEO_COMPLETED', 'PUBLISHED', 'FAILED', 'REJECTED'];
  function viewReels(main) {
    var q = new URLSearchParams((location.hash.split('?')[1]) || '');
    var f = { status: q.get('status') || '', source: '', q: '', page: 1 };
    var statusSel = h('select', { onchange: function () { f.status = statusSel.value; f.page = 1; load(); } },
      h('option', { value: '' }, 'All statuses'), STATUSES.map(function (s) { return h('option', { value: s, selected: s === f.status }, s.replace(/_/g, ' ').toLowerCase()); }));
    var srcSel = h('select', { onchange: function () { f.source = srcSel.value; f.page = 1; load(); } },
      h('option', { value: '' }, 'All sources'), h('option', { value: 'reel' }, 'Reel URL'), h('option', { value: 'upload' }, 'Upload'));
    var search = h('input', { type: 'search', placeholder: 'Search…', oninput: debounce(function () { f.q = search.value; f.page = 1; load(); }, 350) });
    var list = h('div');
    main.appendChild(h('h1', null, 'Reels'));
    main.appendChild(h('div', { class: 'row', style: 'margin-bottom:12px' }, statusSel, srcSel, h('div', { class: 'grow' }, search)));
    main.appendChild(h('div', { class: 'card' }, list));
    async function load() {
      var p = new URLSearchParams({ page: f.page, pageSize: 20 });
      if (f.status) p.set('status', f.status); if (f.source) p.set('source', f.source); if (f.q) p.set('q', f.q);
      try {
        var r = await api('GET', '/api/reels?' + p);
        clear(list);
        if (!r.items.length) return list.appendChild(h('p', { class: 'muted' }, 'No reels match.'));
        list.appendChild(reelTable(r.items));
        list.appendChild(h('div', { class: 'pager' }, h('span', { class: 'muted' }, r.total + ' total' + (r.truncated ? ' (history truncated)' : '')),
          h('button', { disabled: f.page <= 1, onclick: function () { f.page--; load(); } }, 'Prev'), h('span', null, 'Page ' + r.page + ' / ' + r.pages),
          h('button', { disabled: f.page >= r.pages, onclick: function () { f.page++; load(); } }, 'Next')));
      } catch (e) { clear(list); list.appendChild(h('p', { class: 'err' }, errText(e))); }
    }
    state.refresh = load; load();
  }

  // ---------- reel detail ----------
  function viewReel(main, id) {
    var body = h('div', null, h('p', { class: 'muted' }, 'Loading…'));
    main.appendChild(h('p', null, h('a', { href: '#/reels' }, '← All reels'))); main.appendChild(body);
    var editing = false;
    async function load() {
      if (editing) return; // do not clobber unsaved edits on live updates
      try { draw((await api('GET', '/api/reels/' + encodeURIComponent(id))).reel); }
      catch (e) { clear(body); body.appendChild(h('p', { class: 'err' }, errText(e))); }
    }
    function draw(r) {
      clear(body);
      var c = r.content || {}, src = r.source || {}, A = r.actions || {};
      var script = h('textarea', { rows: 6 }, c.script || ''), caption = h('textarea', null, c.caption || ''),
        overlay = h('input', { value: c.overlay || '' }), tags = h('input', { value: (c.hashtags || []).join(' ') });
      [script, caption, overlay, tags].forEach(function (el) { el.addEventListener('input', function () { editing = true; }); });
      var note = h('input', { placeholder: 'Reason (rejecting) or note (regenerating)' });
      function fp() { return r.fingerprint; }
      function post(action, extra, msg) {
        return act(null, async function () {
          var res = await api('POST', '/api/reels/' + encodeURIComponent(id) + '/' + action, Object.assign({ expectedFingerprint: fp() }, extra || {}));
          editing = false; await load(); return res;
        }, msg).catch(function () { return load(); });
      }
      function actBtn(key, label, cls, handler) {
        var a = A[key] || { allowed: false, reason: 'Not available' };
        return h('button', { class: cls || '', disabled: !a.allowed, title: a.allowed ? '' : (a.reason || ''), onclick: handler }, label);
      }
      body.appendChild(h('div', { class: 'row', style: 'margin-bottom:12px' }, h('h1', { style: 'margin:0' }, r.title || '(untitled)'), badge(r.status), r.busy ? h('span', { class: 'badge b-info' }, 'working') : null));
      if (r.error) body.appendChild(h('div', { class: 'card err' }, r.error));
      body.appendChild(h('div', { class: 'card' }, h('h2', null, 'Progress'),
        h('div', { class: 'steps' }, (r.progress || []).map(function (s) { return h('span', { class: 'step ' + s.state }, s.label); }))));
      var vid = r.video || {};
      var vurl = vid.previewUrl || vid.url;
      body.appendChild(h('div', { class: 'grid2' },
        h('div', { class: 'card' }, h('h2', null, 'Source'),
          r.reelUrl ? h('p', null, h('a', { href: r.reelUrl, target: '_blank', rel: 'noopener noreferrer' }, r.reelUrl)) : null,
          h('p', { class: 'muted' }, [src.owner ? '@' + src.owner : '', src.duration ? Math.round(src.duration) + 's' : '', r.niche || '', r.brandVoice || ''].filter(Boolean).join(' · ')),
          src.transcript ? h('pre', { class: 'blk' }, src.transcript) : h('p', { class: 'muted' }, 'No transcript yet.')),
        h('div', { class: 'card' }, h('h2', null, 'Video'),
          vurl ? h('video', { src: vurl, controls: true, preload: 'metadata' }) : h('p', { class: 'muted' }, vid.status ? 'Video: ' + vid.status : 'No video yet.'),
          r.publishedUrl ? h('p', null, h('a', { href: r.publishedUrl, target: '_blank', rel: 'noopener noreferrer' }, 'View on Instagram')) : null)));
      body.appendChild(h('div', { class: 'card' }, h('h2', null, 'Generated content'),
        h('label', null, 'Script'), script, h('label', null, 'Caption'), caption, h('label', null, 'On-screen overlay'), overlay, h('label', null, 'Hashtags (space separated)'), tags,
        h('div', { class: 'row', style: 'margin-top:12px' }, (function () {
          var b = actBtn('edit', 'Save edits', '', function () {
            act(b, async function () {
              var res = await api('POST', '/api/reels/' + encodeURIComponent(id) + '/edit', { expectedFingerprint: fp(), script: script.value, caption: caption.value, overlay: overlay.value,
                hashtags: tags.value.split(/[\s,]+/).filter(Boolean).map(function (t) { return t.charAt(0) === '#' ? t : '#' + t; }) });
              editing = false; await load(); return res;
            }, 'Saved');
          });
          return b;
        })())));
      body.appendChild(h('div', { class: 'card' }, h('h2', null, 'Actions'), h('div', { class: 'row' },
        actBtn('approve', 'Approve', 'primary', function () { post('approve', {}, 'Approved'); }),
        actBtn('reject', 'Reject', 'danger', function () { post('reject', { reason: note.value }, 'Rejected'); }),
        actBtn('regenerate', 'Regenerate', '', function () { post('regenerate', note.value ? { note: note.value } : {}, 'Regenerating'); }),
        actBtn('publish', 'Publish to Instagram', 'primary', function () { if (confirm('Publish this reel to Instagram now?')) post('publish', {}, 'Publishing requested'); }),
        actBtn('retry', 'Retry', '', function () { act(null, function () { return api('POST', '/api/reels/' + encodeURIComponent(id) + '/retry', {}).then(load); }, 'Retrying'); }),
        actBtn('resume', 'Resume', '', function () { act(null, function () { return api('POST', '/api/reels/' + encodeURIComponent(id) + '/resume', {}).then(load); }, 'Resuming'); })),
        h('label', null, 'Reason / note'), note,
        r.approval && r.approval.maxRegenerations != null ? h('p', { class: 'muted' }, 'Regenerations used: ' + (r.approval.regenerations || 0) + ' / ' + r.approval.maxRegenerations) : null));
      if (r.errors && r.errors.length) body.appendChild(h('div', { class: 'card' }, h('h2', null, 'Error history'),
        r.errors.map(function (e) { return h('p', { class: 'err' }, typeof e === 'string' ? e : [e.at ? when(e.at) : '', e.stage || '', e.message || e.code || ''].filter(Boolean).join(' · ')); })));
    }
    state.refresh = load; load();
  }

  // ---------- new reel ----------
  async function getOptions() {
    if (state.options) return state.options;
    try { state.options = await api('GET', '/api/options'); } catch (e) { toast(errText(e), true); state.options = { avatars: [], voices: [], presets: {} }; }
    return state.options;
  }
  function viewNew(main) {
    main.appendChild(h('h1', null, 'New reel'));
    var mode = 'url', host = h('div'), tabs = h('div', { class: 'tabs' }), noAvatar = false, probed = false;
    function tabBtn(k, label) { return h('button', { class: mode === k ? 'on' : '', onclick: function () { mode = k; draw(); } }, label); }
    main.appendChild(tabs); main.appendChild(host);
    async function draw() {
      clear(tabs); tabs.appendChild(tabBtn('url', 'From reel URL')); tabs.appendChild(tabBtn('upload', 'Upload video'));
      clear(host); host.appendChild(h('p', { class: 'muted' }, 'Loading…'));
      if (!probed) {
        probed = true;
        try {
          var st = await api('GET', '/api/settings');
          var hg = st.workflows && st.workflows.integrations && st.workflows.integrations.heygen;
          if (hg && hg.status !== 'connected') { noAvatar = true; mode = 'upload'; clear(tabs); tabs.appendChild(tabBtn('url', 'From reel URL')); tabs.appendChild(tabBtn('upload', 'Upload video')); }
        } catch (e) { /* settings unavailable: keep defaults */ }
      }
      var o = await getOptions();
      clear(host);
      if (noAvatar && mode === 'url') host.appendChild(h('div', { class: 'banner' }, 'AI avatar video (HeyGen) is not enabled. A reel URL will be scraped and rewritten, but it cannot be turned into a video. Use "Upload video" to publish your own video.'));
      var niche = h('input', { list: 'niches', placeholder: 'e.g. fitness' }), voice = h('input', { list: 'voices', placeholder: 'e.g. friendly expert' }), notes = h('textarea', { rows: 2 });
      var presets = o.presets || {};
      var lists = [h('datalist', { id: 'niches' }, (presets.niches || []).map(function (n) { return h('option', { value: n.value || n }); })),
        h('datalist', { id: 'voices' }, (presets.brandVoices || []).map(function (n) { return h('option', { value: n.value || n }); }))];
      var common = [h('label', null, 'Niche'), niche, h('label', null, 'Brand voice'), voice, h('label', null, 'Brand voice notes'), notes, lists];
      function vals() { var v = {}; if (niche.value) v.niche = niche.value; if (voice.value) v.brandVoice = voice.value; if (notes.value) v.brandVoiceNotes = notes.value; return v; }
      var done = function (r) { if (r.duplicate) toast('Already submitted'); location.hash = '#/reels/' + encodeURIComponent(r.recordId); };
      if (mode === 'url') {
        var url = h('input', { type: 'url', placeholder: 'https://www.instagram.com/reel/…', required: true });
        var av = h('select', null, h('option', { value: '' }, 'Default avatar'), (o.avatars || []).map(function (a) { return h('option', { value: a.id }, a.name || a.id); }));
        var vo = h('select', null, h('option', { value: '' }, 'Default voice'), (o.voices || []).map(function (a) { return h('option', { value: a.id }, (a.name || a.id) + (a.language ? ' (' + a.language + ')' : '')); }));
        var btn = h('button', { class: 'primary', type: 'submit' }, 'Submit');
        host.appendChild(h('form', { class: 'card', onsubmit: function (ev) {
          ev.preventDefault();
          var body = Object.assign({ url: url.value.trim() }, vals()); if (av.value) body.avatarId = av.value; if (vo.value) body.voiceId = vo.value;
          act(btn, function () { return api('POST', '/api/reels', body).then(done); });
        } }, h('label', null, 'Instagram reel URL'), url, common, h('label', null, 'Avatar'), av, h('label', null, 'Voice'), vo,
          o.hasMoreAvatars || o.hasMoreVoices ? h('p', { class: 'muted' }, 'Only the first page of avatars/voices is listed.') : null,
          (o.warnings || []).map(function (w) { return h('p', { class: 'muted' }, String(w)); }), h('div', { class: 'row', style: 'margin-top:14px' }, btn)));
      } else {
        var file = h('input', { type: 'file', accept: 'video/mp4,video/quicktime' }), prog = h('div', { class: 'muted' }), staged = null;
        var cap = h('textarea', { rows: 4 }), ov = h('input'), tg = h('input', { placeholder: '#tag1 #tag2' });
        var up = h('button', { type: 'button', onclick: function () { upload(); } }, 'Upload file');
        var sub = h('button', { class: 'primary', type: 'submit', disabled: true }, 'Submit for approval');
        function upload() {
          var f = file.files[0]; if (!f) return toast('Choose a video first', true);
          up.disabled = true; staged = null; sub.disabled = true;
          var x = new XMLHttpRequest(); x.open('POST', '/api/uploads');
          x.setRequestHeader('Content-Type', f.type || 'video/mp4'); x.setRequestHeader('X-File-Name', encodeURIComponent(f.name)); x.setRequestHeader('X-CSRF-Token', state.csrf);
          x.upload.onprogress = function (e) { if (e.lengthComputable) prog.textContent = 'Uploading ' + Math.round(100 * e.loaded / e.total) + '%'; };
          x.onload = function () {
            up.disabled = false; var d = {}; try { d = JSON.parse(x.responseText); } catch (e) { /* ignore */ }
            if (x.status === 201 && d.upload) { staged = d.upload; prog.textContent = 'Uploaded ' + staged.fileName + ' (' + Math.round(staged.durationSeconds) + 's)'; sub.disabled = false; }
            else { prog.textContent = ''; toast(d.message || d.error || ('Upload failed (' + x.status + ')'), true); }
          };
          x.onerror = function () { up.disabled = false; prog.textContent = ''; toast('Upload failed', true); };
          x.send(f);
        }
        host.appendChild(h('form', { class: 'card', onsubmit: function (ev) {
          ev.preventDefault(); if (!staged) return;
          var body = Object.assign({ uploadId: staged.uploadId, caption: cap.value, overlay: ov.value || undefined,
            hashtags: tg.value.split(/[\s,]+/).filter(Boolean).map(function (t) { return t.charAt(0) === '#' ? t : '#' + t; }) }, vals());
          act(sub, function () { return api('POST', '/api/reels/upload', body).then(done); });
        } }, h('label', null, 'Video (mp4 / mov)'), h('div', { class: 'row' }, h('div', { class: 'grow' }, file), up), prog,
          h('label', null, 'Caption'), cap, h('label', null, 'On-screen overlay (optional)'), ov, h('label', null, 'Hashtags'), tg, common,
          h('div', { class: 'row', style: 'margin-top:14px' }, sub)));
      }
    }
    draw();
  }

  // ---------- settings ----------
  function viewSettings(main) {
    var body = h('div', null, h('p', { class: 'muted' }, 'Checking integrations…'));
    main.appendChild(h('h1', null, 'Settings')); main.appendChild(body);
    async function load(fresh) {
      try {
        var s = await api('GET', '/api/settings' + (fresh ? '?refresh=1' : ''));
        clear(body);
        var w = s.workflows || {}, ints = w.integrations || {}, b = s.backend || {};
        if (w.ok === false) body.appendChild(h('div', { class: 'banner' }, 'Workflow layer: ' + (w.error || 'unavailable') + (w.message ? ' – ' + w.message : '')));
        var rows = Object.keys(ints).map(function (k) {
          var i = ints[k] || {};
          return h('tr', null, h('td', null, k), h('td', null, badge(i.status)), h('td', null, i.message || '', i.missing && i.missing.length ? h('div', { class: 'muted' }, 'Missing: ' + i.missing.join(', ')) : null,
            i.account && (i.account.username || i.account.name || i.account.id) ? h('div', { class: 'muted' }, 'Instagram: ' + (i.account.username || i.account.name || i.account.id)) : null));
        });
        body.appendChild(h('div', { class: 'card' }, h('div', { class: 'row' }, h('h2', { style: 'margin:0' }, 'Integrations'),
          h('button', { onclick: function () { load(true); } }, 'Re-check')),
          rows.length ? h('table', null, h('thead', null, h('tr', null, ['Service', 'Status', 'Details'].map(function (c) { return h('th', null, c); }))), h('tbody', null, rows)) : h('p', { class: 'muted' }, 'No data.')));
        body.appendChild(h('div', { class: 'card' }, h('h2', null, 'Backend'),
          h('pre', { class: 'blk' }, JSON.stringify(b, null, 2))));
      } catch (e) { clear(body); body.appendChild(h('p', { class: 'err' }, errText(e))); }
    }
    state.refresh = null; load(false);
  }

  boot();
})();
