import { ZyntheorGraph, ZyntheorState } from '../agents/graph';
import { MemoryManager } from './MemoryManager';

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

      // 🛑 Intercept before Tester Node (before real execution)
      if (state.nextNode === 'tester') {
        onEvent({ type: 'require_approval', action: 'execute_code', filepath: state.filepath, sessionId });

        // Wait for user to Approve or Reject from UI
        const isApproved = await new Promise<boolean>((resolve) => {
          pendingApprovals.set(sessionId, resolve);
        });

        if (!isApproved) {
          onEvent({ type: 'agent_thought', agent: 'SYSTEM', content: '❌ Execution aborted by User.' });
          break;
        }
      }

      let partial: Partial<ZyntheorState> = {};
      if (state.nextNode === 'planner') partial = await graph.plannerNode(state);
      else if (state.nextNode === 'coder') partial = await graph.coderNode(state);
      else if (state.nextNode === 'reviewer') partial = await graph.reviewerNode(state);
      else if (state.nextNode === 'tester') partial = await graph.testerNode(state);

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
