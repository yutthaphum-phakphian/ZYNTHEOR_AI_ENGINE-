import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { verifyDataset } from '../training/scripts/verify_dataset.mjs';
import { probeNativeModelRuntime, classifyAnswerSource } from '../lib/native-model-runtime.ts';
import { evaluateTrainingGateFlags, checkRemoteGpuRuntime } from '../src/services/trainingGateStateMachine.ts';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('ZYNTHEOR CORE 0.1 MLOps & Hardware Gate Verification', () => {
  it('Phase 2: Base Model Provenance & Apache-2.0 Specification', () => {
    const baseModelPath = path.join(rootDir, 'training/registry/base_model.json');
    expect(existsSync(baseModelPath)).toBe(true);

    const baseModel = JSON.parse(readFileSync(baseModelPath, 'utf8'));
    expect(baseModel.name).toBe('Qwen/Qwen2.5-Coder-7B-Instruct');
    expect(baseModel.parameters.total).toBe('7.61B');
    expect(baseModel.license.type).toBe('Apache-2.0');
    expect(baseModel.license.provenance_verified).toBe(true);
    expect(baseModel.training_strategy.type).toContain('QLoRA');
    expect(baseModel.training_strategy.base_training_from_scratch).toBe(false);
    expect(baseModel.hardware_requirements.training.minimum_vram_gb).toBe(16.0);
    expect(baseModel.export_target.format).toBe('GGUF');
    expect(baseModel.export_target.quantization).toBe('Q4_K_M');
  });

  it('Phase 3: Dataset Quality, Provenance, 0% Leakage & Cryptographic Digests', () => {
    const report = verifyDataset();
    expect(report.valid).toBe(true);
    expect(report.stats.totalSamples).toBe(15);
    expect(report.leakageCheck.passed).toBe(true);
    expect(report.leakageCheck.trainVsValOverlaps).toBe(0);
    expect(report.leakageCheck.trainVsTestOverlaps).toBe(0);
    expect(report.leakageCheck.valVsTestOverlaps).toBe(0);
    expect(report.qualityCheck.duplicates).toBe(0);
    expect(report.qualityCheck.nearDuplicates).toBe(0);

    // Verify SHA-256 sums match exactly
    const shaSumsPath = path.join(rootDir, 'training/dataset/SHA256SUMS');
    expect(existsSync(shaSumsPath)).toBe(true);
    const shaSumsContent = readFileSync(shaSumsPath, 'utf8');

    const manifestBuf = readFileSync(path.join(rootDir, 'training/dataset/manifest.json'));
    const manifestActualSha = createHash('sha256').update(manifestBuf).digest('hex');
    expect(shaSumsContent).toContain(manifestActualSha);

    const samplesBuf = readFileSync(path.join(rootDir, 'training/dataset/samples.json'));
    const samplesActualSha = createHash('sha256').update(samplesBuf).digest('hex');
    expect(shaSumsContent).toContain(samplesActualSha);

    // Verify manifest specifies EXPERIMENTAL_DATASET
    const manifest = JSON.parse(manifestBuf.toString('utf8'));
    expect(manifest.dataset_files[0].dataset_status).toBe('EXPERIMENTAL_DATASET');
    expect(manifest.dataset_files[0].format_schema).toContain('ChatML');
  });

  it('Phase 4: Hardware Audit Gate Classification (Fail-Closed on CPU Node)', () => {
    const gpuInfo = checkRemoteGpuRuntime();
    // On CPU container node:
    expect(gpuInfo.detected).toBe(false);
    expect(gpuInfo.totalVramGb).toBe(0);
    expect(gpuInfo.readinessStatus).toBe('GPU_RUNTIME_UNAVAILABLE');

    // Executing train_qlora.py must trigger fail-closed exit code 1
    try {
      execSync('python3 training/scripts/train_qlora.py', { cwd: rootDir, stdio: 'pipe' });
      // Should not reach here
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.status).toBe(1);
      const stderrAndStdout = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
      expect(stderrAndStdout).toContain('FAIL-CLOSED GATE TRIGGERED');
      expect(stderrAndStdout).toContain('DATASET_AND_EVALUATION_CAPABLE: True');
      expect(stderrAndStdout).toContain('FULL_7B_QLORA_TRAINING_UNAVAILABLE: True');
      expect(stderrAndStdout).toContain('SPECIFICATION_LOCKED_PENDING_GPU_RUN');
    }
  });

  it('Phase 5: GGUF Export Script Fails Closed when Weights are Untrained', () => {
    try {
      execSync('bash training/scripts/export_gguf.sh', { cwd: rootDir, stdio: 'pipe' });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.status).toBe(1);
      const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
      expect(output).toContain('FAIL-CLOSED GATE TRIGGERED');
      expect(output).toContain('No trained LoRA adapter weights found on disk');
      expect(output).toContain('UNTRAINED');
    }
  });

  it('Phase 6: Native Model Runtime Zero-Mock Invariant', () => {
    const probe = probeNativeModelRuntime();
    expect(probe.trainedWeightsExist).toBe(false);
    expect(probe.checkpointExists).toBe(false);
    expect(probe.status).toBe('MODEL_NOT_FOUND');
    expect(probe.inferenceTested).toBe(false);
    // Never allow INFERENCE_READY without weights
    expect(probe.status).not.toBe('INFERENCE_READY');

    const source = classifyAnswerSource('zyntheor-native', probe);
    expect(source).not.toBe('native');
  });

  it('Phase 7: 10-Stage Training Gate State Machine & Human Approval Gate', () => {
    const state = evaluateTrainingGateFlags({ operatorId: 'test-architect' });
    expect(state.flags.FOUNDATION_READY.status).toBe('PASSED');
    expect(state.flags.DATASET_READY.status).toBe('PASSED');
    expect(state.flags.TRAINING_CONFIG_READY.status).toBe('PASSED');
    expect(state.flags.GPU_RUNTIME_READY.status).toBe('WAITING');
    expect(state.flags.TRAINING_COMPLETED.status).toBe('PENDING');
    expect(state.flags.BASELINE_EVALUATION_PASSED.status).toBe('PASSED');
    expect(state.flags.FINETUNED_EVALUATION_PASSED.status).toBe('PENDING');
    expect(state.flags.PRODUCTION_APPROVED.status).toBe('PENDING');
    expect(state.overallReadyForProduction).toBe(false);
  });
});
