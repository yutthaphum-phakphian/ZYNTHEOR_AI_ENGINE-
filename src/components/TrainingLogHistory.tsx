import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Search,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  HardDrive,
  ShieldCheck,
  Terminal,
  Activity,
  Layers,
  BarChart2
} from 'lucide-react';

export interface TrainingRunLog {
  runId: string;
  modelName: string;
  baseModel: string;
  method: string;
  hyperparameters: {
    lora_r?: number;
    lora_alpha?: number;
    learning_rate?: number;
    batch_size?: number;
    gradient_accumulation?: number;
    [key: string]: any;
  };
  startedAt: string;
  completedAt: string;
  status: 'COMPLETED' | 'SMOKE_VERIFIED' | 'RUNNING' | 'FAILED' | string;
  epochs: number;
  totalSteps: number;
  finalTrainLoss: number | null;
  finalValLoss: number | null;
  finalAccuracyPct: number | null;
  checkpointHashSha256: string | null;
  checkpointPath: string | null;
  hardwareUsed: string;
  evidenceDigestSha256: string | null;
  logs: string[];
}

export function TrainingLogHistory() {
  const [runs, setRuns] = useState<TrainingRunLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  async function fetchTrainingHistory() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/training/history');
      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.runs)) {
        setRuns(data.runs);
      } else {
        setError(data.message || 'Failed to load training run history');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to training history server');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTrainingHistory();
  }, []);

  function handleCopyHash(hash: string | null) {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  }

  const filteredRuns = runs.filter(run => {
    const q = searchQuery.toLowerCase();
    return (
      run.runId.toLowerCase().includes(q) ||
      run.modelName.toLowerCase().includes(q) ||
      run.method.toLowerCase().includes(q) ||
      (run.checkpointHashSha256 || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="surface-card" style={{ padding: '20px', borderRadius: '12px', marginTop: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#064e3b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
            <FileText size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <b style={{ fontSize: '15px', color: '#f8fafc' }}>Training Log History & Checkpoint Ledger</b>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: '#065f46', color: '#a7f3d0', fontWeight: 700 }}>
                {runs.length} RUNS RECORDED
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Historical training executions, loss metrics, and SHA-256 checkpoint digests
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search run ID, model, or hash…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 10px 6px 30px',
                borderRadius: '6px',
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#f8fafc',
                fontSize: '12px',
                width: '210px',
              }}
            />
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={fetchTrainingHistory}
            disabled={loading}
            style={{ fontSize: '11px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px', borderRadius: '8px', background: '#3b1219', border: '1px solid #ef4444', color: '#fee2e2', fontSize: '12px', marginBottom: '16px' }}>
          <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px' }} />
          {error}
        </div>
      )}

      {loading && runs.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block' }} />
          Retrieving verified training logs and checkpoint fingerprints from server…
        </div>
      ) : filteredRuns.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
          No training runs matched your query.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredRuns.map((run) => {
            const isExpanded = expandedRunId === run.runId;
            const isCompleted = run.status === 'COMPLETED';
            const isSmoke = run.status === 'SMOKE_VERIFIED';

            return (
              <div
                key={run.runId}
                style={{
                  borderRadius: '8px',
                  background: '#0b1120',
                  border: `1px solid ${isExpanded ? '#3b82f6' : '#1e293b'}`,
                  overflow: 'hidden',
                  transition: 'border-color 0.15s ease',
                }}
              >
                {/* Card Header Bar */}
                <div
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: '#0d1527',
                    userSelect: 'none',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                  onClick={() => setExpandedRunId(isExpanded ? null : run.runId)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: '#64748b' }}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <b style={{ fontSize: '13px', color: '#f1f5f9' }}>{run.modelName}</b>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            background: isCompleted ? '#064e3b' : isSmoke ? '#1e293b' : '#3b1219',
                            color: isCompleted ? '#34d399' : isSmoke ? '#a78bfa' : '#f87171',
                            border: `1px solid ${isCompleted ? '#059669' : isSmoke ? '#6366f1' : '#ef4444'}`,
                          }}
                        >
                          {run.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px', fontSize: '11px', color: '#94a3b8' }}>
                        <span>Run ID: <code style={{ color: '#38bdf8' }}>{run.runId}</code></span>
                        <span>·</span>
                        <span>Method: {run.method}</span>
                        <span>·</span>
                        <span><Clock size={11} style={{ display: 'inline', marginRight: '3px' }} />{new Date(run.completedAt || run.startedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Metrics KPI Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Train Loss</span>
                      <b style={{ fontSize: '13px', color: '#34d399' }}>{run.finalTrainLoss?.toFixed(4) || 'N/A'}</b>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Val Loss</span>
                      <b style={{ fontSize: '13px', color: '#fbbf24' }}>{run.finalValLoss?.toFixed(4) || 'N/A'}</b>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Accuracy</span>
                      <b style={{ fontSize: '13px', color: '#38bdf8' }}>{run.finalAccuracyPct == null ? 'UNVERIFIED' : `${run.finalAccuracyPct}%`}</b>
                    </div>
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div style={{ padding: '16px', borderTop: '1px solid #1e293b', background: '#070b14', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Hardware & Checkpoint Metadata Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '10px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid #1e293b' }}>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                          <Cpu size={12} style={{ display: 'inline', marginRight: '4px' }} /> Hardware & Execution
                        </span>
                        <div style={{ fontSize: '12px', color: '#e2e8f0', marginTop: '4px', fontWeight: 600 }}>
                          {run.hardwareUsed}
                        </div>
                        <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                          Base Target: {run.baseModel}
                        </span>
                      </div>

                      <div style={{ padding: '10px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid #1e293b' }}>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                          <HardDrive size={12} style={{ display: 'inline', marginRight: '4px' }} /> Checkpoint Path
                        </span>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#38bdf8', marginTop: '4px', wordBreak: 'break-all' }}>
                          {run.checkpointPath || 'UNVERIFIED — no checkpoint path recorded'}
                        </div>
                        <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                          Steps: {run.totalSteps} · Epochs: {run.epochs}
                        </span>
                      </div>

                      <div style={{ padding: '10px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid #1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                            <ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px' }} /> SHA-256 Checkpoint Digest
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyHash(run.checkpointHashSha256);
                            }}
                            style={{ background: 'transparent', border: 0, color: '#38bdf8', cursor: 'pointer', padding: 0 }}
                            title={run.checkpointHashSha256 ? 'Copy SHA-256 Hash' : 'No verified checkpoint digest'}
                            disabled={!run.checkpointHashSha256}
                          >
                            {copiedHash === run.checkpointHashSha256 && run.checkpointHashSha256 ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                          </button>
                        </div>
                        <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#34d399', marginTop: '4px', wordBreak: 'break-all' }}>
                          {run.checkpointHashSha256 || 'UNVERIFIED — no checkpoint digest recorded'}
                        </div>
                        <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                          Evidence Digest: {run.evidenceDigestSha256 ? `${run.evidenceDigestSha256.slice(0, 16)}…` : 'UNVERIFIED'}
                        </span>
                      </div>
                    </div>

                    {/* Hyperparameters Pill List */}
                    {run.hyperparameters && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '11px' }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Hyperparameters:</span>
                        {run.hyperparameters.lora_r && (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#1e293b', color: '#cbd5e1' }}>
                            Rank r={run.hyperparameters.lora_r}
                          </span>
                        )}
                        {run.hyperparameters.lora_alpha && (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#1e293b', color: '#cbd5e1' }}>
                            Alpha α={run.hyperparameters.lora_alpha}
                          </span>
                        )}
                        {run.hyperparameters.learning_rate && (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#1e293b', color: '#cbd5e1' }}>
                            LR={run.hyperparameters.learning_rate}
                          </span>
                        )}
                        {run.hyperparameters.gradient_accumulation && (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#1e293b', color: '#cbd5e1' }}>
                            Grad Accum={run.hyperparameters.gradient_accumulation}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Execution Terminal Logs Block */}
                    {run.logs && run.logs.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <Terminal size={14} style={{ color: '#34d399' }} />
                          <b style={{ fontSize: '12px', color: '#f8fafc' }}>Training Execution Terminal Output</b>
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: '12px 14px',
                            borderRadius: '6px',
                            background: '#030712',
                            border: '1px solid #1e293b',
                            color: '#4ade80',
                            fontSize: '11px',
                            lineHeight: 1.6,
                            fontFamily: 'monospace',
                            maxHeight: '180px',
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {run.logs.join('\n')}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TrainingLogHistory;
