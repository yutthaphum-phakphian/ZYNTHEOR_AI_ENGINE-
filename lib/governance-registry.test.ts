import { describe, it, expect, beforeEach } from 'vitest';
import { GovernanceRegistry } from './governance-registry';

describe('Governance Registry - Buffalo 1.2.2 PASS', () => {
  let registry: GovernanceRegistry;

  beforeEach(() => {
    registry = new GovernanceRegistry();
  });

  it('1. registers default governance policies', () => {
    const policies = registry.getPolicies();
    expect(policies.length).toBeGreaterThanOrEqual(3);
    expect(policies.find(p => p.id === 'pol_local_only')?.enforced).toBe(true);
  });

  it('2. records compliant audit entry with SHA-256 hash', () => {
    const rec = registry.recordAudit('pol_local_only', 'ollama', 'EXECUTE_LOCAL_INFERENCE', 'compliant');
    expect(rec.hash.length).toBe(64);
    expect(rec.status).toBe('compliant');
  });

  it('3. verifies intact governance audit chain', () => {
    registry.recordAudit('pol_local_only', 'ollama', 'LOCAL_CALL', 'compliant');
    registry.recordAudit('pol_human_approval', 'chat_core', 'DIFF_APPROVED', 'compliant');
    const status = registry.verifyGovernanceChain();
    expect(status.isValid).toBe(true);
    expect(status.totalRecords).toBe(2);
  });

  it('4. detects tampered record in governance chain', () => {
    registry.recordAudit('pol_local_only', 'ollama', 'CALL_1', 'compliant');
    registry.recordAudit('pol_fips_audit', 'server', 'CALL_2', 'compliant');

    const chain = registry.getAuditChain();
    chain[0].status = 'violation'; // Tamper status

    const status = registry.verifyGovernanceChain();
    expect(status.isValid).toBe(false);
    expect(status.brokenIndex).toBe(0);
  });

  it('5. allows custom governance policy registration', () => {
    registry.registerPolicy({
      id: 'pol_custom_rbac',
      name: 'Custom RBAC Role Validation',
      category: 'security',
      enforced: true,
      ruleSpec: 'Ensure role is admin or engineer',
      version: '1.2.2'
    });

    const policies = registry.getPolicies();
    expect(policies.find(p => p.id === 'pol_custom_rbac')).toBeDefined();
  });

  it('6. handles empty governance chain verification', () => {
    const status = registry.verifyGovernanceChain();
    expect(status.isValid).toBe(true);
    expect(status.totalRecords).toBe(0);
  });

  it('7. links prevHash across sequential audit entries', () => {
    const r1 = registry.recordAudit('pol_local_only', 'ollama', 'A1', 'compliant');
    const r2 = registry.recordAudit('pol_human_approval', 'server', 'A2', 'compliant');
    expect(r2.prevHash).toBe(r1.hash);
  });

  it('8. multi-provider linkage auditing', () => {
    registry.recordAudit('pol_local_only', 'ollama', 'INFERENCE_OLLAMA', 'compliant');
    registry.recordAudit('pol_local_only', 'gemini', 'INFERENCE_GEMINI', 'overridden');
    registry.recordAudit('pol_local_only', 'openai', 'INFERENCE_OPENAI', 'violation');

    const chain = registry.getAuditChain();
    expect(chain.length).toBe(3);
    expect(chain[1].providerId).toBe('gemini');
    expect(chain[2].providerId).toBe('openai');
  });

  it('9. full governance lifecycle verification', () => {
    registry.recordAudit('pol_local_only', 'ollama', 'LOCAL_CHECK', 'compliant');
    registry.recordAudit('pol_human_approval', 'human_gate', 'APPROVAL_CHECK', 'compliant');
    registry.recordAudit('pol_fips_audit', 'audit_ledger', 'HASH_CHECK', 'compliant');

    const status = registry.verifyGovernanceChain();
    expect(status.isValid).toBe(true);
    expect(status.totalRecords).toBe(3);
  });
});
