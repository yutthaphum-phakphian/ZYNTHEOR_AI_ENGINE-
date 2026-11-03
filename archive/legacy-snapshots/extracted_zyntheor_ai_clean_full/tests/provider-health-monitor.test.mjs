import test from 'node:test';
import assert from 'node:assert/strict';
import { ProviderHealthMonitor } from '../lib/provider-health-monitor.mjs';

test('starts unknown without making a provider request', () => {
  const monitor = new ProviderHealthMonitor();
  assert.equal(monitor.snapshot('gemini').status, 'unknown');
});

test('records successful inference and latency without exposing secrets', () => {
  const monitor = new ProviderHealthMonitor();
  monitor.recordSuccess('gemini', 12.8);
  const health = monitor.snapshot('gemini');
  assert.equal(health.status, 'healthy');
  assert.equal(health.lastLatencyMs, 13);
  assert.equal('apiKey' in health, false);
});

test('marks provider degraded after threshold and sets a recovery window', () => {
  const monitor = new ProviderHealthMonitor({ failureThreshold: 2, recoveryWindowMs: 60_000 });
  monitor.recordFailure('gemini', 'timeout');
  assert.equal(monitor.snapshot('gemini').status, 'unhealthy');
  monitor.recordFailure('gemini', 'timeout');
  const health = monitor.snapshot('gemini');
  assert.equal(health.status, 'degraded');
  assert.ok(health.cooldownUntil);
});

test('success resets consecutive failures and clears cooldown', () => {
  const monitor = new ProviderHealthMonitor({ failureThreshold: 1 });
  monitor.recordFailure('gemini', 'timeout');
  monitor.recordSuccess('gemini', 42);
  const health = monitor.snapshot('gemini');
  assert.equal(health.status, 'healthy');
  assert.equal(health.consecutiveFailures, 0);
  assert.equal(health.cooldownUntil, null);
});

test('sanitizes untrusted error codes instead of retaining provider text', () => {
  const monitor = new ProviderHealthMonitor({ failureThreshold: 1, recoveryWindowMs: 1_000 });
  monitor.recordFailure('local', 'bad code; API_KEY=secret');
  assert.equal(monitor.snapshot('local').lastErrorCode, 'provider_error');
});
