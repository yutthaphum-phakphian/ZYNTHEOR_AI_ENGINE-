/**
 * Member activity (per-user audit view) — pure helpers.
 *
 * Scope is deliberately limited to events that are really persisted in PostgreSQL today:
 *   - sessions                 -> SESSION_STARTED / SESSION_REVOKED
 *   - ownership_transfer_audit -> OWNERSHIP_TRANSFERRED / OWNERSHIP_RECEIVED / OWNERSHIP_INITIATED
 * Role changes and invitations are NOT persisted as audit rows yet, so they are not reported here.
 */
export type MemberActivityType =
  | 'SESSION_STARTED'
  | 'SESSION_REVOKED'
  | 'OWNERSHIP_TRANSFERRED'
  | 'OWNERSHIP_RECEIVED'
  | 'OWNERSHIP_INITIATED';

export type MemberActivityEvent = {
  id: string;
  type: MemberActivityType;
  occurredAt: string; // ISO 8601
  ipAddress: string | null;
  userAgent: string | null;
  detail: string | null;
};

export const MEMBER_ACTIVITY_SOURCES = ['sessions', 'ownership_transfer_audit'] as const;
export const MEMBER_ACTIVITY_DEFAULT_LIMIT = 50;
export const MEMBER_ACTIVITY_MAX_LIMIT = 200;
const USER_AGENT_MAX = 160;
const DETAIL_MAX = 500;

const KNOWN_TYPES = new Set<string>([
  'SESSION_STARTED', 'SESSION_REVOKED', 'OWNERSHIP_TRANSFERRED', 'OWNERSHIP_RECEIVED', 'OWNERSHIP_INITIATED',
]);

/** Clamp an untrusted `limit` query value to [1, MAX]; fall back to the default. */
export function clampActivityLimit(raw: unknown): number {
  const n = typeof raw === 'string' && /^\d{1,6}$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(n) || n < 1) return MEMBER_ACTIVITY_DEFAULT_LIMIT;
  return Math.min(n, MEMBER_ACTIVITY_MAX_LIMIT);
}

type RawRow = {
  id: unknown; type: unknown; occurred_at: unknown;
  ip_address?: unknown; user_agent?: unknown; detail?: unknown;
};

function cut(value: unknown, max: number): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/**
 * Normalize DB rows into the public shape. Rows with an unknown type or an invalid timestamp are dropped
 * (never guessed), and nothing but the whitelisted fields is ever copied (no token hashes, no session ids beyond the row id).
 */
export function normalizeActivityRows(rows: RawRow[]): MemberActivityEvent[] {
  const out: MemberActivityEvent[] = [];
  for (const r of rows) {
    const type = String(r.type);
    if (!KNOWN_TYPES.has(type)) continue;
    const when = new Date(r.occurred_at as string | number | Date);
    if (Number.isNaN(when.getTime())) continue;
    out.push({
      id: String(r.id),
      type: type as MemberActivityType,
      occurredAt: when.toISOString(),
      ipAddress: cut(r.ip_address, 45),
      userAgent: cut(r.user_agent, USER_AGENT_MAX),
      detail: cut(r.detail, DETAIL_MAX),
    });
  }
  return out;
}
