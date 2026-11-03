import crypto from 'node:crypto';

export interface GovernancePolicy {
  id: string;
  name: string;
  category: 'security' | 'privacy' | 'compliance' | 'human_approval';
  enforced: boolean;
  ruleSpec: string;
  version: string;
}

export interface GovernanceAuditRecord {
  id: string;
  timestamp: number;
  policyId: string;
  providerId: string;
  action: string;
  status: 'compliant' | 'violation' | 'overridden';
  hash: string;
  prevHash: string;
}

export class GovernanceRegistry {
  private policies = new Map<string, GovernancePolicy>();
  private auditChain: GovernanceAuditRecord[] = [];

  constructor() {
    this.initDefaultPolicies();
  }

  private initDefaultPolicies(): void {
    this.registerPolicy({
      id: 'pol_local_only',
      name: 'Local-First Boundary Enforcement',
      category: 'privacy',
      enforced: true,
      ruleSpec: 'Block external API calls unless explicit consent is provided',
      version: '1.2.2'
    });

    this.registerPolicy({
      id: 'pol_human_approval',
      name: 'Human Approval Gate for Code Mutations',
      category: 'human_approval',
      enforced: true,
      ruleSpec: 'Require human confirmation before applying code diffs or destructive actions',
      version: '1.2.2'
    });

    this.registerPolicy({
      id: 'pol_fips_audit',
      name: 'SHA-256 Cryptographic Hash Chain Audit',
      category: 'security',
      enforced: true,
      ruleSpec: 'All system and evidence logs must be cryptographically signed in order',
      version: '1.2.2'
    });
  }

  registerPolicy(policy: GovernancePolicy): void {
    this.policies.set(policy.id, policy);
  }

  getPolicies(): GovernancePolicy[] {
    return Array.from(this.policies.values());
  }

  recordAudit(policyId: string, providerId: string, action: string, status: GovernanceAuditRecord['status']): GovernanceAuditRecord {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const prevHash = this.auditChain.length > 0 ? this.auditChain[this.auditChain.length - 1].hash : '0000000000000000000000000000000000000000000000000000000000000000';
    
    const payload = `${id}|${timestamp}|${policyId}|${providerId}|${action}|${status}|${prevHash}`;
    const hash = crypto.createHash('sha256').update(payload).digest('hex');

    const record: GovernanceAuditRecord = {
      id,
      timestamp,
      policyId,
      providerId,
      action,
      status,
      prevHash,
      hash
    };

    this.auditChain.push(record);
    return record;
  }

  getAuditChain(): GovernanceAuditRecord[] {
    return [...this.auditChain];
  }

  verifyGovernanceChain(): { isValid: boolean; totalRecords: number; brokenIndex?: number } {
    let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    for (let i = 0; i < this.auditChain.length; i++) {
      const rec = this.auditChain[i];
      if (rec.prevHash !== prevHash) return { isValid: false, totalRecords: this.auditChain.length, brokenIndex: i };
      
      const payload = `${rec.id}|${rec.timestamp}|${rec.policyId}|${rec.providerId}|${rec.action}|${rec.status}|${rec.prevHash}`;
      const recomputed = crypto.createHash('sha256').update(payload).digest('hex');
      if (recomputed !== rec.hash) return { isValid: false, totalRecords: this.auditChain.length, brokenIndex: i };
      
      prevHash = rec.hash;
    }
    return { isValid: true, totalRecords: this.auditChain.length };
  }
}

export function createGovernanceRegistry(): GovernanceRegistry {
  return new GovernanceRegistry();
}
