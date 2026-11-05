// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
  createAuditEntry,
  verifyAuditHashChain,
  repairAndResignAuditLedger,
  generateSignedAuditExport,
  generateSignedAuditCsv,
  AuditEntry,
} from '../services/auditLedger.ts';

describe('Forensic Audit Ledger Cryptographic Chain Integrity & Tamper Detection', () => {
  it('should create an intact sequential SHA-256 hash chain and pass verification', () => {
    const e1 = createAuditEntry('INITIALIZE_WORKSPACE', 'Initialized workspace f76619b1');
    const e2 = createAuditEntry('PROPOSE_PATCH', 'Proposed patch patch-101 for src/App.tsx', e1);
    const e3 = createAuditEntry('APPROVE_PATCH', 'Approved patch patch-101 by eng-01', e2);
    const e4 = createAuditEntry('APPLY_PATCH', 'Applied patch patch-101 to src/App.tsx', e3);

    // Records are stored newest-first in application state
    const chain: AuditEntry[] = [e4, e3, e2, e1];

    const result = verifyAuditHashChain(chain);
    expect(result.isValid).toBe(true);
    expect(result.verifiedCount).toBe(4);
    expect(result.brokenIndex).toBeUndefined();
  });

  it('should detect content tampering when a random detail field in a middle entry is mutated', () => {
    const e1 = createAuditEntry('INIT', 'Genesis state');
    const e2 = createAuditEntry('EVENT_A', 'Original details for event A', e1);
    const e3 = createAuditEntry('EVENT_B', 'Original details for event B', e2);
    const e4 = createAuditEntry('EVENT_C', 'Original details for event C', e3);

    const chain: AuditEntry[] = [e4, e3, e2, e1];

    // Mutate entry e2's detail field
    const mutatedChain = JSON.parse(JSON.stringify(chain)) as AuditEntry[];
    mutatedChain[2].detail = 'TAMPERED DETAILS IN EVENT A'; // Index 2 in newest-first is e2

    const result = verifyAuditHashChain(mutatedChain);
    expect(result.isValid).toBe(false);
    expect(result.verifiedCount).toBe(1); // e1 (oldest) passed, e2 failed
    expect(result.brokenRecordId).toBe(e2.id);
    expect(result.reason).toContain('Content signature mismatch');
  });

  it('should detect pointer tampering when an entry prevHash pointer is altered', () => {
    const e1 = createAuditEntry('INIT', 'Genesis state');
    const e2 = createAuditEntry('EVENT_A', 'Details A', e1);
    const e3 = createAuditEntry('EVENT_B', 'Details B', e2);

    const chain: AuditEntry[] = [e3, e2, e1];

    // Mutate prevHash pointer of e3
    const mutatedChain = JSON.parse(JSON.stringify(chain)) as AuditEntry[];
    mutatedChain[0].prevHash = '0000000000000000000000000000000000000000000000000000000000000000';

    const result = verifyAuditHashChain(mutatedChain);
    expect(result.isValid).toBe(false);
    expect(result.brokenRecordId).toBe(e3.id);
    expect(result.reason).toContain('Hash pointer mismatch');
  });

  it('should detect hash signature forgery when entry hash is replaced with a random string', () => {
    const e1 = createAuditEntry('INIT', 'Genesis state');
    const e2 = createAuditEntry('EVENT_A', 'Details A', e1);

    const chain: AuditEntry[] = [e2, e1];

    const mutatedChain = JSON.parse(JSON.stringify(chain)) as AuditEntry[];
    mutatedChain[0].hash = 'deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678';

    const result = verifyAuditHashChain(mutatedChain);
    expect(result.isValid).toBe(false);
    expect(result.brokenRecordId).toBe(e2.id);
  });

  it('should produce signed JSON export reflecting TAMPERED state when chain is mutated', () => {
    const e1 = createAuditEntry('INIT', 'Genesis state');
    const e2 = createAuditEntry('EVENT_A', 'Details A', e1);

    const chain: AuditEntry[] = [e2, e1];
    chain[0].detail = 'TAMPERED_EVENT_A';

    const exportData = generateSignedAuditExport(chain);
    expect(exportData.verificationSummary.isValid).toBe(false);
    expect(exportData.records.some(r => !r.isBlockValid)).toBe(true);
  });

  it('should produce signed CSV export reflecting TAMPERED_OR_MISMATCH when chain is mutated', () => {
    const e1 = createAuditEntry('INIT', 'Genesis state');
    const e2 = createAuditEntry('EVENT_A', 'Details A', e1);

    const chain: AuditEntry[] = [e2, e1];
    chain[0].detail = 'TAMPERED_EVENT_A';

    const csvData = generateSignedAuditCsv(chain);
    expect(csvData).toContain('TAMPERED_OR_MISMATCH');
    expect(csvData).toContain('# Hash Chain Status: TAMPERED');
  });

  it('should repair tampered audit chain, append immutable AUDIT_LEDGER_REPAIRED entry, and record preRepairRootHash', () => {
    const e1 = createAuditEntry('INIT', 'Genesis state');
    const e2 = createAuditEntry('EVENT_A', 'Original details A', e1);
    const e3 = createAuditEntry('EVENT_B', 'Original details B', e2);

    const chain: AuditEntry[] = [e3, e2, e1];
    const preRepairRootHash = chain[0].hash;

    // Tamper with e2 detail
    chain[1].detail = 'TAMPERED_DETAIL_A';

    // Verify it is tampered first
    const tamperedCheck = verifyAuditHashChain(chain);
    expect(tamperedCheck.isValid).toBe(false);

    // Repair chain
    const repairedChain = repairAndResignAuditLedger(chain, {
      reason: 'Authorized security incident remediation',
      repairedBy: 'sec_admin_01',
      authorizationRef: 'SEC-INC-2026-09',
    });

    // Repaired chain should pass hash chain verification
    const repairedCheck = verifyAuditHashChain(repairedChain);
    expect(repairedCheck.isValid).toBe(true);

    // Repaired chain newest entry (index 0) must be AUDIT_LEDGER_REPAIRED
    const repairEntry = repairedChain[0];
    expect(repairEntry.action).toBe('AUDIT_LEDGER_REPAIRED');
    expect(repairEntry.metadata.preRepairRootHash).toBe(preRepairRootHash);
    expect(repairEntry.metadata.reason).toBe('Authorized security incident remediation');
    expect(repairEntry.metadata.repairedBy).toBe('sec_admin_01');
    expect(repairEntry.metadata.authorizationRef).toBe('SEC-INC-2026-09');
    expect(repairEntry.detail).toContain(preRepairRootHash.slice(0, 16));

    // Length should be original length + 1 (repair entry appended)
    expect(repairedChain.length).toBe(4);
  });

  it('should generate canonical exports stamped with version 1.0.0-canonical-stamped and unkeyed SHA-256 header', () => {
    const e1 = createAuditEntry('INIT', 'Genesis state');
    const e2 = createAuditEntry('EVENT_A', 'Details A', e1);

    const chain: AuditEntry[] = [e2, e1];

    const jsonExport = generateSignedAuditExport(chain);
    expect(jsonExport.exportVersion).toBe('1.0.0-canonical-stamped');
    expect(jsonExport.signature.algorithm).toBe('SHA-256-CANONICAL-CHAIN-STAMP');

    const csvExport = generateSignedAuditCsv(chain);
    expect(csvExport).toContain('# Export Version: 1.0.0-canonical-stamped');
    expect(csvExport).toContain('# Hash Stamp Algorithm: SHA-256 (Unkeyed Canonical Hash Stamp)');
  });
});
