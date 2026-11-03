import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const IDENTITY_SOURCE_FILES = ['users.json', 'organizations.json', 'organization_members.json', 'sessions.json'];
export const OWNER_OVERRIDE_FILE = 'approved-owner-corrections.json';
const hash = value => createHash('sha256').update(value).digest('hex');

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

function applyApprovedOwnerOverrides(sourceData, override, rawSourceHashes) {
  if (!override) return { data: structuredClone(sourceData), errors: [], applied: [] };
  const errors = [];
  if (override.schemaVersion !== 1) errors.push('override schemaVersion must be 1');
  if (override.status !== 'APPROVED_IMPORT_PROJECTION_ONLY') errors.push('override is not explicitly approved for import projection only');
  if (override.approver?.authority !== 'self-attested-authorized-owner-or-steward') errors.push('approver authority evidence is missing');
  if (override.approver?.identityVerified !== false) errors.push('approver identity verification must not be overstated');
  if (typeof override.approver?.approvalEvidence !== 'string' || !override.approver.approvalEvidence.trim()) errors.push('approval evidence is missing');
  if (!override.approvedAt || Number.isNaN(Date.parse(override.approvedAt))) errors.push('approvedAt is invalid');
  if (!override.approvalId) errors.push('approvalId is missing');

  const expectedHashes = override.sourceFilesSha256;
  if (!expectedHashes || IDENTITY_SOURCE_FILES.some(file => expectedHashes[file] !== rawSourceHashes[file])) {
    errors.push('identity source files changed since owner override approval; re-approval is required');
  }
  if (!Array.isArray(override.overrides) || override.overrides.length !== 1) errors.push('this approved override must contain exactly one change');

  const data = structuredClone(sourceData);
  const applied = [];
  if (!errors.length) {
    for (const change of override.overrides) {
      if (change.type !== 'promote-owner-membership') { errors.push('unsupported override type'); break; }
      if (change.organizationId !== 'org-usr-3' || change.expectedOwnerUserId !== 3
        || change.membershipId !== 'mem-3-org-usr-3' || change.userId !== 3
        || change.fromRole !== 'ADMIN' || change.toRole !== 'OWNER'
        || change.expectedOwnerMembershipCountBefore !== 0) {
        errors.push('override does not match the exact approved owner correction');
        break;
      }
      const organizations = data['organizations.json'].filter(row => row.id === change.organizationId);
      const memberships = data['organization_members.json'].filter(row => row.id === change.membershipId);
      if (organizations.length !== 1 || organizations[0].ownerId !== change.expectedOwnerUserId) {
        errors.push('organization owner ID does not match the approved correction');
        break;
      }
      if (memberships.length !== 1 || memberships[0].orgId !== change.organizationId
        || memberships[0].userId !== change.userId || memberships[0].role !== change.fromRole) {
        errors.push('membership ID, tenant, user, or current role does not match the approved correction');
        break;
      }
      const ownersBefore = data['organization_members.json'].filter(row => row.orgId === change.organizationId && row.role === 'OWNER').length;
      if (ownersBefore !== change.expectedOwnerMembershipCountBefore) {
        errors.push('OWNER membership count changed since approval');
        break;
      }
      memberships[0].role = change.toRole;
      applied.push({
        type: change.type,
        organizationId: change.organizationId,
        membershipId: change.membershipId,
        userId: change.userId,
        fromRole: change.fromRole,
        toRole: change.toRole,
        ownerIdPreserved: organizations[0].ownerId === change.expectedOwnerUserId,
        approvalId: override.approvalId,
      });
    }
  }
  return { data, errors, applied };
}

export async function loadIdentityImportProjection(identityDir) {
  const sourceData = {};
  const rawSourceBytes = {};
  const rawSourceHashes = {};
  for (const file of IDENTITY_SOURCE_FILES) {
    const raw = await readFile(path.join(identityDir, file));
    rawSourceBytes[file] = raw;
    sourceData[file] = JSON.parse(raw.toString('utf8'));
    rawSourceHashes[file] = hash(raw);
  }
  const sourceCanonical = IDENTITY_SOURCE_FILES.map(file => {
    const primaryKey = file === 'users.json' || file === 'organizations.json' || file === 'organization_members.json' || file === 'sessions.json' ? 'id' : '';
    const rows = [...sourceData[file]].sort((a, b) => String(a?.[primaryKey]).localeCompare(String(b?.[primaryKey])));
    return `${file}\0${JSON.stringify(canonical(rows))}\0`;
  }).join('');
  const sourceDigest = hash(sourceCanonical);

  const overridePath = path.join(identityDir, 'migration-overrides', OWNER_OVERRIDE_FILE);
  let override = null;
  let overrideRaw = null;
  try {
    overrideRaw = await readFile(overridePath);
    override = JSON.parse(overrideRaw.toString('utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw new Error(`APPROVED_OWNER_OVERRIDE_INVALID:${error.message}`);
  }
  const overrideDigest = overrideRaw ? hash(overrideRaw) : null;
  const digest = hash(`${sourceDigest}\0${overrideDigest ?? 'NO_APPROVED_OVERRIDE'}`);
  const application = applyApprovedOwnerOverrides(sourceData, override, rawSourceHashes);
  return {
    sourceData,
    data: application.data,
    rawSourceBytes,
    sourceDigest,
    digest,
    rawSourceHashes,
    override,
    overrideBytes: overrideRaw,
    overridePath: overrideRaw ? overridePath : null,
    overrideDigest,
    overrideErrors: application.errors,
    overridesApplied: application.applied,
  };
}

export async function verifyIdentitySnapshot(identityDir, expectedSourceHashes, expectedOverrideDigest) {
  const actualSourceHashes = {};
  for (const file of IDENTITY_SOURCE_FILES) {
    actualSourceHashes[file] = hash(await readFile(path.join(identityDir, file)));
  }
  let actualOverrideDigest = null;
  try {
    actualOverrideDigest = hash(await readFile(path.join(identityDir, 'migration-overrides', OWNER_OVERRIDE_FILE)));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const sourceFilesMatch = IDENTITY_SOURCE_FILES.every(file => actualSourceHashes[file] === expectedSourceHashes[file]);
  return {
    unchanged: sourceFilesMatch && actualOverrideDigest === expectedOverrideDigest,
    sourceFilesMatch,
    overrideMatches: actualOverrideDigest === expectedOverrideDigest,
  };
}
