// End-to-end test of the real server against a mock OpenAI-compatible upstream. Needs `npm install` (express, tsx).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { readServerEvents } from '../lib/chat-core.mjs';

const cwd = new URL('..', import.meta.url).pathname;

async function startMockUpstream() {
  const state = { requests: [], streamClosed: false };
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : {};
      state.requests.push({ url: req.url, auth: req.headers.authorization, body });
      if (req.url !== '/v1/chat/completions') { res.writeHead(404).end('{}'); return; }
      if (body.stream !== true) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content: 'plain reply' } }] }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      const last = body.messages.at(-1).content;
      if (last === 'finish') {
        for (const t of ['Hel', 'lo']) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`);
        res.end('data: [DONE]\n\n');
        return;
      }
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'first' } }] })}\n\n`);
      const timer = setInterval(() => res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: '.' } }] })}\n\n`), 50);
      res.on('close', () => { clearInterval(timer); state.streamClosed = true; });
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { state, port: server.address().port, close: () => { server.closeAllConnections?.(); server.close(); } };
}

async function startApp(port, upstreamPort, extraEnv = {}) {
  const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd, stdio: 'ignore',
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'development', ZYNTHEOR_LOCAL_ONLY: 'true', ZYNTHEOR_MODEL_BASE_URL: `http://127.0.0.1:${upstreamPort}/v1`, ZYNTHEOR_MODEL_NAME: 'mock-model', ZYNTHEOR_ACCESS_TOKEN: '', ...extraEnv },
  });
  const base = `http://127.0.0.1:${port}`;
  const started = Date.now();
  for (;;) {
    if (child.exitCode !== null) throw new Error(`server exited: ${child.exitCode}`);
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* waiting */ }
    if (Date.now() - started > 20000) { child.kill('SIGTERM'); throw new Error('server did not start in 20s'); }
    await delay(250);
  }
  return { base, stop: () => child.kill('SIGTERM') };
}


async function withStack({ port, env = {}, mock = true }, fn) {
  const upstream = mock ? await startMockUpstream() : null;
  let app;
  try {
    app = await startApp(port, upstream ? upstream.port : 1, env);
    await fn(app, upstream);
  } finally {
    app?.stop();
    upstream?.close();
  }
}

const post = (base, path, body, headers = {}) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('stream route: delivers deltas, sends the mode prompt upstream, rejects bad mode, never leaks the API key', { timeout: 60000 }, async () => {
  await withStack({ port: 41801, env: { ZYNTHEOR_MODEL_API_KEY: 'sk-test-secret-123' } }, async (app, upstream) => {
    const response = await post(app.base, '/api/chat/stream', { message: 'finish', mode: 'plan', history: [{ role: 'user', content: 'earlier' }, { role: 'assistant', content: 'earlier answer' }] });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /text\/event-stream/);
    const events = [];
    for await (const evt of readServerEvents(response.body)) events.push(evt);
    assert.deepEqual(events.map(e => e.event), ['start', 'delta', 'delta', 'done']);
    assert.equal(events.filter(e => e.event === 'delta').map(e => e.data.text).join(''), 'Hello');
    assert.equal(events.at(-1).data.chars, 5);
    const sent = upstream.state.requests.at(-1);
    assert.equal(sent.body.stream, true);
    assert.equal(sent.body.messages[0].role, 'system');
    assert.match(sent.body.messages[0].content, /Reasoning mode/);
    assert.deepEqual(sent.body.messages.slice(1).map(m => m.content), ['earlier', 'earlier answer', 'finish']);
    assert.equal(sent.auth, 'Bearer sk-test-secret-123');
    assert.ok(!JSON.stringify(events).includes('sk-test-secret-123'));

    const bad = await post(app.base, '/api/chat/stream', { message: 'hi', mode: 'root' });
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error, 'invalid_mode');
    const empty = await post(app.base, '/api/chat/stream', { message: '   ' });
    assert.equal(empty.status, 400);

    const plain = await post(app.base, '/api/chat', { message: 'hi', mode: 'code' });
    const plainData = await plain.json();
    assert.equal(plain.status, 200);
    assert.equal(plainData.reply, 'plain reply');
    assert.equal(plainData.mode, 'coding');
    assert.match(upstream.state.requests.at(-1).body.messages[0].content, /Coding mode/);
  });
});

test('stream route: aborting the client request aborts the upstream request', { timeout: 60000 }, async () => {
  await withStack({ port: 41802 }, async (app, upstream) => {
    const controller = new AbortController();
    const response = await fetch(`${app.base}/api/chat/stream`, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'keep going' }) });
    let got = '';
    try {
      for await (const evt of readServerEvents(response.body)) {
        if (evt.event === 'delta') got += evt.data.text;
        if (got.length >= 3) controller.abort();
      }
    } catch { /* abort surfaces as an error */ }
    assert.ok(got.startsWith('first'));
    for (let i = 0; i < 40 && !upstream.state.streamClosed; i += 1) await delay(100);
    assert.equal(upstream.state.streamClosed, true, 'upstream stream should be closed after the client aborts');
  });
});

test('stream route: upstream down returns a real error status, not a fabricated reply', { timeout: 60000 }, async () => {
  await withStack({ port: 41803, mock: false }, async app => {
    const response = await post(app.base, '/api/chat/stream', { message: 'hello' });
    const data = await response.json();
    assert.ok(response.status >= 500);
    assert.equal(data.reply, undefined);
    assert.equal(data.error, 'model_unavailable');
  });
});

test('access token: model routes and policy changes are refused without the token, health stays public', { timeout: 60000 }, async () => {
  await withStack({ port: 41804, env: { ZYNTHEOR_ACCESS_TOKEN: 'correct-horse-battery-staple-0123456789' } }, async (app, upstream) => {
    assert.equal((await fetch(`${app.base}/api/health`)).status, 200);
    assert.equal((await (await fetch(`${app.base}/api/settings`)).json()).accessTokenRequired, true);
    for (const path of ['/api/chat', '/api/chat/stream', '/api/diagnostics/inference', '/api/intelligence/analyze', '/api/settings']) {
      const r = await post(app.base, path, { message: 'x', source: 'x', localOnly: true });
      assert.equal(r.status, 401, `${path} must require the token`);
    }
    assert.equal((await fetch(`${app.base}/api/models`)).status, 401);
    const wrong = await post(app.base, '/api/chat', { message: 'x' }, { Authorization: 'Bearer nope' });
    assert.equal(wrong.status, 401);
    assert.equal(upstream.state.requests.length, 0, 'no upstream call may happen before authorization');
    const ok = await post(app.base, '/api/chat', { message: 'x' }, { Authorization: 'Bearer correct-horse-battery-staple-0123456789' });
    assert.equal(ok.status, 200);
  });
});
