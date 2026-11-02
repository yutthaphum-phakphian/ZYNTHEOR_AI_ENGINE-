import path from 'path';
import { ZyntheorGraph, ZyntheorState } from '../agents/graph';
import { MemoryManager } from './MemoryManager';
import { ExecutionGateway } from '../services/ExecutionGateway.ts';
import { ExecutionRequest, ExecutionStatus, generateRequestDigest } from '../types/execution.ts';

// Map storing pending approval promises awaiting user action from UI
const pendingApprovals = new Map<string, (approved: boolean) => void>();

export class MultiAgentOrchestrator {
  async run(task: string, sessionId: string, onEvent: (e: any) => void) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.ZYNTHEOR_MODEL_API_KEY || '';
    const graph = new ZyntheorGraph(apiKey, onEvent, sessionId);

    // 1. Load memory history (fetch up to 5 most recent lessons)
    const past = (await MemoryManager.loadState(`memory_${sessionId}`)) || { lessons: [] };
    const pastLessons = Array.isArray(past.lessons) ? past.lessons.slice(-5).join('\n') : '';

    let state: ZyntheorState = {
      task: pastLessons
        ? `${task}\n\n[MEMORY FROM PREVIOUS RUNS]:\n${pastLessons}\nPlease avoid these past mistakes.`
        : task,
      plan: '',
      filepath: '',
      currentCode: '',
      reviewFeedback: '',
      testError: null,
      attempts: 0,
      lessonLearned: '',
      nextNode: 'planner',
    };

    if (pastLessons) {
      onEvent({ type: 'agent_thought', agent: 'SYSTEM', content: `🧠 Loading past memories...\n${pastLessons}` });
    }

    while (state.nextNode !== 'end' && state.attempts < 5) {
      state.attempts++;

      // 🛑 Intercept before Tester Node (before real execution) with Level 4 Execution Gateway
      if (state.nextNode === 'tester') {
        const jobId = `job_${Date.now()}`;
        const isTS = state.filepath.endsWith('.ts');
        const executable = isTS ? 'npx' : 'node';
        const args = isTS ? ['ts-node', state.filepath] : [state.filepath];
        const workingDirectory = path.resolve(process.cwd(), 'workspace');

        const execReq: ExecutionRequest = {
          jobId,
          workspaceId: sessionId,
          executable,
          args,
          workingDirectory,
          timeoutMs: 15000,
          capabilities: ['fs:read'],
        };
        const approvedDigest = generateRequestDigest(execReq);

        onEvent({
          type: 'require_approval',
          action: 'execute_code',
          filepath: state.filepath,
          jobId,
          digest: approvedDigest,
          sessionId,
        });

        // Wait for user to Approve or Reject from UI
        const isApproved = await new Promise<boolean>((resolve) => {
          pendingApprovals.set(sessionId, resolve);
        });

        if (!isApproved) {
          onEvent({ type: 'agent_thought', agent: 'SYSTEM', content: '❌ Execution aborted by User.' });
          break;
        }

        onEvent({ type: 'tool_call', name: 'sandbox_execute', status: 'running' });
        const execResult = await ExecutionGateway.runAndVerify(execReq, approvedDigest);

        onEvent({
          type: 'tool_result',
          name: 'execute_command',
          status: execResult.status === ExecutionStatus.COMPLETED ? 'success' : 'error',
          output: execResult.stdout || execResult.stderr,
          metadata: {
            exitCode: execResult.exitCode,
            duration: execResult.durationMs,
            status: execResult.status,
            measuredUsage: execResult.measuredUsage,
            cleanupStatus: execResult.cleanupStatus,
          },
        });

        if (execResult.status === ExecutionStatus.COMPLETED) {
          state = { ...state, nextNode: 'end' as const };
        } else {
          state = {
            ...state,
            testError: `STDERR: ${execResult.stderr}\nSTATUS: ${execResult.status}`,
            nextNode: 'coder' as const,
          };
        }
        await MemoryManager.saveState(sessionId, state);
        onEvent({ type: 'graph_state_update', state: { next: state.nextNode, attempts: state.attempts } });
        continue;
      }

      let partial: Partial<ZyntheorState> = {};
      if (state.nextNode === 'planner') partial = await graph.plannerNode(state);
      else if (state.nextNode === 'coder') partial = await graph.coderNode(state);
      else if (state.nextNode === 'reviewer') partial = await graph.reviewerNode(state);

      state = { ...state, ...partial };
      await MemoryManager.saveState(sessionId, state);
      onEvent({ type: 'graph_state_update', state: { next: state.nextNode, attempts: state.attempts } });

      // When execution reaches end or reaches max attempts
      if (state.nextNode === 'end' || state.attempts >= 5) {
        const isSuccess = state.nextNode === 'end' && !state.testError;
        const reflection = await graph.reflectorNode(state, isSuccess);
        state = { ...state, ...reflection };

        if (reflection.lessonLearned && reflection.lessonLearned !== 'No specific lesson needed.') {
          if (!Array.isArray(past.lessons)) past.lessons = [];
          past.lessons.push(`[${new Date().toISOString()}] ${reflection.lessonLearned}`);
          if (past.lessons.length > 20) past.lessons.shift();
          await MemoryManager.saveState(`memory_${sessionId}`, past);
        }
        break;
      }
    }

    onEvent({
      type: 'final',
      content:
        state.nextNode === 'end' && !state.testError
          ? `✅ Done in ${state.attempts} steps!`
          : `❌ Execution stopped after ${state.attempts} attempts.`,
    });
  }

  /**
   * Handle user approval / rejection signal from the frontend UI
   */
  static handleApproval(sessionId: string, approved: boolean) {
    const resolver = pendingApprovals.get(sessionId);
    if (resolver) {
      resolver(approved);
      pendingApprovals.delete(sessionId);
      return true;
    }
    return false;
  }

  static isPendingApproval(sessionId: string): boolean {
    return pendingApprovals.has(sessionId);
  }
}
