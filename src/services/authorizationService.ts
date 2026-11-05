// @ts-nocheck
import type { Request, Response, NextFunction } from 'express';
import { resolveRequestUser, type AuthenticatedUser } from './authService.ts';

export type AccountRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'MEMBER' | 'VIEWER';

export type CanonicalOperation =
  | 'project:read'
  | 'project:write'
  | 'project:delete'
  | 'backup:create'
  | 'backup:restore'
  | 'audit:view'
  | 'audit:request_repair'
  | 'audit:approve_repair';

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  operation: CanonicalOperation;
  effectiveRole: AccountRole | 'UNKNOWN';
  userId: string;
  tenantId?: string;
}

/**
 * STRICT AUTHORIZATION MATRIX POLICY (Patch 2 & Phase 4 Audit Repair Authorization)
 *
 * Operation            | OWNER | ADMIN | DEVELOPER | MEMBER | VIEWER
 * ---------------------|-------|-------|-----------|--------|-------
 * project:read         | Allow | Allow | Allow     | Allow  | Allow
 * project:write        | Allow | Allow | Allow     | Deny   | Deny
 * project:delete       | Allow | Allow | Deny      | Deny   | Deny
 * backup:create        | Allow | Allow | Deny      | Deny   | Deny
 * backup:restore       | Allow | Deny  | Deny      | Deny   | Deny
 * audit:view           | Allow | Allow | Allow     | Allow  | Allow
 * audit:request_repair | Allow | Allow | Deny      | Deny   | Deny
 * audit:approve_repair | Allow | Deny  | Deny      | Deny   | Deny
 */
export const PERMISSION_MATRIX: Record<CanonicalOperation, Record<AccountRole, boolean>> = {
  'project:read': {
    OWNER: true,
    ADMIN: true,
    DEVELOPER: true,
    MEMBER: true,
    VIEWER: true,
  },
  'project:write': {
    OWNER: true,
    ADMIN: true,
    DEVELOPER: true,
    MEMBER: false,
    VIEWER: false,
  },
  'project:delete': {
    OWNER: true,
    ADMIN: true,
    DEVELOPER: false,
    MEMBER: false,
    VIEWER: false,
  },
  'backup:create': {
    OWNER: true,
    ADMIN: true,
    DEVELOPER: false,
    MEMBER: false,
    VIEWER: false,
  },
  'backup:restore': {
    OWNER: true,
    ADMIN: false, // Critical policy enforcement: ADMIN is strictly DENIED backup restore
    DEVELOPER: false,
    MEMBER: false,
    VIEWER: false,
  },
  'audit:view': {
    OWNER: true,
    ADMIN: true,
    DEVELOPER: true,
    MEMBER: true,
    VIEWER: true,
  },
  'audit:request_repair': {
    OWNER: true,
    ADMIN: true,
    DEVELOPER: false,
    MEMBER: false,
    VIEWER: false,
  },
  'audit:approve_repair': {
    OWNER: true,
    ADMIN: false, // Critical Phase 4 policy: ADMIN strictly DENIED approval authority
    DEVELOPER: false,
    MEMBER: false,
    VIEWER: false,
  },
};

/**
 * Resolves effective fine-grained AccountRole from AuthenticatedUser principal.
 * Client-supplied headers or request body roles are strictly REJECTED.
 */
export function resolveEffectiveRole(user: AuthenticatedUser | any): AccountRole | 'UNKNOWN' {
  if (!user || typeof user !== 'object') return 'UNKNOWN';

  // If user has accountRole derived from session record ('OWNER', 'ADMIN', 'DEVELOPER', 'MEMBER', 'VIEWER')
  if (user.accountRole && typeof user.accountRole === 'string') {
    const uppercaseRole = user.accountRole.toUpperCase();
    if (['OWNER', 'ADMIN', 'DEVELOPER', 'MEMBER', 'VIEWER'].includes(uppercaseRole)) {
      return uppercaseRole as AccountRole;
    }
  }

  // Fallback mapping for workspace level UserRole
  if (user.role === 'admin') {
    return user.id === 'owner-workspace' ? 'OWNER' : 'ADMIN';
  }
  if (user.role === 'engineer') {
    return 'DEVELOPER';
  }
  if (user.role === 'viewer') {
    return 'VIEWER';
  }

  return 'UNKNOWN';
}

/**
 * Evaluates whether an authenticated principal is authorized to perform a canonical operation.
 * Enforces Deny-By-Default on missing credentials, unverified tokens, role insufficient, or cross-tenant violations.
 */
export function authorizeOperation(
  user: AuthenticatedUser | any,
  operation: CanonicalOperation,
  resourceTenantId?: string
): AuthorizationResult {
  // Direct service invocation without a valid principal or unverified principal -> Deny by default
  if (!user || typeof user !== 'object' || !user.isTokenVerified) {
    return {
      allowed: false,
      reason: 'Direct service invocation without a valid, verified principal is denied',
      operation,
      effectiveRole: 'UNKNOWN',
      userId: user?.id || 'unauthenticated',
    };
  }

  const role = resolveEffectiveRole(user);
  if (role === 'UNKNOWN') {
    return {
      allowed: false,
      reason: 'Unknown or unmapped principal role',
      operation,
      effectiveRole: 'UNKNOWN',
      userId: user.id,
      tenantId: user.tenantId,
    };
  }

  // Tenant boundary verification
  if (resourceTenantId && typeof resourceTenantId === 'string') {
    const principalTenantId = user.tenantId;
    if (!principalTenantId || principalTenantId !== resourceTenantId) {
      return {
        allowed: false,
        reason: `Tenant mismatch: Principal tenant '${principalTenantId || 'none'}' does not match target resource tenant '${resourceTenantId}'`,
        operation,
        effectiveRole: role,
        userId: user.id,
        tenantId: principalTenantId,
      };
    }
  }

  // Permission Matrix check
  const matrixEntry = PERMISSION_MATRIX[operation];
  if (!matrixEntry) {
    return {
      allowed: false,
      reason: `Unknown or unmapped canonical operation '${operation}'`,
      operation,
      effectiveRole: role,
      userId: user.id,
      tenantId: user.tenantId,
    };
  }

  const isAllowed = Boolean(matrixEntry[role]);

  if (!isAllowed) {
    return {
      allowed: false,
      reason: `Operation '${operation}' is denied for role '${role}' under authorization policy`,
      operation,
      effectiveRole: role,
      userId: user.id,
      tenantId: user.tenantId,
    };
  }

  return {
    allowed: true,
    operation,
    effectiveRole: role,
    userId: user.id,
    tenantId: user.tenantId,
  };
}

/**
 * Express middleware decorator for protecting endpoints with Patch 2 Shared Authorization Foundation.
 */
export function requireAuthorization(
  operation: CanonicalOperation,
  extractTenantId?: (req: Request) => string | undefined
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user: AuthenticatedUser = (req as any).user || resolveRequestUser(req);
    const paramTenant = typeof req.params?.tenantId === 'string' ? req.params.tenantId : undefined;
    const queryTenant = typeof req.query?.tenantId === 'string' ? req.query.tenantId : undefined;
    const rawTenant = extractTenantId ? extractTenantId(req) : (paramTenant || queryTenant);
    const targetTenantId = typeof rawTenant === 'string' ? rawTenant : undefined;

    const auth = authorizeOperation(user, operation, targetTenantId);

    if (!auth.allowed) {
      return res.status(auth.effectiveRole === 'UNKNOWN' && !user?.isTokenVerified ? 401 : 403).json({
        ok: false,
        error: 'authorization_denied',
        message: auth.reason,
        operation: auth.operation,
        effectiveRole: auth.effectiveRole,
      });
    }

    (req as any).auth = auth;
    next();
  };
}

export const authorizationService = {
  authorizeOperation,
  resolveEffectiveRole,
  requireAuthorization,
  PERMISSION_MATRIX,
};

export default authorizationService;
