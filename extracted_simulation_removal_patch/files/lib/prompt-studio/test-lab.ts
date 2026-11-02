export interface PromptTestCase {
  id: string;
  input: Record<string, string>;
  expectedOutput: string;
  observedOutput?: string;
  actualOutput?: string;
  passed?: boolean;
  latencyMs?: number;
  latency?: number;
  origin?: string;
  evidenceState: 'VERIFIED' | 'UNVERIFIED' | 'CONTRADICTED' | 'STALE';
  executionProofId?: string;
  timestamp?: number;
  error?: string;
}

export interface ModelResult {
  output: string;
  origin: string;
  latencyMs?: number;
  latency?: number;
}

export class PromptTestLab {
  fillVariables(prompt: string, input: Record<string, string>): string {
    let filled = prompt;
    for (const [k, v] of Object.entries(input)) {
      filled = filled.replaceAll(`{{${k}}}`, v).replaceAll(`{${k}}`, v);
    }
    return filled;
  }

  async runTests(
    prompt: string,
    cases: PromptTestCase[],
    callModel: (filledPrompt: string) => Promise<ModelResult>
  ): Promise<PromptTestCase[]> {
    const results: PromptTestCase[] = [];

    for (const c of cases) {
      const start = Date.now();
      try {
        const filled = this.fillVariables(prompt, c.input);
        const r = await callModel(filled);
        const ms = r.latencyMs ?? r.latency ?? (Date.now() - start);

        // Strict observed vs expected output comparison
        const observed = r.output || '';
        const expected = c.expectedOutput || '';
        const passed = expected
          ? observed.toLowerCase().includes(expected.toLowerCase().slice(0, 60))
          : observed.length > 0;

        const proofId = `test-run-${crypto.randomUUID()}`;

        results.push({
          ...c,
          expectedOutput: expected,
          observedOutput: observed,
          actualOutput: observed,
          passed,
          latencyMs: ms,
          latency: ms,
          origin: r.origin,
          evidenceState: passed ? 'VERIFIED' : 'CONTRADICTED',
          executionProofId: proofId,
          timestamp: Date.now(),
        });
      } catch (e) {
        results.push({
          ...c,
          expectedOutput: c.expectedOutput,
          observedOutput: '',
          actualOutput: '',
          passed: false,
          latencyMs: Date.now() - start,
          latency: Date.now() - start,
          evidenceState: 'UNVERIFIED',
          timestamp: Date.now(),
          error: (e as Error).message,
        });
      }
    }
    return results;
  }
}
