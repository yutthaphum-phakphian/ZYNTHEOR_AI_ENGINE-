import { sha256Sync } from '../services/auditLedger';

export enum MemoryCategory {
  PROJECT_ARCHITECTURE = 'PROJECT_ARCHITECTURE',
  VERIFIED_SOLUTIONS = 'VERIFIED_SOLUTIONS',
  KNOWN_BUGS = 'KNOWN_BUGS',
  FAILED_APPROACHES = 'FAILED_APPROACHES',
  SECURITY_CONSTRAINTS = 'SECURITY_CONSTRAINTS',
  CODING_CONVENTIONS = 'CODING_CONVENTIONS',
  ENVIRONMENT_CONSTRAINTS = 'ENVIRONMENT_CONSTRAINTS',
  USER_APPROVED_DECISIONS = 'USER_APPROVED_DECISIONS',
}

export enum MemoryVerificationStatus {
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
  REJECTED = 'REJECTED',
}

export interface MemoryRecord {
  id: string;
  category: MemoryCategory;
  content: string;
  source: string;
  workspaceId: string;
  tenantId: string;
  timestamp: string;
  confidence: number;
  verificationStatus: MemoryVerificationStatus;
  scope: string;
  expiresAt?: string;
  sha256: string;
}

export class EngineeringMemory {
  private static store = new Map<string, MemoryRecord>();

  static async save(
    record: Omit<MemoryRecord, 'timestamp' | 'sha256'>
  ): Promise<MemoryRecord> {
    // Secret blocking firewall: Never store secrets
    if (/api_key|password|secret|ghp_|bearer\s+[a-z0-9_\-\.]+/i.test(record.content)) {
      throw new Error('❌ Secret detected - memory save blocked');
    }

    const timestamp = new Date().toISOString();
    const sha256 = sha256Sync(record.content);
    const full: MemoryRecord = { ...record, timestamp, sha256 };

    // Only VERIFIED may enter trusted memory for VERIFIED_SOLUTIONS
    if (
      record.verificationStatus !== MemoryVerificationStatus.VERIFIED &&
      record.category === MemoryCategory.VERIFIED_SOLUTIONS
    ) {
      throw new Error('Only VERIFIED findings may enter trusted memory');
    }

    this.store.set(record.id, full);
    return full;
  }

  static async retrieve(
    query: string,
    workspaceId: string,
    tenantId: string,
    category?: MemoryCategory
  ): Promise<MemoryRecord[]> {
    // Tenant + Workspace isolation - Fail Closed
    return Array.from(this.store.values())
      .filter((r) => {
        if (r.tenantId !== tenantId) return false;
        if (r.workspaceId !== workspaceId && r.scope !== 'global') return false;
        if (category && r.category !== category) return false;
        if (r.verificationStatus !== MemoryVerificationStatus.VERIFIED) return false;
        return r.content.toLowerCase().includes(query.toLowerCase());
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  static clear(): void {
    this.store.clear();
  }

  static getAll(tenantId?: string): MemoryRecord[] {
    const list = Array.from(this.store.values());
    return tenantId ? list.filter((r) => r.tenantId === tenantId) : list;
  }
}

export { MemoryVerificationStatus as VerificationStatus };
