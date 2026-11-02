import { AgentRole, AgentMessage, ToolName } from './types';
import { AGENT_DEFINITIONS, canApprove } from './definitions';
import crypto from 'crypto';

export class AgentCoordinator {
  private tasks = new Map<
    string,
    { status: string; assignedTo: AgentRole; retries: number; idempotencyKey: string }
  >();
  private messages: AgentMessage[] = [];
  private conflictLog: any[] = [];

  async assignTask(
    taskId: string,
    role: AgentRole,
    idempotencyKey?: string
  ): Promise<{ action: 'ASSIGNED' | 'DUPLICATE_PREVENTED'; role?: AgentRole; key?: string }> {
    const key =
      idempotencyKey || crypto.createHash('sha256').update(`${taskId}:${role}`).digest('hex');

    // Idempotency: prevent duplicate execution
    if (this.tasks.has(taskId) && this.tasks.get(taskId)?.idempotencyKey === key) {
      console.log(`⚠️ Duplicate execution prevented for ${taskId}`);
      return { action: 'DUPLICATE_PREVENTED' };
    }

    if (this.tasks.has(taskId) && this.tasks.get(taskId)?.status === 'RUNNING') {
      throw new Error(`Task ${taskId} already running`);
    }

    this.tasks.set(taskId, {
      status: 'READY',
      assignedTo: role,
      retries: 0,
      idempotencyKey: key,
    });

    return { action: 'ASSIGNED', role, key };
  }

  async trackProgress(taskId: string, status: string) {
    const t = this.tasks.get(taskId);
    if (!t) throw new Error('Task not found');
    t.status = status;
    return t;
  }

  async checkPermission(role: AgentRole, tool: ToolName): Promise<boolean> {
    const def = AGENT_DEFINITIONS[role];
    if (!def) return false;
    const allowed = def.allowedTools.includes(tool);
    if (!allowed) {
      console.log(`🛑 Permission denied: ${role} cannot use ${tool}`);
      return false;
    }
    if (!canApprove(role, tool)) {
      console.log(`🛑 Self-approval blocked: ${role} cannot ${tool}`);
      return false;
    }
    return true;
  }

  // Detect Conflict: If DEVELOPER reports PASS but SECURITY reports FAIL, FAIL wins
  async detectConflict(
    taskId: string,
    proposals: AgentMessage[]
  ): Promise<{ hasConflict: boolean; resolution?: string; evidence?: any }> {
    const pass = proposals.filter((p) => p.type === 'COMPLETED');
    const fail = proposals.filter(
      (p) => p.type === 'FAILED' || p.payload?.status === 'FAILED'
    );

    if (pass.length > 0 && fail.length > 0) {
      const conflict = {
        taskId,
        type: 'CONFLICT',
        evidence: fail[0].payload,
        resolvedBy: 'EVIDENCE_BASED',
      };
      this.conflictLog.push(conflict);
      console.log(`⚠️ Conflict detected in ${taskId}: resolved by evidence`);
      return { hasConflict: true, resolution: 'FAIL_WINS', evidence: fail[0].payload };
    }

    return { hasConflict: false };
  }

  async handleRetry(taskId: string): Promise<{ canRetry: boolean; retries: number }> {
    const t = this.tasks.get(taskId);
    if (!t) return { canRetry: false, retries: 0 };
    const def = AGENT_DEFINITIONS[t.assignedTo];
    if (t.retries >= def.maxRetries) {
      console.log(`🛑 Max retries exceeded for ${taskId} (${def.maxRetries})`);
      return { canRetry: false, retries: t.retries };
    }
    t.retries++;
    t.status = 'READY';
    return { canRetry: true, retries: t.retries };
  }

  recordMessage(message: AgentMessage): void {
    this.messages.push(message);
  }

  getAuditTrail() {
    return {
      tasks: Array.from(this.tasks.entries()),
      messages: this.messages.slice(-20),
      conflicts: this.conflictLog,
    };
  }
}
