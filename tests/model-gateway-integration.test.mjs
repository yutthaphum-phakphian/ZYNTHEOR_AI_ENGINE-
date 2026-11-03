import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('..', import.meta.url));

async function getFreePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

async function startApp(env, extraArgs = []) {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const accessToken = `integration-${randomUUID()}`;
  const child = spawn(process.execPath, ['--import', 'tsx', ...extraArgs, 'server.ts'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      NODE_ENV: 'development',
      ZYNTHEOR_ACCESS_TOKEN: accessToken,
      ...env,
    },
    stdio: 'ignore',
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (child.exitCode !== null) throw new Error(`server exited before health check: ${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return { child, baseUrl, headers };
    } catch {
      await delay(100);
    }
  }
  child.kill('SIGTERM');
  throw new Error('server did not become healthy within 15 seconds');
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  await exited;
}

async function postJson(baseUrl, route, headers, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { response, data: await response.json() };
}

test('backend gateway calls a local provider under Local-Only and never fabricates model output', async () => {
  const received = [];
  const upstream = createServer((req, res) => {
    let rawBody = '';
    req.on('data', chunk => { rawBody += chunk; });
    req.on('end', () => {
      received.push({ method: req.method, path: req.url });
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'GET' && req.url === '/v1/models') {
        res.end(JSON.stringify({ data: [{ id: 'local-integration-model' }] }));
        return;
      }

      const payload = JSON.parse(rawBody || '{}');
      const userMessage = payload.messages?.find(message => message.role === 'user')?.content || '';
      const reply = userMessage.includes('ZYNTHEOR_INFERENCE_OK')
        ? 'ZYNTHEOR_INFERENCE_OK'
        : 'Local integration provider returned a real mock response.';
      res.end(JSON.stringify({
        choices: [{ message: { role: 'assistant', content: reply }, finish_reason: 'stop' }],
      }));
    });
  });
  await new Promise((resolve, reject) => {
    upstream.once('error', reject);
    upstream.listen(0, '127.0.0.1', resolve);
  });

  let app;
  try {
    app = await startApp({
      ZYNTHEOR_PROVIDER: 'openai',
      ZYNTHEOR_MODEL_BASE_URL: `http://127.0.0.1:${upstream.address().port}/v1`,
      ZYNTHEOR_MODEL_NAME: 'local-integration-model',
      ZYNTHEOR_LOCAL_ONLY: 'true',
    });

    const models = await fetch(`${app.baseUrl}/api/models`, { headers: app.headers });
    assert.equal(models.status, 200);
    assert.equal((await models.json()).source, 'live');

    const diagnostic = await postJson(app.baseUrl, '/api/diagnostics/inference', app.headers, {});
    assert.equal(diagnostic.response.status, 200);
    assert.equal(diagnostic.data.matchedExpectedText, true);
    assert.equal(diagnostic.data.modelStatus, 'INFERENCE_READY');

    const chat = await postJson(app.baseUrl, '/api/chat', app.headers, { message: 'Explain a safe patch review.' });
    assert.equal(chat.response.status, 200);
    assert.match(chat.data.reply, /local integration provider/i);

    const analysis = await postJson(app.baseUrl, '/api/intelligence/analyze', app.headers, {
      source: 'function apply(content) { return writeFile(content); }',
      question: 'Identify the likely issue and propose one regression test.',
    });
    assert.equal(analysis.response.status, 200);
    assert.equal(analysis.data.state, 'RESPONDED');
    assert.equal(analysis.data.executionVerified, false);
    assert.ok(received.filter(request => request.path === '/v1/chat/completions').length >= 3);
  } finally {
    if (app) await stopChild(app.child);
    await new Promise((resolve, reject) => {
      upstream.close(error => error ? reject(error) : resolve());
    });
  }
});

test('Local-Only blocks external gateway requests before any outbound fetch', async () => {
  const logPath = path.join(tmpdir(), `zyntheor-external-fetch-${randomUUID()}.log`);
  const preload = fileURLToPath(new URL('./fixtures/block-external-fetch.mjs', import.meta.url));
  let app;
  try {
    app = await startApp({
      ZYNTHEOR_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'test-key-not-for-network-use',
      ZYNTHEOR_LOCAL_ONLY: 'true',
      ZYNTHEOR_TEST_EXTERNAL_FETCH_LOG: logPath,
    }, ['--import', preload]);

    for (const [route, body] of [
      ['/api/diagnostics/inference', {}],
      ['/api/chat', { message: 'must stay local' }],
      ['/api/intelligence/analyze', { source: 'const x = 1;', question: 'Explain this.' }],
      ['/api/intelligence/run', { query: 'What is the root cause?' }],
    ]) {
      const { response, data } = await postJson(app.baseUrl, route, app.headers, body);
      assert.equal(response.status, 403, `${route} should be blocked under Local-Only`);
      assert.equal(data.error, 'online_provider_blocked_by_policy');
    }

    const benchmark = await postJson(app.baseUrl, '/api/models/benchmark-compare', app.headers, {});
    assert.equal(benchmark.response.status, 200);
    assert.equal(benchmark.data.report.mode, 'baseline_fixture_comparison');
    assert.equal(existsSync(logPath), false, 'no external fetch attempt should be made');
  } finally {
    if (app) await stopChild(app.child);
    if (existsSync(logPath)) unlinkSync(logPath);
  }
});
