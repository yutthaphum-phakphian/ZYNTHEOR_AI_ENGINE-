import { ZyntheorGraph, ZyntheorState } from '../agents/graph';

export class MultiAgentOrchestrator {
  async run(task: string, onEvent: (event: any) => void) {
    const graph = new ZyntheorGraph(process.env.GEMINI_API_KEY!, onEvent);
    
    let state: ZyntheorState = {
      task,
      plan: '',
      filepath: '',
      currentCode: '',
      reviewFeedback: '',
      testError: null,
      attempts: 0,
      nextNode: 'planner'
    };

    onEvent({ type: 'graph_start', content: `Starting Multi-Agent workflow for: ${task}` });

    // Graph Execution Loop - กันวนลูปไม่จบ 5 ครั้ง
    while (state.nextNode !== 'end' && state.attempts < 5) {
      state.attempts++;
      let partialState: Partial<ZyntheorState> = {};

      switch (state.nextNode) {
        case 'planner':
          partialState = await graph.plannerNode(state);
          break;
        case 'coder':
          partialState = await graph.coderNode(state);
          break;
        case 'reviewer':
          partialState = await graph.reviewerNode(state);
          break;
        case 'tester':
          partialState = await graph.testerNode(state);
          break;
      }

      // รวม State ใหม่
      state = { ...state, ...partialState };
      onEvent({ type: 'graph_state_update', state: { next: state.nextNode, attempts: state.attempts } });
    }

    if (state.nextNode === 'end') {
      onEvent({ type: 'final', content: `✅ Multi-Agent task completed in ${state.attempts} steps!` });
    } else {
      onEvent({ type: 'final', content: `❌ Task failed after ${state.attempts} attempts.` });
    }
  }
}
