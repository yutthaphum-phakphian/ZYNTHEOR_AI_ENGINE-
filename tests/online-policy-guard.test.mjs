import test from 'node:test';
import assert from 'node:assert/strict';
import { canUpdateOnlineProviderPolicy } from '../src/services/onlinePolicyGuard.ts';

test('online provider policy requires configured server authority when enabling remote use', () => {
  assert.equal(canUpdateOnlineProviderPolicy(true, false, false), true);
  assert.equal(canUpdateOnlineProviderPolicy(false, true, false), true);
  assert.equal(canUpdateOnlineProviderPolicy(false, false, false), false);
  assert.equal(canUpdateOnlineProviderPolicy(false, false, true), true);
});
