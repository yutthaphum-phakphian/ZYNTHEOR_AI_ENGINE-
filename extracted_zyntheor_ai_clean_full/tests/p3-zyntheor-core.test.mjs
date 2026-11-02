import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { verifyDataset } from '../training/scripts/verify_dataset.mjs';
import { runBaselineEvaluation } from '../training/scripts/evaluate_baseline.mjs';
import { probeNativeModelRuntime, classifyAnswerSource } from '../lib/native-model-runtime.ts';
import { evaluateTrainingGateFlags, checkRemoteGpuRuntime } from '../src/services/trainingGateStateMachine.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 1. Dataset Integrity & ChatML Schema
test('P3-1: Dataset Engine — Schema, non-empty samples, and ChatML compliance', () => {
  const result = verifyDataset();
  assert.equal(result.valid, true);
  assert.ok(result.stats.totalSamples >= 15);
  assert.ok(result.stats.splits.train >= 1);
  assert.ok(result.stats.splits.validation >= 1);
  assert.ok(result.stats.splits.test >= 1);
  assert.ok(result.provenance.allLicensed);
  assert.ok(result.provenance.allHaveSource);
});

// 2. Cross-Split Leakage & Deduplication
test('P3-2: Dataset Engine — Cross-split leakage protection & deduplication', () => {
  const result = verifyDataset();
  assert.equal(result.leakageCheck.passed, true);
  assert.equal(result.leakageCheck.trainVsValOverlaps, 0);
  assert.equal(result.leakageCheck.trainVsTestOverlaps, 0);
  assert.equal(result.leakageCheck.valVsTestOverlaps, 0);
});

// 3. Base Model & Training Configuration
test('P3-3: Base Model & Training Pipeline — Qwen2.5-Coder-7B-Instruct & QLoRA params', () => {
  const cfgPath = path.join(root, 'training/config/training_config.json');
  assert.ok(existsSync(cfgPath));
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
  assert.equal(cfg.base_model, 'Qwen/Qwen2.5-Coder-7B-Instruct');
  assert.equal(cfg.model.license, 'Apache-2.0');
  assert.equal(cfg.training.method, 'QLoRA 4-bit / LoRA 16-bit');
  assert.equal(cfg.training.lora_r, 32);
  assert.equal(cfg.training.lora_alpha, 64);
  assert.ok(cfg.training.max_seq_length >= 1024);
  assert.equal(cfg.training.seed, 849202);
});

// 4. Hardware Preflight & GPU Assessment
test('P3-4: GPU Preflight — Hardware assessment & WAITING_FOR_GPU state handling', () => {
  const gpuInfo = checkRemoteGpuRuntime();
  assert.equal(typeof gpuInfo.detected, 'boolean');
  if (!gpuInfo.detected) {
    assert.equal(gpuInfo.readinessStatus, 'GPU_RUNTIME_UNAVAILABLE');
    assert.ok(gpuInfo.preflightMessage.includes('Host lacks direct CUDA GPU'));
  }
  const probe = probeNativeModelRuntime();
  assert.equal(probe.trainedWeightsExist, false);
});

// 5. Checkpoint Integrity & SHA-256 Non-Fabrication
test('P3-5: Checkpoint Integrity — Honest status and non-fabrication rule', () => {
  const probe = probeNativeModelRuntime();
  assert.equal(probe.status !== 'INFERENCE_READY', true);
  if (!probe.checkpointExists) {
    assert.equal(probe.checkpointSha256Actual, null);
    assert.equal(probe.trainedWeightsExist, false);
  }
});

// 6. Model Registry Structure & Provenance
test('P3-6: Model Registry — Specification, license attribution, and export specs', () => {
  const regPath = path.join(root, 'training/registry/model_registry.json');
  assert.ok(existsSync(regPath));
  const reg = JSON.parse(readFileSync(regPath, 'utf8'));
  assert.equal(reg.registry_version, '1.0.0');
  assert.ok(reg.models.length >= 1);
  const foundation = reg.models[0];
  assert.equal(foundation.base_model.name, 'Qwen/Qwen2.5-Coder-7B-Instruct');
  assert.equal(foundation.base_model.license, 'Apache-2.0');
  assert.equal(foundation.export_compatibility.quantization, 'Q4_K_M');
});

// 7. Model Evaluation Framework Baseline Execution
test('P3-7: Evaluation Framework — 8-category benchmark evaluation', async () => {
  const report = await runBaselineEvaluation();
  assert.ok(report.categories.thai_reasoning);
  assert.ok(report.categories.coding_accuracy);
  assert.ok(report.categories.debugging_accuracy);
  assert.ok(report.categories.instruction_following);
  assert.ok(report.categories.security_constraints);
  assert.ok(report.metricsSummary.overallScore >= 0.8);
});

// 8. Inference Integration & Answer Source Routing
test('P3-8: Model Routing — Answer source classification and fallback transparency', () => {
  const probe = probeNativeModelRuntime();
  const source = classifyAnswerSource('gemini', probe);
  assert.equal(source, 'external_provider');
  assert.notEqual(source, 'native');
});

// 9. Governance 10-Stage State Machine Lifecycle
test('P3-9: Governance State Machine — 10-stage lifecycle evaluation', () => {
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

  // Assert SHA-256 cryptographic evidence digests
  for (const flag of Object.values(report.flags)) {
    assert.ok(flag.evidenceHashSha256);
    assert.equal(flag.evidenceHashSha256.length, 64);
  }
});

// 10. Approval Boundary & Agent Restrictions
test('P3-10: Security Boundary — AI agent cannot self-approve model promotion', () => {
  const reportNoApproval = evaluateTrainingGateFlags({ isHumanApproved: false });
  assert.equal(reportNoApproval.flags.PRODUCTION_APPROVED.status, 'PENDING');
  assert.equal(reportNoApproval.overallReadyForProduction, false);

  // Even with human approval, if trained weights do not exist, production promotion remains PENDING (Sovereign Truth)
  const reportWithHumanApproval = evaluateTrainingGateFlags({ isHumanApproved: true });
  assert.equal(reportWithHumanApproval.flags.PRODUCTION_APPROVED.status, 'PENDING');
  assert.equal(reportWithHumanApproval.overallReadyForProduction, false);
});
