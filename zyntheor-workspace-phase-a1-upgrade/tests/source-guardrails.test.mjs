import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const src = async file => readFile(new URL(file, import.meta.url), 'utf8');
test('all main workspace views exist in the new frontend', async () => {
  const app = await src('../src/App.tsx');
  for (const page of ['Chat', 'Projects', 'Plans', 'Files', 'Models', 'Audit Ledger', 'Diagnostics', 'Settings']) assert.ok(app.includes(`'${page}'`), `missing page: ${page}`);
});
test('chat must report model errors and does not make placeholder AI replies', async () => {
  const app = await src('../src/App.tsx');
  const server = await src('../server.ts');
  assert.ok(app.includes("'CHAT_FAILED'"));
  assert.ok(app.includes('ยังไม่ได้รับคำตอบจากโมเดลจริง'));
  assert.ok(server.includes("error: 'model_unavailable'"));
  assert.ok(server.includes("error: 'empty_model_response'"));
});
test('local-only defaults on and remote inference requires explicit consent', async () => {
  const server = await src('../server.ts');
  const env = await src('../.env.example');
  assert.ok(env.includes('ZYNTHEOR_LOCAL_ONLY=true'));
  assert.ok(server.includes("process.env.ZYNTHEOR_LOCAL_ONLY || 'true'"));
  assert.ok(server.includes('if (localOnly) return false'));
  assert.ok(server.includes('return onlineConsent'));
  assert.ok(server.includes('explicit_online_consent_required'));
});
test('API config does not return the secret itself', async () => {
  const server = await src('../server.ts');
  assert.ok(server.includes('apiKeyConfigured: Boolean(cfg.apiKey)'));
  assert.ok(server.includes('apiKeyExposed: false'));
  assert.ok(!server.includes('apiKey: cfg.apiKey'));
});

test('server binds to loopback by default and documents hosted-preview override', async () => {
  const server = await src('../server.ts');
  const env = await src('../.env.example');
  const readme = await src('../README.md');
  assert.ok(server.includes("process.env.HOST || '127.0.0.1'"));
  assert.ok(env.includes('HOST=127.0.0.1'));
  assert.ok(readme.includes('do not expose it directly to the internet'));
});

test('model routes have bounded per-IP request rates and API responses are not cached', async () => {
  const server = await src('../server.ts');
  assert.ok(server.includes("app.get('/api/models', rateLimit(30, 60_000)"));
  assert.ok(server.includes("app.post('/api/chat', rateLimit(20, 60_000)"));
  assert.ok(server.includes("res.setHeader('Cache-Control', 'no-store')"));
  assert.ok(server.includes("error: 'rate_limit_exceeded'"));
});

test('failed assistant messages are excluded from subsequent model context', async () => {
  const app = await src('../src/App.tsx');
  assert.ok(app.includes('messages.filter(m => !m.error).slice(-16)'));
});


test('frontend does not import external font services and search shortcut is wired', async () => {
  const css = await src('../src/styles.css');
  const app = await src('../src/App.tsx');
  assert.ok(!css.includes('fonts.googleapis.com'));
  assert.ok(app.includes("event.key.toLowerCase() === 'k'"));
  assert.ok(app.includes('searchInputRef.current?.focus()'));
});

test('diagnostics performs a real bounded inference request instead of treating model listing as inference proof', async () => {
  const server = await src('../server.ts');
  const app = await src('../src/App.tsx');
  assert.ok(server.includes("app.post('/api/diagnostics/inference', rateLimit(3, 60_000)"));
  assert.ok(server.includes("content: 'Reply with exactly this text: ZYNTHEOR_INFERENCE_OK'"));
  assert.ok(server.includes("error: 'empty_model_response'"));
  assert.ok(app.includes("fetch('/api/diagnostics/inference'"));
  assert.ok(app.includes('matchedExpectedText'));
});


test('production server does not eagerly import Vite and keeps its TypeScript runner in runtime dependencies', async () => {
  const server = await src('../server.ts');
  const pkg = JSON.parse(await src('../package.json'));
  assert.ok(!server.includes("import { createServer as createViteServer } from 'vite'"));
  assert.ok(server.includes("const { createServer: createViteServer } = await import('vite')"));
  assert.ok(pkg.dependencies.tsx);
  assert.ok(!pkg.devDependencies?.tsx);
});


test('Intelligence Core analysis endpoint is bounded and does not claim execution verification', async () => {
  const server = await src('../server.ts');
  assert.ok(server.includes("app.post('/api/intelligence/analyze', rateLimit(10, 60_000)"));
  assert.ok(server.includes("app.get('/api/intelligence/status'"));
  assert.ok(server.includes("executionVerified: false"));
  // Buffalo 0.13+: structured nativeModel probe replaces nativeModelTraining string
  assert.ok(
    server.includes("nativeModelTraining: 'NOT_VERIFIED'") ||
    (server.includes('nativeModel:') && server.includes('trainedWeightsExist') && server.includes('inferenceTested')),
    'must expose honest native training status (legacy string or nativeModel probe block)'
  );
  assert.ok(server.includes("source.length > 20000"));
  // Must not claim INFERENCE_READY without real weights path
  assert.ok(server.includes('probeNativeModelRuntime') || server.includes("nativeModelTraining: 'NOT_VERIFIED'"));
});

test('Intelligence run returns a policy error instead of masking blocked inference as a server failure', async () => {
  const server = await src('../server.ts');
  const handlerStart = server.indexOf("app.post('/api/intelligence/run'");
  const handlerEnd = server.indexOf('// Autonomous Agent Execution API', handlerStart);
  const handler = server.slice(handlerStart, handlerEnd);
  assert.ok(handler.includes("msg === 'online_provider_blocked_by_policy'"));
  assert.ok(handler.includes('res.status(403)'));
});

test('Plan workflow propagates cancellation and displays retrieved workspace sources', async () => {
  const app = await src('../src/App.tsx');
  const start = app.indexOf('async function runIntelligenceCore');
  const end = app.indexOf('async function sendMessage', start);
  const handler = app.slice(start, end);
  assert.ok(handler.includes('abortRef.current = controller'));
  assert.ok(handler.includes('signal: controller.signal'));
  assert.ok(handler.includes('retrievedContext?.retrievedExcerpts'));
  assert.ok(handler.includes('Workspace sources'));
  assert.ok(handler.includes("'empty_intelligence_response'"));
  assert.ok(!handler.includes('Processed successfully against verified evidence'));
});

test('Buffalo 0.6: streaming route, modes, abort and access gate exist in source', async () => {
  const server = await src('../server.ts');
  const app = await src('../src/App.tsx');
  assert.ok(server.includes("app.post('/api/chat/stream', rateLimit(20, 60_000)"));
  assert.ok(server.includes("res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')"));
  assert.ok(server.includes("res.on('close'"));
  assert.ok(server.includes('controller.abort()'));
  assert.ok(server.includes("app.use(['/api/chat', '/api/models', '/api/diagnostics', '/api/intelligence/analyze'], requireAccess)"));
  assert.ok(server.includes('tokenMatches(accessToken'));
  assert.ok(!server.includes('apiKey: cfg.apiKey'));
  assert.ok(app.includes("fetch('/api/chat/stream'"));
  assert.ok(app.includes('abortRef.current?.abort()'));
  assert.ok(app.includes("CHAT_MODE_OPTIONS"));
  assert.ok(!app.includes('ZYNTHEOR_MODEL_API_KEY'));
});

test('Gemini model list: fallback is flagged as unverified and excludes the deprecated model', async () => {
  const providers = await src('../lib/providers.ts');
  const server = await src('../server.ts');
  assert.ok(providers.includes("const fallbackList = ['gemini-3.8-flash', 'gemini-4-argon'];"));
  assert.ok(!providers.includes("'gemini-3.1-flash-lite'"));
  assert.ok(providers.includes("this.modelListSource = 'fallback'"));
  assert.ok(server.includes("state: 'LIST_UNVERIFIED'"));
  assert.ok(server.includes("provider.modelListSource ?? 'live'"));
});
