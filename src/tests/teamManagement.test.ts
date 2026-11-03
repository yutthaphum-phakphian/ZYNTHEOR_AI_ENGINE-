import { describe, it, expect } from 'vitest';
import type { Member } from '../components/TeamManagementPage';

// Helper mimicking CSV generation logic from TeamManagementPage
export function generateMembersCsv(members: Member[]): string {
  if (members.length === 0) return '';
  const headers = ['Member ID', 'User ID', 'Name', 'Email', 'Role', 'Workspace Status', 'Joined Date'];
  const rows = members.map((m) => {
    const status = m.role === 'OWNER' ? 'Active (Owner Protected)' : 'Active';
    return [
      m.id,
      m.userId,
      m.name || `User ${m.userId}`,
      m.email || 'N/A',
      m.role,
      status,
      m.createdAt || 'N/A',
    ];
  });

  const escapeCsv = (val: unknown) => {
    const str = String(val ?? '');
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  return (
    '\uFEFF' +
    [headers.map(escapeCsv).join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\r\n')
  );
}

// Helper mimicking search filtering logic from TeamManagementPage
export function filterMembers(members: Member[], searchQuery: string): Member[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return members;
  return members.filter((m) => {
    const name = (m.name || `User ${m.userId}`).toLowerCase();
    const email = (m.email || '').toLowerCase();
    const role = (m.role || '').toLowerCase();
    const idStr = String(m.userId);
    return name.includes(q) || email.includes(q) || role.includes(q) || idStr.includes(q);
  });
}

// Helper validating email format
export function validateEmailFormat(email: string): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  return /^[^\s@]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(trimmed);
}

describe('Team Management Utilities & Logic', () => {
  const mockMembers: Member[] = [
    {
      id: 'mem-1',
      userId: 101,
      name: 'Somchai Prasert',
      email: 'somchai@zyntheor.local',
      role: 'OWNER',
      createdAt: '2026-01-15T08:00:00.000Z',
    },
    {
      id: 'mem-2',
      userId: 102,
      name: 'Alice Developer',
      email: 'alice@zyntheor.local',
      role: 'DEVELOPER',
      createdAt: '2026-02-01T10:30:00.000Z',
    },
    {
      id: 'mem-3',
      userId: 103,
      name: 'Bob Admin',
      email: 'bob@enterprise.corp',
      role: 'ADMIN',
      createdAt: '2026-02-10T14:15:00.000Z',
    },
    {
      id: 'mem-4',
      userId: 104,
      name: 'Charlie, The "Viewer"',
      email: 'charlie@partner.org',
      role: 'VIEWER',
      createdAt: '2026-03-01T09:00:00.000Z',
    },
  ];

  describe('Real-Time Search Bar Filtering', () => {
    it('returns all members when search query is empty or whitespace', () => {
      expect(filterMembers(mockMembers, '')).toHaveLength(4);
      expect(filterMembers(mockMembers, '   ')).toHaveLength(4);
    });

    it('filters members by partial name (case-insensitive)', () => {
      const results = filterMembers(mockMembers, 'somchai');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Somchai Prasert');

      const aliceResults = filterMembers(mockMembers, 'ALICE');
      expect(aliceResults).toHaveLength(1);
      expect(aliceResults[0].userId).toBe(102);
    });

    it('filters members by email address or domain', () => {
      const partnerResults = filterMembers(mockMembers, 'partner.org');
      expect(partnerResults).toHaveLength(1);
      expect(partnerResults[0].email).toBe('charlie@partner.org');

      const zyntheorResults = filterMembers(mockMembers, 'zyntheor.local');
      expect(zyntheorResults).toHaveLength(2);
    });

    it('filters members by role name', () => {
      const developerResults = filterMembers(mockMembers, 'DEVELOPER');
      expect(developerResults).toHaveLength(1);
      expect(developerResults[0].name).toBe('Alice Developer');

      const adminResults = filterMembers(mockMembers, 'admin');
      expect(adminResults).toHaveLength(1);
      expect(adminResults[0].name).toBe('Bob Admin');
    });

    it('filters members by numeric user ID', () => {
      const idResults = filterMembers(mockMembers, '103');
      expect(idResults).toHaveLength(1);
      expect(idResults[0].name).toBe('Bob Admin');
    });

    it('returns empty array when search query matches nothing', () => {
      const nonExistent = filterMembers(mockMembers, 'nonexistent-user-xyz');
      expect(nonExistent).toHaveLength(0);
    });
  });

  describe('Member Invitation Email Validation', () => {
    it('accepts valid email addresses', () => {
      expect(validateEmailFormat('test@example.com')).toBe(true);
      expect(validateEmailFormat('user.name+tag@sub.domain.co.th')).toBe(true);
      expect(validateEmailFormat('engineer@zyntheor.local')).toBe(true);
      expect(validateEmailFormat('  lead@zyntheor.ai  ')).toBe(true);
    });

    it('rejects invalid or malformed email addresses', () => {
      expect(validateEmailFormat('')).toBe(false);
      expect(validateEmailFormat('plainaddress')).toBe(false);
      expect(validateEmailFormat('@missingusername.com')).toBe(false);
      expect(validateEmailFormat('missingatsign.com')).toBe(false);
      expect(validateEmailFormat('user@.missingdomain.com')).toBe(false);
      expect(validateEmailFormat('user@domain')).toBe(false);
      expect(validateEmailFormat(' ')).toBe(false);
    });

    it('rejects excessively long email addresses exceeding 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validateEmailFormat(longEmail)).toBe(false);
    });
  });

  describe('Browser-Side CSV Export Generation', () => {
    it('prepends UTF-8 Byte Order Mark (BOM) for Excel/Sheets compatibility', () => {
      const csv = generateMembersCsv(mockMembers);
      expect(csv.startsWith('\uFEFF')).toBe(true);
    });

    it('includes standard column headers', () => {
      const csv = generateMembersCsv(mockMembers);
      expect(csv).toContain('Member ID,User ID,Name,Email,Role,Workspace Status,Joined Date');
    });

    it('correctly maps roles and marks Owner as protected', () => {
      const csv = generateMembersCsv(mockMembers);
      expect(csv).toContain('Somchai Prasert,somchai@zyntheor.local,OWNER,Active (Owner Protected)');
      expect(csv).toContain('Alice Developer,alice@zyntheor.local,DEVELOPER,Active');
    });

    it('escapes cells containing commas, double quotes, and special characters', () => {
      const csv = generateMembersCsv(mockMembers);
      // Charlie, The "Viewer" contains both a comma and double quotes, so it must be escaped:
      // "Charlie, The ""Viewer"""
      expect(csv).toContain('"Charlie, The ""Viewer"""');
    });

    it('handles empty members list safely', () => {
      const emptyCsv = generateMembersCsv([]);
      expect(emptyCsv).toBe('');
    });
  });
});
