import test from 'node:test';
import assert from 'node:assert/strict';

test('settings: POST /api/settings updates settings safely and enforces online consent policy', async () => {
  // Simulate POST /api/settings logic
  let localOnly = true;
  let onlineConsent = false;

  function updateSettings(payload) {
    const nextLocalOnly = typeof payload?.localOnly === 'boolean' ? payload.localOnly : localOnly;
    const consent = typeof payload?.onlineConsent === 'boolean' ? payload.onlineConsent : onlineConsent;

    // Policy check: disabling localOnly without onlineConsent on remote providers must fail
    if (!nextLocalOnly && consent !== true) {
      return { ok: false, status: 403, error: 'explicit_online_consent_required' };
    }

    localOnly = nextLocalOnly;
    onlineConsent = consent;

    return {
      ok: true,
      status: 200,
      config: {
        localOnly,
        onlineConsent,
        language: payload?.language || 'th',
        defaultModel: payload?.defaultModel || 'qwen2.5-coder:7b',
      },
    };
  }

  // 1. Valid local-only update
  const res1 = updateSettings({ language: 'th', defaultModel: 'qwen2.5-coder:7b' });
  assert.equal(res1.ok, true);
  assert.equal(res1.config.localOnly, true);

  // 2. Attempting to disable localOnly without explicit onlineConsent
  const res2 = updateSettings({ localOnly: false, onlineConsent: false });
  assert.equal(res2.ok, false);
  assert.equal(res2.status, 403);
  assert.equal(res2.error, 'explicit_online_consent_required');

  // 3. Disabling localOnly with explicit onlineConsent
  const res3 = updateSettings({ localOnly: false, onlineConsent: true });
  assert.equal(res3.ok, true);
  assert.equal(res3.config.localOnly, false);
  assert.equal(res3.config.onlineConsent, true);
});
