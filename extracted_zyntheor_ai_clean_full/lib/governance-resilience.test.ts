import { describe, it, expect } from 'vitest';
import { GovernanceResilienceEngine, globalResilience } from './governance-resilience';

describe('GovernanceResilienceEngine', () => {
  it('initializes with default snapshot and fault tolerance status', () => {
    const status = globalResilience.getResilienceStatus();
    expect(status.disasterRecoveryReady).toBe(true);
    expect(status.failedProviderCount).toBe(0);
    expect(status.crossJurisdictionCompliance.gdpr).toBe(true);
  });

  it('tracks provider failure and restores provider', () => {
    const engine = new GovernanceResilienceEngine();
    engine.reportProviderFailure('US-VA-02');
    let status = engine.getResilienceStatus();
    expect(status.failedProviderCount).toBe(1);
    expect(status.faultToleranceActive).toBe(true);

    engine.restoreProvider('US-VA-02');
    status = engine.getResilienceStatus();
    expect(status.failedProviderCount).toBe(0);
  });

  it('creates and verifies disaster recovery snapshots', () => {
    const engine = new GovernanceResilienceEngine();
    const snap = engine.createSnapshot(['EU-DE-01', 'US-VA-02']);
    expect(snap.snapshotId).toContain('snap-');
    expect(snap.merkleRoot).toMatch(/^0x/);
    expect(engine.verifySnapshot(snap)).toBe(true);
  });

  it('restores state from snapshot', () => {
    const engine = new GovernanceResilienceEngine();
    const snap = engine.createSnapshot(['EU-DE-01']);
    engine.reportProviderFailure('EU-DE-01');

    const result = engine.restoreFromSnapshot(snap.snapshotId);
    expect(result.restored).toBe(true);
    expect(engine.getResilienceStatus().failedProviderCount).toBe(0);
  });
});
