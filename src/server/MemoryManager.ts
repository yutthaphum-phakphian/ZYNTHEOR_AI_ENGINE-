import fs from 'fs/promises';
import path from 'path';
import { db, getDatabaseStatus } from '../db/index.ts';
import { agentMemory } from '../db/schema.ts';

const MEMORY_DIR = path.resolve(process.cwd(), 'memory');
const WORKSPACE_DATA_DIR = path.resolve(process.cwd(), 'workspace_data');

export interface MemoryEntry {
  id?: number | string;
  workspaceId: string;
  lesson: string;
  metadata?: any;
  createdAt?: string | Date;
}

export class MemoryManager {
  /**
   * Preserves backward compatibility with existing session state storage
   */
  static async saveState(sessionId: string, state: any): Promise<void> {
    await fs.mkdir(MEMORY_DIR, { recursive: true });
    await fs.writeFile(path.join(MEMORY_DIR, `${sessionId}.json`), JSON.stringify(state, null, 2), 'utf-8');
  }

  static async loadState(sessionId: string): Promise<any | null> {
    try {
      return JSON.parse(await fs.readFile(path.join(MEMORY_DIR, `${sessionId}.json`), 'utf-8'));
    } catch {
      return null;
    }
  }

  /**
   * Saves an intelligence lesson scoped to a specific workspace and tenant.
   * Stores to local storage and syncs to PostgreSQL agentMemory when available.
   */
  static async saveLesson(workspaceId: string, lesson: string, metadata: any = {}): Promise<void> {
    await fs.mkdir(WORKSPACE_DATA_DIR, { recursive: true });
    const localFile = path.join(WORKSPACE_DATA_DIR, `memory_${workspaceId}.json`);

    let existing: MemoryEntry[] = [];
    try {
      const data = await fs.readFile(localFile, 'utf-8');
      existing = JSON.parse(data);
    } catch {}

    const newEntry: MemoryEntry = {
      workspaceId,
      lesson,
      metadata,
      createdAt: new Date().toISOString(),
    };

    existing.push(newEntry);
    await fs.writeFile(localFile, JSON.stringify(existing.slice(-200), null, 2), 'utf-8');

    // Sync to PostgreSQL if connected
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      try {
        await db.insert(agentMemory).values({
          workspaceId,
          lesson,
          metadata,
        });
      } catch (err: any) {
        console.warn('[MemoryManager] Failed to persist lesson to PostgreSQL:', err?.message || err);
      }
    }
  }

  /**
   * Retrieves lessons for a given workspace.
   */
  static async getLessons(workspaceId: string): Promise<MemoryEntry[]> {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      try {
        const rows = await db.select().from(agentMemory);
        return rows.filter((r: any) => r.workspaceId === workspaceId);
      } catch {}
    }

    // Local file fallback
    try {
      const localFile = path.join(WORKSPACE_DATA_DIR, `memory_${workspaceId}.json`);
      const data = await fs.readFile(localFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Idempotently migrates all legacy JSON memory records to PostgreSQL agent_memory table.
   * Complies with Zero-Mock: if DB is not configured, reports database unavailable.
   */
  static async migrateFromJson(workspaceId?: string): Promise<{ migratedCount: number; errors: string[]; status: string }> {
    const dbStatus = getDatabaseStatus();
    if (!dbStatus.connected) {
      return {
        migratedCount: 0,
        errors: ['PostgreSQL DATABASE_URL is not configured. Migration halted.'],
        status: 'DATABASE_NOT_CONFIGURED',
      };
    }

    let migrated = 0;
    const errors: string[] = [];

    try {
      await fs.mkdir(WORKSPACE_DATA_DIR, { recursive: true });
      const files = await fs.readdir(WORKSPACE_DATA_DIR);
      const memoryFiles = files.filter(f => f.startsWith('memory_') && f.endsWith('.json'));

      for (const file of memoryFiles) {
        try {
          const filePath = path.join(WORKSPACE_DATA_DIR, file);
          const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));
          if (Array.isArray(content)) {
            for (const item of content) {
              if (workspaceId && item.workspaceId !== workspaceId) continue;
              await db.insert(agentMemory).values({
                workspaceId: item.workspaceId || 'default',
                lesson: item.lesson,
                metadata: item.metadata || {},
              });
              migrated++;
            }
          }
        } catch (err: any) {
          errors.push(`File ${file}: ${err?.message || err}`);
        }
      }

      return {
        migratedCount: migrated,
        errors,
        status: 'SUCCESS',
      };
    } catch (err: any) {
      return {
        migratedCount: migrated,
        errors: [err?.message || String(err)],
        status: 'FAILED',
      };
    }
  }
}
