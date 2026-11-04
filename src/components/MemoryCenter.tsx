import { useCallback, useEffect, useState } from 'react';
import { Brain, RefreshCw, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';

type TaskMemory = { id: string; taskId?: string; goal: string; category?: string; status?: string; stagesCompleted?: string[]; findings?: string[]; evidenceDigests?: string[]; createdAt?: string; updatedAt?: string };

export function MemoryCenter({ workspaceId }: { workspaceId: string }) {
  const [records, setRecords] = useState<TaskMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clearing, setClearing] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/intelligence/task-memory?workspaceId=${encodeURIComponent(workspaceId || 'default')}`);
      const data = await response.json();
      if (!response.ok || data.ok !== true) throw new Error(data.message || data.error || 'Memory service unavailable');
      setRecords(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load memory'); }
    finally { setLoading(false); }
  }, [workspaceId]);
  useEffect(() => { void load(); }, [load]);
  const clear = async () => {
    if (!window.confirm('ล้าง Task Memory ทั้งหมดของ Workspace นี้หรือไม่? การดำเนินการนี้ย้อนกลับไม่ได้')) return;
    setClearing(true); setError('');
    try {
      const response = await fetch(`/api/intelligence/task-memory?workspaceId=${encodeURIComponent(workspaceId || 'default')}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || data.ok !== true) throw new Error(data.message || data.error || 'Memory clear failed');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to clear memory'); }
    finally { setClearing(false); }
  };
  return <section className="subpage memory-center">
    <div className="page-heading"><div><div className="eyebrow">CORE X / MEMORY GOVERNANCE</div><h1>Memory Center</h1><p>ตรวจสอบ Task Memory ที่ระบบบันทึก แยกตาม Workspace พร้อมควบคุมการล้างข้อมูล</p></div><div className="heading-actions"><button className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={14}/> Refresh</button><button className="secondary-button danger-button" onClick={() => void clear()} disabled={clearing || loading || records.length === 0}><Trash2 size={14}/> Clear workspace memory</button></div></div>
    <div className="memory-scope-card"><Brain size={20}/><div><b>Workspace scope</b><span>{workspaceId || 'default'}</span></div><div className="memory-scope-note"><ShieldCheck size={15}/> Server-side user and workspace isolation applies</div></div>
    {error && <div className="memory-error"><AlertTriangle size={16}/>{error}</div>}
    <div className="memory-summary-grid"><div><small>VISIBLE RECORDS</small><strong>{loading ? '—' : records.length}</strong></div><div><small>ACTIVE TASKS</small><strong>{records.filter(r => r.status === 'ACTIVE').length}</strong></div><div><small>WITH EVIDENCE</small><strong>{records.filter(r => (r.evidenceDigests?.length || 0) > 0).length}</strong></div></div>
    {loading ? <div className="empty-state">Loading workspace memory…</div> : records.length === 0 ? <div className="empty-state">No task memory records are visible in this workspace.</div> : <div className="memory-record-list">{records.map(record => <article className="memory-record" key={record.id}><div className="memory-record-head"><b>{record.goal}</b><span className={`memory-status ${String(record.status || 'UNKNOWN').toLowerCase()}`}>{record.status || 'UNKNOWN'}</span></div><div className="memory-record-meta">{record.category || 'General'} · Updated {record.updatedAt ? new Date(record.updatedAt).toLocaleString() : 'unknown'}</div><div className="memory-record-counts"><span>{record.stagesCompleted?.length || 0} stages</span><span>{record.findings?.length || 0} findings</span><span>{record.evidenceDigests?.length || 0} evidence digests</span></div>{record.findings?.length ? <ul>{record.findings.slice(0, 3).map((finding, i) => <li key={i}>{finding}</li>)}</ul> : null}</article>)}</div>}
    <p className="memory-footnote">This view exposes Task Memory only. It does not imply that chat history, uploaded files, or model training data are stored in this service.</p>
  </section>;
}
