// @ts-nocheck
import { useCallback, useEffect, useState } from 'react';
import {
  Brain, RefreshCw, Trash2, ShieldCheck, AlertTriangle, Search,
  Plus, FileText, Database, Shield, BookOpen, Check, X, Tag, Lock,
  Download, Edit3, ToggleLeft, ToggleRight, Sparkles, Layers
} from 'lucide-react';

type MemoryTab = 'vector' | 'workspace' | 'task' | 'knowledge' | 'preference';

type VectorMemoryEntry = {
  id: string;
  workspaceId: string;
  category: 'USER_PREFERENCE' | 'PROJECT_KNOWLEDGE' | 'SESSION_CONTEXT' | 'DOMAIN_ENTITY' | 'TASK_MEMORY' | 'CONVERSATIONAL_MEMORY';
  title: string;
  content: string;
  tags: string[];
  enabled?: boolean;
  metadata?: Record<string, any>;
  accessCount?: number;
  lastAccessedAt?: string;
  createdAt: string;
  updatedAt: string;
};

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
  const [activeTab, setActiveTab] = useState<MemoryTab>('vector');
  const [vectorEntries, setVectorEntries] = useState<VectorMemoryEntry[]>([]);
  const [taskRecords, setTaskRecords] = useState<TaskMemory[]>([]);
  const [workspaceEntries, setWorkspaceEntries] = useState<WorkspaceMemoryEntry[]>([]);
  const [knowledgeRecords, setKnowledgeRecords] = useState<KnowledgeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clearing, setClearing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [editingRecord, setEditingRecord] = useState<VectorMemoryEntry | null>(null);

  // New Memory Entry Form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<VectorMemoryEntry['category']>('PROJECT_KNOWLEDGE');
  const [newTags, setNewTags] = useState('');
  const [newSourceFile, setNewSourceFile] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [savingEntry, setSavingEntry] = useState(false);

  // Edit Form state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<VectorMemoryEntry['category']>('PROJECT_KNOWLEDGE');
  const [editTags, setEditTags] = useState('');
  const [editEnabled, setEditEnabled] = useState(true);
  const [updatingEntry, setUpdatingEntry] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    const targetWs = encodeURIComponent(workspaceId || 'default');
    try {
      const [vecRes, taskRes, wsRes, knowRes] = await Promise.allSettled([
        fetch(`/api/intelligence/vector-memory/stats?workspaceId=${targetWs}`).then(r => r.json()),
        fetch(`/api/intelligence/task-memory?workspaceId=${targetWs}`).then(r => r.json()),
        fetch(`/api/intelligence/workspace-memory?workspaceId=${targetWs}`).then(r => r.json()),
        fetch(`/api/intelligence/knowledge?workspaceId=${targetWs}`).then(r => r.json()),
      ]);

      if (vecRes.status === 'fulfilled' && vecRes.value?.ok) {
        setVectorEntries(Array.isArray(vecRes.value.entries) ? vecRes.value.entries : []);
      }
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

  const handleCheckDuplicate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    try {
      const res = await fetch('/api/intelligence/vector-memory/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspaceId || 'default',
          title: newTitle.trim(),
          content: newContent.trim(),
          threshold: 0.85,
        }),
      });
      const data = await res.json();
      if (data.ok && data.isDuplicate && data.duplicates?.length > 0) {
        const top = data.duplicates[0];
        setDuplicateWarning(`High similarity detected: "${top.entry.title}" (${(top.score * 100).toFixed(1)}% match)`);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // Ignore check duplicate failure
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || savingEntry) return;

    try {
      setSavingEntry(true);
      const parsedTags = newTags.split(',').map(t => t.trim()).filter(Boolean);
      
      const res = await fetch('/api/intelligence/vector-memory/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspaceId || 'default',
          category: newCategory,
          title: newTitle.trim(),
          content: newContent.trim(),
          tags: parsedTags,
          metadata: {
            sourceFile: newSourceFile.trim() || undefined,
            provenance: `user-defined://${workspaceId}/${newSourceFile.trim() || 'manual'}`,
          },
          checkDuplicate: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || 'Failed to save memory entry');
      }

      setShowAddModal(false);
      setNewTitle('');
      setNewContent('');
      setNewTags('');
      setNewSourceFile('');
      setDuplicateWarning(null);
      await loadData();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSavingEntry(false);
    }
  };

  const handleToggleEnabled = async (id: string) => {
    try {
      const res = await fetch(`/api/intelligence/vector-memory/${id}/toggle`, {
        method: 'POST',
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  const handleOpenEditModal = (entry: VectorMemoryEntry) => {
    setEditingRecord(entry);
    setEditTitle(entry.title);
    setEditContent(entry.content);
    setEditCategory(entry.category);
    setEditTags(entry.tags ? entry.tags.join(', ') : '');
    setEditEnabled(entry.enabled !== false);
    setShowEditModal(true);
  };

  const handleUpdateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !editTitle.trim() || !editContent.trim() || updatingEntry) return;

    try {
      setUpdatingEntry(true);
      const parsedTags = editTags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await fetch(`/api/intelligence/vector-memory/${editingRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          content: editContent.trim(),
          category: editCategory,
          tags: parsedTags,
          enabled: editEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to update memory');
      }
      setShowEditModal(false);
      setEditingRecord(null);
      await loadData();
    } catch (err: any) {
      alert(`Update error: ${err.message}`);
    } finally {
      setUpdatingEntry(false);
    }
  };

  const handleDeleteEntry = async (id: string, tab: MemoryTab) => {
    if (!window.confirm('Delete this memory record? This operation cannot be undone.')) return;

    try {
      if (tab === 'vector') {
        const res = await fetch(`/api/intelligence/vector-memory/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Delete failed');
      } else if (tab === 'workspace') {
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

  const handleExportMemory = () => {
    const targetWs = encodeURIComponent(workspaceId || 'default');
    window.open(`/api/intelligence/vector-memory/export?workspaceId=${targetWs}`, '_blank');
  };

  const clearAllTaskMemory = async () => {
    if (!window.confirm(`Clear all Task Memory for Workspace '${workspaceId}'? This operation cannot be undone.`)) return;
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
  const filteredVector = vectorEntries.filter(e => {
    const matchesSearch = !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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

  const preferenceEntries = vectorEntries.filter(e => e.category === 'USER_PREFERENCE');

  return (
    <section className="subpage memory-center w-full max-w-7xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="text-xs font-bold text-teal-400 tracking-wider uppercase flex items-center gap-2">
            <Brain size={15} /> ZYNTHEOR CORE X / UNIFIED MEMORY GOVERNANCE
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1">Memory &amp; Context Intelligence</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            5-domain contextual architecture: Conversational, User Preference, Knowledge, Task Memory, and Long-Term Vector Index.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-800/60 bg-teal-950/40 text-xs text-teal-300 hover:bg-teal-900/40 transition"
            onClick={handleExportMemory}
          >
            <Download size={13} />
            <span>Export JSON</span>
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

      {/* Active Workspace Scope */}
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
          <span>Strict Sovereign Tenant &amp; Workspace Isolation Enforced</span>
        </div>
      </div>

      {/* 5-Domain Architecture Map */}
      <div className="p-4 rounded-xl border border-teal-900/50 bg-teal-950/20 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-800/40 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-teal-500/20 text-teal-300 font-bold text-xs font-mono">5-DOMAIN MEMORY ARCHITECTURE</span>
            <span className="text-xs text-zinc-300 font-semibold">ระบบจัดเก็บและจัดการบริบทสมองกล 5 ระดับ</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-teal-800/50 text-teal-300">
            ZERO FAKE — REAL PERSISTENCE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <div className="font-bold text-teal-300 flex items-center gap-1.5">
              <span>⚡</span> 1. Vector Context
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">128-dim sovereign dense embeddings &amp; cosine search</div>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <span>🏢</span> 2. Workspace Memory
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">Architectural summaries, coding rules, &amp; root causes</div>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <div className="font-bold text-sky-300 flex items-center gap-1.5">
              <span>📋</span> 3. Task Memory
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">Multi-stage task execution, findings &amp; SHA-256 evidence</div>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>📚</span> 4. Knowledge Memory
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">Verified document facts &amp; domain entity records</div>
          </div>
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
            <div className="font-bold text-purple-300 flex items-center gap-1.5">
              <span>⚙️</span> 5. Preferences Memory
            </div>
            <div className="text-[10px] text-zinc-400 mt-1">Tone, Thai-first language rules &amp; custom user directives</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle size={15} className="text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="text-[10px] uppercase font-bold text-zinc-500">Vector Entries</div>
          <div className="text-xl font-bold text-teal-300 mt-1">{loading ? '—' : vectorEntries.length}</div>
          <div className="text-[10px] text-zinc-500">128-dim dense index</div>
        </div>
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="text-[10px] uppercase font-bold text-zinc-500">Workspace Entries</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{loading ? '—' : workspaceEntries.length}</div>
          <div className="text-[10px] text-zinc-500">Architectural rules</div>
        </div>
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="text-[10px] uppercase font-bold text-zinc-500">Task Records</div>
          <div className="text-xl font-bold text-sky-400 mt-1">{loading ? '—' : taskRecords.length}</div>
          <div className="text-[10px] text-zinc-500">Execution tasks</div>
        </div>
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="text-[10px] uppercase font-bold text-zinc-500">Knowledge</div>
          <div className="text-xl font-bold text-amber-300 mt-1">{loading ? '—' : knowledgeRecords.length}</div>
          <div className="text-[10px] text-zinc-500">Verified facts</div>
        </div>
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="text-[10px] uppercase font-bold text-zinc-500">Preferences</div>
          <div className="text-xl font-bold text-purple-300 mt-1">{loading ? '—' : preferenceEntries.length}</div>
          <div className="text-[10px] text-zinc-500">User tone &amp; rules</div>
        </div>
      </div>

      {/* Tab Navigation & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab('vector')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'vector'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            Vector Context ({vectorEntries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'workspace'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            Workspace ({workspaceEntries.length})
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
            Tasks ({taskRecords.length})
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
          <button
            type="button"
            onClick={() => setActiveTab('preference')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'preference'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            Preferences ({preferenceEntries.length})
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {activeTab === 'vector' && (
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Vector Categories</option>
              <option value="PROJECT_KNOWLEDGE">Project Knowledge</option>
              <option value="USER_PREFERENCE">User Preference</option>
              <option value="SESSION_CONTEXT">Session Context</option>
              <option value="DOMAIN_ENTITY">Domain Entity</option>
            </select>
          )}

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

      {/* Tab 1: Long-Term Vector Memory Context */}
      {activeTab === 'vector' && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">Loading vector memories…</div>
          ) : filteredVector.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
              No vector memories found matching filter. Click &quot;Add Memory Entry&quot; to index custom long-term context.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredVector.map(entry => (
                <div
                  key={entry.id}
                  className={`p-3.5 rounded-xl border bg-zinc-900/60 hover:border-zinc-700 transition flex flex-col justify-between text-xs space-y-2.5 ${
                    entry.enabled === false ? 'border-zinc-800/50 opacity-60' : 'border-zinc-800'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-zinc-200">{entry.title}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleEnabled(entry.id)}
                          title={entry.enabled === false ? 'Disabled in context assembly' : 'Enabled in context assembly'}
                          className={`p-1 rounded transition ${entry.enabled === false ? 'text-zinc-600 hover:text-zinc-400' : 'text-teal-400 hover:text-teal-300'}`}
                        >
                          {entry.enabled === false ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                        </button>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-teal-950/60 text-teal-300 border border-teal-800/40 shrink-0">
                          {entry.category.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <p className="text-zinc-400 text-[11px] leading-relaxed line-clamp-3">
                      {entry.content}
                    </p>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {entry.tags.map((t, idx) => (
                          <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                    <div className="flex items-center gap-2 truncate">
                      <span>Access count: <b className="text-zinc-300">{entry.accessCount || 0}</b></span>
                      <span>·</span>
                      <span>ID: <b className="font-mono text-zinc-400">{entry.id.slice(0, 12)}…</b></span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(entry)}
                        className="text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1"
                      >
                        <Edit3 size={11} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRecord({ ...entry, tab: 'vector' })}
                        className="text-teal-400 hover:text-teal-300 transition"
                      >
                        Inspect
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(entry.id, 'vector')}
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

      {/* Tab 2: Workspace Memory */}
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

      {/* Tab 3: Task Memory */}
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

      {/* Tab 4: Knowledge Records */}
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

      {/* Tab 5: Preferences Memory */}
      {activeTab === 'preference' && (
        <div className="space-y-3">
          {preferenceEntries.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
              No user preferences stored. You can add preferences under Category &quot;User Preference&quot;.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {preferenceEntries.map(p => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border border-purple-900/40 bg-purple-950/10 hover:border-purple-700/60 transition flex flex-col justify-between text-xs space-y-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-purple-200">{p.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-purple-950/80 text-purple-300 border border-purple-800/50">
                        PREFERENCE
                      </span>
                    </div>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">{p.content}</p>
                  </div>

                  <div className="pt-2 border-t border-purple-900/30 flex items-center justify-between text-[10px] text-zinc-400">
                    <span>Created: {new Date(p.createdAt).toLocaleDateString()}</span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(p)}
                      className="text-purple-400 hover:text-purple-300 transition flex items-center gap-1"
                    >
                      <Edit3 size={11} /> Edit Preference
                    </button>
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
                <Brain size={16} className="text-teal-400" /> Add Memory Record to 128-Dim Index
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setDuplicateWarning(null);
                }}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateMemory} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Memory Category Domain</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="PROJECT_KNOWLEDGE">Project Knowledge</option>
                  <option value="USER_PREFERENCE">User Preference</option>
                  <option value="SESSION_CONTEXT">Session Context</option>
                  <option value="DOMAIN_ENTITY">Domain Entity</option>
                  <option value="TASK_MEMORY">Task Memory</option>
                  <option value="CONVERSATIONAL_MEMORY">Conversational Memory</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onBlur={handleCheckDuplicate}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. SQLite/PostgreSQL Session Token Verification"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Source File / Context Provenance (Optional)</label>
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
                  onBlur={handleCheckDuplicate}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Describe the architectural pattern, invariant rule, or resolution knowledge..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={e => setNewTags(e.target.value)}
                  placeholder="e.g. architecture, auth, security, thai"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              {duplicateWarning && (
                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setDuplicateWarning(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-750 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEntry}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold transition disabled:opacity-50"
                >
                  {savingEntry ? 'Indexing…' : 'Save & Index Memory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Memory Modal */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Edit3 size={16} className="text-teal-400" /> Edit Memory Entry
              </span>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateMemory} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Category Domain</label>
                <select
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="PROJECT_KNOWLEDGE">Project Knowledge</option>
                  <option value="USER_PREFERENCE">User Preference</option>
                  <option value="SESSION_CONTEXT">Session Context</option>
                  <option value="DOMAIN_ENTITY">Domain Entity</option>
                  <option value="TASK_MEMORY">Task Memory</option>
                  <option value="CONVERSATIONAL_MEMORY">Conversational Memory</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Memory Content</label>
                <textarea
                  required
                  rows={4}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={e => setEditTags(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editEnabledCheck"
                  checked={editEnabled}
                  onChange={e => setEditEnabled(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="editEnabledCheck" className="text-zinc-300 text-xs font-medium cursor-pointer">
                  Enabled for auto-injection into prompt context
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-750 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingEntry}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold transition disabled:opacity-50"
                >
                  {updatingEntry ? 'Updating…' : 'Update Memory'}
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
