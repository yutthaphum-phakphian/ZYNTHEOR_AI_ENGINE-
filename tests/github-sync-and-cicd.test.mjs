import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const port = 31989;
let child;

async function waitForServer(base) {
  const started = Date.now();
  while (Date.now() - started < 18000) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) {
      throw new Error(`server exited: ${child.exitCode}`);
    }
    try {
      const r = await fetch(`${base}/api/health`);
      if (r.ok) return;
    } catch {
      // waiting for server
    }
    await delay(250);
  }
  throw new Error('server did not become healthy within 18 seconds');
}

test('GitHub Sync & CI/CD Status API endpoints', async () => {
  const base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: String(port),
      ZYNTHEOR_MODEL_BASE_URL: 'http://127.0.0.1:1/v1',
      ZYNTHEOR_MODEL_NAME: 'smoke-test-model',
      ZYNTHEOR_LOCAL_ONLY: 'true',
      NODE_ENV: 'development',
    },
    stdio: 'ignore',
  });

  try {
    await waitForServer(base);

    // 1. Test /api/github/branches
    const branchesRes = await fetch(`${base}/api/github/branches`);
    assert.equal(branchesRes.status, 200);
    const branchesData = await branchesRes.json();
    assert.equal(branchesData.ok, true);
    assert.ok(Array.isArray(branchesData.branches));
    assert.ok(branchesData.branches.includes('main'), 'Branches should include main');

    // 2. Test /api/github/commits
    const commitsRes = await fetch(`${base}/api/github/commits?branch=main&limit=3`);
    assert.equal(commitsRes.status, 200);
    const commitsData = await commitsRes.json();
    assert.equal(commitsData.ok, true);
    assert.ok(Array.isArray(commitsData.commits));
    assert.ok(commitsData.commits.length > 0 && commitsData.commits.length <= 3);
    const firstCommit = commitsData.commits[0];
    assert.ok(firstCommit.sha);
    assert.ok(firstCommit.author);
    assert.ok(firstCommit.message);
    assert.ok(firstCommit.url);

    // 3. Test /api/github/status?branch=main
    const statusRes = await fetch(`${base}/api/github/status?branch=main`);
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.equal(statusData.ok, true);
    assert.equal(statusData.branch, 'main');
    assert.ok(statusData.commitHash);
    assert.ok(['SUCCESS', 'WARNING', 'FAILED', 'BUILDING'].includes(statusData.buildStatus));

    // 4. Test /api/github/cicd/status
    const cicdRes = await fetch(`${base}/api/github/cicd/status`);
    assert.equal(cicdRes.status, 200);
    const cicdData = await cicdRes.json();
    assert.equal(cicdData.ok, true);
    assert.ok(cicdData.pipeline);
    assert.ok(['IDLE', 'QUEUED', 'RUNNING', 'SUCCESS', 'FAILED'].includes(cicdData.pipeline.stage));
    assert.ok(Array.isArray(cicdData.pipeline.steps));

    // 5. Test /api/github/cicd/trigger
    const triggerRes = await fetch(`${base}/api/github/cicd/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch: 'main', commitHash: statusData.commitHash }),
    });
    assert.equal(triggerRes.status, 200);
    const triggerData = await triggerRes.json();
    assert.equal(triggerData.ok, true);
    assert.ok(triggerData.pipeline);
    assert.ok(['QUEUED', 'RUNNING', 'SUCCESS'].includes(triggerData.pipeline.stage));
  } finally {
    child?.kill('SIGTERM');
  }
});
