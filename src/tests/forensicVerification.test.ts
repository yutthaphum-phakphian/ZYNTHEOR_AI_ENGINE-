import { describe, it, expect } from 'vitest';
import {
  ZYNTHEOR_CANONICAL_STATE,
  validateCourtReady,
  CANONICAL_EXHIBITS,
  CANONICAL_INVARIANTS,
  RADAR_THREAT_VECTORS,
} from '../lib/forensicVerification.ts';
import {
  ZYNTHEOR_MODEL_SOVEREIGNTY_POLICY,
  validateModelSovereignty,
  validateActiveModelSovereignty,
  assertGatewayIsNotProvider,
} from '../lib/sovereignty.ts';

describe('ZYRQUEN Ω∞ SSoT Δ0 & ZYNTHEOR Sovereignty Verification', () => {
  it('validates COURT_READY status against canonical Genesis #849202 and Merkle root', () => {
    const verdict = validateCourtReady();
    expect(verdict.courtReady).toBe(true);
    expect(verdict.admissibilityVerdict).toBe('PRIMA_FACIE_ADMISSIBLE / COURT_READY');
    expect(verdict.canonicalMerkleRoot).toBe('909ab814479844d8a14816bed34cdbb07528e18501da86fc4691763a43fa4c68');
    expect(verdict.genesisBlock).toBe(849202);
    expect(verdict.sealsVerified).toBe(14902);
    expect(verdict.sealsClaimed).toBe(14962);
    expect(verdict.ssotDrift).toBe('Δ0.00%');
    expect(verdict.quorumStatus).toContain('10/10');
    expect(verdict.invariantsPassed).toBe(10);
    expect(verdict.exhibitsVerified).toBe(7);
  });

  it('verifies all 10 canonical invariants are strictly ENFORCED', () => {
    expect(CANONICAL_INVARIANTS).toHaveLength(10);
    for (const inv of CANONICAL_INVARIANTS) {
      expect(inv.status).toBe('ENFORCED');
      expect(inv.id).toMatch(/^INV-\d{2}$/);
    }
  });

  it('verifies all 7 court exhibits EX-001 through EX-007 are registered and verified', () => {
    expect(CANONICAL_EXHIBITS).toHaveLength(7);
    const exhibitIds = CANONICAL_EXHIBITS.map(e => e.id);
    expect(exhibitIds).toEqual([
      'EX-001',
      'EX-002',
      'EX-003',
      'EX-004',
      'EX-005',
      'EX-006',
      'EX-007',
    ]);
    for (const ex of CANONICAL_EXHIBITS) {
      expect(ex.admissibility).toMatch(/ADMISSIBLE|VERIFIED/);
      expect(typeof ex.hash).toBe('string');
      expect(ex.hash.length).toBeGreaterThanOrEqual(32);
    }
  });

  it('verifies radar threat vectors and zero-breach guarantee', () => {
    expect(RADAR_THREAT_VECTORS).toHaveLength(6);
    expect(ZYNTHEOR_CANONICAL_STATE.threatDefense.failClosed).toContain('100% BLOCKED');
    expect(ZYNTHEOR_CANONICAL_STATE.threatDefense.totalInterceptions).toBe(15723);
    expect(ZYNTHEOR_CANONICAL_STATE.threatDefense.regions).toBe(12);
  });

  it('strictly validates model sovereignty for authorized ZYNTHEOR CORE models', () => {
    const validModel = validateModelSovereignty('zyntheor-core-buffalo-v1');
    expect(validModel.valid).toBe(true);
    expect(validModel.sovereignty?.product).toBe('ZYNTHEOR AI ENGINE');
    expect(validModel.sovereignty?.family).toBe('ZYNTHEOR CORE');
    expect(validModel.sovereignty?.courtStatus).toBe('COURT_READY');

    const nativeModel = validateModelSovereignty('zyntheor-native-titan');
    expect(nativeModel.valid).toBe(true);
  });

  it('blocks external providers masquerading as CORE or requesting primary inference', () => {
    const geminiTest = validateModelSovereignty('gemini-1.5-pro');
    expect(geminiTest.valid).toBe(false);
    expect(geminiTest.reason).toContain('violates ZYNTHEOR CORE sovereignty policy');

    const openaiTest = validateModelSovereignty('gpt-4o');
    expect(openaiTest.valid).toBe(false);
    expect(openaiTest.reason).toContain('External provider cannot be primary');

    const claudeTest = validateModelSovereignty('claude-3-5-sonnet');
    expect(claudeTest.valid).toBe(false);
  });

  it('asserts Internet Gateway is strictly an information provider and NOT a model provider', () => {
    const gatewayAssert = assertGatewayIsNotProvider();
    expect(gatewayAssert.valid).toBe(true);
    expect(gatewayAssert.policy.GATEWAY_IS_PROVIDER).toBe(false);
    expect(gatewayAssert.courtReady.courtReady).toBe(true);
  });

  it('validates active model sovereignty and rejects missing active models', () => {
    const missing = validateActiveModelSovereignty(undefined);
    expect(missing.status).toBe('UNAVAILABLE');
    expect(missing.result.valid).toBe(false);

    const verified = validateActiveModelSovereignty('zyntheor-core-buffalo', {
      isLocal: true,
      owner: 'ZYNTHEOR',
      verified: true,
      checkpointHash: 'sha256-verified-master-849202',
    });
    expect(verified.status).toBe('COURT_READY');
    expect(verified.result.valid).toBe(true);
  });
});
