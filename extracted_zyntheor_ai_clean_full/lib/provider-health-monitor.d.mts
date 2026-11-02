export class ProviderHealthMonitor {
  constructor(options?: { failureThreshold?: number; recoveryWindowMs?: number });
  recordSuccess(providerId: string, latencyMs?: number | null): void;
  recordFailure(providerId: string, errorCode?: string): void;
  snapshot(providerId: string): { providerId: string; status: string; consecutiveFailures: number; lastSuccessAt: string | null; lastFailureAt: string | null; lastLatencyMs: number | null; lastErrorCode: string | null; cooldownUntil: string | null };
  all(): ReturnType<ProviderHealthMonitor['snapshot']>[];
}
