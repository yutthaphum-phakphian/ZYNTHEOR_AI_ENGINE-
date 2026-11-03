import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const enabled = process.env.ZYNTHEOR_LIVE_INFERENCE === '1';
const root = new URL('..', import.meta.url).pathname;

async function getFreePort() {
  const server = await import('node:net').then(({ createServer }) => createServer());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

test('live Gemini backend inference requires opt-in and evaluates synthetic engineering tasks', {
  skip: !enabled,
  timeout: 240_000,
}, async t => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  assert.ok(apiKey, 'Set GEMINI_API_KEY or GOOGLE_API_KEY in the process environment.');

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const accessToken = randomBytes(32).toString('hex');
  const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
      ZYNTHEOR_ACCESS_TOKEN: accessToken,
      ZYNTHEOR_PROVIDER: 'gemini',
      ZYNTHEOR_LOCAL_ONLY: 'true',
      GEMINI_API_KEY: apiKey,
    },
    stdio: 'ignore',
  });
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  async function postJson(route, body) {
    const response = await fetch(`${baseUrl}${route}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return { response, data: await response.json() };
  }

  try {
    const startedAt = Date.now();
    let healthy = false;
    while (Date.now() - startedAt < 20000) {
      if (child.exitCode !== null) throw new Error(`server exited before health check: ${child.exitCode}`);
      try {
        const response = await fetch(`${baseUrl}/api/health`);
        if (response.ok) {
          healthy = true;
          break;
        }
      } catch {
        await delay(150);
      }
    }
    assert.equal(healthy, true, 'backend gateway did not become healthy');

    const grant = await postJson('/api/settings', { localOnly: false, onlineConsent: true });
    assert.equal(grant.response.status, 200);
    assert.equal(grant.data.config.onlineConsent, true);
    assert.equal(grant.data.config.apiKeyExposed, false);

    await t.test('live inference diagnostic returns the expected marker', async () => {
      const diagnostic = await postJson('/api/diagnostics/inference', {});
      assert.equal(diagnostic.response.status, 200);
      assert.equal(diagnostic.data.state, 'RESPONDED');
      assert.equal(diagnostic.data.matchedExpectedText, true);
      assert.equal(diagnostic.data.modelStatus, 'INFERENCE_READY');
      assert.match(diagnostic.data.model, /^gemini-/);
      assert.ok(diagnostic.data.latencyMs >= 0);
    });

    const source = [
      'function applyApprovedPatch(proposal, content) {',
      '  if (sha256(proposal.approvedContent) !== proposal.approvedHash) throw new Error("stale");',
      '  return writeFile(proposal.targetPath, content);',
      '}',
    ].join('\n');

    const cases = [
      {
        name: 'English root-cause analysis and minimal patch proposal',
        question: 'In English, identify the root cause, propose the smallest safe patch, and name a regression test for tampered content. Do not claim execution.',
        requireThai: false,
      },
      {
        name: 'Thai root-cause analysis and minimal patch proposal',
        question: 'ตอบเป็นภาษาไทย: ระบุสาเหตุราก เสนอแพตช์ที่ปลอดภัยและเล็กที่สุด และระบุ regression test สำหรับ content ที่ถูกแก้ไข ห้ามอ้างว่ารันการทดสอบแล้ว',
        requireThai: true,
      },
    ];

    for (const evaluation of cases) {
      await t.test(evaluation.name, async () => {
        const result = await postJson('/api/intelligence/analyze', {
          source,
          question: evaluation.question,
        });
        assert.equal(result.response.status, 200);
        assert.equal(result.data.state, 'RESPONDED');
        assert.equal(result.data.executionVerified, false);
        assert.ok(result.data.analysis.length >= 100);

        const analysis = result.data.analysis;
        assert.match(analysis, /approvedContent|approved content|content/i);
        assert.match(analysis, /hash|digest|sha-?256|แฮช|ค่าแฮช/i);
        assert.match(analysis, /test|regression|ทดสอบ|กรณีทดสอบ/i);
        if (evaluation.requireThai) assert.match(analysis, /[\u0E00-\u0E7F]/);
        assert.ok(result.data.latencyMs >= 0);
      });
    }

    const status = await fetch(`${baseUrl}/api/health`, { headers });
    assert.equal(status.status, 200);
    assert.equal((await status.json()).config.apiKeyExposed, false);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      await exited;
    }
  }
});
