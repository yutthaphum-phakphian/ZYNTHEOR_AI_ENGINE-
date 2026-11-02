import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROMPT_TEMPLATES,
  analyzePromptDeterministically,
  generatePromptDeterministically,
  optimizePromptDeterministically
} from '../lib/prompt-engine.ts';

test('Prompt Forge: 10 curated domain templates are present with required structure', () => {
  assert.equal(PROMPT_TEMPLATES.length, 10);
  const categories = PROMPT_TEMPLATES.map(t => t.category);

  assert.ok(categories.includes('Software Engineering'));
  assert.ok(categories.includes('Website and App Development'));
  assert.ok(categories.includes('Debugging'));
  assert.ok(categories.includes('Research and Analysis'));
  assert.ok(categories.includes('Education and Tutoring'));
  assert.ok(categories.includes('Image Generation'));
  assert.ok(categories.includes('Business Planning'));
  assert.ok(categories.includes('Data Analysis'));
  assert.ok(categories.includes('AI Agent Design'));
  assert.ok(categories.includes('System Instructions'));

  for (const t of PROMPT_TEMPLATES) {
    assert.ok(t.id, 'missing id');
    assert.ok(t.title, 'missing title');
    assert.ok(t.targetRole, 'missing targetRole');
    assert.ok(t.template.includes('#'), 'template should have markdown headers');
    assert.ok(t.template.includes('['), 'template should contain slot placeholders');
    assert.ok(t.sampleInput, 'missing sample input');
  }
});

test('Prompt Forge: deterministic generator categorizes intents and builds structured prompts', () => {
  const result = generatePromptDeterministically({
    description: 'ต้องการ AI สำหรับเขียนโปรแกรม TypeScript และสร้าง API',
    additionalConstraints: 'ห้ามใช้ third-party libraries ภายนอก',
  });

  assert.equal(result.category, 'Software Engineering');
  assert.equal(result.mode, 'template-engine-fallback');
  assert.ok(result.prompt.includes('# ROLE & OBJECTIVE'));
  assert.ok(result.prompt.includes('# CONSTRAINTS & NEGATIVE DIRECTIVES'));
  assert.ok(result.prompt.includes('ห้ามใช้ third-party libraries ภายนอก'));
  assert.ok(result.variablesDetected.length > 0);
  assert.ok(result.designChoices.length >= 3);
});

test('Prompt Forge: deterministic generator matches image generation and agent design intents', () => {
  const imgRes = generatePromptDeterministically({ description: 'ต้องการ AI สร้างภาพ cinematic landscape' });
  assert.equal(imgRes.category, 'Image Generation');

  const agentRes = generatePromptDeterministically({ description: 'ต้องการ AI Agent ที่ใช้เครื่องมือได้' });
  assert.equal(agentRes.category, 'AI Agent Design');
});

test('Prompt Forge: deterministic optimizer reorganizes unstructured prompts while keeping intent', () => {
  const messy = 'ช่วยเขียนโค้ดหน่อย อยากได้แบบเร็วๆ ห้ามช้า เอา json มาด้วย';
  const opt = optimizePromptDeterministically(messy);

  assert.ok(opt.optimizedPrompt.includes('# OBJECTIVE & ROLE'));
  assert.ok(opt.optimizedPrompt.includes(messy));
  assert.ok(opt.optimizedPrompt.includes('# CONSTRAINTS'));
  assert.ok(opt.optimizedPrompt.includes('# OUTPUT SPECIFICATION'));
  assert.equal(opt.retainedIntent, messy);
  assert.ok(opt.improvementsMade.length >= 3);
});

test('Prompt Forge: deterministic analyzer evaluates 6 metrics and calculates valid grades', () => {
  const poorPrompt = 'ทำโปรแกรมให้หน่อย';
  const poorReport = analyzePromptDeterministically(poorPrompt);

  assert.ok(poorReport.overallScore <= 50);
  assert.ok(['D', 'F'].includes(poorReport.grade));
  assert.ok(poorReport.missingInformation.length > 0);
  assert.ok(poorReport.potentialFailureModes.length > 0);

  const comprehensivePrompt = `# ROLE & OBJECTIVE
You are a Senior Security Engineer. Your objective is to audit Express route handlers for authorization flaws.

# CONTEXT & PREREQUISITES
Environment: Node.js 22, Express 5. Inspect only the supplied middleware code.

# CONSTRAINTS & NEGATIVE DIRECTIVES
1. Do not recommend changing authentication mechanisms.
2. Never suppress error logs.
3. Strictly adhere to OWASP Top 10 rules.

# OUTPUT SPECIFICATION
Return a Markdown table with columns: Vulnerability, Severity, Line Number, and Minimal Patch.

# EVALUATION CRITERIA
Pass if all missing token checks are flagged.`;

  const goodReport = analyzePromptDeterministically(comprehensivePrompt);
  assert.ok(goodReport.overallScore >= 80, `Expected score >= 80, got ${goodReport.overallScore}`);
  assert.ok(['A', 'B'].includes(goodReport.grade));
  assert.ok(goodReport.metrics.objectiveClarity >= 70);
  assert.ok(goodReport.metrics.constraintCoverage >= 70);
  assert.ok(goodReport.metrics.outputSpecification >= 70);
  assert.ok(goodReport.strengths.length > 0);
});

test('Prompt Forge: analyzer detects contradictory directives', () => {
  const contradictory = 'Be brief and concise in 1 sentence. Be extremely detailed and comprehensive with 50 pages of analysis.';
  const report = analyzePromptDeterministically(contradictory);

  assert.ok(report.metrics.instructionConsistency < 70);
  assert.ok(report.potentialFailureModes.some(m => m.includes('ขัดแย้ง')));
});
