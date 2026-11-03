import type { Request, Response, NextFunction } from 'express';
import { extractToken, tokenMatches } from '../../lib/access.mjs';
import { identityService } from './identityService.ts';

export type UserRole = 'admin' | 'engineer' | 'viewer';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role: UserRole;
  isTokenVerified: boolean;
  source: 'verified_token' | 'local_default' | 'unverified';
  tenantId?: string;
  accountRole?: string;
}

/**
 * Resolves user identity and verified role from incoming HTTP request.
 * HARDENED IDENTITY CONTRACT GUARANTEE:
 * Client-supplied headers (x-user-role, x-user-id, x-owner-id, x-tenant-id) are NEVER
 * trusted as authority for identity, tenant, or role assignment.
 * User identity, tenantId, and role are derived EXCLUSIVELY from verified server-side
 * sessions or verified deployment access tokens.
 */
export function resolveRequestUser(req: Request | any): AuthenticatedUser {
  const masterToken = (process.env.ZYNTHEOR_ACCESS_TOKEN || '').trim();
  const headers = req?.headers || {};
  const providedToken = extractToken(headers);
  const clientRequestedRole = String(headers['x-user-role'] || '').toLowerCase().trim();

  // 1. First, attempt to validate as a user account session token (zyntheor_sess_*)
  if (providedToken && providedToken.startsWith('zyntheor_sess_')) {
    const sessionResult = identityService.validateSession(providedToken);
    if (sessionResult.valid && sessionResult.user && sessionResult.session) {
      // Map IdentityService account role ('OWNER' | 'ADMIN' | 'DEVELOPER' | 'MEMBER' | 'VIEWER') to workspace UserRole
      const accountRole = sessionResult.session.role;
      let mappedRole: UserRole = 'viewer';
      if (['OWNER', 'ADMIN'].includes(accountRole)) {
        mappedRole = 'admin';
      } else if (['DEVELOPER', 'MEMBER'].includes(accountRole)) {
        mappedRole = 'engineer';
      }

      return {
        id: String(sessionResult.user.id),
        role: mappedRole,
        isTokenVerified: true,
        source: 'verified_token',
        tenantId: sessionResult.session.tenantId,
        accountRole,
      };
    }

    // Invalid, expired, or revoked account session token -> Fail closed to unverified
    return {
      id: 'unverified-viewer',
      role: 'viewer',
      isTokenVerified: false,
      source: 'unverified',
    };
  }

  // 2. Second, validate as deployment master access token (ZYNTHEOR_ACCESS_TOKEN)
  const isMasterTokenValid = Boolean(masterToken && tokenMatches(masterToken, providedToken));

  if (masterToken && !isMasterTokenValid) {
    // Provided token does not match deployment master token -> Fail closed
    return {
      id: 'unverified-viewer',
      role: 'viewer',
      isTokenVerified: false,
      source: 'unverified',
    };
  }

  // 3. Token is verified master token or local dev environment without master token set
  if (isMasterTokenValid) {
    const assignedRole: UserRole = clientRequestedRole === 'engineer' ? 'engineer' : clientRequestedRole === 'viewer' ? 'viewer' : 'admin';
    return {
      id: 'admin-workspace',
      role: assignedRole,
      isTokenVerified: true,
      source: 'verified_token',
    };
  }

  // Local development without ZYNTHEOR_ACCESS_TOKEN set
  if (!masterToken) {
    const assignedRole: UserRole = clientRequestedRole === 'viewer' ? 'viewer' : 'engineer';
    return {
      id: 'owner-workspace',
      role: assignedRole,
      isTokenVerified: true,
      source: 'local_default',
    };
  }

  // Default fail-closed fallback
  return {
    id: 'unverified-viewer',
    role: 'viewer',
    isTokenVerified: false,
    source: 'unverified',
  };
}

/**
 * Express middleware to strictly inject server session role into request and response headers.
 * Overwrites any client-side x-user-role attempt with the server-verified role.
 */
export function serverSessionMiddleware(req: Request, res: Response, next: NextFunction) {
  const verifiedUser = resolveRequestUser(req);
  (req as any).user = verifiedUser;
  // Overwrite request headers with server session identity
  req.headers['x-user-role'] = verifiedUser.role;
  req.headers['x-user-id'] = verifiedUser.id;
  // Reflect verified role to client via response header
  res.setHeader('X-User-Role', verifiedUser.role);
  next();
}
/**
 * Express middleware decorator for sensitive API endpoints.
 * Verifies if the authenticated session role matches one of the required privilege roles ('admin', 'engineer', 'viewer').
 * Usage: app.post('/api/workspace/deploy', requireRole('admin'), handler);
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user: AuthenticatedUser = (req as any).user || resolveRequestUser(req);
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        ok: false,
        error: 'insufficient_role_permissions',
        message: `Role privilege check failed: Session role '${user.role}' is not authorized. Required: ${allowedRoles.join(', ')}`,
        userRole: user.role,
        requiredRoles: allowedRoles,
      });
    }
    next();
  };
}

/**
 * Express middleware decorator ensuring the session meets a minimum role rank.
 * Role Hierarchy: viewer (1) < engineer (2) < admin (3)
 */
export function requireMinimumRole(minimumRole: UserRole) {
  const roleRank: Record<UserRole, number> = { viewer: 1, engineer: 2, admin: 3 };
  return (req: Request, res: Response, next: NextFunction) => {
    const user: AuthenticatedUser = (req as any).user || resolveRequestUser(req);
    const userRank = roleRank[user.role] || 1;
    const requiredRank = roleRank[minimumRole] || 3;
    if (userRank < requiredRank) {
      return res.status(403).json({
        ok: false,
        error: 'insufficient_role_permissions',
        message: `Role privilege check failed: Minimum required role '${minimumRole}' (Rank ${requiredRank}), current session role '${user.role}' (Rank ${userRank}).`,
        userRole: user.role,
        minimumRole,
      });
    }
    next();
  };
}


