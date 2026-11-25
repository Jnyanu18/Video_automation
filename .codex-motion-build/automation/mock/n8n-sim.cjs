'use strict';
// Minimal n8n-compatible runtime used to execute the generated workflow JSON against mock services.
// It is NOT n8n: it supports only the node types and expression forms the generated workflows use.
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

class Runner {
  constructor({ workflows, env, credentials, waitScale = 0.05, maxSteps = 3000 }) {
    this.env = env;
    this.creds = credentials;
    this.waitScale = waitScale;
    this.maxSteps = maxSteps;
    this.executions = [];
    this.pending = new Set();
    this.seq = 0;
    this.hooks = new Map();
    this.workflows = workflows;
    for (const wf of workflows) {
      for (const n of wf.nodes) {
        if (n.type === 'n8n-nodes-base.webhook') this.hooks.set(`${n.parameters.httpMethod} ${n.parameters.path}`, { wf, node: n });
      }
    }
  }

  track(p) {
    this.pending.add(p);
    p.finally(() => this.pending.delete(p)).catch(() => {});
    return p;
  }

  async idle() {
    while (this.pending.size) await Promise.allSettled([...this.pending]);
  }

  credHeader(name) {
    const c = this.creds[name];
    if (!c) throw new Error(`SIM: credential "${name}" not configured`);
    return c;
  }

  async handleWebhook(method, hookPath, { headers = {}, body = {}, query = {} } = {}) {
    const hook = this.hooks.get(`${method} ${hookPath}`);
    if (!hook) return { status: 404, body: { message: 'webhook not registered' } };
    const p = hook.node.parameters;
    if (p.authentication === 'headerAuth') {
      const cred = this.credHeader(hook.node.credentials.httpHeaderAuth.name);
      const got = Object.entries(headers).find(([k]) => k.toLowerCase() === cred.header.toLowerCase());
      if (!got || got[1] !== cred.value) return { status: 403, body: { message: 'Authorization data is wrong!' } };
    }
    const ex = { id: String(++this.seq), wf: hook.wf, outputs: {}, trace: [], error: null };
    ex.respond = new Promise((resolve) => { ex.resolveRespond = resolve; });
    const run = this.track(this.execute(ex, hook.node, [{ json: { headers, params: {}, query, body: clone(body) } }]));
    if (p.responseMode === 'onReceived') return { status: 200, body: { message: 'Workflow got started.' } };
    const first = await Promise.race([ex.respond, run.then(() => ({ status: 200, body: { message: 'Workflow executed successfully' } }), () => ({ status: 500, body: { message: 'Workflow execution failed' } }))]);
    return first;
  }

  async execute(ex, startNode, items) {
    const byName = Object.fromEntries(ex.wf.nodes.map((n) => [n.name, n]));
    const record = { workflow: ex.wf.name, id: ex.id, trace: ex.trace, error: null };
    this.executions.push(record);
    const queue = [{ name: startNode.name, items }];
    let steps = 0;
    try {
      while (queue.length) {
        if (++steps > this.maxSteps) throw new Error('SIM: max steps exceeded (loop?)');
        const { name, items: input } = queue.shift();
        const node = byName[name];
        ex.trace.push(name);
        let result;
        try {
          result = await this.runNode(ex, node, input);
        } catch (e) {
          e.nodeName = name;
          throw e;
        }
        ex.outputs[name] = result;
        const conns = (ex.wf.connections[name] && ex.wf.connections[name].main) || [];
        result.forEach((outItems, idx) => {
          if (!outItems || !outItems.length) return;
          for (const t of conns[idx] || []) queue.push({ name: t.node, items: outItems });
        });
      }
    } catch (e) {
      record.error = `${e.nodeName || '?'}: ${e.message}`;
      ex.resolveRespond({ status: 500, body: { message: 'Workflow execution failed', error: record.error } });
      throw e;
    }
  }

  ctxFor(ex, items, i) {
    const env = this.env;
    const nodeItems = (name) => {
      const out = ex.outputs[name];
      if (!out) throw new Error(`SIM: node "${name}" has not been executed`);
      return out[0] && out[0].length ? out[0] : out[1] || [];
    };
    const nodeFn = (name) => {
      const arr = nodeItems(name);
      return { first: () => arr[0], last: () => arr[arr.length - 1], all: () => arr, item: arr[0] };
    };
    const input = { all: () => items, first: () => items[0], last: () => items[items.length - 1] };
    return { $json: items[i] && items[i].json, $input: input, $env: env, $: nodeFn, $execution: { id: ex.id }, $itemIndex: i, $workflow: { name: ex.wf.name } };
  }

  evalExpr(str, ctx) {
    if (typeof str !== 'string' || !str.startsWith('=')) return str;
    const s = str.slice(1);
    const segs = [];
    let i = 0;
    for (;;) {
      const a = s.indexOf('{{', i);
      if (a < 0) { segs.push({ t: s.slice(i) }); break; }
      segs.push({ t: s.slice(i, a) });
      const b = s.indexOf('}}', a + 2);
      if (b < 0) throw new Error('SIM: unterminated expression ' + str);
      segs.push({ e: s.slice(a + 2, b) });
      i = b + 2;
    }
    const run = (expr) => new Function('$json', '$input', '$env', '$', '$execution', '$itemIndex', '$workflow', `return (${expr}\n);`)(ctx.$json, ctx.$input, ctx.$env, ctx.$, ctx.$execution, ctx.$itemIndex, ctx.$workflow);
    const exprs = segs.filter((x) => x.e !== undefined);
    if (exprs.length === 1 && segs.every((x) => x.e !== undefined || x.t.trim() === '')) return run(exprs[0].e);
    return segs.map((x) => (x.e !== undefined ? (v => (typeof v === 'object' ? JSON.stringify(v) : String(v)))(run(x.e)) : x.t)).join('');
  }

  async runNode(ex, node, items) {
    const p = node.parameters;
    switch (node.type) {
      case 'n8n-nodes-base.webhook':
      case 'n8n-nodes-base.noOp':
        return [items];
      case 'n8n-nodes-base.wait': {
        const seconds = Number(this.evalExpr(p.amount, this.ctxFor(ex, items, 0)));
        if (!(seconds >= 0)) throw new Error('Wait amount is not a number: ' + p.amount);
        await new Promise((r) => setTimeout(r, seconds * 1000 * this.waitScale));
        return [items];
      }
      case 'n8n-nodes-base.code': {
        const ctx = this.ctxFor(ex, items, 0);
        const out = await new AsyncFunction('$input', '$env', '$', '$execution', '$workflow', p.jsCode)(ctx.$input, ctx.$env, ctx.$, ctx.$execution, ctx.$workflow);
        if (!Array.isArray(out) || !out.every((o) => o && typeof o === 'object' && o.json && typeof o.json === 'object' && !Array.isArray(o.json))) {
          throw new Error('Code doesn\'t return items properly');
        }
        return [out.map((o) => ({ json: clone(o.json) }))];
      }
      case 'n8n-nodes-base.if': {
        const t = []; const f = [];
        items.forEach((item, i) => {
          const ctx = this.ctxFor(ex, items, i);
          const results = p.conditions.conditions.map((c) => {
            const v = this.evalExpr(c.leftValue, ctx);
            if (c.operator.type !== 'boolean') throw new Error('SIM: unsupported IF operator ' + c.operator.type);
            if (typeof v !== 'boolean') throw new Error(`Wrong type: '${v}' is not a boolean [condition ${c.leftValue}]`);
            return c.operator.operation === 'true' ? v === true : v === false;
          });
          const ok = p.conditions.combinator === 'or' ? results.some(Boolean) : results.every(Boolean);
          (ok ? t : f).push(item);
        });
        return [t, f];
      }
      case 'n8n-nodes-base.respondToWebhook': {
        const ctx = this.ctxFor(ex, items, 0);
        let body = this.evalExpr(p.responseBody, ctx);
        if (typeof body === 'string') body = JSON.parse(body);
        ex.resolveRespond({ status: Number(this.evalExpr(p.options && p.options.responseCode, ctx)) || 200, body });
        return [items];
      }
      case 'n8n-nodes-base.httpRequest':
        return this.http(ex, node, items);
      default:
        throw new Error('SIM: unsupported node type ' + node.type);
    }
  }

  authHeader(node) {
    const p = node.parameters;
    if (p.authentication === 'predefinedCredentialType') return this.credHeader(node.credentials[p.nodeCredentialType].name);
    if (p.authentication === 'genericCredentialType') return this.credHeader(node.credentials[p.genericAuthType].name);
    return null;
  }

  async httpOnce(ex, node, ctx, item) {
    const p = node.parameters;
    let url = this.evalExpr(p.url, ctx);
    if (p.sendQuery) {
      const u = new URL(url);
      for (const q of p.queryParameters.parameters) u.searchParams.set(q.name, String(this.evalExpr(q.value, ctx)));
      url = u.toString();
    }
    const headers = {};
    const auth = this.authHeader(node);
    if (auth) headers[auth.header] = auth.value;
    if (p.sendHeaders) for (const h of p.headerParameters.parameters) headers[h.name] = String(this.evalExpr(h.value, ctx));
    let body;
    if (p.sendBody && p.contentType === 'json') {
      let b = this.evalExpr(p.jsonBody, ctx);
      if (typeof b === 'string') b = JSON.parse(b);
      body = JSON.stringify(b);
      headers['content-type'] = 'application/json';
    } else if (p.sendBody && p.contentType === 'multipart-form-data') {
      const fd = new FormData();
      for (const f of p.bodyParameters.parameters) {
        if (f.parameterType === 'formBinaryData') {
          const bin = item.binary && item.binary[f.inputDataFieldName];
          if (!bin) throw Object.assign(new Error(`No binary data property "${f.inputDataFieldName}" exists on item`), { simNoBinary: true });
          fd.append(f.name, new Blob([bin.buffer], { type: bin.mimeType }), bin.fileName);
        } else fd.append(f.name, String(this.evalExpr(f.value, ctx)));
      }
      body = fd;
    }
    const base = this.env.N8N_WEBHOOK_BASE;
    let status;
    let buf;
    let ctype = '';
    if (base && url.startsWith(base + '/webhook/')) {
      const r = await this.handleWebhook(p.method, url.slice((base + '/webhook/').length), { headers, body: body ? JSON.parse(body) : {} });
      status = r.status;
      buf = Buffer.from(JSON.stringify(r.body));
      ctype = 'application/json';
    } else {
      const res = await fetch(url, { method: p.method, headers, body, signal: AbortSignal.timeout((p.options && p.options.timeout) || 30000) });
      status = res.status;
      buf = Buffer.from(await res.arrayBuffer());
      ctype = res.headers.get('content-type') || '';
    }
    if (status >= 400) {
      const text = buf.toString('utf8');
      throw Object.assign(new Error(`Request failed with status code ${status}`), { httpCode: String(status), description: text });
    }
    const wantsFile = p.options && p.options.response && p.options.response.response && p.options.response.response.responseFormat === 'file';
    if (wantsFile) return [{ json: {}, binary: { data: { buffer: buf, mimeType: ctype, fileName: 'download' } } }];
    if (ctype.includes('application/json') || buf.toString('utf8', 0, 1) === '{' || buf.toString('utf8', 0, 1) === '[') {
      const parsed = JSON.parse(buf.toString('utf8'));
      return Array.isArray(parsed) ? parsed.map((j) => ({ json: j })) : [{ json: parsed }];
    }
    return [{ json: { data: buf.toString('utf8') } }];
  }

  async http(ex, node, items) {
    const tries = node.retryOnFail ? node.maxTries || 3 : 1;
    const out0 = [];
    const out1 = [];
    for (let i = 0; i < items.length; i++) {
      const ctx = this.ctxFor(ex, items, i);
      let lastErr;
      let res;
      for (let attempt = 1; attempt <= tries; attempt++) {
        try { res = await this.httpOnce(ex, node, ctx, items[i]); lastErr = null; break; } catch (e) {
          lastErr = e;
          if (e.simNoBinary) break;
          await new Promise((r) => setTimeout(r, (node.waitBetweenTries || 0) * this.waitScale / 10));
        }
      }
      if (!lastErr) { out0.push(...res); continue; }
      const err = { message: lastErr.message, httpCode: lastErr.httpCode, description: lastErr.description };
      if (node.onError === 'continueErrorOutput') out1.push({ json: { error: clone(err) } });
      else if (node.onError === 'continueRegularOutput') out0.push({ json: { error: clone(err) } });
      else throw lastErr;
    }
    if (!out0.length && !out1.length && node.alwaysOutputData) out0.push({ json: {} });
    return [out0, out1];
  }
}

module.exports = { Runner };
