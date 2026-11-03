import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyDataset } from '../training/scripts/verify_dataset.mjs';
import { runBaselineEvaluation } from '../training/scripts/evaluate_baseline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

test('Buffalo 0.12: dataset manifest and samples exist and match schema', () => {
  const manifestPath = path.join(root, 'training/dataset/manifest.json');
  const samplesPath = path.join(root, 'training/dataset/samples.json');

  assert.ok(existsSync(manifestPath), 'manifest.json must exist');
  assert.ok(existsSync(samplesPath), 'samples.json must exist');

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const samples = JSON.parse(readFileSync(samplesPath, 'utf8'));

  assert.ok(['1.0.0', '1.1.0', '1.2.0', '1.3.1'].includes(manifest.manifest_version), 'manifest_version must be a supported dataset manifest version');
  assert.ok(samples.length >= 11, 'must contain at least 11 curated seeds after Phase 2 expansion');

  for (const s of samples) {
    for (const f of manifest.schema.required_fields) {
      assert.ok(s[f] !== undefined && s[f] !== '', `field '${f}' must be present in sample ${s.id}`);
    }
  }
});

test('Buffalo 0.12: verify_dataset catches zero leakage and passes quality checks', () => {
  const result = verifyDataset();
  assert.equal(result.valid, true, 'Dataset must be strictly valid');
  assert.equal(result.leakageCheck.passed, true, 'Zero leakage allowed between splits');
  assert.equal(result.leakageCheck.trainVsValOverlaps, 0);
  assert.equal(result.leakageCheck.trainVsTestOverlaps, 0);
  assert.equal(result.leakageCheck.valVsTestOverlaps, 0);
  assert.equal(result.qualityCheck.duplicates, 0, 'No duplicate instructions allowed');
  assert.ok(result.stats.totalCharacters > 0);
  assert.ok(result.stats.estimatedTokens > 0);
});

test('Buffalo 0.10: baseline evaluation harness executes deterministic benchmarks', async () => {
  const report = await runBaselineEvaluation();
  assert.ok(report.timestamp);
  assert.equal(report.categories.code_syntax.score, 1.0, 'Code syntax checker should pass valid snippets');
  assert.equal(report.categories.unit_tests.score, 1.0, 'Algorithmic unit tests must execute and pass');
  assert.equal(report.categories.bilingual_instruction.score, 1.0, 'Bilingual instruction checks must pass');
  assert.equal(report.categories.tool_safety_planning.score, 1.0, 'Tool safety compliance must enforce approval');
  assert.equal(report.metricsSummary.hallucinationRate, 0.0, 'Hallucination rate should be 0');
  assert.ok(report.performance.totalDurationMs >= 0);
});

test('Buffalo 0.10: model registry strictly records honest UNTRAINED status without fake weights', () => {
  const regPath = path.join(root, 'training/registry/model_registry.json');
  assert.ok(existsSync(regPath), 'model_registry.json must exist');

  const reg = JSON.parse(readFileSync(regPath, 'utf8'));
  const model = reg.models[0];

  assert.equal(model.trained_weights_exist, false, 'Must not claim trained weights without checkpoints');
  assert.equal(model.base_model.name, 'Qwen/Qwen2.5-Coder-7B-Instruct');
  assert.equal(model.base_model.license, 'Apache-2.0');
  assert.equal(model.checkpoints.active_checkpoint, null);
  assert.equal(model.hardware_audit.gpu_present, false, 'CPU-only node must be recorded accurately');
  assert.equal(model.hardware_audit.vram_gb, 0.0);
});
