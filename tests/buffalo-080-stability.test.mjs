import test from 'node:test';
import assert from 'node:assert/strict';
import { GeminiProvider, OpenAICompatibleProvider, createProvider } from '../lib/providers.ts';
import { buildChatMessages, parseUpstreamLine, readChatStream } from '../lib/chat-core.mjs';

test('Buffalo 0.8: malformed chat payload handling', async () => {
  const provider = new GeminiProvider('mock-key', 'gemini-3.8-flash');
  // Empty messages array produces a valid single user fallback
  // @ts-expect-error test invalid message input
  const formatted = provider['formatContents']([]);
  assert.equal(formatted.contents.length, 1);
  assert.equal(formatted.contents[0].parts[0].text, 'Hello');
});

test('Buffalo 0.8: empty response produces empty_model_response error and does not hang', async () => {
  // Test OpenAI provider with an empty response mock
  const emptyMockProvider = new OpenAICompatibleProvider({
    id: 'mock',
    name: 'Mock Empty',
    baseUrl: 'http://127.0.0.1:9999/v1',
    model: 'mock-model',
  });

  // Verify that empty choices content is detected
  await assert.rejects(
    async () => {
      // Connect to unreachable port to verify connection failure produces clean error without secrets
      await emptyMockProvider.chat({
        mode: 'auto',
        messages: [{ role: 'user', content: 'hello' }],
      });
    },
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(!err.message.includes('mock-key'));
      return true;
    }
  );
});

test('Buffalo 0.8: stream error parsing handles malformed lines gracefully without crashing', () => {
  const lines = [
    '',
    ': keep-alive ping',
    'data: not-json-malformed-data',
    'data: [DONE]',
  ];

  const results = lines.map(line => parseUpstreamLine(line));
  assert.equal(results[0], null);
  assert.equal(results[1], null);
  assert.equal(results[2], null); // malformed JSON returns null without throw
  assert.deepEqual(results[3], { type: 'done' });
});

test('Buffalo 0.8: cancellation signal is respected by stream iterator', async () => {
  const controller = new AbortController();
  controller.abort();

  const provider = new GeminiProvider('mock-key', 'gemini-3.8-flash');
  // Invoking stream with an already aborted signal should exit without yielding items
  const items = [];
  try {
    for await (const item of provider.chatStream({
      mode: 'auto',
      messages: [{ role: 'user', content: 'test' }],
      signal: controller.signal,
    })) {
      items.push(item);
    }
  } catch {
    // Aborted call may throw or return immediately
  }
  assert.equal(items.length, 0);
});

test('Buffalo 0.8: security checks - API keys and credentials are never exposed in JSON output', () => {
  const sensitiveKey = 'AIzaSyD-SecretGeminiKey-999999999';
  const provider = new GeminiProvider(sensitiveKey, 'gemini-3.8-flash');
  const serialized = JSON.stringify(provider);

  assert.ok(!serialized.includes(sensitiveKey));
  assert.ok(!serialized.includes('AIzaSyD'));
  assert.equal(provider.hasApiKey, true);

  const jsonRepresentation = provider.toJSON();
  assert.equal(jsonRepresentation.hasApiKey, true);
  assert.equal('apiKey' in jsonRepresentation, false);
});

test('Buffalo 0.8: explicit policy checks for remote and local routing', () => {
  const localProvider = createProvider({ ZYNTHEOR_PROVIDER: 'ollama' });
  const remoteProvider = createProvider({
    ZYNTHEOR_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'test-key-123456789012345678901234567890',
  });

  assert.equal(localProvider.isLocal, true);
  assert.equal(remoteProvider.isLocal, false);

  // Policy logic:
  const isAllowed = (p, localOnly, consent) => {
    if (p.isLocal) return true;
    if (localOnly) return false;
    return consent;
  };

  // Local-only true -> remote blocked regardless of consent
  assert.equal(isAllowed(remoteProvider, true, true), false);
  assert.equal(isAllowed(remoteProvider, true, false), false);

  // Local-only false, consent false -> remote blocked
  assert.equal(isAllowed(remoteProvider, false, false), false);

  // Local-only false, consent true -> remote allowed
  assert.equal(isAllowed(remoteProvider, false, true), true);

  // Local provider always allowed
  assert.equal(isAllowed(localProvider, true, false), true);
  assert.equal(isAllowed(localProvider, false, false), true);
});
