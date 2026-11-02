import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { authorizeOperation } from './authorizationService.js';
import type { AuthenticatedUser } from './authService.js';
import {
  getProjects,
  saveProject,
  deleteProject,
  getGitStatus,
  type WorkspaceProject,
} from './workspaceManager.js';
import { createAuditEntry } from './auditLedger.js';

export interface TenantScopedResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  reason?: string;
  count?: number;
}

export interface TenantBackupPayload {
  formatVersion: string;
  tenantId: string;
  createdAt: string;
  createdBy: string;
  sourceRevision: string;
  recordCounts: number;
  schemaVersion: string;
  integrityDigest: string;
  signature?: string;
  projects: WorkspaceProject[];
}

export interface RestorePreview {
  tenantId: string;
  incomingCount: number;
  existingCount: number;
  duplicateIds: string[];
  isValid: boolean;
  schemaVersion: string;
}

const BACKUPS_DIR = path.resolve(process.cwd(), 'workspace_data/backups');

function getBackupHmacSecret(): string {
  const isTestEnv = process.env.NODE_ENV !== 'production' && (process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST) || process.env.VITEST_WORKER_ID !== undefined);
  const configuredSecret = [
    process.env.BACKUP_HMAC_SECRET,
    process.env.SERVER_BACKUP_HMAC_SECRET,
    ...(isTestEnv
      ? [process.env.TENANT_STORAGE_HMAC_SECRET, process.env.BILLING_WEBHOOK_SECRET]
      : []),
  ]
    .map((secret) => secret?.trim())
    .find(Boolean);

  if (configuredSecret) return configuredSecret;
  return isTestEnv ? 'test-hmac-secret-for-ci-only-32-chars-long' : '';
}

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

export function isBackupSecretConfigured(): boolean {
  return Boolean(getBackupHmacSecret());
}

export function computeBackupHMAC(payload: Omit<TenantBackupPayload, 'signature'>): string {
  const secret = getBackupHmacSecret();
  if (!secret) {
    throw new Error('BACKUP_HMAC_SECRET_NOT_CONFIGURED');
  }
  const canonicalData = `${payload.formatVersion}:${payload.tenantId}:${payload.createdAt}:${payload.recordCounts}:${payload.integrityDigest}:${payload.schemaVersion}`;
  return crypto.createHmac('sha256', secret).update(canonicalData).digest('hex');
}

export function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  if (!aHex || !bHex) return false;
  try {
    const bufA = Buffer.from(aHex, 'hex');
    const bufB = Buffer.from(bHex, 'hex');
    if (bufA.length !== bufB.length || bufA.length === 0) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * TENANT-AWARE PERSISTENCE FOUNDATION & ISOLATION (Patches 3, 4, 5, 6)
 */

/**
 * 3.3 Persistence Abstraction: findByTenant
 * Returns all active (non-quarantined) projects for the verified principal's tenant.
 * Strict Fail Closed: any record lacking a valid tenantId is explicitly quarantined and excluded from all standard queries.
 */
export function findByTenant(
  principal: AuthenticatedUser | any,
  requestedTenantId?: string
): TenantScopedResult<WorkspaceProject[]> {
  const targetTenant = requestedTenantId || principal?.tenantId || 'org-default';

  // 1. Evaluate permission and tenant boundary check
  const auth = authorizeOperation(principal, 'project:read', targetTenant);
  if (!auth.allowed) {
    return {
      success: false,
      error: 'tenant_authorization_denied',
      reason: auth.reason,
      data: [],
      count: 0,
    };
  }

  const { projects } = getProjects();

  // 2. Strict Fail Closed Filter: Exclude any record lacking a valid tenantId, or marked as unclassified/quarantined
  const tenantProjects = projects.filter((p) => {
    if (!p.tenantId || typeof p.tenantId !== 'string' || !p.tenantId.trim()) {
      return false; // Fail closed: exclude records lacking tenantId regardless of role
    }
    if (p.unclassified === true || p.status === 'QUARANTINED_UNCLASSIFIED') {
      return false; // Exclude explicitly quarantined records
    }
    return p.tenantId === targetTenant;
  });

  return {
    success: true,
    data: tenantProjects,
    count: tenantProjects.length,
  };
}

/**
 * Alias for findByTenant for backward compatibility.
 */
export const getTenantProjects = findByTenant;

/**
 * 3.3 Persistence Abstraction: findOneByTenant
 */
export function findOneByTenant(
  principal: AuthenticatedUser | any,
  projectId: string,
  requestedTenantId?: string
): TenantScopedResult<WorkspaceProject | null> {
  const listResult = findByTenant(principal, requestedTenantId);
  if (!listResult.success || !listResult.data) {
    return {
      success: false,
      error: listResult.error,
      reason: listResult.reason,
      data: null,
    };
  }

  const project = listResult.data.find((p) => p.id === projectId) || null;
  if (!project) {
    return {
      success: false,
      error: 'project_not_found',
      reason: `Project '${projectId}' was not found in tenant '${principal?.tenantId || requestedTenantId}'`,
      data: null,
    };
  }

  return {
    success: true,
    data: project,
  };
}

/**
 * 3.3 Persistence Abstraction: createForTenant
 * Stamps server-verified principal.tenantId (Zero Client Trust).
 */
export function createForTenant(
  principal: AuthenticatedUser | any,
  projectInput: Partial<WorkspaceProject> & { name: string },
  requestedTenantId?: string
): TenantScopedResult<WorkspaceProject> {
  const targetTenant = requestedTenantId || principal?.tenantId || 'org-default';

  // 1. Evaluate permission and tenant boundary check
  const auth = authorizeOperation(principal, 'project:write', targetTenant);
  if (!auth.allowed) {
    return {
      success: false,
      error: 'tenant_authorization_denied',
      reason: auth.reason,
    };
  }

  // 2. Zero Client Trust: Enforce principal.tenantId
  const sanitizedInput: Partial<WorkspaceProject> & { name: string } = {
    ...projectInput,
    tenantId: targetTenant,
    ownerId: String(principal?.id || 'owner-workspace'),
    unclassified: false,
  };

  try {
    const savedResult = saveProject(sanitizedInput, { id: String(principal.id), role: principal.role });
    createAuditEntry(
      'TENANT_PROJECT_CREATED',
      `Project '${savedResult.project.id}' created under tenant '${targetTenant}'`
    );
    return {
      success: true,
      data: savedResult.project,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'save_failed',
      reason: err.message,
    };
  }
}

/**
 * Alias for createForTenant / saveTenantProject
 */
export function saveTenantProject(
  principal: AuthenticatedUser | any,
  projectInput: Partial<WorkspaceProject> & { name: string },
  requestedTenantId?: string
): TenantScopedResult<WorkspaceProject> {
  return createForTenant(principal, projectInput, requestedTenantId);
}

/**
 * 3.3 Persistence Abstraction: updateForTenant
 */
export function updateForTenant(
  principal: AuthenticatedUser | any,
  projectId: string,
  patchData: Partial<WorkspaceProject>,
  requestedTenantId?: string
): TenantScopedResult<WorkspaceProject> {
  const existingResult = findOneByTenant(principal, projectId, requestedTenantId);
  if (!existingResult.success || !existingResult.data) {
    return {
      success: false,
      error: existingResult.error || 'project_not_found',
      reason: existingResult.reason || `Project '${projectId}' not found in target tenant`,
    };
  }

  const existing = existingResult.data;
  const targetTenant = principal?.tenantId || requestedTenantId || existing.tenantId || 'org-default';

  const auth = authorizeOperation(principal, 'project:write', targetTenant);
  if (!auth.allowed) {
    return {
      success: false,
      error: 'tenant_authorization_denied',
      reason: auth.reason,
    };
  }

  const updatedInput: Partial<WorkspaceProject> & { name: string } = {
    ...existing,
    ...patchData,
    id: projectId,
    tenantId: targetTenant, // Maintain tenantId
    unclassified: false,
    name: patchData.name || existing.name,
  };

  try {
    const savedResult = saveProject(updatedInput, { id: String(principal.id), role: principal.role });
    return {
      success: true,
      data: savedResult.project,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'update_failed',
      reason: err.message,
    };
  }
}

/**
 * 3.3 Persistence Abstraction: deleteForTenant
 */
export function deleteForTenant(
  principal: AuthenticatedUser | any,
  projectId: string,
  requestedTenantId?: string
): TenantScopedResult<{ deletedId: string }> {
  const existingResult = findOneByTenant(principal, projectId, requestedTenantId);
  if (!existingResult.success || !existingResult.data) {
    return {
      success: false,
      error: existingResult.error || 'project_not_found',
      reason: existingResult.reason || `Project '${projectId}' was not found in target tenant`,
    };
  }

  const existing = existingResult.data;
  const targetTenant = principal?.tenantId || requestedTenantId || existing.tenantId || 'org-default';

  const auth = authorizeOperation(principal, 'project:delete', targetTenant);
  if (!auth.allowed) {
    return {
      success: false,
      error: 'tenant_authorization_denied',
      reason: auth.reason,
    };
  }

  try {
    const deleteResult = deleteProject(projectId, { id: String(principal.id), role: principal.role });
    createAuditEntry(
      'TENANT_PROJECT_DELETED',
      `Project '${projectId}' deleted from tenant '${targetTenant}'`
    );
    return {
      success: true,
      data: { deletedId: deleteResult.deletedId },
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'delete_failed',
      reason: err.message,
    };
  }
}

/**
 * Alias for deleteForTenant
 */
export const deleteTenantProject = deleteForTenant;

/**
 * PATCH 4 — QUARANTINE ENGINE
 * Returns legacy records that lack verified tenant assignment without leaking details.
 */
export function getQuarantinedLegacyProjects(
  principal: AuthenticatedUser | any
): TenantScopedResult<WorkspaceProject[]> {
  const auth = authorizeOperation(principal, 'project:read');
  if (!auth.allowed) {
    return {
      success: false,
      error: 'authorization_denied',
      reason: auth.reason,
      data: [],
      count: 0,
    };
  }

  const { projects } = getProjects();
  const quarantined = projects.filter((p) => !p.tenantId || p.unclassified === true || p.status === 'QUARANTINED_UNCLASSIFIED');

  // Redact content snippet or personal details in summaries
  const sanitized = quarantined.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || 'Legacy Unclassified Project',
    status: 'QUARANTINED_UNCLASSIFIED',
    updatedAt: p.updatedAt,
    ownerId: p.ownerId || 'legacy-unassigned',
    unclassified: true,
  }));

  return {
    success: true,
    data: sanitized,
    count: sanitized.length,
  };
}

/**
 * PATCH 4 — MANUAL CLASSIFICATION
 * Allows explicit, authorized classification of a quarantined project to a tenant.
 */
export function classifyLegacyProject(
  principal: AuthenticatedUser | any,
  projectId: string,
  targetTenantId: string
): TenantScopedResult<WorkspaceProject> {
  const auth = authorizeOperation(principal, 'project:write', targetTenantId);
  if (!auth.allowed) {
    return {
      success: false,
      error: 'tenant_authorization_denied',
      reason: auth.reason,
    };
  }

  const { projects } = getProjects();
  const target = projects.find((p) => p.id === projectId);

  if (!target) {
    return {
      success: false,
      error: 'project_not_found',
      reason: `Quarantined project '${projectId}' was not found`,
    };
  }

  target.tenantId = targetTenantId;
  target.unclassified = false;
  target.status = 'Active workspace';
  target.updatedAt = new Date().toISOString();

  try {
    const saved = saveProject(target, { id: String(principal.id), role: principal.role });
    createAuditEntry(
      'LEGACY_PROJECT_CLASSIFIED',
      `Project '${projectId}' manually assigned to tenant '${targetTenantId}'`
    );

    return {
      success: true,
      data: saved.project,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'classification_failed',
      reason: err.message,
    };
  }
}

/**
 * PATCH 6 — TENANT-AWARE BACKUP & RESTORE
 * Create tenant-scoped backup (OWNER / ADMIN).
 */
export function createTenantBackup(
  principal: AuthenticatedUser | any
): TenantScopedResult<{ backup: TenantBackupPayload; backupFilename: string }> {
  if (!getBackupHmacSecret()) {
    return {
      success: false,
      error: 'backup_disabled_no_hmac_secret',
      reason: 'Backup functionality is disabled because no BACKUP_HMAC_SECRET is configured in environment variables',
    };
  }

  const tenantId = principal?.tenantId || 'org-default';

  // Policy check: backup:create allows OWNER & ADMIN
  const auth = authorizeOperation(principal, 'backup:create', tenantId);
  if (!auth.allowed) {
    return {
      success: false,
      error: 'tenant_authorization_denied',
      reason: auth.reason,
    };
  }

  // 1. Retrieve ONLY projects belonging to principal's tenant
  const projectsResult = findByTenant(principal, tenantId);
  if (!projectsResult.success || !projectsResult.data) {
    return {
      success: false,
      error: 'backup_failed',
      reason: 'Failed to query tenant projects for backup',
    };
  }

  const tenantProjects = projectsResult.data;
  const createdAt = new Date().toISOString();
  const gitStatus = getGitStatus();
  const sourceRevision = gitStatus.commitSha || 'rev-head';

  const rawJson = JSON.stringify(tenantProjects);
  const integrityDigest = crypto.createHash('sha256').update(rawJson).digest('hex');

  const unsignedPayload: Omit<TenantBackupPayload, 'signature'> = {
    formatVersion: '1.0',
    tenantId,
    createdAt,
    createdBy: String(principal.id || principal.email || 'user'),
    sourceRevision,
    recordCounts: tenantProjects.length,
    schemaVersion: '1.0',
    integrityDigest,
    projects: tenantProjects,
  };

  const signature = computeBackupHMAC(unsignedPayload);
  const fullPayload: TenantBackupPayload = {
    ...unsignedPayload,
    signature,
  };

  ensureBackupsDir();
  const timestamp = createdAt.replace(/[:.]/g, '-');
  const backupFilename = `tenant_backup_${tenantId}_${timestamp}.json`;
  const backupPath = path.join(BACKUPS_DIR, backupFilename);

  fs.writeFileSync(backupPath, JSON.stringify(fullPayload, null, 2), 'utf8');

  createAuditEntry(
    'TENANT_BACKUP_CREATED',
    `Backup '${backupFilename}' created for tenant '${tenantId}' (${tenantProjects.length} records)`
  );

  return {
    success: true,
    data: {
      backup: fullPayload,
      backupFilename,
    },
  };
}

/**
 * PATCH 6 — TENANT-AWARE RESTORE
 * Restores tenant backup into isolated staging first, verifies integrity, then promotes.
 * Policy check: backup:restore is strictly ALLOWED for OWNER, DENIED for ADMIN, DEVELOPER, MEMBER, VIEWER.
 */
export function restoreTenantBackup(
  principal: AuthenticatedUser | any,
  backupPayload: TenantBackupPayload,
  targetTenantId?: string
): TenantScopedResult<{ restoredCount: number; tenantId: string; preview: RestorePreview }> {
  if (!getBackupHmacSecret()) {
    return {
      success: false,
      error: 'restore_disabled_no_hmac_secret',
      reason: 'Restore functionality is disabled because no BACKUP_HMAC_SECRET is configured in environment variables',
    };
  }

  const tenantId = principal?.tenantId || targetTenantId || 'org-default';

  // 1. Policy check: backup:restore ALLOWS OWNER, DENIES ADMIN!
  const auth = authorizeOperation(principal, 'backup:restore', tenantId);
  if (!auth.allowed) {
    return {
      success: false,
      error: 'tenant_authorization_denied',
      reason: auth.reason,
    };
  }

  // 2. Cross-Tenant Restore Protection
  if (!backupPayload || typeof backupPayload !== 'object') {
    return {
      success: false,
      error: 'invalid_backup_format',
      reason: 'Backup payload is invalid or empty',
    };
  }

  if (backupPayload.tenantId !== tenantId) {
    return {
      success: false,
      error: 'cross_tenant_restore_denied',
      reason: `Backup tenantId '${backupPayload.tenantId}' does not match principal tenantId '${tenantId}'`,
    };
  }

  // 3. Cryptographic Signature & Integrity Digest Verification
  if (!backupPayload.integrityDigest || !Array.isArray(backupPayload.projects)) {
    return {
      success: false,
      error: 'corrupted_backup_payload',
      reason: 'Backup payload missing integrity digest or projects array',
    };
  }

  const computedDigest = crypto.createHash('sha256').update(JSON.stringify(backupPayload.projects)).digest('hex');
  if (computedDigest !== backupPayload.integrityDigest) {
    return {
      success: false,
      error: 'backup_integrity_mismatch',
      reason: 'Backup project contents hash does not match recorded integrity digest',
    };
  }

  if (!backupPayload.signature) {
    return {
      success: false,
      error: 'backup_signature_missing',
      reason: 'Backup payload is missing mandatory HMAC signature',
    };
  }

  const { signature: providedSig, ...unsigned } = backupPayload;
  let expectedSig = '';
  try {
    expectedSig = computeBackupHMAC(unsigned);
  } catch (err: any) {
    return {
      success: false,
      error: 'backup_hmac_secret_missing',
      reason: 'Backup HMAC verification failed because BACKUP_HMAC_SECRET is not configured',
    };
  }

  if (!timingSafeEqualHex(providedSig, expectedSig)) {
    return {
      success: false,
      error: 'backup_signature_invalid',
      reason: 'Backup payload HMAC signature verification failed (constant-time check failed)',
    };
  }

  // 4. Safe Restore Staging Buffer & Validation
  const existingProjectsResult = findByTenant(principal, tenantId);
  const existingProjects = existingProjectsResult.data || [];
  const existingIds = new Set(existingProjects.map((p) => p.id));

  const stagingProjects: WorkspaceProject[] = [];
  const duplicateIds: string[] = [];

  for (const proj of backupPayload.projects) {
    if (!proj.id || !proj.name) {
      return {
        success: false,
        error: 'staging_validation_failed',
        reason: 'One or more backup projects are missing required id or name',
      };
    }

    // Force project tenantId to match target tenant
    const stagedProj: WorkspaceProject = {
      ...proj,
      tenantId,
      unclassified: false,
      updatedAt: new Date().toISOString(),
    };

    if (existingIds.has(proj.id)) {
      duplicateIds.push(proj.id);
    }

    stagingProjects.push(stagedProj);
  }

  const preview: RestorePreview = {
    tenantId,
    incomingCount: stagingProjects.length,
    existingCount: existingProjects.length,
    duplicateIds,
    isValid: true,
    schemaVersion: backupPayload.schemaVersion || '1.0',
  };

  // 5. Atomic Promotion from Staging
  try {
    const { projects: allProjects } = getProjects();
    // Keep projects from OTHER tenants untouched
    const otherTenantsProjects = allProjects.filter((p) => p.tenantId && p.tenantId !== tenantId);

    // Combine staging projects with other tenants' projects
    const combinedProjects = [...otherTenantsProjects, ...stagingProjects];

    // Atomically write combined dataset
    const tmpPath = path.resolve(process.cwd(), `workspace_data/projects.tmp.restore.${Date.now()}.json`);
    const projectsPath = path.resolve(process.cwd(), 'workspace_data/projects.json');
    fs.writeFileSync(tmpPath, JSON.stringify(combinedProjects, null, 2), 'utf8');
    fs.renameSync(tmpPath, projectsPath);

    createAuditEntry(
      'TENANT_BACKUP_RESTORED',
      `Restored ${stagingProjects.length} projects for tenant '${tenantId}' from backup`
    );

    return {
      success: true,
      data: {
        restoredCount: stagingProjects.length,
        tenantId,
        preview,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'atomic_promotion_failed',
      reason: `Restore promotion failed: ${err.message}`,
    };
  }
}

export const tenantScopedStorage = {
  findByTenant,
  findOneByTenant,
  createForTenant,
  updateForTenant,
  deleteForTenant,
  getTenantProjects,
  saveTenantProject,
  deleteTenantProject,
  getQuarantinedLegacyProjects,
  classifyLegacyProject,
  createTenantBackup,
  restoreTenantBackup,
};

export default tenantScopedStorage;
