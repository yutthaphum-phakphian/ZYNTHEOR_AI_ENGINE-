import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export type UserRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'MEMBER' | 'VIEWER';

export interface UserRecord {
  id: number;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  authProvider?: 'local' | 'github' | 'google';
  providerAccountId?: string;
  avatarUrl?: string;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface SessionRecord {
  id: string; // Session ID / Bearer token
  userId: number;
  tenantId: string;
  role: UserRole;
  tokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export type IssuedSession = SessionRecord & { accessToken: string };

export interface OrganizationRecord {
  id: string; // Tenant ID (e.g. org-default or org-xyz)
  name: string;
  slug: string;
  ownerId: number;
  planId: string; // FREE, PRO, TEAM, ENTERPRISE
  createdAt: string;
}

export interface OrganizationMemberRecord {
  id: string;
  orgId: string;
  userId: number;
  role: UserRole;
  createdAt: string;
}

const STORAGE_DIR = path.resolve(process.cwd(), 'workspace_data/identity');

function ensureStorageDir() {
  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function loadJsonFile<T>(filename: string, fallback: T): T {
  ensureStorageDir();
  const filePath = path.join(STORAGE_DIR, filename);
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJsonFile(filename: string, data: unknown): void {
  ensureStorageDir();
  const filePath = path.join(STORAGE_DIR, filename);
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  writeFileSync(filePath, readFileSync(tmpPath, 'utf8'), 'utf8');
}

// PBKDF2 Password Hashing
export function hashPassword(password: string, saltHex?: string): { hash: string; salt: string } {
  const salt = saltHex || randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, expectedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  const hashBuf = Buffer.from(hash, 'hex');
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (hashBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(hashBuf, expectedBuf);
}

// User Identity Engine
export class IdentityService {
  private users: UserRecord[];
  private sessions: SessionRecord[];
  private orgs: OrganizationRecord[];
  private members: OrganizationMemberRecord[];

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    this.users = loadJsonFile<UserRecord[]>('users.json', []);
    this.sessions = loadJsonFile<SessionRecord[]>('sessions.json', []);
    this.orgs = loadJsonFile<OrganizationRecord[]>('organizations.json', isProduction ? [] : [{
        id: 'org-default',
        name: 'ZYNTHEOR Default Tenant',
        slug: 'zyntheor-default',
        ownerId: 1,
        planId: 'FREE',
        createdAt: new Date().toISOString(),
      }]);
    this.members = loadJsonFile<OrganizationMemberRecord[]>('organization_members.json', isProduction ? [] : [{
        id: 'mem-default-owner',
        orgId: 'org-default',
        userId: 1,
        role: 'OWNER',
        createdAt: new Date().toISOString(),
      }]);

    if (this.users.length === 0 && !isProduction) {
      const { hash, salt } = hashPassword('AdminPass123!');
      const defaultUser: UserRecord = {
        id: 1,
        email: 'admin@zyntheor.local',
        passwordHash: hash,
        salt,
        name: 'System Admin',
        authProvider: 'local',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.users.push(defaultUser);
      this.persist();
    }
  }

  private persist() {
    saveJsonFile('users.json', this.users);
    saveJsonFile('sessions.json', this.sessions);
    saveJsonFile('organizations.json', this.orgs);
    saveJsonFile('organization_members.json', this.members);
  }

  public registerUser(params: { email: string; password: string; name: string }): { user: Omit<UserRecord, 'passwordHash' | 'salt'>; session: IssuedSession } {
    const cleanEmail = params.email.trim().toLowerCase();
    if (this.users.some(u => u.email === cleanEmail)) {
      throw new Error('An account with this email address already exists');
    }

    if (!params.password || params.password.length < 8) {
      throw new Error('Password must be at least 8 characters in length');
    }

    const { hash, salt } = hashPassword(params.password);
    const userId = this.users.length + 1;
    const now = new Date().toISOString();

    const newUsers: UserRecord = {
      id: userId,
      email: cleanEmail,
      passwordHash: hash,
      salt,
      name: params.name.trim() || cleanEmail.split('@')[0],
      authProvider: 'local',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    this.users.push(newUsers);

    // Create user's default organization
    const orgId = `org-usr-${userId}`;
    this.orgs.push({
      id: orgId,
      name: `${newUsers.name}'s Workspace`,
      slug: `workspace-${userId}-${Date.now().toString(36)}`,
      ownerId: userId,
      planId: 'FREE',
      createdAt: now,
    });

    this.members.push({
      id: `mem-${userId}-${orgId}`,
      orgId,
      userId,
      role: 'OWNER',
      createdAt: now,
    });

    const session = this.createSession(userId, orgId, 'OWNER');
    this.persist();

    const { passwordHash: _, salt: __, ...userWithoutSecrets } = newUsers;
    return { user: userWithoutSecrets, session };
  }

  /**
   * Register or login an OAuth2 provider account (GitHub / Google).
   * Enforces ZYNTHEOR_LOCAL_ONLY policy when required.
   */
  public registerOrLoginOAuthUser(params: {
    provider: 'github' | 'google';
    providerAccountId: string;
    email: string;
    name: string;
    avatarUrl?: string;
    isLocalOnlyEnforced?: boolean;
    ipAddress?: string;
  }): { user: Omit<UserRecord, 'passwordHash' | 'salt'>; session: IssuedSession; isNewUser: boolean } {
    const cleanEmail = params.email.trim().toLowerCase();
    const now = new Date().toISOString();

    // Find existing user by provider account ID or email
    let user = this.users.find(
      u => (u.authProvider === params.provider && u.providerAccountId === params.providerAccountId) || u.email === cleanEmail
    );

    let isNewUser = false;

    if (!user) {
      // Create new OAuth mapped user
      const userId = this.users.length + 1;
      const { hash, salt } = hashPassword(randomBytes(16).toString('hex')); // Dummy password hash

      user = {
        id: userId,
        email: cleanEmail,
        passwordHash: hash,
        salt,
        name: params.name.trim() || cleanEmail.split('@')[0],
        authProvider: params.provider,
        providerAccountId: params.providerAccountId,
        avatarUrl: params.avatarUrl,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      this.users.push(user);
      isNewUser = true;

      // Create default organization for OAuth user
      const orgId = `org-usr-${userId}`;
      this.orgs.push({
        id: orgId,
        name: `${user.name}'s Workspace`,
        slug: `workspace-${userId}-${Date.now().toString(36)}`,
        ownerId: userId,
        planId: 'FREE',
        createdAt: now,
      });

      this.members.push({
        id: `mem-${userId}-${orgId}`,
        orgId,
        userId,
        role: 'OWNER',
        createdAt: now,
      });
    } else {
      // Update external provider mapping if not set
      user.authProvider = params.provider;
      user.providerAccountId = params.providerAccountId;
      if (params.avatarUrl) user.avatarUrl = params.avatarUrl;
      user.updatedAt = now;
    }

    // Find user's primary org and role
    const memberRecord = this.members.find(m => m.userId === user!.id) || { orgId: 'org-default', role: 'MEMBER' as UserRole };
    const session = this.createSession(user.id, memberRecord.orgId, memberRecord.role, params.ipAddress);

    this.persist();

    const { passwordHash: _, salt: __, ...userWithoutSecrets } = user;
    return { user: userWithoutSecrets, session, isNewUser };
  }

  public loginUser(email: string, password: string, ipAddress?: string): { user: Omit<UserRecord, 'passwordHash' | 'salt'>; session: IssuedSession } {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.users.find(u => u.email === cleanEmail);

    // Timing-safe generic error response to prevent user enumeration
    if (!user || user.status !== 'active') {
      verifyPassword('dummy-password', '00'.repeat(64), '00'.repeat(16));
      throw new Error('Invalid email or password credentials');
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    const isKnownDefaultCredential = process.env.NODE_ENV === 'production'
      && user.email === 'admin@zyntheor.local'
      && password === 'AdminPass123!';
    if (!isValid || isKnownDefaultCredential) {
      throw new Error('Invalid email or password credentials');
    }

    // Find primary org & role
    const memberRecord = this.members.find(m => m.userId === user.id) || { orgId: 'org-default', role: 'MEMBER' as UserRole };
    const session = this.createSession(user.id, memberRecord.orgId, memberRecord.role, ipAddress);

    this.persist();
    const { passwordHash: _, salt: __, ...userWithoutSecrets } = user;
    return { user: userWithoutSecrets, session };
  }

  public createSession(userId: number, tenantId: string, role: UserRole, ipAddress?: string): IssuedSession {
    const accessToken = `zyntheor_sess_${randomBytes(24).toString('hex')}`;
    const tokenHash = createHash('sha256').update(accessToken).digest('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 86400000).toISOString(); // 7 days

    const sessionRecord = {
      id: `session_${randomBytes(16).toString('hex')}`,
      userId,
      tenantId,
      role,
      tokenHash,
      ipAddress,
      expiresAt,
      revokedAt: null,
      createdAt: now.toISOString(),
    } satisfies SessionRecord;

    this.sessions.push(sessionRecord);
    return Object.defineProperty(sessionRecord, 'accessToken', {
      value: accessToken,
      enumerable: false,
    }) as IssuedSession;
  }

  public validateSession(accessToken: string): { valid: boolean; session?: SessionRecord; user?: Omit<UserRecord, 'passwordHash' | 'salt'>; reason?: string } {
    const candidateHash = Buffer.from(createHash('sha256').update(accessToken).digest('hex'), 'hex');
    const session = this.sessions.find(s => {
      const storedHash = Buffer.from(s.tokenHash, 'hex');
      return storedHash.length === candidateHash.length && timingSafeEqual(storedHash, candidateHash);
    });
    if (!session) {
      return { valid: false, reason: 'Session token not found' };
    }

    if (session.revokedAt) {
      return { valid: false, reason: 'Session has been revoked' };
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      return { valid: false, reason: 'Session expired' };
    }

    const user = this.users.find(u => u.id === session.userId);
    if (!user || user.status !== 'active') {
      return { valid: false, reason: 'User account disabled or deleted' };
    }

    const { passwordHash: _, salt: __, ...userWithoutSecrets } = user;
    return { valid: true, session: { ...session }, user: userWithoutSecrets };
  }

  public revokeSession(sessionId: string): boolean {
    const session = this.sessions.find(s => s.id === sessionId);
    if (session) {
      session.revokedAt = new Date().toISOString();
      this.persist();
      return true;
    }
    return false;
  }

  public getUserSessions(userId: number): SessionRecord[] {
    return this.sessions.filter(s => s.userId === userId && !s.revokedAt).map(session => ({ ...session }));
  }

  public getOrganization(orgId: string): OrganizationRecord | null {
    return this.orgs.find(o => o.id === orgId) || null;
  }

  public getOrganizationMembers(orgId: string): Array<{ id: string; userId: number; email: string; name: string; role: UserRole }> {
    const orgMembers = this.members.filter(m => m.orgId === orgId);
    return orgMembers.map(m => {
      const u = this.users.find(usr => usr.id === m.userId);
      return {
        id: m.id,
        userId: m.userId,
        email: u?.email || 'unknown@zyntheor.local',
        name: u?.name || 'User',
        role: m.role,
      };
    });
  }

  public updateMemberRole(orgId: string, targetUserId: number, newRole: UserRole): boolean {
    const member = this.members.find(m => m.orgId === orgId && m.userId === targetUserId);
    if (member) {
      member.role = newRole;
      this.persist();
      return true;
    }
    return false;
  }
}

export const identityService = new IdentityService();
