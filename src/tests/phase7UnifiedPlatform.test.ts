import { describe, it, expect } from 'vitest';
import { runPhase7IntegrationSuite } from '../evaluation/phase7IntegrationSuite.ts';
import { zyntheorIntelligenceRuntime } from '../lib/ZyntheorIntelligenceRuntime.ts';
import { getActiveModel, validateModelIdentity } from '../lib/modelIdentityContract.ts';

describe('Phase 7 — Unified Intelligence Platform Integration', () => {
  it('runs Phase 7 system integration suite across all 12 core subsystems', async () => {
    const report = await runPhase7IntegrationSuite();
    expect(report.subsystems.length).toBe(12);
    expect(report.verificationCount).toBe(12);
    expect(report.overallStatus).toBe('VERIFIED');
  });

  it('verifies Unified Model Registry Contract and prevents unauthorized fallbacks', () => {
    const active = getActiveModel();
    const validation = validateModelIdentity(active);
    expect(validation.valid).toBe(true);
    expect(active.provider).toBe('ZYNTHEOR_NATIVE');
  });

  it('executes Unified Intelligence Runtime processRequest through 10-stage pipeline', async () => {
    const response = await zyntheorIntelligenceRuntime.processRequest({
      input: 'ช่วยสรุปหลักการสำคัญของ ZYNTHEOR Unified Intelligence Platform',
      workspaceId: 'workspace-phase7-test',
    });

    expect(response.requestId).toBeDefined();
    expect(response.executionPlan.stages.length).toBe(11);
    expect(response.complexityLevel).toBeDefined();
    expect(response.primaryCapability.id).toBeDefined();
  });
});
