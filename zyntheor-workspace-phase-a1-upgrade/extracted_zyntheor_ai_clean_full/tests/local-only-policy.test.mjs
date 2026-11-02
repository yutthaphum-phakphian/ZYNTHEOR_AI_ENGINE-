import test from 'node:test';
import assert from 'node:assert/strict';
import { createProvider } from '../lib/providers.ts';

// Test local-only policy logic across provider configurations
test('policy: local Ollama endpoint is recognized as local and allowed under ZYNTHEOR_LOCAL_ONLY=true', () => {
  const ollama = createProvider({
    ZYNTHEOR_LOCAL_ONLY: 'true',
    ZYNTHEOR_MODEL_BASE_URL: 'http://127.0.0.1:11434/v1',
  });
  assert.equal(ollama.isLocal, true);
  assert.ok(ollama.endpointHost.includes('127.0.0.1'));

  // Policy logic simulation matching server.ts remoteAllowed()
  function remoteAllowed(provider, localOnly, onlineConsent) {
    if (provider.isLocal) return true;
    if (localOnly) return false;
    return onlineConsent;
  }

  assert.equal(remoteAllowed(ollama, true, false), true, 'Local Ollama must be allowed when localOnly is true');
  assert.equal(remoteAllowed(ollama, true, true), true, 'Local Ollama must be allowed regardless of online consent');
});

test('policy: external Gemini and remote endpoints are strictly blocked under ZYNTHEOR_LOCAL_ONLY=true', () => {
  const gemini = createProvider({
    ZYNTHEOR_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-secret-key',
  });
  assert.equal(gemini.isLocal, false);
  assert.equal(gemini.endpointHost, 'generativelanguage.googleapis.com');

  const remoteOpenAI = createProvider({
    ZYNTHEOR_PROVIDER: 'openai',
    ZYNTHEOR_MODEL_BASE_URL: 'https://api.openai.com/v1',
    ZYNTHEOR_MODEL_API_KEY: 'sk-test',
  });
  assert.equal(remoteOpenAI.isLocal, false);
  assert.equal(remoteOpenAI.endpointHost, 'api.openai.com');

  function remoteAllowed(provider, localOnly, onlineConsent) {
    if (provider.isLocal) return true;
    if (localOnly) return false;
    return onlineConsent;
  }

  // Under ZYNTHEOR_LOCAL_ONLY=true, both must be blocked
  assert.equal(remoteAllowed(gemini, true, false), false, 'Gemini must be blocked when localOnly=true');
  assert.equal(remoteAllowed(gemini, true, true), false, 'Gemini must be blocked even if onlineConsent is true while localOnly=true');

  assert.equal(remoteAllowed(remoteOpenAI, true, false), false, 'Remote OpenAI must be blocked when localOnly=true');
  assert.equal(remoteAllowed(remoteOpenAI, true, true), false, 'Remote OpenAI must be blocked even if onlineConsent is true while localOnly=true');

  // Only allowed when localOnly=false AND onlineConsent=true
  assert.equal(remoteAllowed(gemini, false, false), false, 'Must be blocked without explicit onlineConsent');
  assert.equal(remoteAllowed(gemini, false, true), true, 'Allowed only when localOnly=false and onlineConsent=true');
});

test('policy: localhost variants (127.0.0.1, localhost, ::1) are all classified as local', () => {
  const variants = [
    'http://127.0.0.1:11434/v1',
    'http://localhost:11434/v1',
    'http://127.0.0.1:8000/v1',
    'http://[::1]:11434/v1',
  ];

  for (const url of variants) {
    const prov = createProvider({
      ZYNTHEOR_PROVIDER: 'ollama',
      ZYNTHEOR_MODEL_BASE_URL: url,
    });
    assert.equal(prov.isLocal, true, `${url} should be recognized as local`);
  }
});

test('policy: non-local IP or external domain is classified as remote', () => {
  const externals = [
    'http://192.168.1.100:11434/v1',
    'https://api.together.xyz/v1',
    'https://api.groq.com/openai/v1',
    'https://generativelanguage.googleapis.com',
  ];

  for (const url of externals) {
    const prov = createProvider({
      ZYNTHEOR_PROVIDER: 'ollama',
      ZYNTHEOR_MODEL_BASE_URL: url,
    });
    assert.equal(prov.isLocal, false, `${url} must NOT be classified as local`);
  }
});
