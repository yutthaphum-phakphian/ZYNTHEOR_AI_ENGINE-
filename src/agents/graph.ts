import { GoogleGenAI } from '@google/genai';
import { ToolGateway } from '../services/toolGateway';

export interface ZyntheorState {
  task: string; plan: string; filepath: string; currentCode: string;
  reviewFeedback: string; testError: string | null; attempts: number;
  lessonLearned: string;
  nextNode: 'planner'|'coder'|'reviewer'|'tester'|'reflector'|'end';
}

export class ZyntheorGraph {
  private ai: GoogleGenAI;
  private onEvent: (e:any)=>void;
  constructor(apiKey: string, onEvent: (e:any)=>void) {
    this.ai = new GoogleGenAI({ apiKey });
    this.onEvent = onEvent;
  }
  private emitTokens(res:any) {
    const u = res.usageMetadata;
    if (u) this.onEvent({ type:'token_usage', inputTokens: u.promptTokenCount, outputTokens: u.candidatesTokenCount, totalTokens: u.totalTokenCount });
  }
  async plannerNode(state: ZyntheorState) {
    this.onEvent({ type:'agent_start', agent:'PLANNER', content:'Creating architecture plan...' });
    const res = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role:'user', parts:[{ text:`Task: ${state.task}\nCreate bullet plan.` }] }],
      config: { systemInstruction:'Lead Architect. Output ONLY bulleted plan.' }
    });
    this.emitTokens(res);
    const plan = res.text || '';
    this.onEvent({ type:'agent_thought', agent:'PLANNER', content: plan });
    return { plan, nextNode:'coder' as const };
  }
  async coderNode(state: ZyntheorState) {
    this.onEvent({ type:'agent_start', agent:'CODER', content: state.testError?'Fixing code...':'Writing code...' });
    let prompt = `Task:${state.task}\nPlan:${state.plan}\nWrite FULL code.`;
    if (state.testError) prompt+=`\nFIX ERROR:\n${state.testError}`;
    if (state.reviewFeedback) prompt+=`\nFIX REVIEW:\n${state.reviewFeedback}`;
    const res = await this.ai.models.generateContent({
      model:'gemini-2.5-flash',
      contents:[{ role:'user', parts:[{ text:prompt }] }],
      config:{ systemInstruction:'Expert Coder. Output ONLY JSON {filepath, content}. No markdown.', responseMimeType:'application/json' }
    });
    this.emitTokens(res);
    let raw = (res.text||'{}').replace(/```json/g,'').replace(/```/g,'').trim();
    const obj = JSON.parse(raw);
    this.onEvent({ type:'tool_call', name:'write_file', args:{ filepath: obj.filepath }, status:'running' });
    await ToolGateway.writeFile(obj.filepath, obj.content);
    this.onEvent({ type:'tool_result', name:'write_file', status:'success', output:`Wrote ${obj.filepath}` });
    return { filepath: obj.filepath, currentCode: obj.content, nextNode:'reviewer' as const };
  }
  async reviewerNode(state: ZyntheorState) {
    this.onEvent({ type:'agent_start', agent:'REVIEWER', content:'Reviewing...' });
    const res = await this.ai.models.generateContent({
      model:'gemini-2.5-flash',
      contents:[{ role:'user', parts:[{ text:`Review:\n${state.currentCode}` }] }],
      config:{ systemInstruction:'Senior Reviewer. Output JSON {approved:boolean, feedback:string}', responseMimeType:'application/json' }
    });
    this.emitTokens(res);
    const r = JSON.parse((res.text||'').replace(/```json/g,'').replace(/```/g,'').trim());
    if (r.approved) { this.onEvent({ type:'agent_thought', agent:'REVIEWER', content:'✅ Approved' }); return { nextNode:'tester' as const }; }
    else { this.onEvent({ type:'agent_thought', agent:'REVIEWER', content:`❌ ${r.feedback}` }); return { reviewFeedback: r.feedback, nextNode:'coder' as const }; }
  }
  async testerNode(state: ZyntheorState) {
    this.onEvent({ type:'agent_start', agent:'TESTER', content:'Running in sandbox...' });
    const cmd = state.filepath.endsWith('.ts')?`npx ts-node ${state.filepath}`:`node ${state.filepath}`;
    this.onEvent({ type:'tool_call', name:'execute_command', args:{ command: cmd }, status:'running' });
    const raw = await ToolGateway.executeCommand(cmd);
    const p = JSON.parse(raw);
    if (p.exitCode===0) {
      this.onEvent({ type:'tool_result', name:'execute_command', status:'success', output:p.stdout });
      return { nextNode:'end' as const };
    } else {
      this.onEvent({ type:'tool_result', name:'execute_command', status:'error', output:p.stderr });
      return { testError:`STDOUT:${p.stdout}\nSTDERR:${p.stderr}`, nextNode:'coder' as const };
    }
  }
  async reflectorNode(state: ZyntheorState, isSuccess: boolean) {
    this.onEvent({ type:'agent_start', agent:'REFLECTOR', content:'Extracting lesson...' });
    const res = await this.ai.models.generateContent({
      model:'gemini-2.5-flash',
      contents:[{ role:'user', parts:[{ text:`Task:${state.task}\nAttempts:${state.attempts}\nResult:${isSuccess?'SUCCESS':'FAILED'}\nError:${state.testError}` }] }],
      config:{ systemInstruction:'Meta-Cognitive AI. Output 1-sentence lesson. If perfect, output "No specific lesson needed."' }
    });
    this.emitTokens(res);
    const lesson = res.text || 'No lesson';
    this.onEvent({ type:'agent_thought', agent:'REFLECTOR', content:`💡 Lesson Learned: ${lesson}` });
    return { lessonLearned: lesson, nextNode:'end' as const };
  }
}
