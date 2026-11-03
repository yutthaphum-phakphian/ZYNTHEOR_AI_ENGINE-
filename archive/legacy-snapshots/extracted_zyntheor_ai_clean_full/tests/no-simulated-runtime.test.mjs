import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const exists = p => existsSync(new URL(`../${p}`, import.meta.url));

test('no fake local Ollama bridge exists or is started', () => {
  assert.equal(exists('lib/local-ollama-bridge.ts'), false);
  const server = read('server.ts');
  assert.ok(!server.includes('startLocalOllamaBridge'));
  assert.ok(!server.includes('local-ollama-bridge'));
});

test('training endpoints report NOT_IMPLEMENTED and generate no metrics', () => {
  const server = read('server.ts');
  assert.ok(server.includes("error: 'NOT_IMPLEMENTED'"));
  assert.ok(!server.includes('trainingTimer'));
  assert.ok(!server.includes('setInterval(() => {\n      if (activeJob.status'));
  assert.ok(!server.includes('latest_training_log.json') || !server.includes('writeFileSync(logPath'));
});

test('GPU runtime comes from nvidia-smi, never from environment variables or request bodies', () => {
  const sm = read('src/services/trainingGateStateMachine.ts');
  assert.ok(!sm.includes('process.env.GPU_VRAM_GB'));
  assert.ok(!sm.includes('process.env.GPU_NAME'));
  const server = read('server.ts');
  assert.ok(!server.includes('process.env.GPU_NAME'));
  assert.ok(!server.includes('process.env.GPU_VRAM_GB'));
});

test('simulated dashboard components are gone', () => {
  for (const name of ['APILogViewer', 'ModelUptimeChart', 'ModelPerformanceChart', 'ModelStatusCodeRollingChart',
    'ModelTelemetryChart', 'ModelComparisonTool', 'ModelStatusIndicator', 'SensorMetricsDashboardWidget', 'GpuMemoryStressTest']) {
    assert.equal(exists(`src/components/${name}.tsx`), false, `${name} must not exist`);
  }
});

test('UI components under src/components never generate numbers with Math.random()', () => {
  const dir = new URL('../src/components/', import.meta.url);
  for (const f of readdirSync(dir).filter(n => /\.(tsx|ts)$/.test(n) && !/\.test\./.test(n))) {
    assert.ok(!readFileSync(new URL(f, dir), 'utf8').includes('Math.random'), `${f} uses Math.random`);
  }
});
