import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RequestObservability } from '../lib/request-observability.mjs';

test('persists records across instances and scopes by user/workspace', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'zyntheor-observe-'));
  const file = path.join(dir, 'requests.json');
  try {
    const first = new RequestObservability({ storageFile: file, limit: 10 });
    first.record({ userId: 'u1', workspaceId: 'w1', status: 'success', totalTokens: 12 });
    first.record({ userId: 'u2', workspaceId: 'w1', status: 'failed' });
    const restarted = new RequestObservability({ storageFile: file, limit: 10 });
    assert.equal(restarted.snapshot({ userId: 'u1', workspaceId: 'w1' }).records.length, 1);
    assert.equal(restarted.snapshot({ userId: 'u2', workspaceId: 'w1' }).records.length, 1);
    assert.equal(restarted.snapshot({ userId: 'u1', workspaceId: 'w2' }).records.length, 0);
    assert.equal(restarted.snapshot({ userId: 'u1', workspaceId: 'w1' }).totals.totalTokens, 12);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('does not invent token or cost values', () => {
  const store = new RequestObservability();
  store.record({ userId: 'u', workspaceId: 'w', status: 'success' });
  const row = store.snapshot({ userId: 'u', workspaceId: 'w' }).records[0];
  assert.equal(row.inputTokens, null);
  assert.equal(row.outputTokens, null);
  assert.equal(row.cost, null);
});
