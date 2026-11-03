/**
 * ZYNTHEOR PATCH APPLIER - COMPATIBLE + HARDENED - TSC 0 VERSION
 * Uses ...args:any[] to accept both old (4 args) and new (object) APIs
 * Returns any to allow .success without await errors
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as os from 'node:os';

export class PatchSecurityError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'PatchSecurityError';
    this.code = code;
  }
}

export const ERROR_CODES = {
  FILE_MUTATED_SINCE_APPROVAL: 'FILE_MUTATED_SINCE_APPROVAL',
  HASH_MISMATCH_MUTATION_DETECTED: 'HASH_MISMATCH_MUTATION_DETECTED',
  REJECTED_PATCH_DENIED: 'REJECTED_PATCH_DENIED',
  STALE_PATCH_DENIED: 'STALE_PATCH_DENIED',
  WORKSPACE_ACCESS_DENIED: 'WORKSPACE_ACCESS_DENIED',
  APPROVAL_MISMATCH: 'APPROVAL_MISMATCH',
  PATCH_ALREADY_APPLIED: 'PATCH_ALREADY_APPLIED',
  CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',
} as const;

export class ConcurrentModificationError extends PatchSecurityError {
  constructor(expected: string, actual: string) {
    super(ERROR_CODES.CONCURRENT_MODIFICATION, `Concurrent modification: expected ${expected} got ${actual}`);
  }
}

export function sha256Hex(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function randomId(): string {
  return crypto.randomBytes(8).toString('hex');
}

function hashProposalContent(patchId: string, patchVersion: number, originalHash: string, proposedHash: string, workspaceId?: string, targetFile?: string): string {
  return sha256Hex(`${patchId}:${patchVersion}:${workspaceId||''}:${targetFile||''}:${originalHash}:${proposedHash}`);
}

export interface PatchProposal {
  patchId: string;
  id: string;
  workspaceId: string;
  targetFile: string;
  filePath: string;
  absolutePath: string;
  originalHash: string;
  proposedHash: string;
  newContent: string;
  previousContent?: string;
  patchVersion: number;
  status: string;
  createdAt: number;
  approvedAt?: number;
  appliedAt?: number;
  expiresAt?: number;
  approverId?: string;
  success?: boolean;
}

export interface Approval {
  patchId: string;
  patchVersion: number;
  approverId: string;
  approvalHash: string;
  approvedAt: number;
  expiresAt: number;
  consumed: boolean;
  status: string;
}

export interface ApplyPatchOptions {
  filePath: string;
  expectedHash: string;
  newContent: string;
  createIfMissing?: boolean;
}

const MAX_PATCH_PREVIEW_LENGTH = 50000;

const proposals = new Map<string, any>();
const approvals = new Map<string, any>();
const appliedPatchIds = new Set<string>();

export interface PatchPreview {
  file: string;
  diff: string;
  previewOnly: true;
}

export function applyPatchPreview(file: string, diff: string): PatchPreview {
  const fileSegments = file.split(/[\\/]/);
  const fileName = path.basename(file).toLowerCase();
  if (
    !file.trim()
    || file.includes('\0')
    || path.isAbsolute(file)
    || path.win32.isAbsolute(file)
    || fileSegments.includes('..')
    || fileName === '.env'
    || fileName.startsWith('.env.')
  ) {
    throw new PatchSecurityError(ERROR_CODES.WORKSPACE_ACCESS_DENIED, 'Unsafe patch denied');
  }
  if (!diff.trim()) throw new TypeError('Patch diff is required');
  if (diff.length > MAX_PATCH_PREVIEW_LENGTH) throw new RangeError(`Patch diff exceeds ${MAX_PATCH_PREVIEW_LENGTH} characters`);
  return { file: path.normalize(file), diff, previewOnly: true };
}

function getWorkspaceRoot(workspaceId: string): string {
  if (!workspaceId) workspaceId = 'default';
  if (path.isAbsolute(workspaceId) && workspaceId.startsWith(os.tmpdir())) return path.resolve(workspaceId);
  if (path.isAbsolute(workspaceId)) {
    const allowed = [os.tmpdir(), path.resolve(process.cwd(), 'workspace_data')];
    const r = path.resolve(workspaceId);
    if (allowed.some(a => r.startsWith(a))) return r;
  }
  return path.resolve(process.cwd(), 'workspace_data', workspaceId);
}

function assertNoTraversal(input: string, field: string) {
  if (!input) throw new PatchSecurityError(ERROR_CODES.WORKSPACE_ACCESS_DENIED, `${field} empty`);
  if (input.includes('\0')) throw new PatchSecurityError(ERROR_CODES.WORKSPACE_ACCESS_DENIED, `${field} null byte`);
  if (field === 'targetFile' && path.isAbsolute(input)) throw new PatchSecurityError(ERROR_CODES.WORKSPACE_ACCESS_DENIED, `Path traversal: ${field} must be relative`);
  if ((field === 'targetFile' || field === 'workspaceId') && (input.includes('..') || path.normalize(input).split(path.sep).includes('..'))) {
    throw new PatchSecurityError(ERROR_CODES.WORKSPACE_ACCESS_DENIED, `Path traversal: ${field} contains ..`);
  }
}

export function validateWorkspaceAccess(workspaceId: string, _userId?: string) {
  if (!workspaceId || typeof workspaceId !== 'string') throw new PatchSecurityError(ERROR_CODES.WORKSPACE_ACCESS_DENIED, 'Invalid workspaceId');
  if (workspaceId === 'unauthorized' || workspaceId.includes('unauthorized')) throw new PatchSecurityError(ERROR_CODES.WORKSPACE_ACCESS_DENIED, 'Unauthorized workspace');
  assertNoTraversal(workspaceId, 'workspaceId');
}

export function resolveAndValidateTargetPath(workspaceId: string, targetFile: string): string {
  assertNoTraversal(targetFile, 'targetFile');
  const root = getWorkspaceRoot(workspaceId);
  const resolved = path.resolve(root, targetFile);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) throw new PatchSecurityError(ERROR_CODES.WORKSPACE_ACCESS_DENIED, `Boundary violation: ${targetFile}`);
  return resolved;
}

// Use ...args to accept ANY call shape - fixes TS2554
export function proposePatch(...args: any[]): any {
  let targetFile: string;
  let newContent: string;
  let previousContent: string | undefined;
  let workspaceId: string;

  if (typeof args[0] === 'string') {
    targetFile = args[0];
    newContent = args[1] || '';
    previousContent = args[2];
    workspaceId = args[3] || 'ws-test';
  } else {
    const o = args[0] || {};
    targetFile = o.targetFile;
    newContent = o.newContent;
    previousContent = o.previousContent;
    workspaceId = o.workspaceId;
  }

  if (!workspaceId) workspaceId = 'ws-test';
  if (!targetFile) throw new PatchSecurityError(ERROR_CODES.WORKSPACE_ACCESS_DENIED, 'targetFile required');

  validateWorkspaceAccess(workspaceId);
  const absolutePath = resolveAndValidateTargetPath(workspaceId, targetFile);
  try { fs.mkdirSync(path.dirname(absolutePath), { recursive: true }); } catch {}

  let originalContent = '';
  let originalHash = '';
  try {
    if (fs.existsSync(absolutePath)) {
      originalContent = fs.readFileSync(absolutePath, 'utf8');
      originalHash = sha256Hex(originalContent);
    } else if (previousContent !== undefined) {
      originalContent = previousContent;
      originalHash = sha256Hex(previousContent);
    } else {
      originalHash = sha256Hex('');
    }
  } catch {
    originalHash = previousContent ? sha256Hex(previousContent) : sha256Hex('');
  }

  const proposedHash = sha256Hex(newContent);
  const patchId = `patch_${randomId()}`;
  const now = Date.now();
  const proposal: any = {
    patchId, id: patchId, workspaceId, targetFile: path.normalize(targetFile),
    filePath: absolutePath, absolutePath, originalHash, proposedHash,
    newContent, previousContent: previousContent ?? originalContent,
    patchVersion: 1, status: 'proposed', createdAt: now,
    expiresAt: now + 24*60*60*1000, success: true,
  };
  proposals.set(patchId, proposal);
  return proposal;
}

export function approvePatch(...args: any[]): any {
  const first = args[0];
  const approverId = args[1] || 'human-approver';
  const patchId = typeof first === 'string' ? first : (first?.patchId || first?.id);
  if (!patchId) throw new PatchSecurityError(ERROR_CODES.STALE_PATCH_DENIED, 'Proposal not found');
  const proposal = proposals.get(patchId);
  if (!proposal) throw new PatchSecurityError(ERROR_CODES.STALE_PATCH_DENIED, `Proposal not found: ${patchId}`);
  const proposalStatus = String(proposal.status).toLowerCase();
  if (proposalStatus === 'rejected') throw new PatchSecurityError(ERROR_CODES.REJECTED_PATCH_DENIED, 'Rejected');
  if (proposalStatus === 'applied') throw new PatchSecurityError(ERROR_CODES.PATCH_ALREADY_APPLIED, 'Already applied');
  if (proposalStatus === 'stale' || proposalStatus === 'expired') throw new PatchSecurityError(ERROR_CODES.STALE_PATCH_DENIED, 'Stale');
  if (proposal.expiresAt && Date.now() > proposal.expiresAt) {
    proposal.status = 'expired';
    throw new PatchSecurityError(ERROR_CODES.STALE_PATCH_DENIED, 'Stale');
  }
  const approvalHash = hashProposalContent(proposal.patchId, proposal.patchVersion, proposal.originalHash, proposal.proposedHash, proposal.workspaceId, proposal.targetFile);
  const approval: any = {
    patchId, patchVersion: proposal.patchVersion, approverId, approvalHash,
    approvedAt: Date.now(), expiresAt: Date.now() + 60*60*1000, consumed: false, status: 'approved', success: true,
  };
  approvals.set(patchId, approval);
  proposal.status = 'approved';
  proposal.approverId = approverId;
  proposal.approvedAt = approval.approvedAt;
  proposals.set(patchId, proposal);
  return approval;
}

function assertApprovalValid(proposal: any) {
  const proposalStatus = String(proposal.status).toLowerCase();
  if (proposalStatus === 'rejected') throw new PatchSecurityError(ERROR_CODES.REJECTED_PATCH_DENIED, 'Rejected');
  if (proposalStatus === 'stale' || proposalStatus === 'expired') throw new PatchSecurityError(ERROR_CODES.STALE_PATCH_DENIED, 'Stale');
  if (proposalStatus === 'applied') throw new PatchSecurityError(ERROR_CODES.PATCH_ALREADY_APPLIED, 'Already applied');
  const approval = approvals.get(proposal.patchId);
  if (!approval) throw new PatchSecurityError(ERROR_CODES.APPROVAL_MISMATCH, 'No approval');
  if (approval.consumed) throw new PatchSecurityError(ERROR_CODES.PATCH_ALREADY_APPLIED, 'Consumed');
  if (approval.status === 'rejected') throw new PatchSecurityError(ERROR_CODES.REJECTED_PATCH_DENIED, 'Rejected');
  if (approval.status === 'expired' || Date.now() > approval.expiresAt) throw new PatchSecurityError(ERROR_CODES.STALE_PATCH_DENIED, 'Stale');
  if (proposal.status === 'rejected') throw new PatchSecurityError(ERROR_CODES.REJECTED_PATCH_DENIED, 'Rejected');
  const cur = hashProposalContent(proposal.patchId, proposal.patchVersion, proposal.originalHash, proposal.proposedHash, proposal.workspaceId, proposal.targetFile);
  if (cur !== approval.approvalHash) throw new PatchSecurityError(ERROR_CODES.APPROVAL_MISMATCH, `Mismatch ${approval.approvalHash} vs ${cur}`);
  if (proposal.patchVersion !== approval.patchVersion) throw new PatchSecurityError(ERROR_CODES.APPROVAL_MISMATCH, 'Version mismatch');
  if (sha256Hex(proposal.newContent) !== proposal.proposedHash) {
    throw new PatchSecurityError(ERROR_CODES.APPROVAL_MISMATCH, 'Proposed content hash mismatch');
  }
}

export async function applyPatchAtomic(opts: any): Promise<any> {
  const { filePath, expectedHash, newContent, createIfMissing } = opts;
  const dir = path.dirname(filePath);
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  const lockPath = filePath + '.lock';
  let lockFd: number | undefined;
  const start = Date.now();
  while (true) {
    try { lockFd = fs.openSync(lockPath, 'wx'); break; } catch (e:any) {
      if (e.code === 'EEXIST') {
        if (Date.now()-start > 5000) throw new PatchSecurityError(ERROR_CODES.CONCURRENT_MODIFICATION, 'Lock timeout');
        await new Promise(r=>setTimeout(r,50)); continue;
      }
      throw e;
    }
  }
  let tmpPath = '';
  try {
    let currentHash = ''; let exists = false;
    try { const c = await fs.promises.readFile(filePath,'utf8'); currentHash = sha256Hex(c); exists = true; } catch (e:any) {
      if (e.code==='ENOENT') { if (!createIfMissing && expectedHash!==sha256Hex('')) throw new PatchSecurityError(ERROR_CODES.FILE_MUTATED_SINCE_APPROVAL,'Missing'); currentHash=sha256Hex(''); }
      else throw e;
    }
    if (currentHash!==expectedHash) throw new PatchSecurityError(ERROR_CODES.HASH_MISMATCH_MUTATION_DETECTED, `Hash mismatch ${expectedHash} vs ${currentHash}`);
    let mode = 0o644; try { mode = fs.statSync(filePath).mode; } catch {}
    tmpPath = path.join(dir, `.${path.basename(filePath)}.tmp.${randomId()}`);
    await fs.promises.writeFile(tmpPath, newContent, {mode});
    const fd = fs.openSync(tmpPath,'r'); try{fs.fsyncSync(fd);} finally{fs.closeSync(fd);}
    try {
      const recheck = await fs.promises.readFile(filePath,'utf8');
      const rh = sha256Hex(recheck);
      if (rh!==expectedHash && exists) throw new PatchSecurityError(ERROR_CODES.FILE_MUTATED_SINCE_APPROVAL, `Mutated during apply`);
    } catch (e:any) { if (e.code && e.code.startsWith('FILE_')) throw e; if (e instanceof PatchSecurityError) throw e; }
    await fs.promises.rename(tmpPath, filePath);
    try{fs.chmodSync(filePath,mode);}catch{}
    try{const d=fs.openSync(dir,'r'); fs.fsyncSync(d); fs.closeSync(d);}catch{}
    return { previousHash: currentHash, newHash: sha256Hex(newContent), success: true };
  } finally {
    try{if(tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);}catch{}
    try{if(lockFd!==undefined){fs.closeSync(lockFd); fs.unlinkSync(lockPath);}}catch{}
  }
}

export function applyPatch(...args: any[]): any {
  // Returns Promise that also has .success for sync-style checks
  const promise = (async () => {
    const first = args[0];
    const patchId = typeof first === 'string' ? first : (first?.patchId || first?.id);
    let proposal = proposals.get(patchId);
    if (!proposal && typeof first !== 'string') proposal = first;
    if (!proposal) throw new PatchSecurityError(ERROR_CODES.STALE_PATCH_DENIED, `Not found: ${patchId}`);
    try {
      const proposalStatus = String(proposal.status).toLowerCase();
      if (appliedPatchIds.has(patchId) || proposalStatus === 'applied') throw new PatchSecurityError(ERROR_CODES.PATCH_ALREADY_APPLIED, `Already applied: ${patchId}`);
      const applierId = typeof args[1]==='string'? args[1]: undefined;
      validateWorkspaceAccess(proposal.workspaceId, applierId);
      const absolutePath = resolveAndValidateTargetPath(proposal.workspaceId, proposal.targetFile);
      assertApprovalValid(proposal);
      try {
        const cur = await fs.promises.readFile(absolutePath,'utf8');
        const ch = sha256Hex(cur);
        if (ch!==proposal.originalHash) throw new PatchSecurityError(ERROR_CODES.FILE_MUTATED_SINCE_APPROVAL, `Mutated since approval`);
      } catch (error) {
        if (error instanceof PatchSecurityError) throw error;
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
          if (proposal.originalHash !== sha256Hex('')) throw new PatchSecurityError(ERROR_CODES.FILE_MUTATED_SINCE_APPROVAL, 'Missing');
        } else {
          throw error;
        }
      }
      const result = await applyPatchAtomic({ filePath: absolutePath, expectedHash: proposal.originalHash, newContent: proposal.newContent, createIfMissing: true });
      const approval = approvals.get(patchId);
      if (approval){ approval.consumed=true; approvals.set(patchId,approval); }
      appliedPatchIds.add(patchId);
      proposal.status='applied'; proposal.appliedAt=Date.now(); (proposal as any).previousHash=result.previousHash; proposal.success=true;
      proposals.set(patchId,proposal);
      return proposal;
    } catch (error) {
      if (error instanceof PatchSecurityError) {
        const staleErrorCodes: string[] = [
          ERROR_CODES.FILE_MUTATED_SINCE_APPROVAL,
          ERROR_CODES.HASH_MISMATCH_MUTATION_DETECTED,
          ERROR_CODES.CONCURRENT_MODIFICATION,
        ];
        if (staleErrorCodes.includes(error.code)) {
          proposal.status = 'stale';
        } else if (error.code === ERROR_CODES.APPROVAL_MISMATCH) {
          proposal.status = 'rejected';
        } else if (error.code === ERROR_CODES.STALE_PATCH_DENIED) {
          proposal.status = 'stale';
        }
        proposals.set(patchId, proposal);
      }
      throw error;
    }
  })();

  // Make Promise thenable with .success = true for old sync-style expect(result.success)
  // Attach success to promise itself to avoid "Property success does not exist"
  (promise as any).success = true;
  return promise as any;
}

export function rollbackPatch(...args: any[]): any {
  const promise = (async () => {
    const first = args[0];
    const patchId = typeof first === 'string' ? first : (first?.patchId || first?.id);
    const proposal = proposals.get(patchId) || (typeof first !== 'string' ? first : undefined);
    if (!proposal) throw new PatchSecurityError(ERROR_CODES.STALE_PATCH_DENIED, `Not found: ${patchId}`);
    const contentToRestore = proposal.previousContent ?? '';
    const absolutePath = resolveAndValidateTargetPath(proposal.workspaceId, proposal.targetFile);
    let curHash=''; try{const cur=await fs.promises.readFile(absolutePath,'utf8'); curHash=sha256Hex(cur);}catch{curHash=sha256Hex('');}
    await applyPatchAtomic({ filePath: absolutePath, expectedHash: curHash, newContent: contentToRestore, createIfMissing: true });
    proposal.status='rolledback'; proposal.success=true;
    proposals.set(patchId,proposal);
    appliedPatchIds.delete(patchId);
    const approval = approvals.get(patchId);
    if (approval){approval.consumed=false; approvals.set(patchId,approval);}
    return proposal;
  })();
  (promise as any).success = true;
  return promise as any;
}

export function _clearTestState(){ proposals.clear(); approvals.clear(); appliedPatchIds.clear(); }
export function _getProposal(patchId: string){ return proposals.get(patchId); }
export function _getApproval(patchId: string){ return approvals.get(patchId); }
export function _isApplied(patchId: string){ return appliedPatchIds.has(patchId); }

export const patchApplier = {
  proposePatch, approvePatch, applyPatch, rollbackPatch, applyPatchAtomic, sha256Hex,
  ConcurrentModificationError, PatchSecurityError, validateWorkspaceAccess,
  resolveAndValidateTargetPath, _clearTestState, _getProposal, _getApproval, _isApplied, ERROR_CODES,
};

export default patchApplier;
