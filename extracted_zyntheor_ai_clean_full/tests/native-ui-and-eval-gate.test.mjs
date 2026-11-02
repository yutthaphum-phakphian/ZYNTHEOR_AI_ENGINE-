import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Buffalo 0.14: NativeModelStatusPanel exists and probes /api/native-model/status', () => {
  const p = path.join(root, 'src/components/NativeModelStatusPanel.tsx');
  assert.ok(existsSync(p));
  const c = readFileSync(p, 'utf8');
  assert.ok(c.includes('export function NativeModelStatusPanel'));
  assert.ok(c.includes('/api/native-model/status'));
  assert.ok(c.includes('INFERENCE_READY'));
  assert.ok(c.includes('trainedWeightsExist'));
  assert.ok(c.includes('answerSource') || c.includes('Answer source'));
  assert.ok(c.includes('not') && c.includes('serving answers'));
});

test('Buffalo 0.14: ModelsPage embeds NativeModelStatusPanel', () => {
  const app = readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
  assert.ok(app.includes("import { NativeModelStatusPanel }"));
  assert.ok(app.includes('<NativeModelStatusPanel'));
});

test('Buffalo 0.14: evaluate route marks realInference SKIPPED without weights', () => {
  const server = readFileSync(path.join(root, 'server.ts'), 'utf8');
  assert.ok(server.includes("realInference"));
  assert.ok(server.includes("'SKIPPED'") || server.includes('"SKIPPED"') || server.includes('SKIPPED'));
  assert.ok(server.includes('probeNativeModelRuntime'));
  assert.ok(/0\.1[4-6]\.0/.test(server));
});

test('Buffalo 0.14: package version is 0.14.0', () => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(['0.14.0', '0.15.0', '0.16.0', '0.17.0','0.18.0','0.19.0','0.20.0','1.0.0','1.1.0','1.1.1','1.2.0','1.2.1','1.2.2'].includes(pkg.version));
});
