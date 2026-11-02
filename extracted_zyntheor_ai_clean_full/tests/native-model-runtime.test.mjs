import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  probeNativeModelRuntime,
  classifyAnswerSource,
  assertNotReadyForNativeClaims,
} from '../lib/native-model-runtime.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Buffalo 0.13: native probe never claims INFERENCE_READY without weights', () => {
  const probe = probeNativeModelRuntime({ allowBaseModelFallback: true, ollamaReachable: false });
  assert.notEqual(probe.status, 'INFERENCE_READY');
  assert.equal(probe.inferenceTested, false);
  assert.equal(probe.trainedWeightsExist, false);
  assert.ok(['MODEL_NOT_FOUND', 'CHECKPOINT_UNVERIFIED', 'RUNTIME_UNAVAILABLE'].includes(probe.status));
  assertNotReadyForNativeClaims(probe);
});

test('Buffalo 0.13: registry and probe agree on untrained state', () => {
  const regPath = path.join(root, 'training/registry/model_registry.json');
  assert.ok(existsSync(regPath));
  const reg = JSON.parse(readFileSync(regPath, 'utf8'));
  assert.equal(reg.models[0].trained_weights_exist, false);
  const probe = probeNativeModelRuntime();
  assert.equal(probe.trainedWeightsExist, false);
  assert.ok(probe.notes.length >= 1);
  assert.ok(probe.baseModel && probe.baseModel.includes('Qwen'));
});

test('Buffalo 0.13: answer source classification does not label external as native', () => {
  const probe = probeNativeModelRuntime();
  assert.equal(classifyAnswerSource('gemini', probe), 'external_provider');
  assert.equal(classifyAnswerSource('openai', probe), 'external_provider');
  assert.equal(classifyAnswerSource('ollama', probe), 'local_base_model');
  assert.notEqual(classifyAnswerSource('gemini', probe), 'native');
});

test('Buffalo 0.13: server exposes native-model status route', () => {
  const server = readFileSync(path.join(root, 'server.ts'), 'utf8');
  assert.ok(server.includes("/api/native-model/status"));
  assert.ok(server.includes('probeNativeModelRuntime'));
  assert.ok(server.includes('classifyAnswerSource'));
  assert.ok(server.includes('answerSource'));
});

test('Buffalo 0.13: intelligence status includes nativeModel block', () => {
  const server = readFileSync(path.join(root, 'server.ts'), 'utf8');
  assert.ok(server.includes('nativeModel:'));
  assert.ok(server.includes('0.13.0-buffalo') || server.includes('0.13.0'));
});

test('Buffalo 0.13: local-only privacy guards exist in server and intelligence core source', () => {
  const server = readFileSync(path.join(root, 'server.ts'), 'utf8');
  const core = readFileSync(path.join(root, 'lib/intelligence-core.ts'), 'utf8');
  assert.ok(server.includes('ZYNTHEOR_LOCAL_ONLY') || server.includes('localOnly'));
  assert.ok(server.includes('onlineConsent'));
  assert.ok(core.includes('isRemoteAllowed'));
  assert.ok(core.includes('this.localOnly'));
  // Remote providers must not be auto-called when localOnly without consent — contract in source
  assert.ok(core.includes("if (this.localOnly) return false") || core.includes('localOnly) return false'));
  assert.ok(core.includes('answerSource'));
  assert.ok(core.includes('nativeRuntimeStatus'));
  // API keys must not be serialized in public config paths
  assert.ok(!server.includes('GEMINI_API_KEY:') || server.includes('hasApiKey'));
});

test('Buffalo: native checkpoint discovery uses ESM-compatible filesystem APIs', () => {
  const source = readFileSync(path.join(root, 'lib/native-model-runtime.ts'), 'utf8');
  assert.match(source, /readdirSync/);
  assert.doesNotMatch(source, /require\(['"]node:fs['"]\)/);
});

test('Buffalo: task classifier reports heuristic confidence rather than a fixed probability', () => {
  const source = readFileSync(path.join(root, 'lib/intelligence-core.ts'), 'utf8');
  const start = source.indexOf('  classifyTask(');
  const end = source.indexOf('  generateExecutionPlan(', start);
  assert.ok(start >= 0 && end > start);
  const classifier = source.slice(start, end);
  assert.match(classifier, /matched\?\.confidence \?\? \(normalized\.length < 18 \? 0\.42 : 0\.55\)/);
  assert.match(classifier, /evidenceLevel: .ASSUMPTION./);
  assert.doesNotMatch(classifier, /confidence: 0\.95/);
});
