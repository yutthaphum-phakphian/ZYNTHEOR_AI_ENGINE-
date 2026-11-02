import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** Bounded, in-memory request telemetry. Token/cost values remain null unless supplied by a provider. */
export class RequestObservability {
  #records = [];
  constructor({ limit = 100, storageFile = null } = {}) {
    this.limit = Math.max(1, Math.min(1000, limit));
    this.storageFile = storageFile;
    if (storageFile) {
      try {
        if (existsSync(storageFile)) {
          const parsed = JSON.parse(readFileSync(storageFile, 'utf8'));
          if (Array.isArray(parsed?.records)) this.#records = parsed.records.slice(0, this.limit).filter((r) => r && typeof r.id === 'string' && typeof r.userId === 'string');
        }
      } catch { this.#records = []; }
    }
  }
  #persist() {
    if (!this.storageFile) return;
    const dir = path.dirname(this.storageFile);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const temp = `${this.storageFile}.${process.pid}.tmp`;
    try {
      writeFileSync(temp, JSON.stringify({ version: 1, records: this.#records }), { encoding: 'utf8', mode: 0o600 });
      renameSync(temp, this.storageFile);
    } catch (error) { try { unlinkSync(temp); } catch {} throw error; }
  }
  record(input) {
    const item = {
      userId: String(input.userId || 'local-default').slice(0, 80),
      workspaceId: String(input.workspaceId || 'default').slice(0, 80),
      id: input.id || `req_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(), provider: String(input.provider || 'unknown'),
      model: String(input.model || 'unknown'), mode: String(input.mode || 'auto'),
      effectiveMode: String(input.effectiveMode || input.mode || 'auto'),
      status: input.status === 'success' ? 'success' : 'failed',
      statusCode: Number.isSafeInteger(input.statusCode) ? input.statusCode : (input.status === 'success' ? 200 : (input.errorCode === 'rate_limit_exceeded' ? 429 : 503)),
      latencyMs: Number.isFinite(input.latencyMs) ? Math.max(0, Math.round(input.latencyMs)) : null,
      inputTokens: Number.isSafeInteger(input.inputTokens) && input.inputTokens >= 0 ? input.inputTokens : null,
      outputTokens: Number.isSafeInteger(input.outputTokens) && input.outputTokens >= 0 ? input.outputTokens : null,
      totalTokens: Number.isSafeInteger(input.totalTokens) && input.totalTokens >= 0 ? input.totalTokens : null,
      cost: Number.isFinite(input.cost) && input.cost >= 0 ? input.cost : null,
      errorCode: input.status === 'success' ? null : String(input.errorCode || 'request_failed').slice(0, 80),
    };
    this.#records.unshift(item);
    if (this.#records.length > this.limit) this.#records.length = this.limit;
    this.#persist();
    return { ...item };
  }
  snapshot({ limit = 50, userId = 'local-default', workspaceId = 'default' } = {}) {
    const safeLimit = Math.max(1, Math.min(100, Number.isFinite(limit) ? Math.floor(limit) : 50));
    const scoped = this.#records.filter((r) => r.userId === String(userId) && r.workspaceId === String(workspaceId));
    const records = scoped.slice(0, safeLimit).map((r) => ({ ...r }));
    const totals = records.reduce((a, r) => {
      a.requests++; if (r.status === 'success') a.succeeded++; else a.failed++;
      if (r.totalTokens !== null) { a.knownTokenRequests++; a.totalTokens += r.totalTokens; }
      if (r.cost !== null) { a.knownCostRequests++; a.knownCostTotal += r.cost; }
      return a;
    }, { requests: 0, succeeded: 0, failed: 0, knownTokenRequests: 0, totalTokens: 0, knownCostRequests: 0, knownCostTotal: 0 });
    return { records, totals, retention: this.storageFile ? 'persistent_file_scoped_by_user_workspace' : 'process_memory_only', note: 'Token usage and cost are reported only when supplied by the provider; null means unavailable.' };
  }
}
