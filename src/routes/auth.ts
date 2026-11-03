import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { postgresIdentityService, type IdentityRole } from '../services/postgresIdentityService.ts';
import { entitlementEngine } from '../services/entitlementEngine.ts';
import { usageMeteringService } from '../services/usageMetering.ts';

export type PermissionAction = 'org:manage' | 'workspace:write' | 'workspace:read';
const router = Router();
const SESSION_COOKIE = 'zyntheor_session';
const CSRF_COOKIE = 'zyntheor_csrf';
function cookiePrefix() { return `${process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true' ? 'Secure; ' : ''}SameSite=Strict; Path=/;`; }
const authAttempts = new Map<string, { count: number; resetAt: number }>();

function authRateLimit(max: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.socket.remoteAddress || 'unknown'; const key = `${req.path}:${ip}`; const now = Date.now();
    if (authAttempts.size > 10_000) for (const [k, v] of authAttempts) if (v.resetAt <= now) authAttempts.delete(k);
    const current = authAttempts.get(key);
    if (!current || current.resetAt <= now) authAttempts.set(key, { count: 1, resetAt: now + windowMs });
    else if (++current.count > max) { res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000))); return res.status(429).json({ ok: false, error: 'rate_limited' }); }
    return next();
  };
}
function validEmail(value: unknown): value is string { return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
function cookieValue(req: Request, key: string): string | undefined {
  const raw = req.headers.cookie; if (!raw) return undefined;
  for (const pair of raw.split(';')) {
    const i = pair.indexOf('=');
    if (i >= 0 && pair.slice(0, i).trim() === key) { try { return decodeURIComponent(pair.slice(i + 1).trim()); } catch { return undefined; } }
  }
  return undefined;
}
function requestToken(req: Request): string | undefined { return cookieValue(req, SESSION_COOKIE) || (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1]?.trim(); }
function isSafeOrigin(req: Request): boolean {
  const origin = req.get('origin'); if (!origin) return true;
  try { return new URL(origin).host === req.get('host'); } catch { return false; }
}
function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (!isSafeOrigin(req)) return res.status(403).json({ ok: false, error: 'csrf_origin_rejected' });
  const cookie = cookieValue(req, CSRF_COOKIE); const header = req.get('x-csrf-token');
  if (!cookie || !header) return res.status(403).json({ ok: false, error: 'csrf_token_required' });
  const a = Buffer.from(cookie); const b = Buffer.from(header);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return res.status(403).json({ ok: false, error: 'csrf_token_invalid' });
  return next();
}
function setSession(res: Response, result: { session: { expiresAt: string }; accessToken: string }) {
  const maxAge = Math.floor(Math.max(0, new Date(result.session.expiresAt).getTime() - Date.now()) / 1000);
  res.append('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(result.accessToken)}; ${cookiePrefix()} HttpOnly; Max-Age=${maxAge}`);
}
function clearSession(res: Response) { res.append('Set-Cookie', `${SESSION_COOKIE}=; ${cookiePrefix()} HttpOnly; Max-Age=0`); }
function dbFailure(res: Response) { return res.status(503).json({ ok: false, error: 'identity_database_unavailable', message: 'Identity service is unavailable; no local fallback was used.' }); }
async function resolveUserSession(req: Request) {
  const token = requestToken(req); if (!token) return { authenticated: false as const, reason: 'Missing session' };
  const result = await postgresIdentityService.validateSession(token);
  return { authenticated: result.valid, session: result.session, user: result.user, reason: result.reason, token };
}
function publicAuthResult(res: Response, result: { session: { expiresAt: string; tenantId: string; role: IdentityRole }; accessToken: string; user: unknown }) {
  setSession(res, result);
  return res.json({ ok: true, user: result.user, tenantId: result.session.tenantId, role: result.session.role, expiresAt: result.session.expiresAt });
}

router.get('/api/auth/csrf', (_req: Request, res: Response) => {
  const csrfToken = randomBytes(32).toString('hex');
  res.append('Set-Cookie', `${CSRF_COOKIE}=${csrfToken}; ${cookiePrefix()}`);
  return res.json({ ok: true, csrfToken });
});
router.post('/api/auth/register', authRateLimit(5, 900_000), csrfGuard, async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body || {};
    if (!validEmail(email) || typeof password !== 'string' || password.length < 8 || password.length > 128) return res.status(400).json({ ok: false, error: 'invalid_credentials' });
    if (name !== undefined && (typeof name !== 'string' || name.trim().length > 80)) return res.status(400).json({ ok: false, error: 'invalid_name' });
    const result = await postgresIdentityService.registerUser({ email, password, name: name || email, ipAddress: req.socket.remoteAddress, userAgent: req.get('user-agent') });
    setSession(res, result);
    return res.status(201).json({ ok: true, user: result.user, tenantId: result.session.tenantId, role: result.session.role, expiresAt: result.session.expiresAt });
  } catch (error: any) {
    if (error?.message === 'EMAIL_ALREADY_EXISTS') return res.status(409).json({ ok: false, error: 'email_already_registered' });
    if (['INVALID_CREDENTIALS', 'RESERVED_EMAIL'].includes(error?.message)) return res.status(400).json({ ok: false, error: 'registration_failed' });
    return dbFailure(res);
  }
});
router.post('/api/auth/login', authRateLimit(10, 900_000), csrfGuard, async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!validEmail(email) || typeof password !== 'string' || !password || password.length > 128) return res.status(400).json({ ok: false, error: 'invalid_credentials' });
  try {
    const result = await postgresIdentityService.loginUser(email, password, req.socket.remoteAddress, req.get('user-agent'));
    return publicAuthResult(res, result);
  } catch (error: any) {
    if (error?.message === 'INVALID_CREDENTIALS') return res.status(401).json({ ok: false, error: 'authentication_failed', message: 'Email or password is incorrect.' });
    return dbFailure(res);
  }
});
router.post('/api/auth/logout', csrfGuard, async (req: Request, res: Response) => {
  try {
    const info = await resolveUserSession(req);
    if (info.authenticated && info.session && info.token) await postgresIdentityService.revokeSession(info.session.id, info.token);
    clearSession(res); return res.json({ ok: true, message: 'Logged out successfully' });
  } catch { return dbFailure(res); }
});
router.get('/api/auth/me', async (req: Request, res: Response) => {
  try {
    const info = await resolveUserSession(req);
    if (!info.authenticated || !info.session || !info.user) return res.status(401).json({ ok: false, error: 'unauthorized', message: info.reason });
    const org = await postgresIdentityService.getOrganization(info.session.tenantId);
    if (!org || !await postgresIdentityService.isTenantMember(info.session.userId, info.session.tenantId)) return res.status(403).json({ ok: false, error: 'tenant_access_denied' });
    const plan = entitlementEngine.getPlan(org.planId); const usage = usageMeteringService.getTenantUsageSummary(info.session.tenantId);
    return res.json({ ok: true, user: info.user, tenant: { id: org.id, name: org.name, role: info.session.role, planId: plan.id, planName: plan.name }, usage });
  } catch { return dbFailure(res); }
});
router.get('/api/auth/entitlements', async (req: Request, res: Response) => {
  try {
    const info = await resolveUserSession(req);
    if (!info.authenticated || !info.session) return res.status(401).json({ ok: false, error: 'unauthorized' });
    const tenantId = info.session.tenantId;
    if (req.query.tenantId !== undefined && req.query.tenantId !== tenantId) return res.status(403).json({ ok: false, error: 'tenant_access_denied' });
    if (!await postgresIdentityService.isTenantMember(info.session.userId, tenantId)) return res.status(403).json({ ok: false, error: 'tenant_access_denied' });
    const org = await postgresIdentityService.getOrganization(tenantId); if (!org) return res.status(403).json({ ok: false, error: 'tenant_access_denied' });
    const plan = entitlementEngine.getPlan(org.planId); const usage = usageMeteringService.getMonthlyUsage(tenantId, 'ai_requests');
    const check = entitlementEngine.checkEntitlement(plan.id, 'ai.requests', usage);
    return res.json({ ok: true, tenantId, plan, usage: { monthlyAiRequests: usage, limit: plan.monthlyAiRequests }, entitlements: { canMakeAiRequests: check.entitled, toolsCodeAnalysis: plan.toolsCodeAnalysisEnabled, toolsSandbox: plan.toolsSandboxEnabled, allowedModels: plan.allowedModels, maxWorkspaces: plan.maxWorkspaces, maxMembers: plan.maxMembers, storageMb: plan.storageMb } });
  } catch { return dbFailure(res); }
});
router.get('/api/auth/members', async (req: Request, res: Response) => {
  try {
    const info = await resolveUserSession(req);
    if (!info.authenticated || !info.session) return res.status(401).json({ ok: false, error: 'unauthorized' });
    if (!await postgresIdentityService.isTenantMember(info.session.userId, info.session.tenantId)) return res.status(403).json({ ok: false, error: 'tenant_access_denied' });
    const members = await postgresIdentityService.getOrganizationMembers(info.session.tenantId);
    return res.json({ ok: true, tenantId: info.session.tenantId, count: members.length, members });
  } catch { return dbFailure(res); }
});
router.patch('/api/auth/members/:userId/role', csrfGuard, async (req: Request, res: Response) => {
  try {
    const info = await resolveUserSession(req);
    if (!info.authenticated || !info.session) return res.status(401).json({ ok: false, error: 'unauthorized' });
    const tenantId = info.session.tenantId;
    if (!await postgresIdentityService.isTenantMember(info.session.userId, tenantId)) return res.status(403).json({ ok: false, error: 'tenant_access_denied' });
    const members = await postgresIdentityService.getOrganizationMembers(tenantId);
    const caller = members.find(m => m.userId === info.session!.userId);
    if (!caller || !['OWNER', 'ADMIN'].includes(caller.role)) return res.status(403).json({ ok: false, error: 'forbidden' });
    const targetUserId = Number(req.params.userId); const role = req.body?.role as IdentityRole;
    if (!Number.isSafeInteger(targetUserId) || !['ADMIN', 'DEVELOPER', 'MEMBER', 'VIEWER'].includes(role)) return res.status(400).json({ ok: false, error: 'invalid_role' });
    const updated = await postgresIdentityService.updateMemberRole(tenantId, targetUserId, role);
    return updated ? res.json({ ok: true }) : res.status(404).json({ ok: false, error: 'member_not_found' });
  } catch (error: any) {
    if (error?.message === 'OWNERSHIP_TRANSFER_REQUIRED') return res.status(409).json({ ok: false, error: 'ownership_transfer_required' });
    return dbFailure(res);
  }
});
router.post('/api/auth/members/invite', csrfGuard, async (req: Request, res: Response) => {
  try {
    const info = await resolveUserSession(req);
    if (!info.authenticated || !info.session) return res.status(401).json({ ok: false, error: 'unauthorized' });
    const tenantId = info.session.tenantId;
    if (!await postgresIdentityService.isTenantMember(info.session.userId, tenantId)) return res.status(403).json({ ok: false, error: 'tenant_access_denied' });
    const members = await postgresIdentityService.getOrganizationMembers(tenantId);
    const caller = members.find(m => m.userId === info.session!.userId);
    if (!caller || !['OWNER', 'ADMIN'].includes(caller.role)) return res.status(403).json({ ok: false, error: 'forbidden' });
    const { email, role } = req.body || {};
    if (!validEmail(email)) return res.status(400).json({ ok: false, error: 'invalid_email', message: 'รูปแบบอีเมลไม่ถูกต้อง' });
    const normalizedRole = String(role || '').toUpperCase() as IdentityRole;
    if (!['ADMIN', 'DEVELOPER', 'MEMBER', 'VIEWER'].includes(normalizedRole)) return res.status(400).json({ ok: false, error: 'invalid_role', message: 'บทบาทไม่ถูกต้อง' });
    const existing = members.find(m => m.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) return res.status(409).json({ ok: false, error: 'already_member', message: 'ผู้ใช้นี้เป็นสมาชิกใน Workspace อยู่แล้ว' });
    const member = await postgresIdentityService.inviteMember(tenantId, info.session.userId, email.trim().toLowerCase(), normalizedRole);
    return res.status(201).json({ ok: true, message: `เชิญ ${email.trim()} เข้าร่วม Workspace เรียบร้อยแล้ว`, member });
  } catch (error: any) {
    if (error?.message === 'ALREADY_MEMBER') return res.status(409).json({ ok: false, error: 'already_member', message: 'ผู้ใช้นี้เป็นสมาชิกใน Workspace อยู่แล้ว' });
    if (error?.message === 'INVALID_ROLE') return res.status(400).json({ ok: false, error: 'invalid_role', message: 'บทบาทไม่ถูกต้อง' });
    return dbFailure(res);
  }
});
router.post('/api/auth/ownership-transfer', csrfGuard, async (req: Request, res: Response) => {
  try {
    const info = await resolveUserSession(req);
    if (!info.authenticated || !info.session) return res.status(401).json({ ok: false, error: 'unauthorized' });
    await postgresIdentityService.transferOwnership({ tenantId: info.session.tenantId, currentOwnerId: info.session.userId, targetUserId: Number(req.body?.targetUserId), reason: String(req.body?.reason ?? '') });
    return res.json({ ok: true, message: 'Ownership transferred and audited.' });
  } catch (error: any) {
    if (['OWNER_AUTHORIZATION_REQUIRED', 'TARGET_NOT_MEMBER', 'INVALID_TRANSFER', 'OWNER_MEMBERSHIP_INCONSISTENT'].includes(error?.message)) return res.status(403).json({ ok: false, error: error.message.toLowerCase() });
    return dbFailure(res);
  }
});
router.post('/api/auth/oauth/register-or-login', (_req: Request, res: Response) => res.status(503).json({ ok: false, error: 'oauth_provider_verification_unavailable' }));

export { resolveUserSession, csrfGuard };
export default router;
