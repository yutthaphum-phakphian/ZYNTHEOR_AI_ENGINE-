import { GoogleGenAI } from '@google/genai';
import { ToolGateway } from '../services/toolGateway';

export interface ZyntheorState {
  task: string;
  plan: string;
  filepath: string;
  currentCode: string;
  reviewFeedback: string;
  testError: string | null;
  attempts: number;
  nextNode: 'planner' | 'coder' | 'reviewer' | 'tester' | 'end';
}

export class ZyntheorGraph {
  private ai: GoogleGenAI;
  private onEvent: (event: any) => void;

  constructor(apiKey: string, onEvent: (event: any) => void) {
    this.ai = new GoogleGenAI({ apiKey });
    this.onEvent = onEvent;
  }

  // 🧠 Node 1: PLANNER
  async plannerNode(state: ZyntheorState): Promise<Partial<ZyntheorState>> {
    this.onEvent({ type: 'agent_start', agent: 'PLANNER', content: 'Analyzing task and creating plan...' });
    
    const res = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `Task: ${state.task}\nCreate a strict step-by-step technical plan.` }] }],
      config: { systemInstruction: "You are a Lead Architect. Output ONLY a bulleted plan. Do not write code." }
    });
    
    const plan = res.candidates?.[0]?.content?.parts?.map(p=>p.text).join('\n') || res.text || '';
    this.onEvent({ type: 'agent_thought', agent: 'PLANNER', content: plan });
    return { plan, nextNode: 'coder' };
  }

  // 👨‍💻 Node 2: CODER
  async coderNode(state: ZyntheorState): Promise<Partial<ZyntheorState>> {
    const action = state.testError ? 'Fixing code based on Test Error...' : 'Writing code based on plan...';
    this.onEvent({ type: 'agent_start', agent: 'CODER', content: action });
    
    let prompt = `Task: ${state.task}\nPlan:\n${state.plan}\n\nWrite the FULL code for the main file.`;
    if (state.testError) prompt += `\n\nFIX THIS ERROR:\n${state.testError}`;
    if (state.reviewFeedback) prompt += `\n\nFIX REVIEWER FEEDBACK:\n${state.reviewFeedback}`;

    const res = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: 'You are an Expert Coder. Output ONLY a valid JSON object with "filepath" and "content" keys. No markdown.',
        responseMimeType: "application/json"
      }
    });

    try {
      let rawText = res.text || '{}';
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const codeObj = JSON.parse(rawText);
      this.onEvent({ type: 'tool_call', name: 'write_file', args: { filepath: codeObj.filepath }, status: 'running' });
      await ToolGateway.writeFile(codeObj.filepath, codeObj.content);
      this.onEvent({ type: 'tool_result', name: 'write_file', status: 'success', output: `File ${codeObj.filepath} written.` });
      return { filepath: codeObj.filepath, currentCode: codeObj.content, nextNode: 'reviewer' };
    } catch (e: any) {
      this.onEvent({ type: 'agent_thought', agent: 'CODER', content: `❌ JSON Error: ${e.message}. Retrying...` });
      return { testError: "Failed to generate valid JSON code. Please fix format.", nextNode: 'coder' };
    }
  }

  // 🕵️‍♂️ Node 3: REVIEWER
  async reviewerNode(state: ZyntheorState): Promise<Partial<ZyntheorState>> {
    this.onEvent({ type: 'agent_start', agent: 'REVIEWER', content: 'Reviewing code quality...' });
    
    const res = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `Review this code:\n${state.currentCode}` }] }],
      config: {
        systemInstruction: 'You are a Senior Code Reviewer. Check for bugs/security. Output JSON: {"approved": boolean, "feedback": "reason"}.',
        responseMimeType: "application/json"
      }
    });

    let rawText = res.text || '{"approved": true, "feedback": "LGTM"}';
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const review = JSON.parse(rawText);
    
    if (review.approved) {
      this.onEvent({ type: 'agent_thought', agent: 'REVIEWER', content: "✅ Code approved." });
      return { reviewFeedback: '', nextNode: 'tester' };
    } else {
      this.onEvent({ type: 'agent_thought', agent: 'REVIEWER', content: `❌ Rejected: ${review.feedback}` });
      return { reviewFeedback: review.feedback, nextNode: 'coder' };
    }
  }

  // 🧪 Node 4: TESTER
  async testerNode(state: ZyntheorState): Promise<Partial<ZyntheorState>> {
    this.onEvent({ type: 'agent_start', agent: 'TESTER', content: 'Running code in Sandbox...' });
    
    const isTS = state.filepath.endsWith('.ts');
    const cmd = isTS ? `npx ts-node ${state.filepath}` : `node ${state.filepath}`;
    
    this.onEvent({ type: 'tool_call', name: 'execute_command', args: { command: cmd }, status: 'running' });
    
    const rawResult = await ToolGateway.executeCommand(cmd);
    const parsed = JSON.parse(rawResult);

    if (parsed.exitCode === 0) {
      this.onEvent({ type: 'tool_result', name: 'execute_command', status: 'success', output: parsed.stdout });
      this.onEvent({ type: 'agent_thought', agent: 'TESTER', content: "✅ Execution Successful!" });
      return { nextNode: 'end' };
    } else {
      this.onEvent({ type: 'tool_result', name: 'execute_command', status: 'error', output: parsed.stderr });
      this.onEvent({ type: 'agent_thought', agent: 'TESTER', content: `❌ Failed. Sending to Coder.` });
      return { testError: `STDOUT: ${parsed.stdout}\nSTDERR: ${parsed.stderr}`, nextNode: 'coder' };
    }
  }
}
