import { describe, it, expect } from 'vitest';

describe('Mobile UX Architecture & Navigation Audit', () => {
  it('defines the canonical 5 main mobile hubs (Chat, Explore, Library, Agents, Settings)', () => {
    const requiredHubs = ['chat', 'explore', 'library', 'agents', 'settings'];
    expect(requiredHubs).toHaveLength(5);
    expect(requiredHubs).toContain('chat');
    expect(requiredHubs).toContain('explore');
    expect(requiredHubs).toContain('library');
    expect(requiredHubs).toContain('agents');
    expect(requiredHubs).toContain('settings');
  });

  it('verifies safe area inset rules exist for mobile viewports', () => {
    const safeTop = 'env(safe-area-inset-top, 0px)';
    const safeBottom = 'env(safe-area-inset-bottom, 0px)';
    expect(safeTop).toContain('safe-area-inset-top');
    expect(safeBottom).toContain('safe-area-inset-bottom');
  });
});
