import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

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

async function waitForHealth(baseUrl, child) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (child.exitCode !== null) throw new Error(`server exited: ${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      await delay(100);
    }
  }
  throw new Error('server did not become healthy');
}

test('intelligence run abort disconnects the upstream provider request', { timeout: 25000 }, async () => {
  let markRequestStarted;
  let markUpstreamClosed;
  const requestStarted = new Promise(resolve => { markRequestStarted = resolve; });
  const upstreamClosed = new Promise(resolve => { markUpstreamClosed = resolve; });
  const providerServer = createServer((request, response) => {
    response.on('close', markUpstreamClosed);
    request.on('end', markRequestStarted);
    request.resume();
  });
  await new Promise((resolve, reject) => {
    providerServer.once('error', reject);
    providerServer.listen(0, '127.0.0.1', resolve);
  });

  const appPort = await getFreePort();
  const baseUrl = `http://127.0.0.1:${appPort}`;
  const providerUrl = `http://127.0.0.1:${providerServer.address().port}/v1`;
  const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: String(appPort),
      ZYNTHEOR_LOCAL_ONLY: 'true',
      ZYNTHEOR_PROVIDER: 'openai',
      ZYNTHEOR_MODEL_BASE_URL: providerUrl,
      ZYNTHEOR_MODEL_NAME: 'cancellation-test-model',
      OPENAI_API_KEY: 'test-key',
      NODE_ENV: 'development',
    },
    stdio: 'ignore',
  });

  try {
    await waitForHealth(baseUrl, child);
    const controller = new AbortController();
    const request = fetch(`${baseUrl}/api/intelligence/run`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Cancel this intelligence request', language: 'en', bypassCache: true }),
    }).catch(error => error);

    await requestStarted;
    controller.abort();
    await request;

    const closedWithinTimeout = await Promise.race([
      upstreamClosed.then(() => true),
      delay(5000).then(() => false),
    ]);
    assert.equal(closedWithinTimeout, true, 'client cancellation must abort the provider request');
  } finally {
    child.kill('SIGTERM');
    providerServer.closeAllConnections();
    await new Promise(resolve => providerServer.close(resolve));
  }
});