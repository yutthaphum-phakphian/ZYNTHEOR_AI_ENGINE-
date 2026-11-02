import { ZyntheorGraph, ZyntheorState } from '../agents/graph';
import { MemoryManager } from './MemoryManager';
const pendingApprovals = new Map<string, (b:boolean)=>void>();
export class MultiAgentOrchestrator {
  async run(task: string, sessionId: string, onEvent: (e:any)=>void) {
    const graph = new ZyntheorGraph(process.env.GEMINI_API_KEY!, onEvent);
    const past = await MemoryManager.loadState(`memory_${sessionId}`) || { lessons: [] };
    const pastLessons = past.lessons.slice(-5).join('\n');
    let state: ZyntheorState = {
      task: pastLessons?`${task}\n\n[MEMORY]:\n${pastLessons}`:task,
      plan:'', filepath:'', currentCode:'', reviewFeedback:'', testError:null, attempts:0, lessonLearned:'', nextNode:'planner'
    };
    if (pastLessons) onEvent({ type:'agent_thought', agent:'SYSTEM', content:`🧠 Memory loaded:\n${pastLessons}` });
    while (state.nextNode!=='end' && state.attempts<5) {
      state.attempts++;
      if (state.nextNode==='tester') {
        onEvent({ type:'require_approval', action:'execute_code', filepath: state.filepath, sessionId });
        const ok = await new Promise<boolean>(r=>pendingApprovals.set(sessionId, r));
        if (!ok) { onEvent({ type:'agent_thought', agent:'SYSTEM', content:'❌ Aborted by User' }); break; }
      }
      let partial: Partial<ZyntheorState> = {};
      if (state.nextNode==='planner') partial = await graph.plannerNode(state);
      if (state.nextNode==='coder') partial = await graph.coderNode(state);
      if (state.nextNode==='reviewer') partial = await graph.reviewerNode(state);
      if (state.nextNode==='tester') partial = await graph.testerNode(state);
      state = { ...state, ...partial };
      await MemoryManager.saveState(sessionId, state);
      onEvent({ type:'graph_state_update', state:{ next: state.nextNode, attempts: state.attempts } });
      if (state.nextNode==='end') {
        const isSuccess = !state.testError;
        const reflection = await graph.reflectorNode(state, isSuccess);
        state = { ...state, ...reflection };
        if (reflection.lessonLearned && reflection.lessonLearned!=='No specific lesson needed.') {
          past.lessons.push(`[${new Date().toISOString()}] ${reflection.lessonLearned}`);
          if (past.lessons.length>20) past.lessons.shift();
          await MemoryManager.saveState(`memory_${sessionId}`, past);
        }
        break;
      }
    }
    onEvent({ type:'final', content: state.nextNode==='end'?`✅ Done in ${state.attempts} steps!`:`❌ Failed after ${state.attempts}` });
  }
  static handleApproval(sessionId: string, approved: boolean) {
    const r = pendingApprovals.get(sessionId);
    if (r) { r(approved); pendingApprovals.delete(sessionId); }
  }
}
