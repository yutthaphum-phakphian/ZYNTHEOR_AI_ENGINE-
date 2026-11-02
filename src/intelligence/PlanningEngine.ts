import crypto from 'node:crypto';
import { createAuditEntry } from '../services/auditLedger.js';

export type TaskState =
  | 'PLANNED'
  | 'READY'
  | 'RUNNING'
  | 'WAITING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED';

export interface PlanStep {
  id: string;
  order: number;
  description: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  requiresHumanApproval: boolean;
  result?: string;
  error?: string;
}

export interface StateTransitionRecord {
  fromState: TaskState;
  toState: TaskState;
  timestamp: string;
  actor: string;
  reason?: string;
  digest: string;
}

export interface PlannedTask {
  id: string;
  title: string;
  goal: string;
  state: TaskState;
  steps: PlanStep[];
  currentStepIndex: number;
  requiresHumanApproval: boolean;
  createdAt: string;
  updatedAt: string;
  history: StateTransitionRecord[];
  lastDigest: string;
}

export class IllegalStateTransitionError extends Error {
  constructor(
    public readonly taskId: string,
    public readonly fromState: TaskState,
    public readonly toState: TaskState,
    public readonly validTargets: TaskState[]
  ) {
    super(
      `Illegal task state transition: Cannot transition task '${taskId}' from '${fromState}' to '${toState}'. Valid transitions are: [${validTargets.join(', ')}].`
    );
    this.name = 'IllegalStateTransitionError';
  }
}

export class PlanningEngine {
  private static tasks: Map<string, PlannedTask> = new Map();

  /**
   * Deterministic state transition table.
   * Any state transition not present in this matrix is strictly rejected (Fail Closed).
   */
  public static readonly validTransitions: Record<TaskState, readonly TaskState[]> = {
    PLANNED: ['READY', 'BLOCKED', 'FAILED'] as const,
    READY: ['RUNNING', 'BLOCKED', 'FAILED'] as const,
    RUNNING: ['WAITING_APPROVAL', 'COMPLETED', 'FAILED', 'BLOCKED'] as const,
    WAITING_APPROVAL: ['COMPLETED', 'RUNNING', 'FAILED', 'BLOCKED'] as const,
    COMPLETED: [] as const, // Terminal state
    FAILED: ['READY'] as const, // Can retry by resetting to READY
    BLOCKED: ['READY', 'FAILED'] as const, // Can unblock to READY or abort to FAILED
  };

  /**
   * Creates a new plan initialized in PLANNED state
   */
  public static createPlan(
    goal: string,
    steps: Array<{ description: string; requiresHumanApproval?: boolean }>,
    title?: string
  ): PlannedTask {
    const id = `task-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const initialDigest = crypto.createHash('sha256').update(`INITIAL:${id}:${goal}`).digest('hex');

    const formattedSteps: PlanStep[] = steps.map((s, idx) => ({
      id: `step-${idx + 1}`,
      order: idx + 1,
      description: s.description,
      status: 'PENDING',
      requiresHumanApproval: Boolean(s.requiresHumanApproval),
    }));

    const task: PlannedTask = {
      id,
      title: title || goal.slice(0, 50),
      goal,
      state: 'PLANNED',
      steps: formattedSteps,
      currentStepIndex: 0,
      requiresHumanApproval: formattedSteps.some((s) => s.requiresHumanApproval),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          fromState: 'PLANNED',
          toState: 'PLANNED',
          timestamp: new Date().toISOString(),
          actor: 'system',
          reason: 'Initial plan formulated',
          digest: initialDigest,
        },
      ],
      lastDigest: initialDigest,
    };

    this.tasks.set(id, task);

    createAuditEntry({
      eventType: 'PLANNING_TASK_CREATED',
      actor: 'planning-engine',
      details: { taskId: id, title: task.title, stepsCount: steps.length, digest: initialDigest },
    });

    return task;
  }

  /**
   * Transitions task state strictly enforcing validTransitions table
   */
  public static transition(
    taskId: string,
    targetState: TaskState,
    actor = 'orchestrator',
    reason?: string
  ): PlannedTask {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task '${taskId}' not found in planning engine.`);
    }

    const currentState = task.state;
    const allowed = this.validTransitions[currentState] || [];

    if (!allowed.includes(targetState)) {
      createAuditEntry({
        eventType: 'ILLEGAL_STATE_TRANSITION_BLOCKED',
        actor,
        details: { taskId, currentState, attemptedTarget: targetState, allowed },
      });
      throw new IllegalStateTransitionError(taskId, currentState, targetState, [...allowed]);
    }

    // Compute cryptographically linked transition digest
    const transitionDigest = crypto
      .createHash('sha256')
      .update(`${task.lastDigest}:${taskId}:${currentState}->${targetState}:${Date.now()}:${actor}`)
      .digest('hex');

    const record: StateTransitionRecord = {
      fromState: currentState,
      toState: targetState,
      timestamp: new Date().toISOString(),
      actor,
      reason,
      digest: transitionDigest,
    };

    task.state = targetState;
    task.updatedAt = new Date().toISOString();
    task.history.push(record);
    task.lastDigest = transitionDigest;

    createAuditEntry({
      eventType: 'PLANNING_TASK_TRANSITIONED',
      actor,
      details: { taskId, from: currentState, to: targetState, reason, digest: transitionDigest },
    });

    return task;
  }

  public static getTask(taskId: string): PlannedTask | undefined {
    return this.tasks.get(taskId);
  }

  public static listTasks(): PlannedTask[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public static updateStep(
    taskId: string,
    stepId: string,
    update: Partial<PlanStep>
  ): PlannedTask {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task '${taskId}' not found.`);

    const step = task.steps.find((s) => s.id === stepId);
    if (!step) throw new Error(`Step '${stepId}' not found in task '${taskId}'.`);

    Object.assign(step, update);
    task.updatedAt = new Date().toISOString();
    return task;
  }
}
