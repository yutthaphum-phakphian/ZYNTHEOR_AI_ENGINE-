import { Router } from 'express';
import {
  applyPatchPreview,
  proposePatch,
  approvePatch,
  applyPatch,
  PatchSecurityError,
  ERROR_CODES,
  _getProposal
} from '../services/patchApplier.ts';
import { changeImpactEngine } from '../services/changeImpactEngine.ts';
import { createAuditEntry, sha256Sync, type AuditEntry } from '../services/auditLedger.ts';

const r = Router();

// In-memory audit log for change gate events
const changeGateAuditEntries: AuditEntry[] = [];
let latestAuditHash = 'GENESIS';

function recordChangeGateAudit(action: string, detail: string, actor: string = 'human-operator'): AuditEntry {
  const entry = createAuditEntry(
    action,
    detail,
    { hash: latestAuditHash } as AuditEntry,
    undefined,
    undefined,
    undefined,
    `key-gate-${actor}`,
    'SHA-256'
  );
  entry.actor = actor;
  latestAuditHash = entry.hash;
  changeGateAuditEntries.unshift(entry);
  return entry;
}

// 1. POST /api/editing/propose
// Workflow: Repository Analysis -> Change Proposal -> Impact Analysis -> Risk Assessment -> Human Approval Gate
r.post('/api/editing/propose', (req, res) => {
  const body: unknown = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'file and diff required' });
  }
  const { file, diff, newContent, workspaceId, reason, lang } = body as {
    file?: unknown;
    diff?: unknown;
    newContent?: unknown;
    workspaceId?: unknown;
    reason?: unknown;
    lang?: unknown;
  };

  if (typeof file !== 'string' || typeof diff !== 'string') {
    return res.status(400).json({ ok: false, error: 'file and diff required' });
  }

  try {
    // 1. Preview & Boundary validation
    const preview = applyPatchPreview(file, diff);
    const targetWs = typeof workspaceId === 'string' && workspaceId.trim() ? workspaceId.trim() : 'default';

    // 2. Impact Analysis & Risk Assessment
    const impactReport = changeImpactEngine.analyzeImpact(file, {
      diff,
      proposedChangeSummary: typeof reason === 'string' ? reason : undefined,
      lang: lang === 'en' ? 'en' : 'th',
    });

    // 3. Formulate Change Proposal
    const content = typeof newContent === 'string' ? newContent : diff;
    const proposal = proposePatch({
      targetFile: file,
      newContent: content,
      workspaceId: targetWs,
    });

    // 4. Audit Log
    const auditRecord = recordChangeGateAudit(
      'CHANGE_PROPOSED',
      `Proposed patch for ${file} [Risk: ${impactReport.riskLevel}] Blast radius: ${impactReport.affectedFiles.length} files`,
      'human-operator'
    );

    return res.json({
      ok: true,
      proposalId: proposal.patchId,
      patchId: proposal.patchId,
      status: 'AWAITING_HUMAN_APPROVAL',
      requiresHumanApproval: true,
      preview,
      proposal,
      impactReport,
      auditHash: auditRecord.hash,
    });
  } catch (error) {
    if (error instanceof PatchSecurityError || error instanceof TypeError || error instanceof RangeError) {
      return res.status(400).json({ ok: false, error: 'invalid_patch_preview', message: error.message });
    }
    return res.status(500).json({ ok: false, error: 'proposal_failed', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// 2. POST /api/editing/approve
// Human Approval Gate: Strictly records human approver sign-off
r.post('/api/editing/approve', (req, res) => {
  const { patchId, approverId, reason } = req.body || {};
  if (!patchId || typeof patchId !== 'string') {
    return res.status(400).json({ ok: false, error: 'patchId is required' });
  }

  const approver = typeof approverId === 'string' && approverId.trim() ? approverId.trim() : 'human-engineer';

  try {
    const approval = approvePatch(patchId, approver);
    const auditRecord = recordChangeGateAudit(
      'CHANGE_GATE_APPROVED',
      `Patch ${patchId} approved by ${approver}. Reason: ${reason || 'Human verification ratified'}`,
      approver
    );

    return res.json({
      ok: true,
      patchId,
      status: 'APPROVED',
      approval,
      auditHash: auditRecord.hash,
    });
  } catch (error) {
    if (error instanceof PatchSecurityError) {
      return res.status(400).json({ ok: false, error: error.code, message: error.message });
    }
    return res.status(500).json({ ok: false, error: 'approval_failed', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// 3. POST /api/editing/reject
r.post('/api/editing/reject', (req, res) => {
  const { patchId, approverId, reason } = req.body || {};
  if (!patchId || typeof patchId !== 'string') {
    return res.status(400).json({ ok: false, error: 'patchId is required' });
  }

  const approver = typeof approverId === 'string' && approverId.trim() ? approverId.trim() : 'human-engineer';

  try {
    const proposal = _getProposal(patchId);
    if (proposal) {
      proposal.status = 'rejected';
      proposal.rejectedBy = approver;
      proposal.rejectedAt = Date.now();
    }
    const auditRecord = recordChangeGateAudit(
      'CHANGE_GATE_REJECTED',
      `Patch ${patchId} rejected by ${approver}. Reason: ${reason || 'Rejected by human operator'}`,
      approver
    );

    return res.json({
      ok: true,
      patchId,
      status: 'REJECTED',
      auditHash: auditRecord.hash,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'rejection_failed', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// 4. POST /api/editing/execute
// Execution Gateway: Strictly verifies human approval before modifying files
r.post('/api/editing/execute', async (req, res) => {
  const { patchId, approverId } = req.body || {};
  if (!patchId || typeof patchId !== 'string') {
    return res.status(400).json({ ok: false, error: 'patchId is required' });
  }

  const proposal = _getProposal(patchId);
  if (!proposal) {
    return res.status(404).json({ ok: false, error: ERROR_CODES.STALE_PATCH_DENIED, message: 'Proposal not found' });
  }

  // FAIL-CLOSED HUMAN APPROVAL GATE
  if (proposal.status !== 'approved') {
    return res.status(403).json({
      ok: false,
      error: 'HUMAN_APPROVAL_REQUIRED',
      message: `Patch execution denied: Proposal status is '${proposal.status}'. It must be explicitly approved through the Human Approval Gate before execution.`,
    });
  }

  try {
    const result = await applyPatch(patchId, approverId || 'human-executor');
    const auditRecord = recordChangeGateAudit(
      'PATCH_APPLIED',
      `Patch ${patchId} applied atomically to ${proposal.targetFile}. SHA-256: ${proposal.proposedHash}`,
      approverId || 'human-executor'
    );

    return res.json({
      ok: true,
      patchId,
      applied: true,
      result,
      auditHash: auditRecord.hash,
    });
  } catch (error) {
    if (error instanceof PatchSecurityError) {
      return res.status(400).json({ ok: false, error: error.code, message: error.message });
    }
    return res.status(500).json({ ok: false, error: 'execution_failed', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// 5. GET /api/editing/audit
r.get('/api/editing/audit', (_req, res) => {
  return res.json({
    ok: true,
    count: changeGateAuditEntries.length,
    entries: changeGateAuditEntries.slice(0, 50),
    latestHash: latestAuditHash,
  });
});

export default r;
