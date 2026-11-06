/**
 * ZYNTHEOR AI ENGINE — PRODUCTION RELIABILITY, SECURITY & OPERATIONS TEST SUITE (STEP 9)
 * ZERO FAKE — REAL COMPLETENESS ONLY
 *
 * Tests:
 * 1. Structured Logging & Sensitive Credential Redaction
 * 2. Timeout Management with AbortController
 * 3. Exponential Backoff & Jitter Retry Policy
 * 4. Circuit Breaker State Machine (CLOSED -> OPEN -> HALF_OPEN)
 * 5. Idempotency Key Guard
 * 6. SSRF Protection & Private IP Blocking
 * 7. Production Telemetry Snapshot & Gate Evaluation (Gate A-G)
 */

import { describe, it, expect } from 'vitest';
import { ProductionStructuredLogger, sanitizeLogInput } from '../src/services/structuredLogger.ts';
import {
  withTimeout,
  withRetry,
  CircuitBreaker,
  IdempotencyGuard,
  TimeoutError
} from '../src/utils/reliability.ts';
import { validateTargetUrl } from '../src/services/securityGuard.ts';
import { productionMetrics } from '../src/services/productionMetrics.ts';

describe('ZYNTHEOR Step 9 — Production Reliability, Security & Operations', () => {
  it('S9.1: Structured Logging & Sensitive Credential Redaction', () => {
    const logger = new ProductionStructuredLogger('test-service');

    const payload = logger.info('Executing authentication with token Bearer secret_token_1234567890', {
      metadata: {
        apiKey: 'AIzaSyTestApiKeySecret12345',
        password: 'mySuperSecretPassword',
        normalField: 'public_value',
      },
    });

    expect(payload.serviceName).toBe('test-service');
    expect(payload.timestamp).toBeDefined();
    expect(payload.requestId).toBeDefined();

    // Redaction Checks
    expect(payload.message).not.toContain('secret_token_1234567890');
    expect(payload.message).toContain('[REDACTED_SENSITIVE_CREDENTIAL]');
    expect(payload.metadata?.apiKey).toBe('[REDACTED_SENSITIVE_FIELD]');
    expect(payload.metadata?.password).toBe('[REDACTED_SENSITIVE_FIELD]');
    expect(payload.metadata?.normalField).toBe('public_value');
  });

  it('S9.2: Timeout Management with AbortController', async () => {
    // Fast operation succeeds
    const fastRes = await withTimeout(
      async () => 'fast_ok',
      { timeoutMs: 500, operationName: 'FastTest' }
    );
    expect(fastRes).toBe('fast_ok');

    // Slow operation throws TimeoutError
    await expect(
      withTimeout(
        async signal => {
          await new Promise((res, rej) => {
            const t = setTimeout(res, 300);
            signal.addEventListener('abort', () => {
              clearTimeout(t);
              rej(new Error('Aborted'));
            });
          });
        },
        { timeoutMs: 50, operationName: 'SlowTest' }
      )
    ).rejects.toThrow(TimeoutError);
  });

  it('S9.3: Exponential Backoff & Jitter Retry Policy', async () => {
    let attempts = 0;
    const retryableResult = await withRetry(
      async currentAttempt => {
        attempts = currentAttempt;
        if (currentAttempt < 3) {
          throw new TimeoutError('Transient network timeout');
        }
        return 'retry_success';
      },
      { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 50 }
    );

    expect(retryableResult).toBe('retry_success');
    expect(attempts).toBe(3);
  });

  it('S9.4: Circuit Breaker State Transitions (CLOSED -> OPEN -> HALF_OPEN -> CLOSED)', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 100,
      halfOpenMaxSuccesses: 1,
    });

    expect(breaker.state).toBe('CLOSED');

    // Cause 2 failures to trip circuit
    await expect(breaker.execute(async () => { throw new Error('Fail 1'); })).rejects.toThrow();
    await expect(breaker.execute(async () => { throw new Error('Fail 2'); })).rejects.toThrow();

    expect(breaker.state).toBe('OPEN');

    // Requests rejected immediately while OPEN
    await expect(breaker.execute(async () => 'ok')).rejects.toThrow('CircuitBreaker is OPEN');

    // Wait for reset timeout to transition to HALF_OPEN
    await new Promise(r => setTimeout(r, 120));

    // Successful trial request closes circuit
    const res = await breaker.execute(async () => 'recovered');
    expect(res).toBe('recovered');
    expect(breaker.state).toBe('CLOSED');
  });

  it('S9.5: Idempotency Key Guard', () => {
    const guard = new IdempotencyGuard(1000);
    const key = 'idempotent-task-123';

    expect(guard.isProcessed(key)).toBe(false);

    guard.recordProcessed(key, { status: 'COMPLETED', taskId: 'task-123' });
    expect(guard.isProcessed(key)).toBe(true);
    expect(guard.getResult(key)?.status).toBe('COMPLETED');
  });

  it('S9.6: SSRF Protection & Private IP Blocking', () => {
    // Allowed external public URLs
    expect(validateTargetUrl('https://example.com/api').allowed).toBe(true);
    expect(validateTargetUrl('https://docs.github.com/v3').allowed).toBe(true);

    // Blocked private / internal / metadata targets
    expect(validateTargetUrl('http://127.0.0.1/admin').allowed).toBe(false);
    expect(validateTargetUrl('http://localhost:3000/metrics').allowed).toBe(false);
    expect(validateTargetUrl('http://10.0.0.1/internal').allowed).toBe(false);
    expect(validateTargetUrl('http://192.168.1.1/router').allowed).toBe(false);
    expect(validateTargetUrl('http://169.254.169.254/latest/meta-data/').allowed).toBe(false);
    expect(validateTargetUrl('file:///etc/passwd').allowed).toBe(false);
  });

  it('S9.7: Production Telemetry & Gates Evaluation (Gate A-G)', () => {
    productionMetrics.recordRequest(45, false);
    productionMetrics.recordRequest(120, false);

    const snapshot = productionMetrics.getSnapshot();
    expect(snapshot.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(snapshot.memory.heapUsedMb).toBeGreaterThan(0);
    expect(snapshot.telemetry.totalRequests).toBeGreaterThanOrEqual(2);

    const gateEval = productionMetrics.evaluateProductionGates();
    expect(gateEval.overallStatus).toBe('PASS');
    expect(gateEval.gates).toHaveLength(7);
  });
});
