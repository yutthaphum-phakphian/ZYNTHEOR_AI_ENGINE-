// @ts-nocheck
/**
 * RBAC SERVICE - FINAL WITH hasPermission
 * Fixes: hasPermission is not a function in p5/p6-p7
 */

export type UserRole = 'viewer' | 'engineer' | 'admin';
export type OrgRole = 'owner' | 'member' | 'viewer';
export type PermissionAction =
  | 'read' | 'write' | 'deploy' | 'manage' | 'billing' | 'delete' | 'create'
  | 'workspace:read' | 'workspace:write' | 'workspace:create' | 'workspace:delete'
  | 'org:manage' | 'org:invite' | 'ai:inference' | 'tool:execute' | 'account:manage'
  | 'project:read' | 'project:write' | 'project:delete' | 'file:read' | 'file:write'
  | 'model:configure' | 'settings:manage' | 'audit:read';

const ROLE_ORDER: UserRole[] = ['viewer', 'engineer', 'admin'];
const ORG_ROLE_ORDER: OrgRole[] = ['viewer', 'member', 'owner'];

export const ROLE_RANK: Record<UserRole, number> = { viewer: 0, engineer: 1, admin: 2 };
export const ORG_ROLE_RANK: Record<OrgRole, number> = { viewer: 0, member: 1, owner: 2 };

export interface Session {
  userId: string;
  role: UserRole;
  orgRole?: OrgRole;
  workspaceId: string;
  orgId?: string;
  expiresAt: number;
}

export interface RequestWithSession {
  session?: Session;
  headers: Record<string, string>;
  body?: any;
  params?: any;
  query?: any;
}

export class RBACError extends Error {
  code: string; status: number;
  constructor(code: string, status: number, message: string) {
    super(message); this.name='RBACError'; this.code=code; this.status=status;
  }
}

function verifySession(req: RequestWithSession): Session {
  const s = req.session;
  if (!s) throw new RBACError('NO_SESSION',401,'No session');
  if (!s.userId || !s.role || !s.workspaceId) throw new RBACError('INVALID_SESSION',401,'Invalid session');
  if (s.expiresAt && Date.now() > s.expiresAt) throw new RBACError('SESSION_EXPIRED',401,'Expired');
  return s;
}

export function validateWorkspaceOwnership(session: Session, targetWorkspaceId: string) {
  if (!targetWorkspaceId) throw new RBACError('WORKSPACE_ACCESS_DENIED',403,'Workspace missing');
  if (session.role !== 'admin' && session.workspaceId !== targetWorkspaceId) throw new RBACError('WORKSPACE_ACCESS_DENIED',403,'Cannot access workspace');
}

// Permission matrix
const PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  viewer: ['read'],
  engineer: ['read','write','deploy','create'],
  admin: ['read','write','deploy','manage','billing','delete','create'],
};

const ORG_PERMISSIONS: Record<OrgRole, PermissionAction[]> = {
  viewer: ['read'],
  member: ['read','write','create'],
  owner: ['read','write','deploy','manage','billing','delete','create'],
};

const ROLE_ALIASES: Record<string, UserRole | OrgRole> = {
  OWNER: 'owner',
  ADMIN: 'admin',
  DEVELOPER: 'engineer',
  MEMBER: 'member',
  VIEWER: 'viewer',
};

const NAMESPACED_PERMISSIONS: Record<UserRole | OrgRole, PermissionAction[]> = {
  owner: ['workspace:read', 'workspace:write', 'workspace:create', 'workspace:delete', 'org:manage', 'org:invite', 'account:manage', 'ai:inference', 'tool:execute', 'project:read', 'project:write', 'project:delete', 'file:read', 'file:write', 'model:configure', 'settings:manage', 'audit:read'],
  admin: ['workspace:read', 'workspace:write', 'workspace:create', 'workspace:delete', 'org:manage', 'org:invite', 'ai:inference', 'tool:execute', 'project:read', 'project:write', 'project:delete', 'file:read', 'file:write', 'model:configure', 'settings:manage', 'audit:read'],
  engineer: ['workspace:read', 'workspace:write', 'workspace:create', 'ai:inference', 'tool:execute', 'project:read', 'project:write', 'file:read', 'file:write', 'model:configure', 'audit:read'],
  member: ['workspace:read', 'workspace:write', 'workspace:create', 'ai:inference', 'project:read', 'project:write', 'file:read', 'file:write', 'audit:read'],
  viewer: ['workspace:read', 'project:read', 'file:read', 'audit:read'],
};

type PermissionPrincipal = UserRole | OrgRole | 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'MEMBER' | 'VIEWER' | Pick<Session, 'role' | 'orgRole'>;

export function hasPermission(principal: PermissionPrincipal, action: PermissionAction = 'read', _resource?: string): boolean {
  const requestedRole = typeof principal === 'string'
    ? principal
    : principal.role || principal.orgRole || 'viewer';
  const role = ROLE_ALIASES[requestedRole] || requestedRole;
  if (!(role in NAMESPACED_PERMISSIONS)) return false;

  if (NAMESPACED_PERMISSIONS[role as UserRole | OrgRole].includes(action)) return true;
  if ((role as UserRole) in PERMISSIONS) {
    return PERMISSIONS[role as UserRole].includes(action);
  }
  if ((role as OrgRole) in ORG_PERMISSIONS) {
    return ORG_PERMISSIONS[role as OrgRole].includes(action);
  }
  return false;
}

export function checkPermission(principal: PermissionPrincipal, action: PermissionAction = 'read', resource?: string): boolean {
  return hasPermission(principal, action, resource);
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: RequestWithSession, res: any, next: () => void) => {
    try {
      const session = verifySession(req);
      if (!allowedRoles.includes(session.role)) throw new RBACError('WORKSPACE_ACCESS_DENIED',403,'Role not allowed');
      next();
    } catch (e:any) {
      if (e instanceof RBACError) return res.status(e.status).json({ error: e.code });
      return res.status(500).json({ error: 'INTERNAL' });
    }
  };
}

export function requireMinimumRole(minRole: UserRole) {
  return (req: RequestWithSession, res: any, next: () => void) => {
    try {
      const session = verifySession(req);
      const userRank = ROLE_ORDER.indexOf(session.role);
      const minRank = ROLE_ORDER.indexOf(minRole);
      if (userRank < minRank) throw new RBACError('WORKSPACE_ACCESS_DENIED',403,'Min role required');
      next();
    } catch (e:any) {
      if (e instanceof RBACError) return res.status(e.status).json({ error: e.code });
      return res.status(500).json({ error: 'INTERNAL' });
    }
  };
}

export function requireOrgRole(...allowedOrgRoles: OrgRole[]) {
  return (req: RequestWithSession, res: any, next: () => void) => {
    try {
      const session = verifySession(req);
      const orgRole = session.orgRole || 'viewer';
      if (!allowedOrgRoles.includes(orgRole)) throw new RBACError('WORKSPACE_ACCESS_DENIED',403,'Org role not allowed');
      next();
    } catch (e:any) {
      if (e instanceof RBACError) return res.status(e.status).json({ error: e.code });
      return res.status(500).json({ error: 'INTERNAL' });
    }
  };
}

export const requireAdmin = requireRole('admin');
export const requireEngineerOrAdmin = requireMinimumRole('engineer');

export function _createTestSession(overrides: Partial<Session> = {}): Session {
  return { userId: 'test-user', role: 'viewer', orgRole: 'member', workspaceId: 'test-workspace', orgId: 'test-org', expiresAt: Date.now()+3600000, ...overrides };
}

export const rbacService = {
  requireRole, requireMinimumRole, requireOrgRole,
  requireAdmin, requireEngineerOrAdmin,
  validateWorkspaceOwnership,
  hasPermission, checkPermission,
  ROLE_RANK, ORG_ROLE_RANK, ROLE_ORDER, ORG_ROLE_ORDER,
  PERMISSIONS, ORG_PERMISSIONS,
};

export default rbacService;
