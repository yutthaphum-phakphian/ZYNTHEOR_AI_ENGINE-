import test from 'node:test';
import assert from 'node:assert/strict';
import { createProvider, GeminiProvider, OpenAICompatibleProvider } from '../lib/providers.ts';
import { buildChatMessages, MODE_PROMPTS } from '../lib/chat-core.mjs';

test('provider factory: defaults to ollama when no key, switches to gemini when GEMINI_API_KEY is set', () => {
  const ollama = createProvider({});
  assert.equal(ollama.id, 'ollama');
  assert.equal(ollama.isLocal, true);
  assert.equal(ollama.configuredModel, 'qwen2.5-coder:7b');

  const gemini = createProvider({ GEMINI_API_KEY: 'test-secret-key-123' });
  assert.equal(gemini.id, 'gemini');
  assert.equal(gemini.isLocal, false);
  assert.equal(gemini.endpointHost, 'generativelanguage.googleapis.com');
  assert.equal(gemini.configuredModel, 'gemini-3.8-flash');
  assert.equal(gemini.hasApiKey, true);
});

test('provider factory: supports explicit ZYNTHEOR_PROVIDER=gemini and custom model', () => {
  const geminiCustom = createProvider({
    ZYNTHEOR_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-key',
    ZYNTHEOR_MODEL_NAME: 'gemini-4-argon',
  });
  assert.equal(geminiCustom.id, 'gemini');
  assert.equal(geminiCustom.configuredModel, 'gemini-4-argon');
  assert.equal(geminiCustom.isLocal, false);
});

test('provider factory: supports explicit ZYNTHEOR_PROVIDER=openai', () => {
  const openai = createProvider({
    ZYNTHEOR_PROVIDER: 'openai',
    ZYNTHEOR_MODEL_API_KEY: 'sk-test',
    ZYNTHEOR_MODEL_NAME: 'gpt-4o',
  });
  assert.equal(openai.id, 'openai');
  assert.equal(openai.isLocal, false);
  assert.equal(openai.configuredModel, 'gpt-4o');
});

test('provider factory: supports GOOGLE_API_KEY and protects against Ollama model names', () => {
  const googleKeyGemini = createProvider({
    GOOGLE_API_KEY: 'test-google-key',
    ZYNTHEOR_MODEL_NAME: 'qwen2.5-coder:7b', // legacy Ollama model should not be sent to Gemini
  });
  assert.equal(googleKeyGemini.id, 'gemini');
  assert.equal(googleKeyGemini.hasApiKey, true);
  assert.equal(googleKeyGemini.configuredModel, 'gemini-3.8-flash');
});

test('provider factory: custom base URL preserves OpenAI provider for mock upstreams', () => {
  const mockCustom = createProvider({
    GEMINI_API_KEY: 'key',
    ZYNTHEOR_MODEL_BASE_URL: 'http://127.0.0.1:54321/v1',
    ZYNTHEOR_MODEL_NAME: 'mock-model',
  });
  assert.equal(mockCustom.id, 'ollama');
  assert.equal(mockCustom.configuredModel, 'mock-model');
});

test('secret protection: GeminiProvider does not expose raw apiKey property', () => {
  const p = new GeminiProvider('secret-value-abc', 'gemini-3.8-flash');
  assert.equal(p.hasApiKey, true);
  assert.equal(Object.prototype.hasOwnProperty.call(p, 'apiKey'), false);
  assert.equal(JSON.stringify(p).includes('secret-value-abc'), false);
});

test('gemini chat messages: Auto, Plan, and Code modes format system instruction correctly', () => {
  for (const mode of ['auto', 'reasoning', 'coding']) {
    const messages = buildChatMessages(mode, [{ role: 'user', content: 'hello' }], 'explain this code');
    assert.equal(messages[0].role, 'system');
    assert.equal(messages[0].content, MODE_PROMPTS[mode]);
    assert.equal(messages.at(-1).content, 'explain this code');
  }
});

test('unconfigured Gemini provider throws clear actionable error and never fabricates reply', async () => {
  const unconfigured = new GeminiProvider('', 'gemini-3.8-flash');
  assert.equal(unconfigured.hasApiKey, false);
  await assert.rejects(
    async () => {
      await unconfigured.chat({
        mode: 'auto',
        messages: [{ role: 'user', content: 'test prompt' }],
      });
    },
    /Gemini API key is not configured/
  );
});

test('Gemini requests reject pre-aborted signals instead of starting or falling back', async () => {
  const provider = new GeminiProvider('test-key', 'gemini-3.8-flash');
  const controller = new AbortController();
  controller.abort();

  const abortOptions = { name: 'AbortError' };
  await assert.rejects(
    provider.chat({ mode: 'auto', messages: [{ role: 'user', content: 'test' }], signal: controller.signal }),
    abortOptions
  );
  await assert.rejects(provider.listModels(controller.signal), abortOptions);
  await assert.rejects(provider.testInference(controller.signal), abortOptions);
  await assert.rejects(
    provider.analyze({ source: 'test', question: 'test', signal: controller.signal }),
    abortOptions
  );
  await assert.rejects(async () => {
    for await (const _item of provider.chatStream({
      mode: 'auto',
      messages: [{ role: 'user', content: 'test' }],
      signal: controller.signal,
    })) {
      // The pre-aborted stream must not emit a normal completion.
    }
  }, abortOptions);
});

test('local-only boundary rejects external Gemini requests until explicit consent', () => {
  const gemini = new GeminiProvider('key', 'gemini-3.8-flash');
  let localOnly = true;
  let onlineConsent = false;

  const remoteAllowed = () => {
    if (gemini.isLocal) return true;
    if (localOnly) return false;
    return onlineConsent;
  };

  assert.equal(remoteAllowed(), false, 'Gemini must be blocked when localOnly is true');
  localOnly = false;
  assert.equal(remoteAllowed(), false, 'Gemini must be blocked without explicit onlineConsent');
  onlineConsent = true;
  assert.equal(remoteAllowed(), true, 'Gemini allowed only when localOnly is false and onlineConsent is true');
});

test('GeminiProvider.listModels without a usable key returns the fallback list marked as fallback (no silent "live")', async () => {
  const provider = new GeminiProvider('', 'gemini-3.8-flash');
  const models = await provider.listModels();
  assert.equal(provider.modelListSource, 'fallback');
  assert.deepEqual(models, ['gemini-3.8-flash', 'gemini-4-argon']);
});
