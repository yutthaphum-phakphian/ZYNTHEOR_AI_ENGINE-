// @ts-nocheck
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export interface UsageEvent {
  id: string;
  tenantId: string;
  userId: number;
  workspaceId: string;
  metric: 'ai_requests' | 'input_tokens' | 'output_tokens' | 'tool_execution';
  amount: number;
  idempotencyKey: string;
  recordedAt: string;
}

const STORAGE_DIR = path.resolve(process.cwd(), 'workspace_data/identity');

function ensureStorageDir() {
  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function loadUsageRecords(): UsageEvent[] {
  ensureStorageDir();
  const filePath = path.join(STORAGE_DIR, 'usage_records.json');
  if (!existsSync(filePath)) return [];
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return [];
  }
}

function saveUsageRecords(records: UsageEvent[]): void {
  ensureStorageDir();
  const filePath = path.join(STORAGE_DIR, 'usage_records.json');
  writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf8');
}

export class UsageMeteringService {
  private records: UsageEvent[];

  constructor() {
    this.records = loadUsageRecords();
  }

  /**
   * Idempotently records a usage event.
   * Prevents duplicate count increment when retries occur with same idempotencyKey.
   */
  public recordUsage(event: Omit<UsageEvent, 'id' | 'recordedAt'>): UsageEvent {
    // Idempotency check
    const existing = this.records.find(r => r.idempotencyKey === event.idempotencyKey);
    if (existing) {
      return existing; // Return existing record without duplicating count
    }

    const newRecord: UsageEvent = {
      ...event,
      id: `usage-${crypto.randomUUID()}`,
      recordedAt: new Date().toISOString(),
    };

    this.records.push(newRecord);
    saveUsageRecords(this.records);
    return newRecord;
  }

  /**
   * Calculates total usage for a given tenant and metric within the current calendar month.
   */
  public getMonthlyUsage(tenantId: string, metric: UsageEvent['metric']): number {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return this.records
      .filter(r => r.tenantId === tenantId && r.metric === metric && new Date(r.recordedAt).getTime() >= startOfMonth)
      .reduce((sum, r) => sum + r.amount, 0);
  }

  /**
   * Get usage breakdown for a tenant
   */
  public getTenantUsageSummary(tenantId: string): {
    aiRequestsMonthly: number;
    inputTokensMonthly: number;
    outputTokensMonthly: number;
    toolExecutionsMonthly: number;
    totalEvents: number;
  } {
    return {
      aiRequestsMonthly: this.getMonthlyUsage(tenantId, 'ai_requests'),
      inputTokensMonthly: this.getMonthlyUsage(tenantId, 'input_tokens'),
      outputTokensMonthly: this.getMonthlyUsage(tenantId, 'output_tokens'),
      toolExecutionsMonthly: this.getMonthlyUsage(tenantId, 'tool_execution'),
      totalEvents: this.records.filter(r => r.tenantId === tenantId).length,
    };
  }
}

export const usageMeteringService = new UsageMeteringService();
