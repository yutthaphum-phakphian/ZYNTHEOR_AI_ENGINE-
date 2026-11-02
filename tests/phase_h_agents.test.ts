import { describe, it, expect } from 'vitest';
import { AgentCoordinator } from '../src/agents/coordinator';
import { AgentRole, ToolName } from '../src/agents/types';
import { DeveloperAgent } from '../src/agents/developerAgent';

describe('PHASE H: Multi-Agent Coordination 2.0', () => {
  it('enforces permission boundary - RELEASE_MANAGER cannot merge or approve gate', async () => {
    const coord = new AgentCoordinator();
    expect(await coord.checkPermission(AgentRole.RELEASE_MANAGER, ToolName.MERGE_PR)).toBe(false);
    expect(await coord.checkPermission(AgentRole.RELEASE_MANAGER, ToolName.APPROVE_GATE)).toBe(false);
    expect(await coord.checkPermission(AgentRole.RELEASE_MANAGER, ToolName.GIT_PUSH)).toBe(true);
  });

  it('enforces read-only permissions for ARCHITECT and CODE_REVIEWER', async () => {
    const coord = new AgentCoordinator();
    expect(await coord.checkPermission(AgentRole.ARCHITECT, ToolName.READ_FILE)).toBe(true);
    expect(await coord.checkPermission(AgentRole.ARCHITECT, ToolName.WRITE_FILE)).toBe(false);
    expect(await coord.checkPermission(AgentRole.CODE_REVIEWER, ToolName.WRITE_FILE)).toBe(false);
  });

  it('prevents duplicate task execution using idempotency keys', async () => {
    const coord = new AgentCoordinator();
    const r1 = await coord.assignTask('TASK-1', AgentRole.DEVELOPER, 'key-123');
    const r2 = await coord.assignTask('TASK-1', AgentRole.DEVELOPER, 'key-123');
    expect(r1.action).toBe('ASSIGNED');
    expect(r2.action).toBe('DUPLICATE_PREVENTED');
  });

  it('enforces retry limits per agent definition', async () => {
    const coord = new AgentCoordinator();
    await coord.assignTask('TASK-2', AgentRole.DEVELOPER);
    expect((await coord.handleRetry('TASK-2')).canRetry).toBe(true); // retry 1
    expect((await coord.handleRetry('TASK-2')).canRetry).toBe(true); // retry 2
    expect((await coord.handleRetry('TASK-2')).canRetry).toBe(true); // retry 3
    const r = await coord.handleRetry('TASK-2'); // retry 4 -> blocked (max 3 for DEVELOPER)
    expect(r.canRetry).toBe(false);
  });

  it('detects conflicts where evidence-based FAIL wins over PASS', async () => {
    const coord = new AgentCoordinator();
    const conflict = await coord.detectConflict('TASK-3', [
      { from: AgentRole.DEVELOPER, type: 'COMPLETED', payload: { status: 'PASSED' } } as any,
      {
        from: AgentRole.SECURITY_REVIEWER,
        type: 'FAILED',
        payload: { status: 'FAILED', reason: 'Hardcoded secret' },
      } as any,
    ]);
    expect(conflict.hasConflict).toBe(true);
    expect(conflict.resolution).toBe('FAIL_WINS');
    expect(conflict.evidence?.reason).toBe('Hardcoded secret');
  });

  it('allows DeveloperAgent to execute within its allowed tool boundaries', async () => {
    const coord = new AgentCoordinator();
    const agent = new DeveloperAgent(coord);
    const result = await agent.execute('TASK-DEV-1', {
      filePath: 'package.json',
      code: '// valid update',
    });
    expect(result.status).toBe('COMPLETED');
    expect(result.evidence).toBe('tsc exit 0');
  });
});
