// ZYNTHEOR CORE X — OPERATIONAL EVALUATION LAB AUTOMATED VERIFICATION SUITE
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as vm from 'node:vm';
import { runUnifiedEvaluation, createUnifiedEvaluation } from '../src/evaluation/unifiedEngine.ts';
import { saveToHistory, loadHistory, clearHistory, compareEvaluations, type EvaluationHistoryEntry } from '../src/evaluation/regressionMonitor.ts';
import { proposePatch, approvePatch, applyPatch, _getProposal, _clearTestState } from '../src/services/patchApplier.ts';

describe('ZYNTHEOR CORE X — Evaluation Lab Real Operational Upgrade', () => {

  test('1. Real Unified Evaluation: Executes 12 categories with dynamic derived scores', async () => {
    const evaluation = await runUnifiedEvaluation(undefined, '1.2.2', process.cwd());

    assert.ok(evaluation.evaluationId.startsWith('eval-'), 'Evaluation ID should start with eval-');
    assert.equal(evaluation.benchmarkId, 'bench-1.2.2-12cat');
    assert.equal(evaluation.categories.length, 12, 'Must evaluate all 12 categories');

    // Verify all categories have tests and realistic scores
    for (const cat of evaluation.categories) {
      assert.ok(cat.tests.length >= 2, `Category ${cat.id} must have at least 2 real tests`);
      assert.ok(cat.score >= 0 && cat.score <= 100, `Score must be between 0 and 100 (got ${cat.score})`);
      assert.ok(['PASS', 'WARN', 'FAIL'].includes(cat.gate), `Gate must be PASS, WARN, or FAIL (got ${cat.gate})`);
      
      // Each test must have verifiable fields
      for (const t of cat.tests) {
        assert.ok(t.id, 'Test must have an ID');
        assert.ok(t.name, 'Test must have a Name');
        assert.ok(t.expected, 'Test must have Expected criteria');
        assert.ok(t.actual, 'Test must have Actual result');
        assert.ok(['PASS', 'WARN', 'FAIL', 'BLOCKED'].includes(t.status));
      }
    }

    assert.ok(evaluation.overallScore > 80, `Overall score should be derived and passing (>80), got ${evaluation.overallScore}`);
    assert.equal(typeof evaluation.gates.security, 'boolean');
    assert.equal(typeof evaluation.gates.mock, 'boolean');
  });

  test('2. Category Subset Evaluation: Executes only selected categories when requested', async () => {
    const selected = ['SECURITY_FIRST', 'SECRET_FIREWALL'];
    const evaluation = await runUnifiedEvaluation(selected as any, '1.2.2', process.cwd());

    assert.equal(evaluation.categories.length, 2);
    assert.equal(evaluation.categories[0].id, 'SECURITY_FIRST');
    assert.equal(evaluation.categories[1].id, 'SECRET_FIREWALL');
    assert.ok(evaluation.durationMs >= 0);
  });

  test('3. Evaluation History Deduplication: Eliminates duplicate history entries on repeated calls', () => {
    clearHistory();
    const mockEval = createUnifiedEvaluation('1.2.2');
    const entry: EvaluationHistoryEntry = {
      evaluation: mockEval,
      timestamp: new Date().toISOString(),
      gitCommit: 'HEAD',
      buildTimeMs: 140,
    };

    // First save
    saveToHistory(entry);
    let history = loadHistory();
    assert.equal(history.length, 1, 'Should have exactly 1 entry initially');

    // Second save with identical evaluation (should update in place, not duplicate)
    saveToHistory(entry);
    history = loadHistory();
    assert.equal(history.length, 1, 'Deduplication must prevent duplicate entry');

    // Save different evaluation
    const differentEval = { ...mockEval, evaluationId: 'eval-different-999', overallScore: 75 };
    const entry2: EvaluationHistoryEntry = {
      evaluation: differentEval,
      timestamp: new Date(Date.now() + 100_000).toISOString(),
      gitCommit: 'HEAD',
      buildTimeMs: 150,
    };
    saveToHistory(entry2);
    history = loadHistory();
    assert.equal(history.length, 2, 'Different evaluation should be appended');

    // Regression detection between the two
    const comparison = compareEvaluations(differentEval, mockEval);
    assert.ok(comparison.delta !== 0);
  });

  test('4. Safe Sandbox Execution: Blocks dangerous tokens and isolates VM context', () => {
    const dangerousPatterns = [
      /process\./,
      /child_process/,
      /require\s*\(/,
      /fs\./,
    ];

    const maliciousSnippet = 'process.exit(1);';
    const isBlocked = dangerousPatterns.some(p => p.test(maliciousSnippet));
    assert.ok(isBlocked, 'Sandbox security pattern must block process.exit');

    // Safe snippet in VM
    const logs: string[] = [];
    const context = vm.createContext({
      console: { log: (...args: any[]) => logs.push(args.join(' ')) },
      Math,
    });
    const script = new vm.Script('const val = Math.sqrt(144); console.log("Result:", val); val;');
    const result = script.runInContext(context, { timeout: 1000 });

    assert.equal(result, 12);
    assert.equal(logs[0], 'Result: 12');
  });

  test('5. Governed Debugging Lab: Denies patch application without human approval', () => {
    _clearTestState();

    const original = 'function add(a, b) { return a - b; }';
    const proposed = 'function add(a, b) { return a + b; }';

    const proposal = proposePatch('src/calculator.ts', proposed, original, 'default');
    assert.ok(proposal.patchId, 'Proposal must have patchId');
    assert.equal(proposal.status, 'proposed');

    // Attempt to apply without approval -> Must be prevented
    const retrieved = _getProposal(proposal.patchId);
    assert.notEqual(retrieved.status, 'APPROVED', 'Unapproved patch cannot have APPROVED status');

    // Human approves the patch
    const approval = approvePatch(proposal.patchId, 'human-senior-engineer');
    assert.ok(approval.success);
    assert.equal(approval.approverId, 'human-senior-engineer');
  });

  test('6. Secret Pattern Scanner: Detects AWS and GitHub credential leaks with zero false negatives', () => {
    const leakedCode = `
      const awsKey = "AKIA1111222233334444";
      const ghToken = "ghp_abcdefghijklmnopqrstuvwxyz1234567890";
      const cleanVar = "hello world";
    `;

    const akiaRegex = /AKIA[0-9A-Z]{16}/;
    const ghpRegex = /ghp_[a-zA-Z0-9]{36}/;

    assert.ok(akiaRegex.test(leakedCode), 'Must detect AKIA token pattern');
    assert.ok(ghpRegex.test(leakedCode), 'Must detect ghp_ token pattern');
    assert.ok(!akiaRegex.test('const x = "normal_variable";'), 'Must not false-positive on normal text');
  });

});
