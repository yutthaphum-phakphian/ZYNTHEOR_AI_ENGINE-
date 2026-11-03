export interface TaskCheckpoint {
  taskId: string;
  stepId: string;
  timestamp: number;
  data: any;
  progress: number;
}

export interface PersistentTask {
  id: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  checkpoints: TaskCheckpoint[];
  currentStep: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

export interface EvidenceCheck {
  name: string;
  passed: boolean;
  reason?: string;
}

export interface EvidenceGateResult {
  passed: boolean;
  checks: EvidenceCheck[];
}

export interface ContinuityResult {
  canResume: boolean;
  task: PersistentTask | null;
  lastCheckpoint: TaskCheckpoint | null;
  evidence: EvidenceGateResult;
}

export class TaskContinuityManager {
  private storage = new Map<string, PersistentTask>();

  createTask(id: string, metadata?: Record<string, any>): PersistentTask {
    const task: PersistentTask = {
      id,
      status: 'pending',
      progress: 0,
      checkpoints: [],
      currentStep: 'init',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata
    };
    this.storage.set(id, task);
    return task;
  }

  saveTask(task: PersistentTask): void {
    task.updatedAt = Date.now();
    this.storage.set(task.id, { ...task, checkpoints: [...task.checkpoints] });
  }

  loadTask(taskId: string): PersistentTask | null {
    const task = this.storage.get(taskId);
    return task ? { ...task, checkpoints: [...task.checkpoints] } : null;
  }

  createCheckpoint(taskId: string, stepId: string, data: any, progress: number): TaskCheckpoint | null {
    const task = this.storage.get(taskId);
    if (!task) return null;
    
    const checkpoint: TaskCheckpoint = {
      taskId,
      stepId,
      timestamp: Date.now(),
      data,
      progress: Math.min(100, Math.max(0, progress))
    };
    
    task.checkpoints.push(checkpoint);
    task.currentStep = stepId;
    task.progress = checkpoint.progress;
    task.status = progress >= 100 ? 'completed' : 'running';
    task.updatedAt = Date.now();
    
    this.storage.set(taskId, task);
    return checkpoint;
  }

  resumeTask(taskId: string): ContinuityResult {
    const task = this.loadTask(taskId);
    if (!task) {
      return {
        canResume: false,
        task: null,
        lastCheckpoint: null,
        evidence: { passed: false, checks: [{ name: 'task_exists', passed: false, reason: 'task not found' }] }
      };
    }

    const lastCheckpoint = task.checkpoints.length > 0 ? task.checkpoints[task.checkpoints.length - 1] : null;
    const evidence = this.verifyContinuity(task);
    
    return {
      canResume: evidence.passed && task.status !== 'completed',
      task,
      lastCheckpoint,
      evidence
    };
  }

  pauseTask(taskId: string): boolean {
    const task = this.storage.get(taskId);
    if (!task) return false;
    task.status = 'paused';
    task.updatedAt = Date.now();
    this.storage.set(taskId, task);
    return true;
  }

  listTasks(): PersistentTask[] {
    return Array.from(this.storage.values()).map(t => ({ ...t, checkpoints: [...t.checkpoints] }));
  }

  clearCompleted(): number {
    let count = 0;
    for (const [id, task] of this.storage.entries()) {
      if (task.status === 'completed') {
        this.storage.delete(id);
        count++;
      }
    }
    return count;
  }

  verifyContinuity(task: PersistentTask): EvidenceGateResult {
    const checks: EvidenceCheck[] = [
      { name: 'has_id', passed: !!task.id, reason: !task.id ? 'missing id' : undefined },
      { name: 'progress_valid', passed: task.progress >= 0 && task.progress <= 100, reason: 'progress out of range' },
      { name: 'checkpoints_ordered', passed: this.isCheckpointsOrdered(task.checkpoints), reason: 'checkpoints not ordered' },
      { name: 'timestamps_valid', passed: task.updatedAt >= task.createdAt, reason: 'timestamps invalid' },
      { name: 'status_consistent', passed: !(task.status === 'completed' && task.progress < 100), reason: 'completed but progress <100' },
    ];
    return { passed: checks.every(c=>c.passed), checks };
  }

  private isCheckpointsOrdered(checkpoints: TaskCheckpoint[]): boolean {
    for (let i = 1; i < checkpoints.length; i++) {
      if (checkpoints[i].timestamp < checkpoints[i-1].timestamp) return false;
      if (checkpoints[i].progress < checkpoints[i-1].progress) return false;
    }
    return true;
  }

  exportState(): string {
    return JSON.stringify(Array.from(this.storage.entries()));
  }

  importState(json: string): boolean {
    try {
      const entries = JSON.parse(json) as [string, PersistentTask][];
      this.storage = new Map(entries);
      return true;
    } catch {
      return false;
    }
  }
}

export function createContinuityManager(): TaskContinuityManager {
  return new TaskContinuityManager();
}
