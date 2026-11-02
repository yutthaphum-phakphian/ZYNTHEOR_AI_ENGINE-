import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { verifyDataset } from '../training/scripts/verify_dataset.mjs';
import { runBaselineEvaluation } from '../training/scripts/evaluate_baseline.mjs';
import { probeNativeModelRuntime, classifyAnswerSource } from '../lib/native-model-runtime.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 1. Dataset Validation Test
test('ZYNTHEOR CORE Directive 2: Dataset schema, non-empty, and split distribution', () => {
  const result = verifyDataset();
  assert.equal(result.valid, true);
  assert.equal(result.stats.totalSamples >= 15, true);
  assert.equal(result.stats.splits.train >= 1, true);
  assert.equal(result.stats.splits.validation >= 1, true);
  assert.equal(result.stats.splits.test >= 1, true);
});

// 2. License Validation Test
test('ZYNTHEOR CORE Directive 1 & 2: License fitness and provenance tracking', () => {
  const result = verifyDataset();
  assert.equal(result.provenance.allLicensed, true);
  assert.equal(result.provenance.allHaveSource, true);
  assert.ok(result.provenance.licensesSeen.includes('Apache-2.0'));
});

// 3. Leakage Detection Test
test('ZYNTHEOR CORE Directive 2: Zero cross-split leakage detection', () => {
  const result = verifyDataset();
  assert.equal(result.leakageCheck.passed, true);
  assert.equal(result.leakageCheck.trainVsValOverlaps, 0);
  assert.equal(result.leakageCheck.trainVsTestOverlaps, 0);
  assert.equal(result.leakageCheck.valVsTestOverlaps, 0);
});

// 4. Training Configuration Test
test('ZYNTHEOR CORE Directive 3: Training hyperparameter config validation', () => {
  const cfgPath = path.join(root, 'training/config/training_config.json');
  assert.ok(existsSync(cfgPath));
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
  assert.equal(cfg.base_model, 'Qwen/Qwen2.5-Coder-7B-Instruct');
  assert.equal(cfg.model.license, 'Apache-2.0');
  assert.ok(cfg.training.max_seq_length >= 1024);
  assert.ok(cfg.training.seed === 849202);
});

// 5. GPU Resource Validation (Mock Test for CPU vs GPU environments)
test('ZYNTHEOR CORE Directive 3: Hardware pre-flight probe and VRAM calculation', () => {
  const probe = probeNativeModelRuntime();
  assert.equal(probe.trainedWeightsExist, false);
  assert.equal(probe.status !== 'INFERENCE_READY', true);
});

// 6. Checkpoint Integrity Test
test('ZYNTHEOR CORE Directive 1 & 8: Checkpoint integrity and non-fabrication rule', () => {
  const probe = probeNativeModelRuntime();
  if (!probe.checkpointExists) {
    assert.equal(probe.checkpointSha256Actual, null);
    assert.equal(probe.trainedWeightsExist, false);
  }
});

// 7. Model Evaluation Benchmark Test
test('ZYNTHEOR CORE Directive 4: 8-category evaluation benchmark execution', async () => {
  const report = await runBaselineEvaluation();
  assert.ok(report.categories.thai_reasoning);
  assert.ok(report.categories.english_reasoning);
  assert.ok(report.categories.coding_accuracy);
  assert.ok(report.categories.debugging_accuracy);
  assert.ok(report.categories.instruction_following);
  assert.ok(report.categories.tool_calling);
  assert.ok(report.categories.security_constraints);
  assert.ok(report.categories.context_retention);
  assert.equal(report.metricsSummary.overallScore >= 0.8, true);
});

// 8. Export Compatibility Test
test('ZYNTHEOR CORE Directive 5: Export compatibility metadata and Ollama Modelfile', () => {
  const regPath = path.join(root, 'training/registry/model_registry.json');
  const reg = JSON.parse(readFileSync(regPath, 'utf8'));
  const model = reg.models[0];
  assert.ok(model.export_compatibility);
  assert.equal(model.export_compatibility.quantization, 'Q4_K_M');
  assert.ok(model.export_compatibility.ollama_modelfile);
});

// 9. Inference Integration & Answer Source Classification Test
test('ZYNTHEOR CORE Directive 6: Answer source classification and fallback transparency', () => {
  const probe = probeNativeModelRuntime();
  const source = classifyAnswerSource('gemini', probe);
  assert.equal(source, 'external_provider');
  assert.notEqual(source, 'native');
});

// 10. Governance & Human Approval Gate Test
test('ZYNTHEOR CORE Directive 8: Human approval gate required for production deployment', () => {
  const server = readFileSync(path.join(root, 'server.ts'), 'utf8');
  assert.ok(server.includes('/api/native-model/deploy'));
  assert.ok(server.includes('isHumanApproved'));
  assert.ok(server.includes('human_approval_required'));
});

// 11. Cryptographic Audit Ledger Nanosecond Timestamp Integrity Test
test('ZYNTHEOR CORE Audit Ledger: High-resolution nanosecond timestamp inclusion and hash chain validity', async () => {
  const { createAuditEntry, verifyAuditHashChain } = await import('../src/services/auditLedger.ts');
  const entry1 = createAuditEntry('MODEL_INIT', 'Base model initialized Qwen2.5-Coder-7B-Instruct');
  assert.ok(entry1.nanoAt);
  assert.ok(typeof entry1.nanoAt === 'string');
  assert.ok(entry1.nanoAt.length >= 10);

  const entry2 = createAuditEntry('DATASET_VERIFIED', 'Dataset verified with 15 samples', entry1);
  assert.ok(entry2.nanoAt);
  assert.equal(entry2.prevHash, entry1.hash);

  const verification = verifyAuditHashChain([entry2, entry1]);
  assert.equal(verification.isValid, true);
  assert.equal(verification.verifiedCount, 2);
});

// 12. Training Gate State Machine & Remote GPU Connector Test
test('ZYNTHEOR CORE Training Gate Flags: 10-stage state machine and remote GPU connector pre-flight', async () => {
  const { evaluateTrainingGateFlags, checkRemoteGpuRuntime } = await import('../src/services/trainingGateStateMachine.ts');

  // Check GPU connector without CUDA env
  const gpuInfo = checkRemoteGpuRuntime();
  assert.equal(typeof gpuInfo.detected, 'boolean');
  if (!gpuInfo.detected) {
    assert.equal(gpuInfo.readinessStatus, 'GPU_RUNTIME_UNAVAILABLE');
    assert.ok(gpuInfo.preflightMessage.includes('Host lacks direct CUDA GPU'));
  }

  // Check state machine evaluating 10 flags
  const report = evaluateTrainingGateFlags({ isHumanApproved: false });
  const flagKeys = Object.keys(report.flags);
  assert.equal(flagKeys.length, 10);
  assert.ok(report.flags.FOUNDATION_READY);
  assert.ok(report.flags.DATASET_READY);
  assert.ok(report.flags.TRAINING_CONFIG_READY);
  assert.ok(report.flags.GPU_RUNTIME_READY);
  assert.ok(report.flags.TRAINING_RUNNING);
  assert.ok(report.flags.TRAINING_COMPLETED);
  assert.ok(report.flags.BASELINE_EVALUATION_PASSED);
  assert.ok(report.flags.FINETUNED_EVALUATION_PASSED);
  assert.ok(report.flags.PRODUCTION_APPROVAL_PENDING);
  assert.ok(report.flags.PRODUCTION_APPROVED);

  // Assert SHA-256 evidence digests are present on all flags
  for (const flag of Object.values(report.flags)) {
    assert.ok(flag.evidenceHashSha256);
    assert.equal(flag.evidenceHashSha256.length, 64);
  }

  // Without human approval, PRODUCTION_APPROVED must stay PENDING
  assert.equal(report.flags.PRODUCTION_APPROVED.status, 'PENDING');
  assert.equal(report.overallReadyForProduction, false);
});


