/**
 * ZYNTHEOR AI ENGINE — Conversation History & Thread Management Service
 * ZERO FAKE — REAL COMPLETENESS ONLY
 *
 * Manages persistent user conversation threads in LocalStorage & Workspace Memory.
 */

export interface ConversationThread {
  id: string;
  title: string;
  lastUpdated: string;
  messageCount: number;
  previewText?: string;
  operatingMode?: 'ONLINE_INTELLIGENCE' | 'HYBRID_INTELLIGENCE' | 'LOCAL_ONLY';
}

const STORAGE_KEY = 'zyntheor_recent_conversations';

/**
 * Retrieves stored recent conversations sorted by last updated timestamp descending.
 */
export function getRecentConversations(): ConversationThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: ConversationThread[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
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
    const current = getRecentConversations();
    const existingIndex = current.findIndex(t => t.id === thread.id);

    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...thread, lastUpdated: new Date().toISOString() };
    } else {
      current.unshift({ ...thread, lastUpdated: new Date().toISOString() });
    }

    // Keep top 30 recent conversations
    const trimmed = current.slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent('zyntheor:conversations-changed', { detail: trimmed }));
  } catch (err) {
    console.error('[ZYNTHEOR Memory] Failed to save conversation thread:', err);
  }
}

/**
 * Deletes a conversation thread by ID.
 */
export function deleteConversationThread(id: string): void {
  try {
    const current = getRecentConversations().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent('zyntheor:conversations-changed', { detail: current }));
  } catch (err) {
    console.error('[ZYNTHEOR Memory] Failed to delete conversation thread:', err);
  }
}

/**
 * Formats ISO timestamp to human-readable Thai/English time string.
 */
export function formatThreadTime(isoString: string): string {
  try {
    const date = new Date(isoString);
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
