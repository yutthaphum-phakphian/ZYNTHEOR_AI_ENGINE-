export enum TaskState {
  CREATED = 'CREATED',
  UNDERSTANDING = 'UNDERSTANDING',
  CONTEXT_GATHERING = 'CONTEXT_GATHERING',
  PLANNING = 'PLANNING',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  READY = 'READY',
  RUNNING = 'RUNNING',
  VERIFYING = 'VERIFYING',
  RECOVERING = 'RECOVERING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  CANCELLED = 'CANCELLED',
}

export class CognitiveControlPlane {
  private static valid: Record<TaskState, TaskState[]> = {
    [TaskState.CREATED]: [TaskState.UNDERSTANDING, TaskState.CANCELLED],
    [TaskState.UNDERSTANDING]: [TaskState.CONTEXT_GATHERING, TaskState.FAILED, TaskState.CANCELLED],
    [TaskState.CONTEXT_GATHERING]: [TaskState.PLANNING, TaskState.FAILED, TaskState.CANCELLED],
    [TaskState.PLANNING]: [TaskState.AWAITING_APPROVAL, TaskState.FAILED, TaskState.CANCELLED],
    [TaskState.AWAITING_APPROVAL]: [TaskState.READY, TaskState.CANCELLED],
    [TaskState.READY]: [TaskState.RUNNING, TaskState.CANCELLED],
    [TaskState.RUNNING]: [TaskState.VERIFYING, TaskState.FAILED, TaskState.BLOCKED],
    [TaskState.VERIFYING]: [TaskState.COMPLETED, TaskState.FAILED, TaskState.RUNNING, TaskState.RECOVERING],
    [TaskState.RECOVERING]: [TaskState.READY, TaskState.AWAITING_APPROVAL, TaskState.FAILED],
    [TaskState.COMPLETED]: [],
    [TaskState.FAILED]: [TaskState.READY, TaskState.RECOVERING],
    [TaskState.BLOCKED]: [TaskState.READY, TaskState.CANCELLED],
    [TaskState.CANCELLED]: [],
  };

  static validateTransition(current: TaskState, next: TaskState): boolean {
    if (!this.valid[current]?.includes(next)) {
      throw new Error(`❌ INVALID STATE TRANSITION: ${current} -> ${next}`);
    }
    return true;
  }

  static getValidTransitions(current: TaskState): TaskState[] {
    return this.valid[current] || [];
  }
}
