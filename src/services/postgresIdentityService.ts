// @ts-nocheck
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { getPool, withTransaction } from '../db/connection.ts';
import { normalizeActivityRows, type MemberActivityEvent } from './memberActivity.ts';
import { hashPassword, verifyPassword, needsPasswordUpgrade } from './passwordSecurity.ts';

export type IdentityRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'MEMBER' | 'VIEWER';
export type PublicUser = { id: number; email: string; name: string; authProvider: string; avatarUrl: string | null; status: string; createdAt: string; updatedAt: string };
export type Session = { id: string; userId: number; tenantId: string; role: IdentityRole; tokenHash: string; ipAddress: string | null; userAgent: string | null; expiresAt: string; revokedAt: string | null; createdAt: string };
export type AuthResult = { user: PublicUser; session: Session; accessToken: string };

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const VALID_ROLES = new Set<IdentityRole>(['OWNER', 'ADMIN', 'DEVELOPER', 'MEMBER', 'VIEWER']);
const DUMMY_PASSWORD = hashPassword('non-user-authentication-timing-placeholder');

function toPublicUser(row: any): PublicUser {
  return { id: Number(row.id), email: row.email, name: row.name, authProvider: row.auth_provider,
    avatarUrl: row.avatar_url ?? null, status: row.status, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() };
}
function tokenHash(token: string): string { return createHash('sha256').update(token).digest('hex'); }
function newToken(): string { return `zyntheor_sess_${randomBytes(32).toString('hex')}`; }
function safeToken(token: unknown): token is string { return typeof token === 'string' && /^zyntheor_sess_[a-f0-9]{64}$/.test(token); }
function sessionFrom(row: any, effectiveRole?: string): Session {
  return { id: row.id, userId: Number(row.user_id), tenantId: row.tenant_id, role: (effectiveRole ?? row.role) as IdentityRole,
    tokenHash: row.token_hash, ipAddress: row.ip_address ?? null, userAgent: row.user_agent ?? null,
    expiresAt: new Date(row.expires_at).toISOString(), revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString() };
}

async function createSession(client: PoolClient, userId: number, tenantId: string, role: IdentityRole, ipAddress?: string, userAgent?: string) {
  const accessToken = newToken();
  const id = `session_${randomBytes(16).toString('hex')}`;
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const result = await client.query(
    `INSERT INTO sessions(id,user_id,tenant_id,role,token_hash,ip_address,user_agent,expires_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [id, userId, tenantId, role, tokenHash(accessToken), ipAddress || null, userAgent || null, expiresAt],
  );
  return { session: sessionFrom(result.rows[0]), accessToken };
}

export class PostgresIdentityService {
  private async ready() { return getPool(); }

  async registerUser(params: { email: string; password: string; name: string; ipAddress?: string; userAgent?: string }): Promise<AuthResult> {
    const email = params.email.trim().toLowerCase();
    if (email === 'admin@zyntheor.local') throw new Error('RESERVED_EMAIL');
    if (!email || !params.password || params.password.length < 8 || params.password.length > 128) throw new Error('INVALID_CREDENTIALS');
    const { hash, salt } = hashPassword(params.password);
    const name = params.name.trim().slice(0, 80) || email.split('@')[0];
    return withTransaction(async client => {
      let inserted;
      try {
        inserted = await client.query(
          `INSERT INTO users(email,password_hash,salt,name,auth_provider,status) VALUES($1,$2,$3,$4,'local','active') RETURNING *`,
          [email, hash, salt, name],
        );
      } catch (error: any) {
        if (error?.code === '23505') throw new Error('EMAIL_ALREADY_EXISTS');
        throw error;
      }
      const user = inserted.rows[0];
      const tenantId = `org-${randomUUID()}`;
      const slug = `workspace-${randomBytes(16).toString('hex')}`;
      await client.query(`INSERT INTO organizations(id,name,slug,owner_id,plan_id) VALUES($1,$2,$3,$4,'FREE')`, [tenantId, `${name}'s Workspace`, slug, user.id]);
      await client.query(`INSERT INTO organization_members(org_id,user_id,role) VALUES($1,$2,'OWNER')`, [tenantId, user.id]);
      const { session, accessToken } = await createSession(client, Number(user.id), tenantId, 'OWNER', params.ipAddress, params.userAgent);
      return { user: toPublicUser(user), session, accessToken };
    }, { isolationLevel: 'SERIALIZABLE' });
  }

  async loginUser(emailInput: string, password: string, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    const email = emailInput.trim().toLowerCase();
    const pool = await this.ready();
    const result = await pool.query(
      `SELECT u.*, m.org_id AS tenant_id, m.role AS membership_role
       FROM users u JOIN organization_members m ON m.user_id=u.id
       JOIN organizations o ON o.id=m.org_id AND o.owner_id IS NOT NULL
       WHERE u.email=$1 AND u.status='active' ORDER BY m.created_at,m.org_id LIMIT 1`, [email],
    );
    const user = result.rows[0];
    if (!user || !verifyPassword(password, user.password_hash ?? DUMMY_PASSWORD.hash, user.salt ?? DUMMY_PASSWORD.salt)) {
      throw new Error('INVALID_CREDENTIALS');
    }
    if (!VALID_ROLES.has(user.membership_role)) throw new Error('IDENTITY_ROLE_INVALID');
    const { session, accessToken } = await withTransaction(async client => {
      if (needsPasswordUpgrade(user.password_hash)) {
        const upgraded = hashPassword(password, user.salt);
        await client.query('UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2', [upgraded.hash, user.id]);
      }
      return createSession(client, Number(user.id), user.tenant_id, user.membership_role, ipAddress, userAgent);
    });
    return { user: toPublicUser(user), session, accessToken };
  }

  async validateSession(accessToken: string): Promise<{ valid: boolean; session?: Session; user?: PublicUser; reason?: string }> {
    if (!safeToken(accessToken)) return { valid: false, reason: 'Session token not found' };
    const pool = await this.ready();
    const result = await pool.query(
      `SELECT s.*,m.role AS current_role,u.id AS user_id,u.email,u.name,u.auth_provider,u.avatar_url,u.status,u.created_at AS user_created_at,u.updated_at AS user_updated_at
       FROM sessions s JOIN users u ON u.id=s.user_id
       JOIN organization_members m ON m.org_id=s.tenant_id AND m.user_id=s.user_id
       JOIN organizations o ON o.id=s.tenant_id
       WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='active' LIMIT 1`, [tokenHash(accessToken)],
    );
    const row = result.rows[0];
    if (!row) return { valid: false, reason: 'Session invalid, expired, revoked, or no longer a tenant member' };
    if (!VALID_ROLES.has(row.current_role)) return { valid: false, reason: 'Invalid server-side role' };
    const user = toPublicUser({ ...row, created_at: row.user_created_at, updated_at: row.user_updated_at });
    const session = sessionFrom(row, row.current_role);
    return { valid: true, user, session };
  }

  async revokeSession(sessionId: string, accessToken?: string): Promise<boolean> {
    const pool = await this.ready();
    const result = await pool.query(
      `UPDATE sessions SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL${accessToken ? ' AND token_hash=$2' : ''} RETURNING id`,
      accessToken ? [sessionId, tokenHash(accessToken)] : [sessionId],
    );
    return result.rowCount === 1;
  }

  async getOrganization(tenantId: string) {
    const pool = await this.ready();
    const { rows } = await pool.query('SELECT id,name,slug,owner_id,plan_id,created_at FROM organizations WHERE id=$1', [tenantId]);
    const r = rows[0];
    return r ? { id: r.id, name: r.name, slug: r.slug, ownerId: Number(r.owner_id), planId: r.plan_id, createdAt: new Date(r.created_at).toISOString() } : null;
  }

  async isTenantMember(userId: number, tenantId: string): Promise<boolean> {
    const pool = await this.ready();
    const { rowCount } = await pool.query('SELECT 1 FROM organization_members m JOIN organizations o ON o.id=m.org_id WHERE m.user_id=$1 AND m.org_id=$2', [userId, tenantId]);
    return rowCount === 1;
  }

  async getOrganizationMembers(tenantId: string) {
    const pool = await this.ready();
    const { rows } = await pool.query(
      `SELECT m.id,m.legacy_id,m.org_id,m.user_id,m.role,m.created_at,u.email,u.name
       FROM organization_members m JOIN users u ON u.id=m.user_id WHERE m.org_id=$1 ORDER BY m.created_at,m.id`, [tenantId],
    );
    return rows.map(r => ({ id: String(r.legacy_id ?? r.id), userId: Number(r.user_id), email: r.email, name: r.name, role: r.role as IdentityRole, createdAt: new Date(r.created_at).toISOString() }));
  }

  /**
   * Read-only, tenant-scoped activity for one member, built only from persisted tables
   * (sessions, ownership_transfer_audit). Returns null when the target is not a member of the tenant.
   */
  async getMemberActivity(tenantId: string, targetUserId: number, limit: number): Promise<{ events: MemberActivityEvent[]; truncated: boolean } | null> {
    const pool = await this.ready();
    const member = await pool.query('SELECT 1 FROM organization_members WHERE org_id=$1 AND user_id=$2', [tenantId, targetUserId]);
    if (!member.rowCount) return null;
    const { rows } = await pool.query(
      `SELECT id, type, occurred_at, ip_address, user_agent, detail FROM (
         SELECT 'sess_start_' || s.id AS id, 'SESSION_STARTED'::text AS type, s.created_at AS occurred_at,
                s.ip_address::text AS ip_address, s.user_agent::text AS user_agent, NULL::text AS detail
           FROM sessions s WHERE s.tenant_id=$1 AND s.user_id=$2
         UNION ALL
         SELECT 'sess_end_' || s.id, 'SESSION_REVOKED'::text, s.revoked_at,
                s.ip_address::text, s.user_agent::text, NULL::text
           FROM sessions s WHERE s.tenant_id=$1 AND s.user_id=$2 AND s.revoked_at IS NOT NULL
         UNION ALL
         SELECT 'own_' || t.id,
                (CASE WHEN t.to_user_id=$2 THEN 'OWNERSHIP_RECEIVED'
                      WHEN t.from_user_id=$2 THEN 'OWNERSHIP_TRANSFERRED'
                      ELSE 'OWNERSHIP_INITIATED' END)::text,
                t.created_at, NULL::text, NULL::text, t.reason::text
           FROM ownership_transfer_audit t
          WHERE t.org_id=$1 AND (t.from_user_id=$2 OR t.to_user_id=$2 OR t.initiated_by=$2)
       ) e ORDER BY occurred_at DESC, id DESC LIMIT $3`,
      [tenantId, targetUserId, limit + 1],
    );
    const events = normalizeActivityRows(rows);
    return { events: events.slice(0, limit), truncated: rows.length > limit };
  }

  async updateMemberRole(tenantId: string, targetUserId: number, newRole: IdentityRole): Promise<boolean> {
    if (!VALID_ROLES.has(newRole) || newRole === 'OWNER') throw new Error('OWNERSHIP_TRANSFER_REQUIRED');
    return withTransaction(async client => {
      const org = await client.query('SELECT owner_id FROM organizations WHERE id=$1 FOR UPDATE', [tenantId]);
      if (!org.rowCount) return false;
      const result = await client.query(
        `UPDATE organization_members SET role=$1 WHERE org_id=$2 AND user_id=$3 AND user_id<>$4 AND role<>'OWNER' RETURNING user_id`,
        [newRole, tenantId, targetUserId, Number(org.rows[0].owner_id)],
      );
      return result.rowCount === 1;
    });
  }

  async inviteMember(tenantId: string, inviterUserId: number, email: string, role: IdentityRole): Promise<{ id: string; userId: number; email: string; name: string; role: IdentityRole; createdAt: string }> {
    if (!VALID_ROLES.has(role) || role === 'OWNER') throw new Error('INVALID_ROLE');
    const cleanEmail = email.trim().toLowerCase();
    return withTransaction(async client => {
      let userRes = await client.query('SELECT id, email, name, status FROM users WHERE email = $1', [cleanEmail]);
      let targetUserId: number;
      let name: string;
      if (userRes.rowCount === 0) {
        const { hash, salt } = hashPassword(randomBytes(16).toString('hex'));
        name = cleanEmail.split('@')[0];
        const inserted = await client.query(
          `INSERT INTO users(email, password_hash, salt, name, auth_provider, status)
           VALUES($1, $2, $3, $4, 'local', 'active') RETURNING id, email, name`,
          [cleanEmail, hash, salt, name],
        );
        targetUserId = Number(inserted.rows[0].id);
      } else {
        targetUserId = Number(userRes.rows[0].id);
        name = userRes.rows[0].name;
      }

      const memCheck = await client.query('SELECT 1 FROM organization_members WHERE org_id = $1 AND user_id = $2', [tenantId, targetUserId]);
      if (memCheck.rowCount && memCheck.rowCount > 0) {
        throw new Error('ALREADY_MEMBER');
      }

      const memRes = await client.query(
        `INSERT INTO organization_members(org_id, user_id, role)
         VALUES($1, $2, $3) RETURNING id, created_at`,
        [tenantId, targetUserId, role],
      );

      const mem = memRes.rows[0];
      return {
        id: String(mem.id),
        userId: targetUserId,
        email: cleanEmail,
        name,
        role,
        createdAt: new Date(mem.created_at).toISOString(),
      };
    });
  }

  async transferOwnership(params: { tenantId: string; currentOwnerId: number; targetUserId: number; reason: string }): Promise<void> {
    const reason = params.reason.trim();
    if (!reason || reason.length > 1000 || params.currentOwnerId === params.targetUserId) throw new Error('INVALID_TRANSFER');
    await withTransaction(async client => {
      const org = await client.query('SELECT owner_id FROM organizations WHERE id=$1 FOR UPDATE', [params.tenantId]);
      if (!org.rowCount || Number(org.rows[0].owner_id) !== params.currentOwnerId) throw new Error('OWNER_AUTHORIZATION_REQUIRED');
      const target = await client.query('SELECT role FROM organization_members WHERE org_id=$1 AND user_id=$2 FOR UPDATE', [params.tenantId, params.targetUserId]);
      if (!target.rowCount) throw new Error('TARGET_NOT_MEMBER');
      const previous = await client.query('UPDATE organization_members SET role=\'ADMIN\' WHERE org_id=$1 AND user_id=$2 AND role=\'OWNER\' RETURNING user_id', [params.tenantId, params.currentOwnerId]);
      if (previous.rowCount !== 1) throw new Error('OWNER_MEMBERSHIP_INCONSISTENT');
      const next = await client.query('UPDATE organization_members SET role=\'OWNER\' WHERE org_id=$1 AND user_id=$2 RETURNING user_id', [params.tenantId, params.targetUserId]);
      if (next.rowCount !== 1) throw new Error('TARGET_MEMBERSHIP_UPDATE_FAILED');
      const updatedOrg = await client.query('UPDATE organizations SET owner_id=$1 WHERE id=$2 AND owner_id=$3 RETURNING id', [params.targetUserId, params.tenantId, params.currentOwnerId]);
      if (updatedOrg.rowCount !== 1) throw new Error('OWNER_POINTER_UPDATE_FAILED');
      await client.query(
        `INSERT INTO ownership_transfer_audit(id,org_id,from_user_id,to_user_id,initiated_by,reason)
         VALUES($1,$2,$3,$4,$3,$5)`, [`owner-transfer-${randomUUID()}`, params.tenantId, params.currentOwnerId, params.targetUserId, reason],
      );
    }, { isolationLevel: 'SERIALIZABLE' });
  }
}

export const postgresIdentityService = new PostgresIdentityService();
