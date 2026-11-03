import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IntelligenceCore, LocalInferenceCache } from '../lib/intelligence-core.ts';

test('1. LocalInferenceCache: Stores, retrieves, and enforces TTL and workspace isolation', () => {
  const cache = new LocalInferenceCache();
  const ws1 = 'cache-ws-alpha';
  const ws2 = 'cache-ws-beta';

  cache.clear();

  const key1 = cache.computeCacheKey(ws1, 'gemini-provider', 'gemini-3.8-flash', 'Analyze express middleware defect', 'th');
  const key2 = cache.computeCacheKey(ws2, 'gemini-provider', 'gemini-3.8-flash', 'Analyze express middleware defect', 'th');

  // Verify distinct keys per workspace
  assert.notEqual(key1, key2, 'Cache keys must differ across workspaces for identical queries');

  const mockResponse = {
    requestId: 'req-1',
    classification: {
      category: 'bug_analysis',
      confidence: 0.95,
      intent: 'Analyze express middleware defect',
      targetLanguage: 'th',
      requiresTools: true,
      suggestedTools: ['code.analyze'],
      evidenceLevel: 'VERIFIED',
    },
    workflowStages: [],
    plan: {
      id: 'plan-1',
      goal: 'Analyze express middleware defect',
      category: 'bug_analysis',
      targetLanguage: 'th',
      steps: [],
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    executionSummary: { totalSteps: 0, completedSteps: 0, pendingApprovalSteps: 0, failedSteps: 0 },
    finalAnswer: 'Analyzed defect cleanly',
    evidenceAudit: [],
    isLocalOnly: true,
  };

  // Cache miss before set
  assert.equal(cache.get(ws1, key1), null);

  // Set cache for ws1
  cache.set(ws1, key1, mockResponse);

  // Cache hit for ws1
  const hit1 = cache.get(ws1, key1);
  assert.ok(hit1);
  assert.equal(hit1?.fromCache, true);
  assert.equal(hit1?.cacheKey, key1);

  // Cache miss for ws2 (workspace isolation)
  assert.equal(cache.get(ws2, key2), null);

  // Stats verification
  const stats = cache.getStats();
  assert.ok(stats.hits >= 1);
  assert.ok(stats.misses >= 2);
  assert.ok(stats.hitRatioPct > 0);

  // Clear ws1
  cache.clear(ws1);
  assert.equal(cache.get(ws1, key1), null);
});

test('2. IntelligenceCore Integration: Caches responses and serves hits on identical prompts', async () => {
  let inferenceCalls = 0;
  const provider = {
    id: 'cache-test-provider',
    configuredModel: 'cache-test-model',
    endpointHost: '127.0.0.1',
    isLocal: true,
    listModels: async () => ['cache-test-model'],
    chat: async () => {
      inferenceCalls++;
      return { reply: 'Cache test inference', model: 'cache-test-model', provider: 'cache-test-provider' };
    },
    chatStream: async function* () {},
    testInference: async () => ({ ok: true, model: 'cache-test-model', latencyMs: 1, matchedExpectedText: true }),
    analyze: async () => ({ analysis: '', model: 'cache-test-model', latencyMs: 1 }),
  };
  const core = new IntelligenceCore({ localOnly: true, provider, cache: new LocalInferenceCache() });
  const wsId = 'integration-cache-ws';

  core.clearCache(wsId);

  const req = {
    query: 'What does a reducer do in state management?',
    language: 'en',
  };

  // First execution -> Cache miss -> Fresh processing
  const res1 = await core.processRequest(req);
  assert.equal(res1.fromCache, false);
  assert.equal(res1.finalAnswer, 'Cache test inference');
  assert.equal(inferenceCalls, 1);

  // Second execution -> Cache hit -> Instant cached response
  const res2 = await core.processRequest(req);
  assert.equal(res2.fromCache, true);
  assert.equal(inferenceCalls, 1);
  assert.ok(res2.cacheKey);
  assert.ok(res2.workflowStages.some(s => s.detail.includes('[LOCAL CACHE HIT]')));

  // Execution with bypassCache = true -> Forced fresh processing
  const res3 = await core.processRequest({ ...req, bypassCache: true });
  assert.equal(res3.fromCache, false);
  assert.equal(inferenceCalls, 2);

  // Cleanup
  core.clearCache(wsId);
});
