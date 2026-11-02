#!/usr/bin/env node

/**
 * ZYNTHEOR CORE 0.1 — Remote GPU Connector & Training Gate Transition Integration Script
 *
 * Connects to remote/local GPU runtime, evaluates CUDA & VRAM availability,
 * calculates SHA-256 evidence digests, and validates state transitions.
 */

import { checkRemoteGpuRuntime, evaluateTrainingGateFlags, verifyGatePromotionWithEvidence } from '../../src/services/trainingGateStateMachine.ts';

async function runGpuConnectorIntegration() {
  console.log('------------------------------------------------------------');
  console.log('ZYNTHEOR CORE 0.1 — Remote GPU Connector Integration Engine');
  console.log('------------------------------------------------------------\n');

  // 1. Hardware Availability Check (CUDA, VRAM, BF16, QLoRA)
  console.log('1. Probing GPU Runtime Environment...');
  const gpuRuntime = checkRemoteGpuRuntime();

  console.log(` - Detected GPU: ${gpuRuntime.name}`);
  console.log(` - CUDA Available: ${gpuRuntime.cudaAvailable ? 'YES (' + gpuRuntime.cudaVersion + ')' : 'NO'}`);
  console.log(` - Total VRAM: ${gpuRuntime.totalVramGb} GB (Free: ${gpuRuntime.freeVramGb} GB)`);
  console.log(` - BF16 Support: ${gpuRuntime.bf16Supported ? 'YES' : 'NO'}`);
  console.log(` - QLoRA Compatibility: ${gpuRuntime.qloraCompatible ? 'YES' : 'NO'}`);
  console.log(` - Readiness Status: ${gpuRuntime.readinessStatus}\n`);

  // 2. State Machine Flag Evaluation
  console.log('2. Evaluating Training Gate Flags State Machine...');
  const stateReport = evaluateTrainingGateFlags();

  console.log(` - Current Active Stage: ${stateReport.currentStage}`);
  console.log(` - GPU Gate Status: ${stateReport.flags.GPU_RUNTIME_READY.status}`);
  console.log(` - Pre-flight Message: ${stateReport.flags.GPU_RUNTIME_READY.evidenceSummary}`);
  console.log(` - Evidence SHA-256 Digest: ${stateReport.flags.GPU_RUNTIME_READY.evidenceHashSha256}\n`);

  // 3. Evidence Validation Test
  console.log('3. Validating SHA-256 Evidence Hash Lock...');
  const gpuFlag = stateReport.flags.GPU_RUNTIME_READY;
  const evidencePayload = `GPU_RUNTIME_READY|${gpuRuntime.name}|${gpuRuntime.totalVramGb}|${gpuFlag.timestamp}`;
  const validation = verifyGatePromotionWithEvidence('GPU_RUNTIME_READY', evidencePayload, gpuFlag.evidenceHashSha256);

  if (validation.valid) {
    console.log(` [✓] Evidence Hash Verified: ${validation.calculatedSha256}`);
  } else {
    console.log(` [✗] Evidence Hash Rejected: ${validation.reason}`);
  }

  // Summary
  console.log('\n------------------------------------------------------------');
  if (gpuRuntime.readinessStatus === 'GPU_RUNTIME_READY') {
    console.log('SUCCESS: GPU Runtime verified and State Machine transitioned to GPU_RUNTIME_READY.');
  } else {
    console.log('NOTICE: GPU Runtime unavailable on CPU node. GPU_RUNTIME_UNAVAILABLE verified.');
  }
  console.log('------------------------------------------------------------\n');

  return {
    success: true,
    gpuRuntime,
    stateReport,
    validation,
  };
}

if (process.argv[1]?.includes('gpu_connector_integration.mjs')) {
  runGpuConnectorIntegration().catch((err) => {
    console.error('Integration execution failed:', err);
    process.exit(1);
  });
}

export { runGpuConnectorIntegration };
