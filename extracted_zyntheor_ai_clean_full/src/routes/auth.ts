import { Router, type Request, type Response } from 'express';
import { identityService, type UserRole } from '../services/identityService.ts';
import { requireRole as rbacService } from '../services/rbacService.ts';

export type PermissionAction = 'org:manage' | 'workspace:write' | 'workspace:read';
import { entitlementEngine } from '../services/entitlementEngine.ts';
import { usageMeteringService } from '../services/usageMetering.ts';
import { tenantIsolationService } from '../services/tenantIsolation.ts';

const router = Router();

// Lightweight process-local throttling. For multi-instance deployments, replace
// with a shared Redis/database limiter before public launch.
const authAttempts = new Map<string, { count: number; resetAt: number }>();
function authRateLimit(max: number, windowMs: number) {
  return (req: Request, res: Response, next: () => void) => {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ip = forwarded || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const current = authAttempts.get(key);
    if (!current || current.resetAt <= now) {
      authAttempts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).json({ ok: false, error: 'rate_limited', message: 'Too many authentication attempts. Please try again later.' });
    }
    return next();
  };
}

function validEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// Middleware to resolve session from Authorization Bearer token or ZYNTHEOR_ACCESS_TOKEN
export function resolveUserSession(req: Request): {
  authenticated: boolean;
  session?: any;
  user?: any;
  reason?: string;
} {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { authenticated: false, reason: 'Missing authorization token' };
  }

  const result = identityService.validateSession(token);
  return {
    authenticated: result.valid,
    session: result.session,
    user: result.user,
    reason: result.reason,
  };
}

function isSessionTenantMember(userId: number, tenantId: string): boolean {
  return Boolean(
    identityService.getOrganization(tenantId)
    && identityService.getOrganizationMembers(tenantId).some(member => member.userId === userId)
  );
}

// 1. POST /api/auth/register
router.post('/api/auth/register', authRateLimit(5, 15 * 60 * 1000), (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body || {};
    if (!validEmail(email) || typeof password !== 'string' || !password || password.length > 128) {
      return res.status(400).json({ ok: false, error: 'invalid_credentials', message: 'Enter a valid email and password.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ ok: false, error: 'weak_password', message: 'Password must be at least 8 characters.' });
    }
    if (name !== undefined && (typeof name !== 'string' || name.trim().length > 80)) {
      return res.status(400).json({ ok: false, error: 'invalid_name', message: 'Name must be 80 characters or fewer.' });
    }

    const result = identityService.registerUser({ email, password, name: name || email });
    return res.status(201).json({
      ok: true,
      user: result.user,
      token: result.session.accessToken,
      tenantId: result.session.tenantId,
      role: result.session.role,
      expiresAt: result.session.expiresAt,
    });
  } catch (err: any) {
    const duplicate = /already exists/i.test(String(err?.message || ''));
    return res.status(duplicate ? 409 : 400).json({ ok: false, error: duplicate ? 'email_already_registered' : 'registration_failed', message: duplicate ? 'An account with this email already exists.' : 'Registration could not be completed.' });
  }
});

// 2. POST /api/auth/login
router.post('/api/auth/login', authRateLimit(10, 15 * 60 * 1000), (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!validEmail(email) || typeof password !== 'string' || !password || password.length > 128) {
      return res.status(400).json({ ok: false, error: 'invalid_credentials', message: 'Enter a valid email and password.' });
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const result = identityService.loginUser(email, password, ipAddress);

    return res.json({
      ok: true,
      user: result.user,
      token: result.session.accessToken,
      tenantId: result.session.tenantId,
      role: result.session.role,
      expiresAt: result.session.expiresAt,
    });
  } catch (err: any) {
    return res.status(401).json({ ok: false, error: 'authentication_failed', message: 'Email or password is incorrect.' });
  }
});

// 3. POST /api/auth/logout
router.post('/api/auth/logout', (req: Request, res: Response) => {
  const sessionInfo = resolveUserSession(req);
  if (sessionInfo.authenticated && sessionInfo.session) {
    identityService.revokeSession(sessionInfo.session.id);
  }
  return res.json({ ok: true, message: 'Logged out successfully' });
});

// 4. GET /api/auth/me
router.get('/api/auth/me', (req: Request, res: Response) => {
  const sessionInfo = resolveUserSession(req);
  if (!sessionInfo.authenticated || !sessionInfo.session || !sessionInfo.user) {
    return res.status(401).json({ ok: false, error: 'unauthorized', message: sessionInfo.reason || 'Authentication required' });
  }

  const tenantId = sessionInfo.session.tenantId;
  if (!isSessionTenantMember(sessionInfo.session.userId, tenantId)) {
    return res.status(403).json({ ok: false, error: 'tenant_access_denied' });
  }

  const org = identityService.getOrganization(tenantId);
  if (!org) return res.status(403).json({ ok: false, error: 'tenant_access_denied' });
  const plan = entitlementEngine.getPlan(org.planId);
  const usage = usageMeteringService.getTenantUsageSummary(tenantId);

  return res.json({
    ok: true,
    user: sessionInfo.user,
    tenant: {
      id: sessionInfo.session.tenantId,
      name: org?.name || 'Default Tenant',
      role: sessionInfo.session.role,
      planId: plan.id,
      planName: plan.name,
    },
    usage,
  });
});

// 5. GET /api/auth/entitlements
router.get('/api/auth/entitlements', (req: Request, res: Response) => {
  const sessionInfo = resolveUserSession(req);
  if (!sessionInfo.authenticated || !sessionInfo.session || !sessionInfo.user) {
    return res.status(401).json({ ok: false, error: 'unauthorized', message: sessionInfo.reason || 'Authentication required' });
  }

  const tenantId = sessionInfo.session.tenantId;
  const requestedTenantId = req.query.tenantId;
  if (requestedTenantId !== undefined && requestedTenantId !== tenantId) {
    return res.status(403).json({ ok: false, error: 'tenant_access_denied' });
  }

  try {
    tenantIsolationService.verifyTenantMembership(sessionInfo.session.userId, tenantId);
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.startsWith('TENANT ACCESS DENIED:') || err.message.startsWith('TENANT ISOLATION VIOLATION:'))
    ) {
      return res.status(403).json({ ok: false, error: 'tenant_access_denied' });
    }
    throw err;
  }

  const org = identityService.getOrganization(tenantId);
  if (!org) {
    return res.status(403).json({ ok: false, error: 'tenant_access_denied' });
  }
  const plan = entitlementEngine.getPlan(org.planId);

  const usage = usageMeteringService.getMonthlyUsage(tenantId, 'ai_requests');
  const aiReqCheck = entitlementEngine.checkEntitlement(plan.id, 'ai.requests', usage);

  return res.json({
    ok: true,
    tenantId,
    plan,
    usage: {
      monthlyAiRequests: usage,
      limit: plan.monthlyAiRequests,
    },
    entitlements: {
      canMakeAiRequests: aiReqCheck.entitled,
      toolsCodeAnalysis: plan.toolsCodeAnalysisEnabled,
      toolsSandbox: plan.toolsSandboxEnabled,
      allowedModels: plan.allowedModels,
      maxWorkspaces: plan.maxWorkspaces,
      maxMembers: plan.maxMembers,
      storageMb: plan.storageMb,
    },
  });
});

// 6. GET /api/auth/members
router.get('/api/auth/members', (req: Request, res: Response) => {
  const sessionInfo = resolveUserSession(req);
  if (!sessionInfo.authenticated || !sessionInfo.session) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const tenantId = sessionInfo.session.tenantId;
  if (!isSessionTenantMember(sessionInfo.session.userId, tenantId)) {
    return res.status(403).json({ ok: false, error: 'tenant_access_denied' });
  }
  const members = identityService.getOrganizationMembers(tenantId);
  return res.json({ ok: true, tenantId, count: members.length, members });
});

// 7. PATCH /api/auth/members/:userId/role
router.patch('/api/auth/members/:userId/role', (req: Request, res: Response) => {
  const sessionInfo = resolveUserSession(req);
  if (!sessionInfo.authenticated || !sessionInfo.session) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  if (!isSessionTenantMember(sessionInfo.session.userId, sessionInfo.session.tenantId)) {
    return res.status(403).json({ ok: false, error: 'tenant_access_denied' });
  }

  const caller = identityService.getOrganizationMembers(sessionInfo.session.tenantId)
    .find(member => member.userId === sessionInfo.session.userId);
  if (!caller || !['OWNER', 'ADMIN'].includes(caller.role)) {
    return res.status(403).json({ ok: false, error: 'forbidden', message: 'Only admin role can modify member permissions.' });
  }

  const targetUserId = Number(req.params.userId);
  const newRole = req.body?.role as UserRole;

  if (!['OWNER', 'ADMIN', 'DEVELOPER', 'MEMBER', 'VIEWER'].includes(newRole)) {
    return res.status(400).json({ ok: false, error: 'invalid_role', message: 'Invalid role specification.' });
  }
  if (caller.role === 'ADMIN' && newRole === 'OWNER') {
    return res.status(403).json({ ok: false, error: 'forbidden', message: 'Only an owner can grant owner permissions.' });
  }

  const updated = identityService.updateMemberRole(sessionInfo.session.tenantId, targetUserId, newRole);
  if (updated) {
    return res.json({ ok: true, message: `Updated member ${targetUserId} role to ${newRole}` });
  } else {
    return res.status(404).json({ ok: false, error: 'member_not_found' });
  }
});

// 8. POST /api/auth/oauth/register-or-login
router.post('/api/auth/oauth/register-or-login', (_req: Request, res: Response) => {
  return res.status(503).json({ ok: false, error: 'oauth_provider_verification_unavailable' });
});

export default router;
