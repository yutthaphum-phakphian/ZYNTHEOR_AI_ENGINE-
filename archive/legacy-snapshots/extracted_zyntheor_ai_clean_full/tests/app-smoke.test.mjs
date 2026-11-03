import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const port = 31987;
let child;
async function waitForServer(base) {
  const started = Date.now();
  while (Date.now() - started < 18000) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error(`server exited: ${child.exitCode}`);
    try { const r = await fetch(`${base}/api/health`); if (r.ok) return; } catch { /* wait for startup */ }
    await delay(250);
  }
  throw new Error('server did not become healthy within 18 seconds');
}
test('app server reports real health and never fabricates an unavailable model reply', async () => {
  const base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, PORT: String(port), ZYNTHEOR_MODEL_BASE_URL: 'http://127.0.0.1:1/v1', ZYNTHEOR_MODEL_NAME: 'smoke-test-model', ZYNTHEOR_LOCAL_ONLY: 'true', NODE_ENV: 'development' },
    stdio: 'ignore',
  });
  try {
    await waitForServer(base);
    const health = await (await fetch(`${base}/api/health`)).json();
    assert.equal(health.ok, true);
    assert.equal(health.config.localOnly, true);
    const previewResponse = await fetch(`${base}/api/editing/propose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: 'src/example.ts', diff: '--- a/src/example.ts\n+++ b/src/example.ts' }),
    });
    const preview = await previewResponse.json();
    assert.equal(previewResponse.status, 200);
    assert.equal(preview.previewOnly, true);
    assert.equal(preview.file, 'src/example.ts');
    const marker = path.join(tmpdir(), `zyntheor-blocked-execution-${randomUUID()}`);
    try {
      const executionResponse = await fetch(`${base}/api/editing/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: `npx tsx $(touch ${marker})`, consent: true }),
      });
      assert.equal(executionResponse.status, 503);
      assert.deepEqual(await executionResponse.json(), { error: 'execution_disabled' });
      assert.equal(existsSync(marker), false);
    } finally {
      if (existsSync(marker)) unlinkSync(marker);
    }

    const claimedAdminExecution = await fetch(`${base}/api/editing/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer unverified-test-token',
        'X-User-Role': 'admin',
      },
      body: JSON.stringify({ cmd: 'npm run test', consent: true }),
    });
    assert.equal(claimedAdminExecution.status, 503);

    const unsafePreview = await fetch(`${base}/api/editing/propose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: '../outside.ts', diff: 'diff' }),
    });
    assert.equal(unsafePreview.status, 400);
    const chat = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'hello' }) });
    const data = await chat.json();
    assert.ok(chat.status >= 500, `expected provider failure status, got ${chat.status}`);
    assert.equal(typeof data.reply, 'undefined', 'unavailable model must not return a fabricated reply');
    assert.ok(data.error || data.message, 'error reason should be returned');
    const settings = await (await fetch(`${base}/api/settings`)).json();
    assert.equal(settings.apiKeyExposed, false);
  } finally {
    child?.kill('SIGTERM');
  }
});

test('online-provider consent can be revoked and blocks subsequent external requests', async () => {
  const consentPort = 31988;
  const base = `http://127.0.0.1:${consentPort}`;
  const accessToken = 'consent-regression-test-token';
  child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: String(consentPort),
      ZYNTHEOR_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'test-key',
      ZYNTHEOR_ACCESS_TOKEN: accessToken,
      ZYNTHEOR_LOCAL_ONLY: 'false',
      NODE_ENV: 'development',
    },
    stdio: 'ignore',
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
  try {
    await waitForServer(base);
    const grant = await fetch(`${base}/api/settings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ localOnly: false, onlineConsent: true }),
    });
    assert.equal(grant.status, 200);
    assert.equal((await grant.json()).config.onlineConsent, true);

    const revoke = await fetch(`${base}/api/settings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ localOnly: false, onlineConsent: false }),
    });
    assert.equal(revoke.status, 200);
    const settings = await revoke.json();
    assert.equal(settings.config.onlineConsent, false);
    assert.equal(settings.config.localOnly, false);

    const chat = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: 'must remain local' }),
    });
    assert.equal(chat.status, 403);
    assert.equal((await chat.json()).error, 'online_provider_blocked_by_policy');
  } finally {
    child?.kill('SIGTERM');
  }
});

test('production APIs require the configured access token except for health and auth routes', async () => {
  const productionPort = 31989;
  const base = `http://127.0.0.1:${productionPort}`;
  const accessToken = 'production-api-test-token';
  child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: String(productionPort),
      HOST: '127.0.0.1',
      ZYNTHEOR_ACCESS_TOKEN: accessToken,
      ZYNTHEOR_LOCAL_ONLY: 'true',
      NODE_ENV: 'production',
    },
    stdio: 'ignore',
  });

  try {
    await waitForServer(base);
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
    assert.equal((await fetch(`${base}/api/intelligence/observability/requests`)).status, 401);

    const authorized = await fetch(`${base}/api/intelligence/observability/requests`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.equal(authorized.status, 200);
  } finally {
    child?.kill('SIGTERM');
  }
});

test('production server refuses to start without an access token', async () => {
  const unconfigured = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: '31990',
      ZYNTHEOR_ACCESS_TOKEN: '',
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  unconfigured.stderr.setEncoding('utf8');
  unconfigured.stderr.on('data', chunk => { stderr += chunk; });

  const outcome = await Promise.race([
    new Promise(resolve => unconfigured.once('exit', (code, signal) => resolve({ code, signal }))),
    delay(5000).then(() => null),
  ]);
  if (!outcome) {
    unconfigured.kill('SIGTERM');
    await new Promise(resolve => unconfigured.once('exit', resolve));
    assert.fail('production server remained running without its required access token');
  }
  assert.notEqual(outcome.code, 0);
  assert.match(stderr, /Production startup requires ZYNTHEOR_ACCESS_TOKEN/);
});
