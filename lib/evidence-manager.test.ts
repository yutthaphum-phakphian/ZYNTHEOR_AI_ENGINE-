import { describe, it, expect, beforeEach } from 'vitest';
import { EvidenceManager } from './evidence-manager';

describe('Evidence Manager - Buffalo 1.2.1 PASS', () => {
  let manager: EvidenceManager;

  beforeEach(() => {
    manager = new EvidenceManager();
  });

  it('1. records auto rationale evidence with sha256 hash', () => {
    const rec = manager.record('auto_rationale', 'chat_core', 'Selected reasoning mode', { ASTComplexity: 12, mode: 'reasoning' });
    expect(rec.id).toBeDefined();
    expect(rec.hash.length).toBe(64);
    expect(rec.passed).toBe(true);
  });

  it('2. verifies intact evidence chain', () => {
    manager.record('tool_verification', 'patch_applier', 'Applied patch hunk 1', { file: 'server.ts' });
    manager.record('code_impact', 'code_graph', 'Calculated cross-file impact', { affected: 3 });
    const status = manager.verifyChain();
    expect(status.isValid).toBe(true);
    expect(status.totalRecords).toBe(2);
  });

  it('3. detects tampered record in chain', () => {
    manager.record('routing', 'adaptive_router', 'Selected Ollama provider', { cost: 0 });
    manager.record('task_continuity', 'continuity_mgr', 'Checkpoint saved', { step: 2 });
    
    const chain = manager.getChain();
    // Tamper with payload of first record
    chain[0].payload.cost = 999;

    const status = manager.verifyChain();
    expect(status.isValid).toBe(false);
    expect(status.brokenIndex).toBe(0);
  });

  it('4. filters evidence by category', () => {
    manager.record('auto_rationale', 'core', 'Mode auto', {});
    manager.record('routing', 'router', 'Route selected', {});
    manager.record('routing', 'router', 'Fallback selected', {});

    const routingRecords = manager.getByCategory('routing');
    expect(routingRecords.length).toBe(2);
  });

  it('5. handles empty chain verification', () => {
    const status = manager.verifyChain();
    expect(status.isValid).toBe(true);
    expect(status.totalRecords).toBe(0);
  });

  it('6. calculates confidence correctly', () => {
    const rec = manager.record('observability', 'health_monitor', 'Health check', {}, true, 0.95);
    expect(rec.confidence).toBe(0.95);
  });

  it('7. clears chain state', () => {
    manager.record('auto_rationale', 'core', 'Test', {});
    expect(manager.getChain().length).toBe(1);
    manager.clear();
    expect(manager.getChain().length).toBe(0);
  });

  it('8. chains prevHash correctly across sequential records', () => {
    const r1 = manager.record('auto_rationale', 'src1', 'Rec 1', {});
    const r2 = manager.record('auto_rationale', 'src2', 'Rec 2', {});
    expect(r2.prevHash).toBe(r1.hash);
  });

  it('9. full integration test across 6 evidence types', () => {
    manager.record('auto_rationale', 'auto_mode', 'Auto selected', { mode: 'coding' });
    manager.record('tool_verification', 'verifier', 'Verified output', { passed: true });
    manager.record('code_impact', 'intel', 'AST analyzed', { complexity: 4 });
    manager.record('observability', 'telemetry', 'Latency recorded', { latencyMs: 120 });
    manager.record('routing', 'adaptive_router', 'Routed to Ollama', { provider: 'ollama' });
    manager.record('task_continuity', 'continuity', 'Task resumed', { taskId: 'task-1' });

    const status = manager.verifyChain();
    expect(status.isValid).toBe(true);
    expect(status.totalRecords).toBe(6);
  });
});
