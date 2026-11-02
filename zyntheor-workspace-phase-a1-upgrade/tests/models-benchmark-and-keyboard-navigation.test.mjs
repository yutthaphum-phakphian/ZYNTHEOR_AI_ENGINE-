import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStandardBenchmarkSuite, runModelBenchmark } from '../lib/model-benchmark.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Buffalo Benchmark Engine: loads canonical programming tasks suite', () => {
  const suite = loadStandardBenchmarkSuite();
  assert.ok(Array.isArray(suite), 'Benchmark suite must be an array');
  assert.ok(suite.length >= 5, 'Must contain at least 5 standard benchmark tasks');

  const idValidator = suite.find(t => t.id === 'th-en-code-001');
  assert.ok(idValidator, 'Must include Thai National ID check digit validator task');
  assert.equal(idValidator.category, 'code_generation');
  assert.ok(idValidator.requiredCriteria.length > 0, 'Must define required verification criteria');

  const tokenLeakage = suite.find(t => t.id === 'th-en-code-002');
  assert.ok(tokenLeakage, 'Must include Express header token leakage debugging task');
  assert.equal(tokenLeakage.category, 'debugging');

  const toolSafety = suite.find(t => t.id === 'th-en-code-003');
  assert.ok(toolSafety, 'Must include destructive action approval plan task');
  assert.equal(toolSafety.category, 'tool_orchestration');
});

test('Buffalo Benchmark Engine: evaluates a local provider response against the reference dataset', async () => {
  const mockProvider = {
    id: 'mock-test-provider',
    configuredModel: 'mock-model-7b',
    endpointHost: '127.0.0.1',
    isLocal: true,
    listModels: async () => ['mock-model-7b'],
    chat: async () => ({
      provider: 'mock-test-provider',
      model: 'mock-model-7b',
      reply: 'export function validateThaiNationalID(id: string) { const clean = id.replace(/\\D/g, ""); return { valid: clean.length === 13 }; }',
    }),
    testInference: async () => ({ state: 'RESPONDED', model: 'mock-model-7b', matchedExpectedText: true }),
  };

  const report = await runModelBenchmark(mockProvider, {
    allowRemote: false,
    localOnly: true,
    onlineConsent: false,
  });

  assert.ok(report, 'Benchmark report must be generated');
  assert.ok(typeof report.overallScore === 'number' && report.overallScore >= 0 && report.overallScore <= 100);
  assert.ok(typeof report.baselineScore === 'number');
  assert.ok(typeof report.scoreDelta === 'number');
  assert.ok(['A+', 'A', 'B', 'C', 'F'].includes(report.grade));
  assert.equal(report.tasks.length, 5);
  assert.ok(report.tasks.every(t => ['PASS', 'PARTIAL', 'FAIL'].includes(t.status)));
  assert.ok(report.baselineReferenceModel.includes('Baseline Dataset Ground Truth'));
  assert.equal(report.mode, 'live_model_evaluation');
});

test('Buffalo Benchmark Engine: disallowed remote providers use fixtures without inference', async () => {
  let calls = 0;
  const provider = {
    id: 'remote-test-provider',
    configuredModel: 'remote-model',
    isLocal: false,
    chat: async () => { calls += 1; throw new Error('must not be called'); },
  };

  const report = await runModelBenchmark(provider, {
    allowRemote: false,
    localOnly: false,
    onlineConsent: true,
  });

  assert.equal(calls, 0);
  assert.equal(report.mode, 'baseline_fixture_comparison');
  assert.equal(report.averageLatencyMs, 0);
  assert.equal(report.policyNote, 'Baseline fixture comparison only; no model inference was performed.');
});

test('Buffalo Benchmark Engine: inference failures are not replaced with reference answers', async () => {
  const provider = {
    id: 'remote-test-provider',
    configuredModel: 'remote-model',
    isLocal: false,
    chat: async () => { throw new Error('provider response may contain sensitive details'); },
  };

  await assert.rejects(
    runModelBenchmark(provider, {
      allowRemote: true,
      localOnly: false,
      onlineConsent: true,
    }),
    /model_benchmark_inference_failed:th-en-code-001/
  );
});

test('Buffalo UI: App.tsx integrates ModelBenchmarkSuite and keyboard navigation for Projects & Plans', () => {
  const appPath = path.join(root, 'src/App.tsx');
  assert.ok(existsSync(appPath), 'src/App.tsx must exist');

  const content = readFileSync(appPath, 'utf8');

  // Benchmark suite integration
  assert.ok(content.includes("import { ModelBenchmarkSuite } from './components/ModelBenchmarkSuite';"), 'App.tsx must import ModelBenchmarkSuite');
  assert.ok(content.includes('<ModelBenchmarkSuite'), 'ModelsPage must render ModelBenchmarkSuite');

  // Keyboard navigation on ProjectsPage
  assert.ok(content.includes('ArrowRight') && content.includes('ArrowDown'), 'ProjectsPage must handle Arrow keys');
  assert.ok(content.includes('cardRefs'), 'ProjectsPage must track card refs for focus');
  assert.ok(content.includes('selectedProject') || content.includes('setSelectedProject'), 'ProjectsPage must support project selection modal via Enter/Space');
  assert.ok(content.includes('aria-selected'), 'ProjectsPage must mark selected card accessibility');

  // Keyboard navigation on PlansPage
  assert.ok(content.includes('planRefs'), 'PlansPage must track plan checklist refs');
  assert.ok(content.includes('role="checkbox"'), 'PlansPage plan items must have accessible role');
  assert.ok(content.includes('aria-checked={plan.done}'), 'PlansPage must maintain aria-checked state');
  assert.ok(content.includes('toggle(visible[focusedIndex])'), 'PlansPage Enter/Space must toggle focused plan status');
});

test('Buffalo Server: server.ts exposes benchmark comparison endpoints', () => {
  const serverPath = path.join(root, 'server.ts');
  assert.ok(existsSync(serverPath), 'server.ts must exist');

  const content = readFileSync(serverPath, 'utf8');
  assert.ok(content.includes('/api/models/benchmark-compare'), 'server.ts must expose /api/models/benchmark-compare');
  assert.ok(content.includes('/api/models/benchmark-suite'), 'server.ts must expose /api/models/benchmark-suite');
  assert.ok(content.includes('MODEL_BENCHMARK_COMPLETED'), 'server.ts must record audit log on benchmark run');
});
