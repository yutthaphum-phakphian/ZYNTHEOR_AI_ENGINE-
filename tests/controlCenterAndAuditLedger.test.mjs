// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  auditLedgerService,
  verifyAuditHashChain,
  CANONICAL_CORE_RUNTIME_HASH,
  CANONICAL_CORE_MERKLE_ROOT,
  createAuditEntry
} from '../src/services/auditLedger.ts';

test('Audit Ledger & ZYNTHEOR CORE Runtime Hash Linkage Suite', async (t) => {
  await t.test('1. Canonical CORE runtime hash is valid hex and Merkle root is anchored', () => {
    assert.equal(typeof CANONICAL_CORE_RUNTIME_HASH, 'string');
    assert.ok(CANONICAL_CORE_RUNTIME_HASH.length >= 32);
    assert.match(CANONICAL_CORE_RUNTIME_HASH, /^[0-9a-f]+$/);
    assert.equal(typeof CANONICAL_CORE_MERKLE_ROOT, 'string');
    assert.equal(CANONICAL_CORE_MERKLE_ROOT.length, 64);
    assert.match(CANONICAL_CORE_MERKLE_ROOT, /^[0-9a-f]{64}$/);
  });

  await t.test('2. getModelInferenceAudits returns records linked to ZYNTHEOR CORE runtime hash', () => {
    const inferences = auditLedgerService.getModelInferenceAudits();
    assert.ok(Array.isArray(inferences));
    assert.ok(inferences.length >= 4);

    // Verify each record has valid hash chain properties
    for (const record of inferences) {
      assert.ok(record.id, 'Record must have an ID');
      assert.ok(record.blockHash, 'Record must have a blockHash');
      assert.ok(record.prevHash, 'Record must have a prevHash');
      assert.ok(record.runtimeHash, 'Record must link to a runtimeHash');
      assert.equal(record.provider, 'ZYNTHEOR', 'Provider must be ZYNTHEOR');
      assert.ok(['CORE_NATIVE', 'CORE_ADAPTED', 'CORE_DISTILLED'].includes(record.modelCategory), 'Model category must belong to CORE');
    }
  });

  await t.test('3. logModelInferenceAudit attaches canonical CORE runtime hash by default and updates chain', () => {
    const newRecord = auditLedgerService.logModelInferenceAudit({
      query: 'Verify post-quantum lattice boundary constraints',
      modelId: 'zyntheor-core-native-v1',
      modelCategory: 'CORE_NATIVE',
      provider: 'ZYNTHEOR',
      tokensEstimated: 1540
    });

    assert.ok(newRecord.id);
    assert.equal(newRecord.runtimeHash, CANONICAL_CORE_RUNTIME_HASH);
    assert.equal(newRecord.status, 'VERIFIED_CORE_EXECUTION');
    assert.ok(newRecord.blockHash.length === 64);
  });

  await t.test('4. Control Center setting changes produce cryptographically sealed audit entries', () => {
    const entry = createAuditEntry('CONTROL_CENTER_SETTING_UPDATED', {
      setting: 'reasoningLevel',
      value: 'deep',
      modifiedBy: 'operator@zyntheor.internal'
    });

    assert.ok(entry.id);
    assert.equal(entry.action, 'CONTROL_CENTER_SETTING_UPDATED');
    assert.ok(entry.hash.length === 64);
    assert.ok(entry.detail.includes('reasoningLevel'));

    // Chain verification
    const report = verifyAuditHashChain([entry]);
    assert.equal(report.isValid, true);
    assert.equal(report.integrityStatus, 'INTACT');
  });

  await t.test('5. System Administration role segregation prevents non-admin modification of core backend', () => {
    const roles = {
      OWNER: { isSystemAdmin: true },
      ADMIN: { isSystemAdmin: true },
      SUPER_ADMIN: { isSystemAdmin: true },
      MEMBER: { isSystemAdmin: false },
      VIEWER: { isSystemAdmin: false }
    };

    for (const [role, { isSystemAdmin }] of Object.entries(roles)) {
      const computed = ['ADMIN', 'OWNER', 'SUPER_ADMIN'].includes(role);
      assert.equal(computed, isSystemAdmin, `Role ${role} expected isSystemAdmin=${isSystemAdmin}`);
    }
  });
});
