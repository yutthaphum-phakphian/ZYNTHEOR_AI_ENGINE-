import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyProviderError, toProviderFailure } from '../lib/provider-resilience.mjs';

test('classifies provider timeout as retryable gateway timeout', () => {
  const result = classifyProviderError(Object.assign(new Error('request timed out'), { name: 'TimeoutError' }));
  assert.equal(result.kind, 'timeout');
  assert.equal(result.httpStatus, 504);
  assert.equal(result.retryable, true);
});

test('classifies rate limits without exposing provider response text', () => {
  const result = classifyProviderError(Object.assign(new Error('quota exceeded secret details'), { status: 429 }));
  assert.equal(result.kind, 'rate_limit');
  assert.equal(result.httpStatus, 429);
  assert.equal(result.message.includes('secret'), false);
});

test('classifies authentication and unavailable failures', () => {
  assert.equal(classifyProviderError(Object.assign(new Error('unauthorized'), { status: 401 })).kind, 'authentication');
  assert.equal(classifyProviderError(Object.assign(new Error('fetch failed'), { code: 'ECONNRESET' })).kind, 'unavailable');
});

test('wraps provider errors in a safe structured failure', () => {
  const failure = toProviderFailure(Object.assign(new Error('quota exceeded'), { status: 429 }));
  assert.equal(failure.name, 'ProviderFailure');
  assert.equal(failure.code, 'rate_limit');
  assert.equal(failure.retryable, true);
  assert.equal(failure.message, 'rate_limit');
});
