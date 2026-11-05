import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { IntelligenceOrchestrationEngine } from '../lib/intelligence-orchestrator.ts';
import { internetGateway } from '../lib/internet-gateway.ts';
import { enforceModelSovereigntyPolicy, MODEL_SOVEREIGNTY_POLICY } from '../lib/model-sovereignty-policy.ts';
import { probeNativeModelRuntime, classifyAnswerSource, assertNotReadyForNativeClaims } from '../lib/native-model-runtime.ts';
import { validateModelIdentity } from '../src/contracts/modelIdentityContract.ts';

test('P0 Regression 1: Online Search never changes the inference model from ZYNTHEOR CORE', async () => {
  const orchestrator = new IntelligenceOrchestrationEngine();

  const res = await orchestrator.execute({
    query: 'What are the architectural specifications for sovereign AI?',
    onlineConsent: true,
    enableInternetSearch: true,
  });

  // Inference model must remain ZYNTHEOR CORE under Model Sovereignty
  assert.equal(res.modelMetadata.modelId, 'zyntheor-core-native-v1');
  assert.equal(res.modelMetadata.providerId, 'ZYNTHEOR');
  assert.equal(res.modelMetadata.modelCategory, 'CORE_NATIVE');
  assert.equal(res.modelMetadata.isFirstParty, true);

  // External providers must NEVER replace CORE during internet search
  assert.notEqual(res.modelMetadata.providerId, 'GOOGLE');
  assert.notEqual(res.modelMetadata.modelId, 'gemini-3.8-flash');
});

test('P0 Regression 2: Internet Gateway performs retrieval only and never generates answers', async () => {
  const searchRes = await internetGateway.executeSearch('Thailand digital economy overview');

  assert.equal(typeof searchRes.ok, 'boolean');
  assert.ok(Array.isArray(searchRes.sources));
  assert.ok(typeof searchRes.evidenceDigest === 'string');

  // Internet Gateway must NOT provide LLM answers or replace the reasoning model
  assert.equal(searchRes.reply, undefined);
  assert.equal(searchRes.text, undefined);
  assert.equal(searchRes.finalAnswer, undefined);

  // If sources were retrieved, their SHA-256 digests must be deterministic
  for (const src of searchRes.sources) {
    assert.equal(typeof src.contentDigest, 'string');
    assert.equal(src.contentDigest.length, 64);
    assert.equal(src.verificationStatus, 'VERIFIED_SOURCE');
  }
});

test('P0 Regression 3: ZYNTHEOR CORE is the only default model', async () => {
  const orchestrator = new IntelligenceOrchestrationEngine();

  const res = await orchestrator.execute({
    query: 'Synthesize system invariants',
  });

  assert.equal(res.modelMetadata.modelId, 'zyntheor-core-native-v1');
  assert.equal(res.modelMetadata.providerId, 'ZYNTHEOR');
  assert.equal(res.modelMetadata.modelCategory, 'CORE_NATIVE');
  assert.equal(res.modelMetadata.isFirstParty, true);
  assert.equal(MODEL_SOVEREIGNTY_POLICY.PRIMARY_MODEL, 'ZYNTHEOR_CORE');
  assert.equal(MODEL_SOVEREIGNTY_POLICY.AUTO_PROVIDER_FALLBACK, false);
});

test('P0 Regression 4: CORE unavailability causes fail-closed behavior (CORE_RUNTIME_UNAVAILABLE)', async () => {
  const orchestrator = new IntelligenceOrchestrationEngine();

  const res = await orchestrator.execute({
    query: 'Synthesize mission plan',
    coreAvailable: false, // simulate core runtime outage
  });

  assert.equal(res.taskState, 'FAILED');
  assert.equal(res.error, 'CORE_RUNTIME_UNAVAILABLE');
  assert.equal(res.finalAnswer, '');

  // Must fail closed with verification artifact, NEVER silently falling back to Gemini
  assert.ok(res.verificationArtifacts.some(a => a.category === 'FAILED_VERIFICATION' && a.source === 'zyntheor-core'));
  assert.notEqual(res.modelMetadata.providerId, 'GOOGLE');
  assert.notEqual(res.modelMetadata.providerId, 'OPENAI');
});

test('P0 Regression 5: External models require explicit selection and online consent', async () => {
  const orchestrator = new IntelligenceOrchestrationEngine();

  // Case A: Online consent granted without explicit external selection defaults to CORE
  const defaultRes = await orchestrator.execute({
    query: 'Hello world',
    onlineConsent: true,
  });
  assert.equal(defaultRes.modelMetadata.providerId, 'ZYNTHEOR');
  assert.equal(defaultRes.modelMetadata.isFirstParty, true);

  // Case B: Explicit external selection WITHOUT consent fails closed
  const rejectedRes = await orchestrator.execute({
    query: 'Hello world',
    explicitModelId: 'gemini-3.8-flash',
    explicitModelProvider: 'google',
    onlineConsent: false,
  });
  assert.equal(rejectedRes.taskState, 'FAILED');
  assert.equal(rejectedRes.error, 'EXTERNAL_MODEL_ROUTING_UNAUTHORIZED');

  // Case C: Sovereignty policy reject unauthorized external calls
  const policyCheck = enforceModelSovereigntyPolicy({
    requestedModel: 'gemini-3.8-flash',
    requestedProvider: 'google',
    explicitExternalConsent: false,
  });
  assert.equal(policyCheck.allowed, false);
  assert.ok(policyCheck.error?.includes('EXTERNAL_MODEL_ROUTING_UNAUTHORIZED'));
});

test('P0 Regression 6: Airgap blocks outbound network requests and external model calls', async () => {
  // A: Search blocked in Airgap
  const searchAirgap = await internetGateway.executeSearch('Thailand news', { mode: 'AIRGAP_MODE' });
  assert.equal(searchAirgap.ok, false);
  assert.ok(searchAirgap.error?.includes('AIRGAP_POLICY_VIOLATION'));
  assert.equal(searchAirgap.sources.length, 0);

  // B: Web fetch blocked in Airgap
  const fetchAirgap = await internetGateway.fetchWebSource('https://example.com', { mode: 'AIRGAP_MODE' });
  assert.equal(fetchAirgap.ok, false);
  assert.ok(fetchAirgap.error?.includes('AIRGAP_POLICY_VIOLATION'));

  // C: Outbound model calls blocked in Airgap
  const policyAirgap = enforceModelSovereigntyPolicy({
    requestedProvider: 'google',
    operatingMode: 'AIRGAP_MODE',
  });
  assert.equal(policyAirgap.allowed, false);
  assert.ok(policyAirgap.error?.includes('AIRGAP_POLICY_VIOLATION'));
});

test('P0 Regression 7: Cancellation via AbortSignal propagates and returns CANCELLED, never COMPLETED', async () => {
  const orchestrator = new IntelligenceOrchestrationEngine();
  const controller = new AbortController();

  controller.abort();

  const res = await orchestrator.execute({
    query: 'Long running task',
    signal: controller.signal,
  });

  assert.equal(res.taskState, 'CANCELLED');
  assert.notEqual(res.taskState, 'COMPLETED');
  assert.equal(res.error, 'Task cancelled');
  assert.equal(res.finalAnswer, '');
});

test('P0 Regression 8: Evidence Integrity distinguishes VERIFIED_FACT from MODEL_INTERPRETATION', async () => {
  const orchestrator = new IntelligenceOrchestrationEngine();

  const res = await orchestrator.execute({
    query: 'Deduce system behavior',
  });

  assert.equal(res.taskState, 'COMPLETED');

  // Model synthetic output MUST be classified as MODEL_INTERPRETATION, NEVER VERIFIED_FACT
  const interpretation = res.verificationArtifacts.find(a => a.category === 'MODEL_INTERPRETATION');
  assert.ok(interpretation, 'Must produce MODEL_INTERPRETATION for synthetic answer');
  assert.equal(interpretation.source, 'ZYNTHEOR');

  // Verify that model identity validation rejects labeling external models as CORE
  const invalidClaim = validateModelIdentity('gemini-3.8-flash', 'CORE_NATIVE');
  assert.equal(invalidClaim.valid, false);
  assert.equal(invalidClaim.actualCategory, 'EXTERNAL_MODEL_PROVIDER');
});
