import { describe, it, expect } from 'vitest';
import { GovernanceFederationEngine, globalFederation } from './governance-federation';

describe('GovernanceFederationEngine', () => {
  it('initializes with active global federation status', () => {
    const status = globalFederation.getFederationStatus();
    expect(status.federationId).toBe('zyntheor-global-fed-01');
    expect(status.activeRegions).toBeGreaterThanOrEqual(4);
    expect(status.globalCrossLinkHash).toMatch(/^0x/);
    expect(status.harmonizedPolicyVersion).toContain('1.2.6');
  });

  it('syncs regional node state and updates global hash', () => {
    const engine = new GovernanceFederationEngine();
    const initialHash = engine.getFederationStatus().globalCrossLinkHash;
    const synced = engine.syncRegion('EU-DE-01', 849300);
    expect(synced).toBe(true);

    const updatedStatus = engine.getFederationStatus();
    expect(updatedStatus.regions.find(r => r.regionId === 'EU-DE-01')?.syncedBlockHeight).toBe(849300);
    expect(updatedStatus.globalCrossLinkHash).not.toBe(initialHash);
  });

  it('verifies cross jurisdiction proof', () => {
    const engine = new GovernanceFederationEngine();
    const proof = engine.verifyCrossJurisdictionProof();
    expect(proof.valid).toBe(true);
    expect(proof.regionCount).toBe(4);
    expect(proof.globalProof).toMatch(/^0x/);
  });
});
