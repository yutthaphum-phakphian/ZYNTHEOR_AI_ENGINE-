import { CheckpointManager, Checkpoint } from './CheckpointManager';
import { TaskState, CognitiveControlPlane } from './CognitiveControlPlane';
import fs from 'fs/promises';

export interface RecoveryOutcome {
  action: 'NO_CHECKPOINT' | 'REQUIRE_APPROVAL' | 'RESUME_SAFE';
  reason?: string;
  resumeFrom?: string;
  safeTasks?: any[];
  checkpoint?: Checkpoint;
}

export class DeterministicRecoveryEngine {
  static async recover(jobId: string): Promise<RecoveryOutcome> {
    console.log(`\n♻️ Recovering job ${jobId}...`);
    const cp = await CheckpointManager.load(jobId);
    if (!cp) return { action: 'NO_CHECKPOINT' };

    // 1. Verify state transition to RECOVERING
    CognitiveControlPlane.validateTransition(cp.taskState as TaskState, TaskState.RECOVERING);

    // 2. Inspect whether changes already applied (stat check)
    const incomplete: string[] = [];
    for (const changeId of cp.appliedChangeIds) {
      try {
        await fs.stat(changeId);
      } catch {
        incomplete.push(changeId);
      }
    }

    // 3. Detect ambiguous state requiring human approval
    if (incomplete.length > 0 && cp.taskState === TaskState.VERIFYING) {
      return {
        action: 'REQUIRE_APPROVAL',
        reason: `Ambiguous changes: ${incomplete.join(', ')}`,
        checkpoint: cp,
      };
    }

    // 4. Resume safe ops only
    const taskNodes = Array.isArray(cp.taskGraph?.nodes)
      ? cp.taskGraph.nodes
      : typeof cp.taskGraph?.nodes === 'object' && cp.taskGraph?.nodes !== null
      ? Object.values(cp.taskGraph.nodes)
      : [];

    return {
      action: 'RESUME_SAFE',
      resumeFrom: cp.taskState,
      safeTasks: taskNodes.filter((n: any) => n.status !== 'COMPLETED'),
      checkpoint: cp,
    };
  }
}
