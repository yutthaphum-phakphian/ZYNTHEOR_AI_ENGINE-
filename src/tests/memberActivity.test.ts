// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  clampActivityLimit,
  normalizeActivityRows,
  MEMBER_ACTIVITY_DEFAULT_LIMIT,
  MEMBER_ACTIVITY_MAX_LIMIT,
} from '../services/memberActivity';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('memberActivity helpers', () => {
  it('clamps limit: default for junk, min 1, max cap', () => {
    expect(clampActivityLimit(undefined)).toBe(MEMBER_ACTIVITY_DEFAULT_LIMIT);
    expect(clampActivityLimit('abc')).toBe(MEMBER_ACTIVITY_DEFAULT_LIMIT);
    expect(clampActivityLimit('-5')).toBe(MEMBER_ACTIVITY_DEFAULT_LIMIT);
    expect(clampActivityLimit('0')).toBe(MEMBER_ACTIVITY_DEFAULT_LIMIT);
    expect(clampActivityLimit('10')).toBe(10);
    expect(clampActivityLimit('999999')).toBe(MEMBER_ACTIVITY_MAX_LIMIT);
    expect(clampActivityLimit(['1', '2'])).toBe(MEMBER_ACTIVITY_DEFAULT_LIMIT);
  });

  it('normalizes rows, whitelists fields and drops unknown types / bad dates', () => {
    const rows = [
      { id: 'a', type: 'SESSION_STARTED', occurred_at: '2026-11-03T10:00:00Z', ip_address: '10.0.0.1', user_agent: 'x'.repeat(400), detail: null, token_hash: 'SECRET' },
      { id: 'b', type: 'DROP_TABLE', occurred_at: '2026-11-03T10:00:00Z' },
      { id: 'c', type: 'SESSION_REVOKED', occurred_at: 'not-a-date' },
      { id: 'd', type: 'OWNERSHIP_RECEIVED', occurred_at: new Date('2026-11-02T00:00:00Z'), detail: '  handover  ' },
    ];
    const out = normalizeActivityRows(rows as any);
    expect(out.map((e) => e.id)).toEqual(['a', 'd']);
    expect(out[0].userAgent!.length).toBeLessThanOrEqual(161);
    expect(out[0].occurredAt).toBe('2026-11-03T10:00:00.000Z');
    expect(out[1].detail).toBe('handover');
    expect(JSON.stringify(out)).not.toContain('SECRET');
    expect(Object.keys(out[0]).sort()).toEqual(['detail', 'id', 'ipAddress', 'occurredAt', 'type', 'userAgent']);
  });
});

describe('member activity route & UI wiring (static source checks — not a DB integration test)', () => {
  const route = read('../routes/auth.ts');
  const svc = read('../services/postgresIdentityService.ts');
  const page = read('../components/TeamManagementPage.tsx');
  const css = read('../styles.css');

  it('route is OWNER/ADMIN-gated, tenant-scoped, validates id, fails closed', () => {
    const start = route.indexOf("router.get('/api/auth/members/:userId/activity'");
    expect(start).toBeGreaterThan(-1);
    const body = route.slice(start, route.indexOf("router.post('/api/auth/members/invite'"));
    expect(body).toContain("['OWNER', 'ADMIN'].includes(caller.role)");
    expect(body).toContain('info.session.tenantId');
    expect(body).toContain('isTenantMember');
    expect(body).toContain('invalid_user_id');
    expect(body).toContain('member_not_found');
    expect(body).toContain('dbFailure(res)');
    expect(body).not.toMatch(/req\.(query|body)\.tenantId/);
  });

  it('service query is read-only and filters by tenant on every source', () => {
    const start = svc.indexOf('async getMemberActivity');
    const body = svc.slice(start, svc.indexOf('async updateMemberRole'));
    expect(body).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b/);
    expect(body).toContain('s.tenant_id=$1');
    expect(body).toContain('t.org_id=$1');
    expect(body).not.toContain('token_hash');
  });

  it('UI: tooltips are accessible, rows fade with reduced-motion fallback, activity gated by canManage', () => {
    expect(page).toContain('role="tooltip"');
    expect(page).toContain('aria-describedby');
    expect(page).toContain('{canManage && (\n                      <button\n                        type="button"\n                        className="team-activity-btn"');
    expect(css).toContain('@keyframes team-row-in');
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\{\.team-row\{animation:none\}/);
    expect(css).toContain('.role-tip-wrap:focus-within .role-tip');
  });
});
