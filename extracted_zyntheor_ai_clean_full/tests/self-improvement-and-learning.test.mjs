import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recordExperience,
  getWorkspaceExperiences,
  clearWorkspaceExperiences,
  evaluateWorkspaceIntelligence,
  createImprovementProposal,
  getWorkspaceProposals,
  approveImprovementProposal,
  applyImprovementProposal,
  rollbackImprovementProposal,
  evaluateModelQuality,
  promoteModelToProduction,
  addKnowledgeRecord,
  getWorkspaceKnowledge,
  clearWorkspaceKnowledge,
  sanitizeLogDetail,
} from '../src/services/selfImprovementEngine.ts';
import { verifyAuditHashChain } from '../src/services/auditLedger.ts';

test('1. Experience Learning Engine: Records task experiences and enforces strict workspace isolation', () => {
  const wsA = 'learning-ws-alpha';
  const wsB = 'learning-ws-beta';

  clearWorkspaceExperiences(wsA);
  clearWorkspaceExperiences(wsB);

  // Record experience in Alpha
  const expA = recordExperience({
    workspaceId: wsA,
    goal: 'Debug memory leak in WebSocket connection pool',
    category: 'bug_analysis',
    outcome: 'SUCCESS',
    stepsExecuted: 4,
    errorsEncountered: [{ error: 'Unclosed listener callback', fixApplied: 'Added removeAllListeners on close', resolved: true }],
    lessons: [{ category: 'memory_management', lesson: 'Always clean up event listeners on socket close', status: 'VERIFIED' }],
    userId: 'user-alice',
  });

  assert.equal(expA.workspaceId, wsA);
  assert.equal(expA.outcome, 'SUCCESS');
  assert.equal(expA.lessonsLearned.length, 1);
  assert.equal(expA.lessonsLearned[0].status, 'VERIFIED');

  // Record experience in Beta
  const expB = recordExperience({
    workspaceId: wsB,
    goal: 'Optimize SQL index for user queries in Beta',
    category: 'database',
    outcome: 'FAILURE',
    errorsEncountered: [{ error: 'Syntax error in CREATE INDEX', resolved: false }],
    lessons: [{ category: 'sql', lesson: 'Verify syntax on SQLite before applying', status: 'HYPOTHESIS' }],
    userId: 'user-bob',
  });

  assert.equal(expB.workspaceId, wsB);

  // Workspace Isolation Check: Alpha must NOT see Beta experiences
  const expsAlpha = getWorkspaceExperiences(wsA);
  assert.equal(expsAlpha.length, 1);
  assert.equal(expsAlpha[0].id, expA.id);
  assert.equal(expsAlpha[0].goal, 'Debug memory leak in WebSocket connection pool');

  const expsBeta = getWorkspaceExperiences(wsB);
  assert.equal(expsBeta.length, 1);
  assert.equal(expsBeta[0].id, expB.id);

  // Clean up
  clearWorkspaceExperiences(wsA);
  clearWorkspaceExperiences(wsB);
  assert.equal(getWorkspaceExperiences(wsA).length, 0);
  assert.equal(getWorkspaceExperiences(wsB).length, 0);
});

test('2. Intelligence Evaluation Engine: Computes real scores across 8 dimensions with SHA-256 evidence digests', () => {
  const wsEval = 'eval-workspace-test';
  clearWorkspaceExperiences(wsEval);

  // Record a mix of successes and resolved error experiences
  recordExperience({
    workspaceId: wsEval,
    goal: 'เขียนฟังก์ชันแปลงภาษาไทยเป็น English',
    category: 'multilingual',
    outcome: 'SUCCESS',
  });
  recordExperience({
    workspaceId: wsEval,
    goal: 'Refactor typescript interface',
    category: 'software_dev',
    outcome: 'SUCCESS',
    errorsEncountered: [{ error: 'Missing type export', fixApplied: 'Exported interface', resolved: true }],
  });

  const report = evaluateWorkspaceIntelligence(wsEval);

  assert.equal(report.workspaceId, wsEval);
  assert.equal(typeof report.overallScore, 'number');
  assert.ok(report.overallScore >= 0 && report.overallScore <= 100);
  assert.ok(['A', 'B', 'C', 'D', 'F'].includes(report.grade));
  assert.equal(report.isRealEvaluation, true);
  assert.ok(report.evidenceDigest.length === 64);

  // Check 8 dimension scores
  assert.ok(typeof report.dimensionScores.reasoningAccuracy === 'number');
  assert.ok(typeof report.dimensionScores.instructionFollowing === 'number');
  assert.ok(typeof report.dimensionScores.codingQuality === 'number');
  assert.ok(typeof report.dimensionScores.toolSelectionAccuracy === 'number');
  assert.ok(typeof report.dimensionScores.contextRetention === 'number');
  assert.ok(typeof report.dimensionScores.errorRecovery === 'number');
  assert.ok(typeof report.dimensionScores.thaiLanguageUnderstanding === 'number');
  assert.ok(typeof report.dimensionScores.englishLanguageUnderstanding === 'number');

  clearWorkspaceExperiences(wsEval);
});

test('3. Self-Improvement Loop & Human Approval Gate: Model agents blocked from self-approving proposals', () => {
  const wsProp = 'proposal-ws-test';

  const proposal = createImprovementProposal({
    workspaceId: wsProp,
    targetSubsystem: 'PROMPT',
    weaknessIdentified: 'System instruction lacks explicit output formatting boundary',
    proposedChange: 'Add # OUTPUT SPECIFICATION heading with JSON schema constraint',
    riskLevel: 'MEDIUM',
    previousStateBackup: 'System instruction v1.0',
  });

  assert.equal(proposal.status, 'PROPOSED');
  assert.ok(proposal.beforeEvidenceDigest.length === 64);

  // Model agent attempting self-approval MUST be rejected
  const modelAgentUser = { id: 'agent-gemini-2.5-flash', isModelAgent: true };
  assert.throws(
    () => approveImprovementProposal(proposal.id, wsProp, modelAgentUser),
    /forbidden from approving their own improvement proposals/
  );

  // Model agent attempting to apply proposal MUST be rejected
  assert.throws(
    () => applyImprovementProposal(proposal.id, wsProp, modelAgentUser),
    /cannot apply improvement changes without human authorization/
  );

  // Human operator approval succeeds
  const humanUser = { id: 'human-operator-alice', role: 'admin', isModelAgent: false };
  const auditList = [];

  const { proposal: approvedProp, auditEntry: approveAudit } = approveImprovementProposal(
    proposal.id,
    wsProp,
    humanUser,
    null
  );
  auditList.unshift(approveAudit);

  assert.equal(approvedProp.status, 'APPROVED');
  assert.equal(approvedProp.approvedBy, 'human-operator-alice');

  // Apply improvement
  const { proposal: appliedProp, auditEntry: applyAudit } = applyImprovementProposal(
    proposal.id,
    wsProp,
    humanUser,
    approveAudit
  );
  auditList.unshift(applyAudit);

  assert.equal(appliedProp.status, 'APPLIED');
  assert.ok(appliedProp.afterEvidenceDigest);

  // Rollback execution
  const { proposal: rolledBackProp, auditEntry: rollbackAudit } = rollbackImprovementProposal(
    proposal.id,
    wsProp,
    humanUser,
    applyAudit
  );
  auditList.unshift(rollbackAudit);

  assert.equal(rolledBackProp.status, 'ROLLED_BACK');
  assert.ok(rolledBackProp.rolledBackAt);

  // Verify cryptographic Audit Ledger chain
  const chainResult = verifyAuditHashChain(auditList);
  assert.equal(chainResult.isValid, true, 'Audit chain must be cryptographically valid');
});

test('4. Model Quality Management: Blocks production promotion without evaluation & human approval', () => {
  const modelId = 'zyntheor-core-1.2.0-gpu-apex';

  // Model quality evaluation
  const quality = evaluateModelQuality(modelId);
  assert.equal(quality.modelId, modelId);
  assert.equal(quality.status, 'QUALIFIED');
  assert.ok(quality.evalFixturesScore >= 80);

  // Model agent self-promotion MUST be rejected
  const modelAgent = { id: 'agent-bot', isModelAgent: true };
  assert.throws(
    () => promoteModelToProduction(modelId, modelAgent),
    /cannot promote themselves to Production status/
  );

  // Human operator promotion succeeds
  const humanOperator = { id: 'engineer-yutthaphum', role: 'admin', isModelAgent: false };
  const { qualityRecord, auditEntry } = promoteModelToProduction(modelId, humanOperator);

  assert.equal(qualityRecord.status, 'PROMOTED');
  assert.equal(qualityRecord.promotedToProduction, true);
  assert.equal(qualityRecord.promoterUser, 'engineer-yutthaphum');
  assert.equal(auditEntry.action, 'MODEL_PROMOTED_TO_PRODUCTION');
});

test('5. Workspace Knowledge Base: Records facts & project context with provenance', () => {
  const ws = 'knowledge-ws-test';
  clearWorkspaceKnowledge(ws);

  const record = addKnowledgeRecord({
    workspaceId: ws,
    title: 'PostgreSQL Connection Pooling Rule',
    category: 'FACT',
    content: 'Always set max connections to 20 when using Cloud SQL Unix socket proxy.',
    source: 'PostgreSQL Performance Optimization Guide',
    authorId: 'engineer-alice',
    status: 'VERIFIED',
  });

  assert.equal(record.workspaceId, ws);
  assert.equal(record.category, 'FACT');
  assert.equal(record.provenance.status, 'VERIFIED');
  assert.equal(record.version, 1);

  const list = getWorkspaceKnowledge(ws);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, record.id);
  assert.equal(list[0].title, 'PostgreSQL Connection Pooling Rule');
});

test('6. Intelligence Observability: Sanitizes sensitive credentials, API keys, and bearer tokens from log output', () => {
  const rawLog = 'Connecting to model with API key: api_key=sk-proj-1234567890abcdefghijklmn and Bearer eyJhbGciOiJIUzI1NiI16789';
  const sanitized = sanitizeLogDetail(rawLog);

  assert.ok(!sanitized.includes('sk-proj-1234567890abcdefghijklmn'), 'Raw API key must be redacted');
  assert.ok(!sanitized.includes('eyJhbGciOiJIUzI1NiI16789'), 'Bearer token must be redacted');
  assert.ok(sanitized.includes('[REDACTED_SECRET]'), 'Redaction placeholder must be present');
});
