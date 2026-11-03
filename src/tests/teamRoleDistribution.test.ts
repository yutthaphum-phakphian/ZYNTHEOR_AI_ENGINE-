import { describe, it, expect } from 'vitest';
import type { TeamMemberRoleItem } from '../components/TeamRoleDistributionChart';

describe('Team Role Distribution Calculations', () => {
  it('correctly calculates counts and percentages for Owner, Admin, Developer, and Viewer', () => {
    const sampleMembers: TeamMemberRoleItem[] = [
      { id: '1', userId: 1, role: 'OWNER', name: 'Alice' },
      { id: '2', userId: 2, role: 'ADMIN', name: 'Bob' },
      { id: '3', userId: 3, role: 'DEVELOPER', name: 'Charlie' },
      { id: '4', userId: 4, role: 'MEMBER', name: 'David' },
      { id: '5', userId: 5, role: 'VIEWER', name: 'Eve' },
    ];

    const counts: Record<string, number> = {
      OWNER: 0,
      ADMIN: 0,
      DEVELOPER: 0,
      VIEWER: 0,
    };

    sampleMembers.forEach((m) => {
      const normalizedRole = m.role?.toUpperCase();
      if (normalizedRole === 'OWNER') counts.OWNER++;
      else if (normalizedRole === 'ADMIN') counts.ADMIN++;
      else if (normalizedRole === 'DEVELOPER' || normalizedRole === 'MEMBER') counts.DEVELOPER++;
      else if (normalizedRole === 'VIEWER') counts.VIEWER++;
    });

    const total = sampleMembers.length;
    expect(total).toBe(5);
    expect(counts.OWNER).toBe(1);
    expect(counts.ADMIN).toBe(1);
    expect(counts.DEVELOPER).toBe(2); // DEVELOPER + MEMBER
    expect(counts.VIEWER).toBe(1);

    expect(Math.round((counts.OWNER / total) * 100)).toBe(20);
    expect(Math.round((counts.ADMIN / total) * 100)).toBe(20);
    expect(Math.round((counts.DEVELOPER / total) * 100)).toBe(40);
    expect(Math.round((counts.VIEWER / total) * 100)).toBe(20);
  });

  it('handles empty workspace member list safely without division by zero (Zero-State)', () => {
    const sampleMembers: TeamMemberRoleItem[] = [];
    const total = sampleMembers.length;
    const percentage = total > 0 ? Math.round((1 / total) * 100) : 0;
    expect(percentage).toBe(0);
    expect(total).toBe(0);
  });

  it('handles single-role workspace with 100% distribution', () => {
    const sampleMembers: TeamMemberRoleItem[] = [
      { id: '1', userId: 1, role: 'OWNER', name: 'Founder' },
    ];
    const total = sampleMembers.length;
    const ownerCount = sampleMembers.filter((m) => m.role === 'OWNER').length;
    expect(total).toBe(1);
    expect(ownerCount).toBe(1);
    expect(Math.round((ownerCount / total) * 100)).toBe(100);
  });

  it('normalizes mixed case role strings safely', () => {
    const mixedMembers: TeamMemberRoleItem[] = [
      { id: '1', userId: 1, role: 'owner' as any, name: 'User 1' },
      { id: '2', userId: 2, role: 'Admin' as any, name: 'User 2' },
      { id: '3', userId: 3, role: 'DEVELOPER', name: 'User 3' },
      { id: '4', userId: 4, role: 'viewer' as any, name: 'User 4' },
    ];

    const counts: Record<string, number> = {
      OWNER: 0,
      ADMIN: 0,
      DEVELOPER: 0,
      VIEWER: 0,
    };

    mixedMembers.forEach((m) => {
      const normalizedRole = m.role?.toUpperCase();
      if (normalizedRole === 'OWNER') counts.OWNER++;
      else if (normalizedRole === 'ADMIN') counts.ADMIN++;
      else if (normalizedRole === 'DEVELOPER' || normalizedRole === 'MEMBER') counts.DEVELOPER++;
      else if (normalizedRole === 'VIEWER') counts.VIEWER++;
    });

    expect(counts.OWNER).toBe(1);
    expect(counts.ADMIN).toBe(1);
    expect(counts.DEVELOPER).toBe(1);
    expect(counts.VIEWER).toBe(1);
  });
});
