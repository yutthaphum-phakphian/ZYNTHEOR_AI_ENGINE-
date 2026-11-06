import { zyntheorIntelligenceRuntime } from '../src/lib/ZyntheorIntelligenceRuntime';
import fs from 'fs';
import path from 'path';

// Test Suite for Level 1 Functional Capabilities
const REALITY_CHECKS = [
  {
    id: 'T1-REASONING',
    category: 'Advanced Reasoning',
    prompt: 'If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets? Explain your logic.',
    expectedKeywords: ['5', 'minutes', 'logic'],
  },
  {
    id: 'T2-KNOWLEDGE',
    category: 'Knowledge & Research',
    prompt: 'What was the specific technical reason for the AWS us-east-1 outage in December 2021? Provide sources if possible.',
    requiresWebSearch: true,
  },
  {
    id: 'T3-CODING',
    category: 'Coding & Technical',
    prompt: 'Write a TypeScript function that reverses a linked list. Then, explain the time complexity.',
    expectedKeywords: ['ListNode', 'while', 'O(n)'],
  },
  {
    id: 'T4-THAI',
    category: 'Thai Intelligence',
    prompt: 'อธิบายความแตกต่างระหว่าง "Machine Learning" และ "Deep Learning" ให้เด็กอายุ 10 ขวบเข้าใจได้ง่ายๆ',
    expectedKeywords: ['AI', 'ข้อมูล', 'โครงข่ายประสาทเทียม'],
  },
  {
    id: 'T5-MEMORY-CONTEXT',
    category: 'Memory & Context',
    prompt: 'What is my name and what project are we building?',
    context: 'User name is Yutthaphum. We are building ZYNTHEOR, a sovereign AI platform.',
    expectedKeywords: ['Yutthaphum', 'ZYNTHEOR'],
  }
];

async function runRealityCheck() {
  console.log("🚀 Starting ZYNTHEOR Live Intelligence Reality Check...");
  
  const runtime = zyntheorIntelligenceRuntime;
  const results = [];

  for (const test of REALITY_CHECKS) {
    console.log(`\n⏳ Running: ${test.id} (${test.category})...`);
    const startTime = Date.now();
    
    try {
      const response = await runtime.processRequest({
        input: test.context ? `${test.context}\n\nQuery: ${test.prompt}` : test.prompt,
        workspaceId: 'workspace-reality-check',
        operatingMode: test.requiresWebSearch ? 'ONLINE_INTELLIGENCE' : 'HYBRID_INTELLIGENCE',
      });

      const executionTime = Math.round(Date.now() - startTime);

      results.push({
        testId: test.id,
        category: test.category,
        status: 'EXECUTED',
        executionTimeMs: executionTime,
        prompt: test.prompt,
        actualOutput: response.finalResponse || '',
        toolCalls: response.executionPlan?.stages || [],
        error: null
      });

      console.log(`✅ ${test.id} Completed in ${executionTime}ms.`);

    } catch (error: any) {
      console.log(`❌ ${test.id} Failed: ${error.message}`);
      results.push({
        testId: test.id,
        category: test.category,
        status: 'FAILED',
        executionTimeMs: Math.round(Date.now() - startTime),
        prompt: test.prompt,
        actualOutput: null,
        error: error.message
      });
    }
  }

  const reportPath = path.resolve(process.cwd(), 'docs/audit/INTELLIGENCE_REALITY_CHECK.json');
  const dir = path.dirname(reportPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    runtimeVersion: 'P0-CLEAN',
    results,
  }, null, 2));

  console.log(`\n🏁 Reality Check Complete. Raw evidence saved to ${reportPath}`);
  console.log(`⚠️ NOTE: These results must be evaluated manually. No automatic PASS/FAIL is assigned.`);
}

runRealityCheck().catch(console.error);
