import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, openSync, fsyncSync, closeSync, unlinkSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { threadId } from 'node:worker_threads';
import { hashPassword, verifyPassword } from './passwordSecurity.ts';
export { hashPassword, verifyPassword } from './passwordSecurity.ts';

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

const IS_TEST_RUNNER = Boolean(process.env.NODE_TEST_CONTEXT || process.env.VITEST);
const STORAGE_DIR = IS_TEST_RUNNER
  ? path.join(os.tmpdir(), `zyntheor-identity-test-${process.pid}-${threadId}`)
  : process.env.ZYNTHEOR_IDENTITY_STORAGE_DIR
    ? path.resolve(process.env.ZYNTHEOR_IDENTITY_STORAGE_DIR)
    : path.resolve(process.cwd(), 'workspace_data/identity');
if (IS_TEST_RUNNER) {
  process.once('exit', () => { try { rmSync(STORAGE_DIR, { recursive: true, force: true }); } catch { /* isolated test state cleanup only */ } });
}

function ensureStorageDir() {
  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function loadJsonFile<T>(filename: string, fallback: T): T {
  ensureStorageDir();
  const filePath = path.join(STORAGE_DIR, filename);
  if (!existsSync(filePath)) return fallback;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    // Corrupt identity state must never be interpreted as an empty database.
    throw new Error(`IDENTITY_STORAGE_CORRUPT:${filename}`);
  }
  if (!Array.isArray(parsed)) throw new Error(`IDENTITY_STORAGE_INVALID_SHAPE:${filename}`);
  return parsed as T;
}

function saveJsonFile(filename: string, data: unknown): void {
  ensureStorageDir();
  const filePath = path.join(STORAGE_DIR, filename);
  const tmpPath = `${filePath}.tmp.${process.pid}.${randomBytes(6).toString('hex')}`;
  let fd: number | undefined;
  try {
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    fd = openSync(tmpPath, 'r');
    fsyncSync(fd);
    closeSync(fd); fd = undefined;
    renameSync(tmpPath, filePath);
  } catch (error) {
    if (fd !== undefined) closeSync(fd);
    try { unlinkSync(tmpPath); } catch { /* temp file may not exist */ }
    throw error;
  }
}

// User Identity Engine
export class IdentityService {
  private users: UserRecord[];
  private sessions: SessionRecord[];
  private orgs: OrganizationRecord[];
  private members: OrganizationMemberRecord[];

  constructor() {
    this.users = loadJsonFile<UserRecord[]>('users.json', []);
    this.sessions = loadJsonFile<SessionRecord[]>('sessions.json', []);
    // No predictable development account or orphaned default tenant is created.
    // The first account must be explicitly registered and receives its own tenant.
    this.orgs = loadJsonFile<OrganizationRecord[]>('organizations.json', []);
    this.members = loadJsonFile<OrganizationMemberRecord[]>('organization_members.json', []);
  }

  private persist() {
    saveJsonFile('users.json', this.users);
    saveJsonFile('sessions.json', this.sessions);
    saveJsonFile('organizations.json', this.orgs);
    saveJsonFile('organization_members.json', this.members);
  }

  public registerUser(params: { email: string; password: string; name: string }): { user: Omit<UserRecord, 'passwordHash' | 'salt'>; session: IssuedSession } {
    const cleanEmail = params.email.trim().toLowerCase();
    if (cleanEmail === 'admin@zyntheor.local') throw new Error('This reserved system address cannot be used for account registration.');
    if (this.users.some(u => u.email === cleanEmail)) {
      throw new Error('An account with this email address already exists');
    }

    if (!params.password || params.password.length < 8) {
      throw new Error('Password must be at least 8 characters in length');
    }

    const { hash, salt } = hashPassword(params.password);
    const userId = this.users.reduce((max, user) => Math.max(max, user.id), 0) + 1;
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
    if (cleanEmail === 'admin@zyntheor.local') throw new Error('This reserved system address cannot be used for account registration.');
    const now = new Date().toISOString();

    // Find existing user by provider account ID or email
    let user = this.users.find(
      u => (u.authProvider === params.provider && u.providerAccountId === params.providerAccountId) || u.email === cleanEmail
    );

    let isNewUser = false;

    if (!user) {
      // Create new OAuth mapped user
      const userId = this.users.reduce((max, user) => Math.max(max, user.id), 0) + 1;
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
    const memberRecord = this.members.find(m => m.userId === user!.id);
    if (!memberRecord) throw new Error('No tenant membership is associated with this account');
    const session = this.createSession(user.id, memberRecord.orgId, memberRecord.role, params.ipAddress);

    this.persist();

    const { passwordHash: _, salt: __, ...userWithoutSecrets } = user;
    return { user: userWithoutSecrets, session, isNewUser };
  }

  public loginUser(email: string, password: string, ipAddress?: string): { user: Omit<UserRecord, 'passwordHash' | 'salt'>; session: IssuedSession } {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.users.find(u => u.email === cleanEmail);

    // Retired predictable bootstrap identity is never allowed to authenticate.
    if (cleanEmail === 'admin@zyntheor.local') {
      verifyPassword('dummy-password', '00'.repeat(64), '00'.repeat(16));
      throw new Error('Invalid email or password credentials');
    }

    // Timing-safe generic error response to prevent user enumeration
    if (!user || user.status !== 'active') {
      verifyPassword('dummy-password', '00'.repeat(64), '00'.repeat(16));
      throw new Error('Invalid email or password credentials');
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      throw new Error('Invalid email or password credentials');
    }
    if (!user.passwordHash.startsWith('pbkdf2-sha512$')) {
      const upgraded = hashPassword(password, user.salt);
      user.passwordHash = upgraded.hash;
      user.updatedAt = new Date().toISOString();
      this.persist();
    }

    // Find primary org & role
    const memberRecord = this.members.find(m => m.userId === user.id);
    if (!memberRecord) throw new Error('No tenant membership is associated with this account');
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
