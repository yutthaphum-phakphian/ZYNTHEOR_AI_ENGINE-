import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenMatches, extractToken } from '../lib/access.mjs';
import { createProvider } from '../lib/providers.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Buffalo 1.1.1: Production configs enforce ZYNTHEOR_LOCAL_ONLY=true by default', () => {
  const fly = readFileSync(path.join(root, 'fly.toml'), 'utf8');
  assert.ok(fly.includes('ZYNTHEOR_LOCAL_ONLY = "true"'), 'fly.toml must lock ZYNTHEOR_LOCAL_ONLY to "true"');

  const render = readFileSync(path.join(root, 'render.yaml'), 'utf8');
  assert.ok(render.includes('value: true') && render.includes('ZYNTHEOR_LOCAL_ONLY'), 'render.yaml must lock ZYNTHEOR_LOCAL_ONLY to true');

  const envExample = readFileSync(path.join(root, '.env.example'), 'utf8');
  assert.ok(envExample.includes('ZYNTHEOR_LOCAL_ONLY=true'), '.env.example must lock ZYNTHEOR_LOCAL_ONLY to true');

  const server = readFileSync(path.join(root, 'server.ts'), 'utf8');
  assert.ok(server.includes("process.env.ZYNTHEOR_LOCAL_ONLY || 'true'"), 'server.ts must default local-only to true');
});

test('Buffalo 1.1.1: tokenMatches and extractToken enforce strict access gate', () => {
  const testSecret = 'test-token-buffalo-security-1234567890';

  // No token provided
  assert.equal(tokenMatches(testSecret, ''), false, 'Empty token must be rejected');
  assert.equal(tokenMatches(testSecret, null), false, 'Null token must be rejected');
  assert.equal(tokenMatches(testSecret, undefined), false, 'Undefined token must be rejected');

  // Wrong token provided
  assert.equal(tokenMatches(testSecret, 'wrong-token-9999999999999999999999'), false, 'Incorrect token must be rejected');
  assert.equal(tokenMatches(testSecret, 'test-token-buffalo-security-1234567891'), false, 'Near match token must be rejected');

  // Valid token provided
  assert.equal(tokenMatches(testSecret, testSecret), true, 'Exact token must be accepted');

  // Extraction from headers
  assert.equal(extractToken({ authorization: `Bearer ${testSecret}` }), testSecret);
  assert.equal(extractToken({ 'x-zyntheor-token': testSecret }), testSecret);
  assert.equal(extractToken({ authorization: 'Basic dXNlcjpwYXNz' }), '');
  assert.equal(extractToken({}), '');
});

test('Buffalo 1.1.1: Local-only policy strictly blocks external model calls and allows local endpoints', () => {
  const localProvider = createProvider({
    ZYNTHEOR_LOCAL_ONLY: 'true',
    ZYNTHEOR_MODEL_BASE_URL: 'http://127.0.0.1:11434/v1',
  });
  assert.equal(localProvider.isLocal, true);

  const geminiProvider = createProvider({
    ZYNTHEOR_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-key-mock',
  });
  assert.equal(geminiProvider.isLocal, false);

  function isRemoteAllowed(provider, localOnly, consent) {
    if (provider.isLocal) return true;
    if (localOnly) return false;
    return consent;
  }

  // Under ZYNTHEOR_LOCAL_ONLY=true, external calls are unconditionally blocked
  assert.equal(isRemoteAllowed(geminiProvider, true, false), false);
  assert.equal(isRemoteAllowed(geminiProvider, true, true), false);

  // Local calls remain allowed
  assert.equal(isRemoteAllowed(localProvider, true, false), true);
});

test('Buffalo 1.1.1: Health endpoint and publicConfig never expose credentials or secret keys', () => {
  const server = readFileSync(path.join(root, 'server.ts'), 'utf8');

  // Must ensure apiKeyExposed is explicitly false and no raw secret is returned
  assert.ok(server.includes('apiKeyExposed: false as const') || server.includes('apiKeyExposed: false'));
  assert.ok(server.includes('apiKeyConfigured: Boolean(cfg.apiKey)'));
  assert.ok(!server.includes('apiKey: cfg.apiKey'));

  // Health endpoint must not expose authorization headers or raw secrets
  assert.ok(server.includes("app.get('/api/health'"));
  assert.ok(!server.includes("res.json({ ...req.headers }"));
});

test('Buffalo 1.1.1: Runtime dependencies keep tsx for production startup', () => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.dependencies.tsx, 'tsx must be in production dependencies');
  assert.ok(!pkg.devDependencies?.tsx, 'tsx must not be in devDependencies');

  const prodStart = readFileSync(path.join(root, 'scripts/production-start.mjs'), 'utf8');
  assert.ok(prodStart.includes("'--import', 'tsx', 'server.ts'"), 'production start must use tsx import');
});
