/**
 * ZYNTHEOR AI ENGINE — RELIABILITY ENGINEERING UTILITIES (STEP 9)
 * Master Principle: ZERO FAKE — REAL COMPLETENESS ONLY
 *
 * Capabilities:
 * - Timeout Management with AbortController
 * - Exponential Backoff & Randomized Jitter Retry Policy
 * - Circuit Breaker Pattern (CLOSED | OPEN | HALF_OPEN)
 * - Idempotency Key Guard for Duplicate Write Prevention
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const IDEMPOTENCY_STORE_PATH = path.resolve(process.cwd(), '.aistudio/idempotency_store.json');

export interface TimeoutOptions {
  timeoutMs: number;
  operationName?: string;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableErrorFilter?: (error: any) => boolean;
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps an async operation with a hard timeout limit.
 */
export async function withTimeout<T>(
  asyncFn: (signal: AbortSignal) => Promise<T>,
  options: TimeoutOptions
): Promise<T> {
  const { timeoutMs, operationName = 'Operation' } = options;
  const controller = new AbortController();

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // Prevent unhandled rejections if asyncFn finishes first
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  });

  try {
    return await Promise.race([asyncFn(controller.signal), timeoutPromise]);
  } finally {
    controller.abort();
  }
}

/**
 * Retries an async function with exponential backoff and randomized jitter.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 200;
  const maxDelayMs = options.maxDelayMs ?? 3000;
  const isRetryable = options.retryableErrorFilter ?? ((err: any) => {
    // By default, retry network timeouts and 5xx errors, do NOT retry 4xx or auth errors
    if (err instanceof TimeoutError) return true;
    if (err?.status && err.status >= 500) return true;
    if (err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT') return true;
    return false;
  });

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn(attempt);
    } catch (err: any) {
      lastError = err;

      if (attempt > maxRetries || !isRetryable(err)) {
        throw err;
      }

      // Calculate exponential backoff: base * 2^(attempt-1) + jitter
      const exponential = baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * (baseDelayMs * 0.5);
      const delay = Math.min(maxDelayMs, Math.floor(exponential + jitter));

      await new Promise(res => setTimeout(res, delay));
    }
  }

  throw lastError;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Failures needed to open circuit (e.g. 5)
  resetTimeoutMs?: number;   // Time spent in OPEN before trying HALF_OPEN (e.g. 10000ms)
  halfOpenMaxSuccesses?: number; // Successes in HALF_OPEN to transition back to CLOSED
}

export class CircuitBreaker {
  public state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCountInHalfOpen = 0;
  private lastStateChangeTimestamp = Date.now();

  private failureThreshold: number;
  private resetTimeoutMs: number;
  private halfOpenMaxSuccesses: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 10000;
    this.halfOpenMaxSuccesses = options.halfOpenMaxSuccesses ?? 2;
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();

    // 1. Check state transitions from OPEN -> HALF_OPEN after reset timeout
    if (this.state === 'OPEN') {
      if (now - this.lastStateChangeTimestamp >= this.resetTimeoutMs) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw new Error('CircuitBreaker is OPEN: Requests temporarily blocked to protect downstream service.');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCountInHalfOpen++;
      if (this.successCountInHalfOpen >= this.halfOpenMaxSuccesses) {
        this.transitionTo('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  private onFailure() {
    this.failureCount++;
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  private transitionTo(newState: CircuitState) {
    this.state = newState;
    this.lastStateChangeTimestamp = Date.now();
    if (newState === 'CLOSED') {
      this.failureCount = 0;
      this.successCountInHalfOpen = 0;
    } else if (newState === 'HALF_OPEN') {
      this.successCountInHalfOpen = 0;
    }
  }

  public getStatus(): {
    state: CircuitState;
    failureCount: number;
    lastStateChange: string;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastStateChange: new Date(this.lastStateChangeTimestamp).toISOString(),
    };
  }
}

export class IdempotencyGuard {
  private processedKeys = new Map<string, { timestamp: string; result: any; scope?: string }>();
  private ttlMs: number;

  constructor(ttlMs = 3600000) { // Default 1 hour TTL
    this.ttlMs = ttlMs;
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(IDEMPOTENCY_STORE_PATH)) {
        const raw = fs.readFileSync(IDEMPOTENCY_STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.processedKeys.clear();
          const now = Date.now();
          for (const item of parsed) {
            if (now - new Date(item.timestamp).getTime() <= this.ttlMs) {
              this.processedKeys.set(item.key, {
                timestamp: item.timestamp,
                result: item.result,
                scope: item.scope,
              });
            }
          }
        }
      }
    } catch {
      // In-memory fallback if disk read fails
    }
  }

  private saveToDisk() {
    try {
      const dir = path.dirname(IDEMPOTENCY_STORE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.processedKeys.entries()).map(([key, val]) => ({
        key,
        timestamp: val.timestamp,
        result: val.result,
        scope: val.scope,
      }));
      fs.writeFileSync(IDEMPOTENCY_STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Ignore disk write errors in restricted sandboxes
    }
  }

  public formatScopedKey(key: string, workspaceId = 'default', userId = 'anonymous'): string {
    return `${workspaceId}:${userId}:${key}`;
  }

  public isProcessed(key: string, workspaceId?: string, userId?: string): boolean {
    const targetKey = workspaceId ? this.formatScopedKey(key, workspaceId, userId) : key;
    const record = this.processedKeys.get(targetKey) || (workspaceId ? this.processedKeys.get(key) : undefined);
    if (!record) return false;

    // Check expiration
    if (Date.now() - new Date(record.timestamp).getTime() > this.ttlMs) {
      this.processedKeys.delete(targetKey);
      this.saveToDisk();
      return false;
    }
    return true;
  }

  public getResult(key: string, workspaceId?: string, userId?: string): any {
    const targetKey = workspaceId ? this.formatScopedKey(key, workspaceId, userId) : key;
    const record = this.processedKeys.get(targetKey) || (workspaceId ? this.processedKeys.get(key) : undefined);
    return record?.result;
  }

  public recordProcessed(key: string, result: any, workspaceId?: string, userId?: string): void {
    const targetKey = workspaceId ? this.formatScopedKey(key, workspaceId, userId) : key;
    const now = new Date().toISOString();
    this.processedKeys.set(targetKey, {
      timestamp: now,
      result,
      scope: workspaceId ? `${workspaceId}:${userId || 'anonymous'}` : undefined,
    });
    this.saveToDisk();
  }

  public clear(): void {
    this.processedKeys.clear();
    this.saveToDisk();
  }
}

export const globalIdempotencyGuard = new IdempotencyGuard();
