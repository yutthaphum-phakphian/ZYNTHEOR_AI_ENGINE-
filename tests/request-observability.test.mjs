import test from 'node:test';
import assert from 'node:assert/strict';
import { RequestObservability } from '../lib/request-observability.mjs';

test('records real request metadata and leaves unknown token/cost values unavailable', () => {
  const monitor = new RequestObservability();
  monitor.record({ provider: 'gemini', model: 'test-model', mode: 'auto', effectiveMode: 'coding', status: 'success', latencyMs: 123 });
  const result = monitor.snapshot();
  assert.equal(result.records[0].effectiveMode, 'coding');
  assert.equal(result.records[0].totalTokens, null);
  assert.equal(result.records[0].cost, null);
  assert.equal(result.totals.succeeded, 1);
  assert.equal(result.note.includes('null means unavailable'), true);
});

test('bounds retention and requested snapshot size', () => {
  const monitor = new RequestObservability({ limit: 2 });
  for (let i = 0; i < 4; i++) monitor.record({ provider: 'local', status: i === 3 ? 'failed' : 'success', totalTokens: 10 });
  const result = monitor.snapshot({ limit: 99 });
  assert.equal(result.records.length, 2);
  assert.equal(result.records[0].status, 'failed');
  assert.equal(result.totals.totalTokens, 20);
});
