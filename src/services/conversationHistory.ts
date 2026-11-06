/**
 * ZYNTHEOR AI ENGINE — Conversation History & Thread Management Service
 * ZERO FAKE — REAL COMPLETENESS ONLY
 *
 * STEP 5 — Intelligent Conversation Management
 * Manages persistent user conversation threads with backend API sync & LocalStorage backup.
 */

export interface ConversationThread {
  id: string;
  title: string;
  lastUpdated: string;
  messageCount: number;
  previewText?: string;
  operatingMode?: 'ONLINE_INTELLIGENCE' | 'HYBRID_INTELLIGENCE' | 'LOCAL_ONLY';
  archived?: boolean;
  toneStyle?: 'professional' | 'casual' | 'concise' | 'academic' | 'creative';
}

export interface GroupedConversations {
  today: ConversationThread[];
  yesterday: ConversationThread[];
  previous7Days: ConversationThread[];
  older: ConversationThread[];
  archived: ConversationThread[];
}

const STORAGE_KEY = 'zyntheor_recent_conversations';

/**
 * Retrieves stored recent conversations sorted by last updated timestamp descending.
 */
export function getRecentConversations(includeArchived = false): ConversationThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: ConversationThread[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    
    const filtered = includeArchived ? list : list.filter(t => !t.archived);
    return filtered.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  } catch (err) {
    console.error('[ZYNTHEOR Memory] Failed to parse recent conversations:', err);
    return [];
  }
}

/**
 * Saves or updates a conversation thread in persistent storage.
 */
export function saveConversationThread(thread: ConversationThread): void {
  try {
    const current = getRecentConversations(true);
    const existingIndex = current.findIndex(t => t.id === thread.id);

    if (existingIndex >= 0) {
      current[existingIndex] = {
        ...current[existingIndex],
        ...thread,
        lastUpdated: thread.lastUpdated || new Date().toISOString(),
      };
    } else {
      current.unshift({
        ...thread,
        lastUpdated: thread.lastUpdated || new Date().toISOString(),
      });
    }

    // Keep top 50 recent conversations
    const trimmed = current.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent('zyntheor:conversations-changed', { detail: trimmed }));

    // Async sync to backend endpoint
    syncThreadToBackend(thread).catch(() => {});
  } catch (err) {
    console.error('[ZYNTHEOR Memory] Failed to save conversation thread:', err);
  }
}

/**
 * Renames a conversation thread by ID.
 */
export function renameConversationThread(id: string, newTitle: string): void {
  try {
    const current = getRecentConversations(true);
    const target = current.find(t => t.id === id);
    if (target) {
      target.title = newTitle.trim() || target.title;
      target.lastUpdated = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      window.dispatchEvent(new CustomEvent('zyntheor:conversations-changed', { detail: current }));
      syncThreadToBackend(target).catch(() => {});
    }
  } catch (err) {
    console.error('[ZYNTHEOR Memory] Failed to rename conversation thread:', err);
  }
}

/**
 * Toggles or sets archive status for a conversation thread.
 */
export function archiveConversationThread(id: string, archiveState = true): void {
  try {
    const current = getRecentConversations(true);
    const target = current.find(t => t.id === id);
    if (target) {
      target.archived = archiveState;
      target.lastUpdated = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      window.dispatchEvent(new CustomEvent('zyntheor:conversations-changed', { detail: current }));
      syncThreadToBackend(target).catch(() => {});
    }
  } catch (err) {
    console.error('[ZYNTHEOR Memory] Failed to archive conversation thread:', err);
  }
}

/**
 * Deletes a conversation thread by ID.
 */
export function deleteConversationThread(id: string): void {
  try {
    const current = getRecentConversations(true).filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('zyntheor:conversations-changed', { detail: current }));

    // Async sync deletion to backend
    deleteThreadFromBackend(id).catch(() => {});
  } catch (err) {
    console.error('[ZYNTHEOR Memory] Failed to delete conversation thread:', err);
  }
}

/**
 * Groups conversation threads by real ISO timestamp ranges:
 * - Today
 * - Yesterday
 * - Previous 7 Days
 * - Older
 * - Archived
 */
export function groupConversationsByDate(threads: ConversationThread[]): GroupedConversations {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfSevenDaysAgo = startOfToday - (7 * 86400000);

  const groups: GroupedConversations = {
    today: [],
    yesterday: [],
    previous7Days: [],
    older: [],
    archived: [],
  };

  for (const thread of threads) {
    if (thread.archived) {
      groups.archived.push(thread);
      continue;
    }

    const threadTime = new Date(thread.lastUpdated).getTime();
    if (isNaN(threadTime)) {
      groups.older.push(thread);
    } else if (threadTime >= startOfToday) {
      groups.today.push(thread);
    } else if (threadTime >= startOfYesterday) {
      groups.yesterday.push(thread);
    } else if (threadTime >= startOfSevenDaysAgo) {
      groups.previous7Days.push(thread);
    } else {
      groups.older.push(thread);
    }
  }

  return groups;
}

/**
 * Formats ISO timestamp to human-readable Thai/English time string.
 */
export function formatThreadTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'ไม่ระบุเวลา';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชม. ที่แล้ว`;
    if (diffDays === 1) return 'เมื่อวานนี้';
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;

    return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
  } catch {
    return 'ไม่ระบุเวลา';
  }
}

async function syncThreadToBackend(thread: ConversationThread): Promise<void> {
  try {
    await fetch('/api/workspace/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(thread),
    });
  } catch {
    // Fail silent on network error — LocalStorage is SSOT
  }
}

async function deleteThreadFromBackend(id: string): Promise<void> {
  try {
    await fetch(`/api/workspace/conversations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch {
    // Fail silent on network error
  }
}
