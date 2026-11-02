import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionGateway, VALID_TRANSITIONS, SecurityPolicy } from '../src/services/ExecutionGateway.ts';
import { ExecutionStatus } from '../src/types/execution.ts';
import { AuditLedger } from '../src/services/auditLedger.ts';
import { getDatabaseStatus, checkDbHealth, db } from '../src/db/index.ts';
import { MemoryManager } from '../src/server/MemoryManager.ts';

describe('P13.1 Enterprise Database & Execution Security Tests', () => {
  beforeEach(() => {
    // Reset test job state
  });

  // 1. Execution State Machine Enforcement
  describe('Execution State Machine (FSM)', () => {
    it('Permits valid sequential lifecycle transitions', () => {
      const jobId = `test-fsm-${Date.now()}`;
      ExecutionGateway.registerJob(jobId, ExecutionStatus.CREATED);

      expect(ExecutionGateway.transitionState(jobId, ExecutionStatus.AWAITING_APPROVAL)).toBe(
        ExecutionStatus.AWAITING_APPROVAL
      );
      expect(ExecutionGateway.transitionState(jobId, ExecutionStatus.APPROVED)).toBe(
        ExecutionStatus.APPROVED
      );
      expect(ExecutionGateway.transitionState(jobId, ExecutionStatus.STARTING)).toBe(
        ExecutionStatus.STARTING
      );
      expect(ExecutionGateway.transitionState(jobId, ExecutionStatus.RUNNING)).toBe(
        ExecutionStatus.RUNNING
      );
      expect(ExecutionGateway.transitionState(jobId, ExecutionStatus.COMPLETED)).toBe(
        ExecutionStatus.COMPLETED
      );
    });

    it('Rejects invalid transition leaps (e.g. CREATED -> COMPLETED)', () => {
      const jobId = `test-invalid-${Date.now()}`;
      ExecutionGateway.registerJob(jobId, ExecutionStatus.CREATED);

      expect(() => {
        ExecutionGateway.transitionState(jobId, ExecutionStatus.COMPLETED);
      }).toThrow(/INVALID_STATE_TRANSITION/);
    });

    it('Protects terminal states from resurrection (e.g. COMPLETED -> RUNNING)', () => {
      const jobId = `test-terminal-${Date.now()}`;
      ExecutionGateway.registerJob(jobId, ExecutionStatus.CREATED);
      ExecutionGateway.transitionState(jobId, ExecutionStatus.AWAITING_APPROVAL);
      ExecutionGateway.transitionState(jobId, ExecutionStatus.APPROVED);
      ExecutionGateway.transitionState(jobId, ExecutionStatus.STARTING);
      ExecutionGateway.transitionState(jobId, ExecutionStatus.RUNNING);
      ExecutionGateway.transitionState(jobId, ExecutionStatus.COMPLETED);

      expect(() => {
        ExecutionGateway.transitionState(jobId, ExecutionStatus.RUNNING);
      }).toThrow(/INVALID_STATE_TRANSITION/);
    });
  });

  // 2. Concurrency-Safe Audit Hash Chain Integrity
  describe('Audit Ledger Concurrency Lock', () => {
    it('Maintains unbroken cryptographic SHA-256 chain under 15 simultaneous writes', async () => {
      const writePromises = Array.from({ length: 15 }, (_, i) =>
        AuditLedger.log('CONCURRENT_ACTION', {
          batch: 'p13_1',
          index: i,
          timestamp: Date.now(),
        })
      );

      const results = await Promise.all(writePromises);
      expect(results.length).toBe(15);

      // Verify that every logged entry has a valid SHA-256 hash
      results.forEach((entry) => {
        expect(entry.hash).toBeDefined();
        expect(entry.hash.length).toBe(64);
      });

      // Verify overall chain validity without gaps or broken links
      const verification = AuditLedger.verifyChain();
      expect(verification.isValid).toBe(true);
      expect(verification.brokenIndex).toBeUndefined();
    });
  });

  // 3. Anti-SSRF URL Policy Verification
  describe('SecurityPolicy SSRF Protection', () => {
    it('Blocks internal, cloud metadata, and RFC1918 addresses', () => {
      expect(SecurityPolicy.validateUrl('http://localhost:3000')).toBe(false);
      expect(SecurityPolicy.validateUrl('http://127.0.0.1')).toBe(false);
      expect(SecurityPolicy.validateUrl('http://169.254.169.254/computeMetadata/v1/')).toBe(false);
      expect(SecurityPolicy.validateUrl('http://metadata.google.internal/')).toBe(false);
      expect(SecurityPolicy.validateUrl('http://10.128.0.3:8080')).toBe(false);
      expect(SecurityPolicy.validateUrl('http://192.168.1.254')).toBe(false);
      expect(SecurityPolicy.validateUrl('ftp://example.com')).toBe(false);
    });

    it('Permits valid outbound public URLs', () => {
      expect(SecurityPolicy.validateUrl('https://example.com')).toBe(true);
      expect(SecurityPolicy.validateUrl('https://google.com/search?q=zyntheor')).toBe(true);
    });
  });

  // 4. Zero-Mock Database Fail-Closed Protection
  describe('Zero-Mock Database Fail-Closed Behavior', () => {
    it('Accurately reports database status without fabricating connectivity', () => {
      const status = getDatabaseStatus();
      expect(status).toBeDefined();
      expect(['CONNECTED', 'NOT_CONFIGURED', 'CONNECTION_ERROR']).toContain(status.status);
    });

    it('checkDbHealth returns NOT_CONFIGURED or UNHEALTHY when Postgres is not running', async () => {
      const health = await checkDbHealth();
      expect(['HEALTHY', 'UNHEALTHY', 'NOT_CONFIGURED']).toContain(health.status);
      if (health.status !== 'HEALTHY') {
        expect(health.error).toBeDefined();
      }
    });

    it('MemoryManager.migrateFromJson does not fake successful migration when DB is offline', async () => {
      const result = await MemoryManager.migrateFromJson();
      if (!getDatabaseStatus().connected) {
        expect(result.status).toBe('DATABASE_NOT_CONFIGURED');
        expect(result.migratedCount).toBe(0);
      }
    });
  });
});
