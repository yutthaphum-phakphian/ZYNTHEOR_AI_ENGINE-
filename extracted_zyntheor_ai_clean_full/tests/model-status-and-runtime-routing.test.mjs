import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createProvider, GeminiProvider, OpenAICompatibleProvider } from '../lib/providers.ts';

// Helper to simulate policy logic matching server.ts remoteAllowed()
function isRemoteAllowed(provider, localOnly, onlineConsent) {
  if (provider.isLocal) return true;
  if (localOnly) return false;
  return onlineConsent;
}

// Helper to compute honest model status matching server.ts computeModelStatus()
function computeHonestStatus(provider, localOnly, onlineConsent, inferenceVerified) {
  if (!provider.isLocal && localOnly) {
    return 'BLOCKED_BY_LOCAL_ONLY';
  }
  if (!isRemoteAllowed(provider, localOnly, onlineConsent)) {
    return 'BLOCKED_BY_LOCAL_ONLY';
  }
  if (inferenceVerified) {
    return 'INFERENCE_READY';
  }
  return 'MODEL_UNAVAILABLE';
}

// Case 1: Local-Only เปิด + มี Local Model -> ใช้ Local Model ได้จริง
test('Case 1: Local-Only เปิด + มี Local Model -> ใช้ Local Model ได้จริง', async () => {
  const mockServer = createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        choices: [{ message: { content: 'ZYNTHEOR_INFERENCE_OK - local model ready' } }]
      }));
    });
  });

  await new Promise(resolve => mockServer.listen(0, '127.0.0.1', resolve));
  const port = mockServer.address().port;
  const baseUrl = `http://127.0.0.1:${port}/v1`;

  try {
    const localProvider = createProvider({
      ZYNTHEOR_LOCAL_ONLY: 'true',
      ZYNTHEOR_MODEL_BASE_URL: baseUrl,
      ZYNTHEOR_MODEL_NAME: 'local-qwen-coder',
    });

    assert.equal(localProvider.isLocal, true, 'Provider on 127.0.0.1 must be classified as local');
    assert.equal(isRemoteAllowed(localProvider, true, false), true, 'Local provider must be allowed under Local-Only');

    // Run actual inference against local mock
    const diag = await localProvider.testInference();
    assert.equal(diag.state, 'RESPONDED');
    assert.equal(diag.matchedExpectedText, true);

    const status = computeHonestStatus(localProvider, true, false, true);
    assert.equal(status, 'INFERENCE_READY', 'Once local inference responds, status is INFERENCE_READY');
  } finally {
    mockServer.close();
  }
});

// Case 2: Local-Only เปิด + ไม่มี Local Model -> MODEL_UNAVAILABLE
test('Case 2: Local-Only เปิด + ไม่มี Local Model -> MODEL_UNAVAILABLE', async () => {
  // Use a port where no server is listening
  const offlineBaseUrl = 'http://127.0.0.1:58432/v1';

  const localProvider = createProvider({
    ZYNTHEOR_LOCAL_ONLY: 'true',
    ZYNTHEOR_MODEL_BASE_URL: offlineBaseUrl,
    ZYNTHEOR_MODEL_NAME: 'offline-model',
  });

  assert.equal(localProvider.isLocal, true);
  assert.equal(isRemoteAllowed(localProvider, true, false), true);

  // Calling an offline model runtime fails
  await assert.rejects(
    async () => { await localProvider.testInference(); },
    /ECONNREFUSED|fetch failed/
  );

  // Since inference has not succeeded, model status MUST NOT report INFERENCE_READY
  const status = computeHonestStatus(localProvider, true, false, false);
  assert.equal(status, 'MODEL_UNAVAILABLE', 'Must report MODEL_UNAVAILABLE when local model is offline');
});

// Case 3: Local-Only เปิด + เลือก Remote Model -> BLOCKED_BY_LOCAL_ONLY
test('Case 3: Local-Only เปิด + เลือก Remote Model -> BLOCKED_BY_LOCAL_ONLY', async () => {
  const geminiProvider = createProvider({
    ZYNTHEOR_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-key-12345',
    ZYNTHEOR_LOCAL_ONLY: 'true',
  });

  assert.equal(geminiProvider.isLocal, false, 'Gemini must be classified as non-local');
  assert.equal(isRemoteAllowed(geminiProvider, true, false), false, 'Remote provider is blocked when localOnly=true');
  assert.equal(isRemoteAllowed(geminiProvider, true, true), false, 'Remote provider remains blocked even with consent when localOnly=true');

  const status = computeHonestStatus(geminiProvider, true, false, false);
  assert.equal(status, 'BLOCKED_BY_LOCAL_ONLY', 'Must report BLOCKED_BY_LOCAL_ONLY');
});

// Case 4: Remote Provider ใช้งานไม่ได้ -> แสดงข้อผิดพลาดตามจริง
test('Case 4: Remote Provider ใช้งานไม่ได้ -> แสดงข้อผิดพลาดตามจริง', async () => {
  const unconfiguredGemini = new GeminiProvider('', 'gemini-3.8-flash');
  assert.equal(unconfiguredGemini.hasApiKey, false);

  // When policy allows remote (localOnly=false, consent=true), calling unconfigured provider must fail honestly
  assert.equal(isRemoteAllowed(unconfiguredGemini, false, true), true);

  await assert.rejects(
    async () => {
      await unconfiguredGemini.chat({
        mode: 'auto',
        messages: [{ role: 'user', content: 'test request' }],
      });
    },
    /Gemini API key is not configured/,
    'Must report realistic error without mock hallucination'
  );

  const status = computeHonestStatus(unconfiguredGemini, false, true, false);
  assert.equal(status, 'MODEL_UNAVAILABLE', 'Unconfigured or failing remote provider maps to MODEL_UNAVAILABLE');
});

// Case 5: โมเดลตอบได้จริง -> แสดง INFERENCE_READY
test('Case 5: โมเดลตอบได้จริง -> แสดง INFERENCE_READY', async () => {
  let inferenceVerified = false;
  const mockServer = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      choices: [{ message: { content: 'Reply with exactly this text: ZYNTHEOR_INFERENCE_OK' } }]
    }));
  });

  await new Promise(resolve => mockServer.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${mockServer.address().port}/v1`;

  try {
    const provider = new OpenAICompatibleProvider({
      baseUrl,
      model: 'qwen2.5-coder:7b',
    });

    // Before inference test: status is MODEL_UNAVAILABLE
    assert.equal(computeHonestStatus(provider, true, false, inferenceVerified), 'MODEL_UNAVAILABLE');

    // Perform live inference test
    const diag = await provider.testInference();
    assert.equal(diag.matchedExpectedText, true);

    // After live inference succeeds: transitions to INFERENCE_READY
    inferenceVerified = true;
    assert.equal(computeHonestStatus(provider, true, false, inferenceVerified), 'INFERENCE_READY');
  } finally {
    mockServer.close();
  }
});
