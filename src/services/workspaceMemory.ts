import { saveTaskMemory, getTaskMemories, type TaskMemoryRecord } from './taskMemory.ts';

export interface WorkspaceMemoryEntry {
  id: string;
  type: 'architecture_summary' | 'coding_convention' | 'bug_root_cause' | 'fix_history';
  title: string;
  content: string;
  sourceFile?: string;
  sourceLine?: number;
  provenance: string;
  confidenceScore: number; // 0.0 to 1.0
  versionMarker: string;
  createdAt: string;
}

export class WorkspaceMemoryService {
  private memoryEntries: Map<string, WorkspaceMemoryEntry[]> = new Map();

  public addMemoryEntry(
    workspaceId: string,
    entryInput: Omit<WorkspaceMemoryEntry, 'id' | 'createdAt'>
  ): WorkspaceMemoryEntry {
    const list = this.memoryEntries.get(workspaceId) || [];
    const id = `wm-${crypto.randomUUID()}`;

    const entry: WorkspaceMemoryEntry = {
      ...entryInput,
      id,
      createdAt: new Date().toISOString(),
    };

    list.unshift(entry);
    this.memoryEntries.set(workspaceId, list);

    // Also persist into taskMemory
    saveTaskMemory({
      workspaceId,
      goal: `[WorkspaceMemory] ${entry.title}`,
      category: entry.type,
      findings: [entry.content],
      evidenceDigests: [entry.provenance],
      status: 'COMPLETED',
    });

    return entry;
  }

  public getMemoryEntries(
    workspaceId: string,
    typeFilter?: WorkspaceMemoryEntry['type']
  ): WorkspaceMemoryEntry[] {
    let list = this.memoryEntries.get(workspaceId) || [];

    // If empty in-memory, seed default architectural entries
    if (list.length === 0) {
      this.seedDefaultArchitectureEntries(workspaceId);
      list = this.memoryEntries.get(workspaceId) || [];
    }

    if (typeFilter) {
      return list.filter(e => e.type === typeFilter);
    }

    return list;
  }

  public deleteMemoryEntry(workspaceId: string, id: string): boolean {
    const list = this.memoryEntries.get(workspaceId) || [];
    const initialLen = list.length;
    const filtered = list.filter(e => e.id !== id);
    this.memoryEntries.set(workspaceId, filtered);
    return filtered.length < initialLen;
  }

  private seedDefaultArchitectureEntries(workspaceId: string) {
    this.addMemoryEntry(workspaceId, {
      type: 'architecture_summary',
      title: 'ZYNTHEOR Full-Stack Express & React Architecture',
      content: 'Server entry in server.ts mounting Express on port 3000, Vite SPA frontend with Tailwind CSS.',
      sourceFile: 'server.ts',
      sourceLine: 1,
      provenance: 'file://server.ts#line=1',
      confidenceScore: 1.0,
      versionMarker: '1.1.0',
    });

    this.addMemoryEntry(workspaceId, {
      type: 'coding_convention',
      title: 'Local-Only & Sovereign Policy Enforcement',
      content: 'All LLM calls and user credentials must adhere to ZYNTHEOR_LOCAL_ONLY policy without external leaks.',
      sourceFile: 'AUTHENTICATION_SPECIFICATION.md',
      sourceLine: 1,
      provenance: 'file://AUTHENTICATION_SPECIFICATION.md#line=1',
      confidenceScore: 0.98,
      versionMarker: '1.1.0',
    });
  }
}

export const workspaceMemoryService = new WorkspaceMemoryService();
