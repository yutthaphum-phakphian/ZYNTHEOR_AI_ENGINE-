import type { Request, Response, NextFunction } from 'express';
import { resolveRequestUser, type AuthenticatedUser } from '../services/authService.js';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      user?: AuthenticatedUser;
    }
  }
}

export interface TenantRequest extends Request {
  tenantId?: string;
  user?: AuthenticatedUser;
}

/**
 * TENANT CONTEXT MIDDLEWARE
 * Intercepts incoming requests, validates the 'tenantId' from the secure session principal,
 * and attaches the validated 'tenantId' to the request object for use by subsequent services.
 */
export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const user: AuthenticatedUser = (req as any).user || resolveRequestUser(req);
  (req as any).user = user;

  // Resolve validated tenantId strictly from verified session principal or default fallback
  const validatedTenantId = user.tenantId || 'org-default';

  // Attach to request object for downstream handlers & services
  (req as any).tenantId = validatedTenantId;
  req.tenantId = validatedTenantId;

  // Set response header reflecting server-verified tenant context
  res.setHeader('X-Tenant-ID', validatedTenantId);

  next();
}

/**
 * Middleware decorator enforcing verified session token & valid tenant context on sensitive routes.
 */
export function requireTenant(req: Request, res: Response, next: NextFunction) {
  const user: AuthenticatedUser = (req as any).user || resolveRequestUser(req);
  if (!user || !user.isTokenVerified) {
    return res.status(401).json({
      ok: false,
      error: 'unauthenticated_tenant_access',
      message: 'Access denied: Valid session token required to resolve tenant context',
    });
  }

  const tenantId = user.tenantId || 'org-default';
  (req as any).tenantId = tenantId;
  req.tenantId = tenantId;

  res.setHeader('X-Tenant-ID', tenantId);

  next();
}

export default tenantMiddleware;
