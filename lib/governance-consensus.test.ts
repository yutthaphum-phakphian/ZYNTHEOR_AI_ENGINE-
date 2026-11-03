import { describe, it, expect } from 'vitest';
import { GovernanceConsensusEngine, globalConsensus } from './governance-consensus';

describe('Governance Consensus Engine — Buffalo 1.2.3', () => {
  it('1. initializes with default seed consensus attestation', () => {
    const snapshot = globalConsensus.getConsensusSnapshot();
    expect(snapshot.state.term).toBeGreaterThan(1);
    expect(snapshot.attestations.length).toBeGreaterThan(0);
  });

  it('2. records provider vote correctly', () => {
    const engine = new GovernanceConsensusEngine();
    const success = engine.recordVote({
      providerId: 'provider-gemini-primary',
      vote: 'GRANT',
      weight: 30,
      timestamp: new Date().toISOString(),
      signature: 'sig-test-1',
    });
    expect(success).toBe(true);
  });

  it('3. rejects votes from unknown providers', () => {
    const engine = new GovernanceConsensusEngine();
    const success = engine.recordVote({
      providerId: 'untrusted-rogue-node',
      vote: 'GRANT',
      weight: 100,
      timestamp: new Date().toISOString(),
      signature: 'bad-sig',
    });
    expect(success).toBe(false);
  });

  it('4. ratifies policy when quorum threshold >= 67% is met', () => {
    const engine = new GovernanceConsensusEngine();
    const attestation = engine.recordConsensus('policy-security-lock', [
      { providerId: 'provider-gemini-primary', vote: 'GRANT', weight: 40, timestamp: new Date().toISOString(), signature: 'sig-1' },
      { providerId: 'provider-ollama-local', vote: 'GRANT', weight: 35, timestamp: new Date().toISOString(), signature: 'sig-2' },
    ]);
    expect(attestation.ratified).toBe(true);
    expect(attestation.weightedPassRatio).toBeGreaterThanOrEqual(0.67);
  });

  it('5. rejects policy when quorum threshold < 67%', () => {
    const engine = new GovernanceConsensusEngine();
    const attestation = engine.recordConsensus('policy-blocked-change', [
      { providerId: 'provider-gemini-primary', vote: 'GRANT', weight: 20, timestamp: new Date().toISOString(), signature: 'sig-1' },
      { providerId: 'provider-ollama-local', vote: 'DENY', weight: 80, timestamp: new Date().toISOString(), signature: 'sig-2' },
    ]);
    expect(attestation.ratified).toBe(false);
    expect(attestation.weightedPassRatio).toBeLessThan(0.67);
  });

  it('6. generates valid cryptographic threshold signature', () => {
    const engine = new GovernanceConsensusEngine();
    const attestation = engine.recordConsensus('policy-threshold-check', [
      { providerId: 'provider-gemini-primary', vote: 'GRANT', weight: 50, timestamp: new Date().toISOString(), signature: 'sig-1' },
      { providerId: 'provider-zyntheor-core', vote: 'GRANT', weight: 50, timestamp: new Date().toISOString(), signature: 'sig-2' },
    ]);
    const isValid = engine.verifyThresholdSignature(attestation);
    expect(isValid).toBe(true);
  });

  it('7. advances consensus term on ratification', () => {
    const engine = new GovernanceConsensusEngine();
    const startTerm = engine.getConsensusSnapshot().state.term;
    engine.recordConsensus('policy-advance-term', [
      { providerId: 'provider-gemini-primary', vote: 'GRANT', weight: 50, timestamp: new Date().toISOString(), signature: 'sig-1' },
      { providerId: 'provider-zyntheor-core', vote: 'GRANT', weight: 50, timestamp: new Date().toISOString(), signature: 'sig-2' },
    ]);
    const endTerm = engine.getConsensusSnapshot().state.term;
    expect(endTerm).toBe(startTerm + 1);
  });

  it('8. verifies consensus chain integrity', () => {
    const engine = new GovernanceConsensusEngine();
    engine.recordConsensus('policy-chain-1', [
      { providerId: 'provider-gemini-primary', vote: 'GRANT', weight: 50, timestamp: new Date().toISOString(), signature: 'sig-1' },
      { providerId: 'provider-zyntheor-core', vote: 'GRANT', weight: 50, timestamp: new Date().toISOString(), signature: 'sig-2' },
    ]);
    const integrity = engine.verifyChainIntegrity();
    expect(integrity.valid).toBe(true);
  });

  it('9. snapshots retain recent attestations and provider list', () => {
    const snapshot = globalConsensus.getConsensusSnapshot();
    expect(snapshot.state.activeProviders.length).toBeGreaterThanOrEqual(5);
    expect(Array.isArray(snapshot.attestations)).toBe(true);
  });
});
