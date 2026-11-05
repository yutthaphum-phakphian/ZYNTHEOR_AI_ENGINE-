// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import {
  Brain, RefreshCw, Trash2, ShieldCheck, AlertTriangle, Search,
  Plus, FileText, Database, Shield, BookOpen, Check, X, Tag, Lock
} from 'lucide-react';

type MemoryTab = 'task' | 'workspace' | 'knowledge';

type TaskMemory = {
  id: string;
  taskId?: string;
  goal: string;
  category?: string;
  status?: string;
  stagesCompleted?: string[];
  findings?: string[];
  evidenceDigests?: string[];
  createdAt?: string;
  updatedAt?: string;
};

type WorkspaceMemoryEntry = {
  id: string;
  type: 'architecture_summary' | 'coding_convention' | 'bug_root_cause' | 'fix_history';
  title: string;
  content: string;
  sourceFile?: string;
  sourceLine?: number;
  provenance: string;
  confidenceScore: number;
  versionMarker: string;
  createdAt: string;
};

type KnowledgeRecord = {
  id: string;
  workspaceId: string;
  title: string;
  category: string;
  content: string;
  source?: string;
  createdAt: string;
  authorId?: string;
  status?: string;
};

export function MemoryCenter({ workspaceId = 'default' }: { workspaceId: string }) {
  const [activeTab, setActiveTab] = useState<MemoryTab>('workspace');
  const [taskRecords, setTaskRecords] = useState<TaskMemory[]>([]);
  const [workspaceEntries, setWorkspaceEntries] = useState<WorkspaceMemoryEntry[]>([]);
  const [knowledgeRecords, setKnowledgeRecords] = useState<KnowledgeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clearing, setClearing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // New Memory Entry Form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<WorkspaceMemoryEntry['type']>('architecture_summary');
  const [newSourceFile, setNewSourceFile] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    const targetWs = encodeURIComponent(workspaceId || 'default');
    try {
      const [taskRes, wsRes, knowRes] = await Promise.allSettled([
        fetch(`/api/intelligence/task-memory?workspaceId=${targetWs}`).then(r => r.json()),
        fetch(`/api/intelligence/workspace-memory?workspaceId=${targetWs}`).then(r => r.json()),
        fetch(`/api/intelligence/knowledge?workspaceId=${targetWs}`).then(r => r.json()),
      ]);

      if (taskRes.status === 'fulfilled' && taskRes.value?.ok) {
        setTaskRecords(Array.isArray(taskRes.value.tasks) ? taskRes.value.tasks : []);
      }
      if (wsRes.status === 'fulfilled' && wsRes.value?.ok) {
        setWorkspaceEntries(Array.isArray(wsRes.value.entries) ? wsRes.value.entries : []);
      }
      if (knowRes.status === 'fulfilled' && knowRes.value?.ok) {
        setKnowledgeRecords(Array.isArray(knowRes.value.knowledge) ? knowRes.value.knowledge : []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load memory records');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || savingEntry) return;

    try {
      setSavingEntry(true);
      const res = await fetch('/api/intelligence/workspace-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspaceId || 'default',
          type: newType,
          title: newTitle.trim(),
          content: newContent.trim(),
          sourceFile: newSourceFile.trim() || undefined,
          provenance: `workspace://${workspaceId}/${newSourceFile.trim() || 'manual'}`,
          confidenceScore: 1.0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to save memory entry');
      }

      setShowAddModal(false);
      setNewTitle('');
      setNewContent('');
      setNewSourceFile('');
      await loadData();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSavingEntry(false);
    }
  };

  const handleDeleteEntry = async (id: string, tab: MemoryTab) => {
    if (!window.confirm('Delete this memory record? This operation cannot be undone.')) return;

    try {
      if (tab === 'workspace') {
        const res = await fetch(`/api/intelligence/workspace-memory/${id}?workspaceId=${encodeURIComponent(workspaceId)}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Delete failed');
      } else if (tab === 'task') {
        const res = await fetch(`/api/intelligence/task-memory/${id}?workspaceId=${encodeURIComponent(workspaceId)}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Delete failed');
      }
      setSelectedRecord(null);
      await loadData();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const clearAllTaskMemory = async () => {
    if (!window.confirm(`ล้าง Task Memory ทั้งหมดของ Workspace '${workspaceId}' หรือไม่? การดำเนินการนี้ย้อนกลับไม่ได้`)) return;
    setClearing(true);
    setError('');
    try {
      const response = await fetch(`/api/intelligence/task-memory?workspaceId=${encodeURIComponent(workspaceId || 'default')}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || data.ok !== true) throw new Error(data.message || data.error || 'Memory clear failed');
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to clear memory');
    } finally {
      setClearing(false);
    }
  };

  // Filtered entries
  const filteredWorkspace = workspaceEntries.filter(e => {
    const matchesSearch = !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || e.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const filteredTask = taskRecords.filter(r => {
    return !searchQuery || r.goal.toLowerCase().includes(searchQuery.toLowerCase()) || r.findings?.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const filteredKnowledge = knowledgeRecords.filter(k => {
    return !searchQuery || k.title.toLowerCase().includes(searchQuery.toLowerCase()) || k.content.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <section className="subpage memory-center w-full max-w-7xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="text-xs font-bold text-teal-400 tracking-wider uppercase flex items-center gap-2">
            <Brain size={15} /> ZYNTHEOR CORE X / MEMORY GOVERNANCE
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1">Memory Center</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Workspace-scoped architectural memory, project conventions, bug root causes, and verifiable knowledge records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-xs text-zinc-200 hover:bg-zinc-750 transition"
            onClick={() => void loadData()}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-xs font-bold text-white transition shadow-md shadow-teal-950/40"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={13} />
            <span>Add Memory Entry</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-800/60 bg-red-950/30 text-xs text-red-300 hover:bg-red-900/30 transition"
            onClick={() => void clearAllTaskMemory()}
            disabled={clearing || loading || taskRecords.length === 0}
          >
            <Trash2 size={13} />
            <span>Clear Task Memory</span>
          </button>
        </div>
      </div>

      {/* Scope Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/70 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-950/70 text-teal-400 border border-teal-800/40">
            <Brain size={18} />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-500">Active Workspace Scope</div>
            <div className="text-sm font-bold text-zinc-100">{workspaceId || 'default'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <ShieldCheck size={16} className="text-teal-400" />
          <span>Strict Server-Side Tenant &amp; Workspace Isolation Enforced</span>
        </div>
      </div>

      {/* 5-System ZYNTHEOR Architecture Map & Zero-Assumption Policy */}
      <div className="p-4 rounded-xl border border-teal-900/50 bg-teal-950/20 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-800/40 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-teal-500/20 text-teal-300 font-bold text-xs font-mono">5-TIER SOVEREIGN AI ARCHITECTURE</span>
            <span className="text-xs text-zinc-300 font-semibold">แยกสมอง ความจำ และการปฏิบัติการอย่างชัดเจน</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-teal-800/50 text-teal-300">
            ZERO ASSUMPTION IN KNOWLEDGE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <div className="font-bold text-teal-300 flex items-center gap-1.5">
              <span>🧠</span> 1. Intelligence Core
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">สมองส่วนคิด: Reasoning, Semantic Analysis &amp; การตัดสินใจ</div>
          </div>
          <div className="p-2.5 rounded-lg bg-teal-950/40 border border-teal-700/60 ring-1 ring-teal-500/30">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <span>💾</span> 2. Memory Center
            </div>
            <div className="text-[10px] text-zinc-300 mt-1 font-semibold">ห้องความจำ: จัดเก็บ &amp; เรียกคืนความรู้ที่ Verify แล้ว (ห้องนี้)</div>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <div className="font-bold text-sky-300 flex items-center gap-1.5">
              <span>📋</span> 3. Planning Engine
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">การวางแผน: แยก Fact ออกจาก Assumption, แบ่งเป้าหมาย</div>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>🤖</span> 4. Agent Orchestrator
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">ประสานงาน: มอบหมาย 5 Governed Agents &amp; ควบคุม Tools</div>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <div className="font-bold text-purple-300 flex items-center gap-1.5">
              <span>🔒</span> 5. Verification Engine
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">ตรวจสอบหลักฐาน: SHA-256 Digest &amp; Human Approval</div>
          </div>
        </div>

        <div className="text-[10px] text-zinc-400 bg-zinc-950/80 p-2 rounded-lg border border-zinc-800/80 flex items-center gap-2">
          <ShieldCheck size={14} className="text-teal-400 shrink-0" />
          <span><b>กฎเหล็ก:</b> ห้ามบันทึกสมมติฐานหรือผลลัพธ์ที่ยังไม่ผ่าน Verification Engine เป็น Knowledge Record จริงโดยเด็ดขาด ทุกข้อค้นพบต้องยึดโยงกับ SHA-256 Evidence</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle size={15} className="text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="text-[10px] uppercase font-bold text-zinc-500">Workspace Entries</div>
          <div className="text-xl font-bold text-teal-300 mt-1">{loading ? '—' : workspaceEntries.length}</div>
          <div className="text-[10px] text-zinc-500">Architectural &amp; Code memory</div>
        </div>
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="text-[10px] uppercase font-bold text-zinc-500">Task Memory</div>
          <div className="text-xl font-bold text-zinc-100 mt-1">{loading ? '—' : taskRecords.length}</div>
          <div className="text-[10px] text-zinc-500">Governed orchestrator tasks</div>
        </div>
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="text-[10px] uppercase font-bold text-zinc-500">Knowledge Records</div>
          <div className="text-xl font-bold text-zinc-100 mt-1">{loading ? '—' : knowledgeRecords.length}</div>
          <div className="text-[10px] text-zinc-500">Discovered facts &amp; insights</div>
        </div>
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="text-[10px] uppercase font-bold text-zinc-500">With Evidence Digests</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {loading ? '—' : taskRecords.filter(r => (r.evidenceDigests?.length || 0) > 0).length + workspaceEntries.length}
          </div>
          <div className="text-[10px] text-zinc-500">Anchored with SHA-256 provenance</div>
        </div>
      </div>

      {/* Tab Navigation & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'workspace'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            Workspace Memory ({workspaceEntries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('task')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'task'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            Task Memory ({taskRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('knowledge')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'knowledge'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            Knowledge ({knowledgeRecords.length})
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {activeTab === 'workspace' && (
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Memory Types</option>
              <option value="architecture_summary">Architecture Summary</option>
              <option value="coding_convention">Coding Convention</option>
              <option value="bug_root_cause">Bug Root Cause</option>
              <option value="fix_history">Fix History</option>
            </select>
          )}

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search memory records…"
              className="pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-teal-500 w-48 sm:w-60"
            />
          </div>
        </div>
      </div>

      {/* Tab 1: Workspace Memory */}
      {activeTab === 'workspace' && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">Loading workspace memory…</div>
          ) : filteredWorkspace.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
              No workspace memory entries found. Click &quot;Add Memory Entry&quot; to record architectural patterns or conventions.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredWorkspace.map(entry => (
                <div
                  key={entry.id}
                  className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition flex flex-col justify-between text-xs space-y-2.5"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-zinc-200">{entry.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-teal-950/60 text-teal-300 border border-teal-800/40 shrink-0">
                        {entry.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-[11px] leading-relaxed line-clamp-3">
                      {entry.content}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                    <div className="flex items-center gap-2 truncate">
                      <span>Source: <b className="text-zinc-400">{entry.sourceFile || 'manual'}</b></span>
                      <span>·</span>
                      <span>Confidence: <b className="text-teal-400">{Math.round(entry.confidenceScore * 100)}%</b></span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord({ ...entry, tab: 'workspace' })}
                        className="text-teal-400 hover:text-teal-300 transition"
                      >
                        Inspect
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry.id, 'workspace')}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Task Memory */}
      {activeTab === 'task' && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">Loading task memory…</div>
          ) : filteredTask.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
              No task memory records visible in this workspace. Run an agent or chat task to generate persisted memory.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTask.map(task => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-200">{task.goal}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                        {task.category || 'General'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {task.status || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                      <span>{task.stagesCompleted?.length || 0} stages</span>
                      <span>·</span>
                      <span>{task.findings?.length || 0} findings</span>
                      <span>·</span>
                      <span>{task.evidenceDigests?.length || 0} evidence digests</span>
                      <span>·</span>
                      <span>Updated: {task.updatedAt ? new Date(task.updatedAt).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedRecord({ ...task, tab: 'task' })}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition"
                    >
                      Inspect
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(task.id, 'task')}
                      className="p-1 rounded text-red-400 hover:text-red-300 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Knowledge Records */}
      {activeTab === 'knowledge' && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">Loading knowledge records…</div>
          ) : filteredKnowledge.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
              No knowledge records found. Knowledge items are added as insights during self-improvement and research runs.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredKnowledge.map(k => (
                <div
                  key={k.id}
                  className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition flex flex-col justify-between text-xs space-y-2"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-zinc-200">{k.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                        {k.category}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-[11px] leading-relaxed line-clamp-3">{k.content}</p>
                  </div>
                  <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/80">
                    Source: {k.source || 'internal'} · {new Date(k.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Brain size={16} className="text-teal-400" /> Add Workspace Memory Record
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateMemory} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Memory Type</label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="architecture_summary">Architecture Summary</option>
                  <option value="coding_convention">Coding Convention</option>
                  <option value="bug_root_cause">Bug Root Cause</option>
                  <option value="fix_history">Fix History</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. SQLite/PostgreSQL Session Token Verification"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Source File (Optional)</label>
                <input
                  type="text"
                  value={newSourceFile}
                  onChange={e => setNewSourceFile(e.target.value)}
                  placeholder="e.g. src/services/authService.ts"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Memory Content / Detail</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Describe the architectural pattern, invariant rule, or resolution knowledge..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-750 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEntry}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold transition disabled:opacity-50"
                >
                  {savingEntry ? 'Saving…' : 'Save Memory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <span className="text-sm font-bold text-zinc-100">
                Inspect Memory: {selectedRecord.title || selectedRecord.goal}
              </span>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500">Record ID</span>
                <div className="font-mono text-zinc-300 mt-0.5">{selectedRecord.id}</div>
              </div>

              {selectedRecord.content && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Content</span>
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 whitespace-pre-wrap mt-1 leading-relaxed">
                    {selectedRecord.content}
                  </div>
                </div>
              )}

              {selectedRecord.findings && selectedRecord.findings.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Findings</span>
                  <ul className="list-disc pl-5 space-y-1 text-zinc-300 mt-1">
                    {selectedRecord.findings.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedRecord.provenance && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Provenance Reference</span>
                  <div className="font-mono text-teal-400 mt-0.5">{selectedRecord.provenance}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Created At</span>
                  <div className="text-zinc-300 mt-0.5">{new Date(selectedRecord.createdAt || Date.now()).toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Security Isolation</span>
                  <div className="text-emerald-400 mt-0.5 flex items-center gap-1">
                    <ShieldCheck size={13} /> Tenant Isolated
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => handleDeleteEntry(selectedRecord.id, selectedRecord.tab)}
                className="px-3 py-1.5 rounded-lg border border-red-800 bg-red-950/40 text-red-300 hover:bg-red-900/40 text-xs transition flex items-center gap-1.5"
              >
                <Trash2 size={12} /> Delete Record
              </button>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default MemoryCenter;
