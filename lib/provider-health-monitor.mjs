/** Passive provider health tracking. It never sends probe requests or exposes credentials. */
export class ProviderHealthMonitor {
  #entries = new Map();
  constructor({ failureThreshold = 3, recoveryWindowMs = 60_000 } = {}) {
    this.failureThreshold = Math.max(1, failureThreshold);
    this.recoveryWindowMs = Math.max(1_000, recoveryWindowMs);
  }
  recordSuccess(providerId, latencyMs = null) {
    const previous = this.#entries.get(providerId);
    this.#entries.set(providerId, {
      providerId, status: 'healthy', consecutiveFailures: 0,
      lastSuccessAt: new Date().toISOString(), lastFailureAt: previous?.lastFailureAt ?? null,
      lastLatencyMs: Number.isFinite(latencyMs) ? Math.max(0, Math.round(latencyMs)) : null,
      lastErrorCode: null, cooldownUntil: null,
    });
  }
  recordFailure(providerId, errorCode = 'provider_error') {
    const previous = this.#entries.get(providerId);
    const failures = (previous?.consecutiveFailures ?? 0) + 1;
    const cooldown = failures >= this.failureThreshold ? Date.now() + this.recoveryWindowMs : null;
    this.#entries.set(providerId, {
      providerId, status: cooldown ? 'degraded' : 'unhealthy', consecutiveFailures: failures,
      lastSuccessAt: previous?.lastSuccessAt ?? null, lastFailureAt: new Date().toISOString(),
      lastLatencyMs: previous?.lastLatencyMs ?? null,
      lastErrorCode: ['timeout', 'rate_limit', 'authentication', 'unavailable', 'empty_response', 'stream_start_failed', 'stream_failed', 'provider_request_failed'].includes(errorCode) ? errorCode : 'provider_error',
      cooldownUntil: cooldown ? new Date(cooldown).toISOString() : null,
    });
  }
  snapshot(providerId) {
    const entry = this.#entries.get(providerId);
    if (!entry) return { providerId, status: 'unknown', consecutiveFailures: 0, lastSuccessAt: null, lastFailureAt: null, lastLatencyMs: null, lastErrorCode: null, cooldownUntil: null };
    if (entry.cooldownUntil && Date.now() >= Date.parse(entry.cooldownUntil)) {
      return { ...entry, status: 'probe_due', cooldownUntil: null };
    }
    return { ...entry };
  }
  all() { return [...this.#entries.keys()].map((id) => this.snapshot(id)); }
}
