import React, { useState, useEffect, useCallback } from 'react';
import {
  Workflow,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  GitBranch,
  Terminal,
  Activity,
  Layers,
  ShieldCheck,
} from 'lucide-react';

export interface PipelineStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  progress: number;
  durationMs: number;
  message?: string;
}

export interface PipelineData {
  pipelineId: string;
  name: string;
  branch: string;
  commitSha: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  progress: number;
  currentStepIndex: number;
  totalSteps: number;
  completedSteps: number;
  startedAt: string;
  completedAt: string | null;
  steps: PipelineStep[];
  summary: {
    passed: number;
    failed: number;
    total: number;
    verdict: string;
  };
  verifiedAt: string;
}

interface PipelineMonitorProps {
  authHeaders?: () => Record<string, string>;
  onAuditRecord?: (type: string, detail: string) => void;
}

export function PipelineMonitor({ authHeaders, onAuditRecord }: PipelineMonitorProps) {
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [autoPoll, setAutoPoll] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPipeline = useCallback(async () => {
    try {
      const headers = authHeaders ? authHeaders() : {};
      const res = await fetch('/api/workspace/pipeline', { headers });
      const data = await res.json();
      if (res.ok && data.ok && data.pipeline) {
        setPipeline(data.pipeline);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch pipeline');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching pipeline');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  // Initial fetch
  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  // Polling effect: poll every 2.5 seconds when active or running
  useEffect(() => {
    if (!autoPoll) return;
    const intervalTime = pipeline?.status === 'running' ? 1500 : 4000;
    const timer = setInterval(() => {
      fetchPipeline();
    }, intervalTime);
    return () => clearInterval(timer);
  }, [autoPoll, pipeline?.status, fetchPipeline]);

  async function handleTrigger() {
    setTriggering(true);
    try {
      const headers = authHeaders ? { 'Content-Type': 'application/json', ...authHeaders() } : { 'Content-Type': 'application/json' };
      const res = await fetch('/api/workspace/pipeline/trigger', {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (res.ok && data.ok && data.pipeline) {
        setPipeline(data.pipeline);
        onAuditRecord?.('PIPELINE_RUN_TRIGGERED', data.pipeline.pipelineId);
      } else {
        setError(data.message || 'Trigger failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to trigger pipeline');
    } finally {
      setTriggering(false);
    }
  }

  const getStatusBadge = (status: PipelineStep['status'] | PipelineData['status']) => {
    switch (status) {
      case 'success':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, background: '#064e3b', color: '#6ee7b7', border: '1px solid #059669' }}>
            <CheckCircle2 size={12} /> SUCCESS
          </span>
        );
      case 'running':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, background: '#1e1b4b', color: '#c7d2fe', border: '1px solid #6366f1' }}>
            <RefreshCw size={12} className="spin" /> RUNNING
          </span>
        );
      case 'failed':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, background: '#450a0a', color: '#fca5a5', border: '1px solid #dc2626' }}>
            <AlertCircle size={12} /> FAILED
          </span>
        );
      case 'pending':
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 600, background: '#1e2433', color: '#94a3b8', border: '1px solid #334155' }}>
            <Clock size={12} /> PENDING
          </span>
        );
    }
  };

  return (
    <div
      className="pipeline-monitor-container"
      style={{
        border: '1px solid #283348',
        borderRadius: '12px',
        background: 'linear-gradient(145deg, #121824, #0e131d)',
        padding: '18px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
        marginTop: '16px',
        marginBottom: '16px',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #202a3d', paddingBottom: '14px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#252044', border: '1px solid #5a4b9c', display: 'grid', placeItems: 'center', color: '#bcaeff' }}>
            <Workflow size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <b style={{ fontSize: '13px', color: '#f1f5f9' }}>{pipeline?.name || 'Local Workspace Verification Suite'}</b>
              {pipeline && getStatusBadge(pipeline.status)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px', color: '#8899b0', marginTop: '3px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <GitBranch size={12} style={{ color: '#818cf8' }} /> {pipeline?.branch && pipeline.branch !== 'unavailable (no .git)' ? pipeline.branch : 'No Git Repo'}
              </span>
              <span>•</span>
              <span style={{ fontFamily: 'monospace', color: '#a5b4fc' }}>
                {pipeline?.commitSha && pipeline.commitSha !== 'unavailable' ? `#${pipeline.commitSha}` : 'No commit hash'}
              </span>
              <span>•</span>
              <span>Completed {pipeline?.completedSteps || 0} of {pipeline?.totalSteps || 5} steps</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#94a3b8', cursor: 'pointer', marginRight: '4px' }}>
            <input
              type="checkbox"
              checked={autoPoll}
              onChange={e => setAutoPoll(e.target.checked)}
              style={{ accentColor: '#14b8a6', cursor: 'pointer' }}
            />
            <span>Auto-poll (Real-time)</span>
          </label>
          <button
            type="button"
            className="secondary-button"
            style={{ fontSize: '10px', padding: '6px 10px' }}
            onClick={() => { setLoading(true); fetchPipeline(); }}
            disabled={loading}
            title="Poll now"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Poll</span>
          </button>
          <button
            type="button"
            className="primary-button"
            style={{ fontSize: '10px', padding: '6px 12px' }}
            onClick={handleTrigger}
            disabled={triggering || pipeline?.status === 'running'}
          >
            {triggering || pipeline?.status === 'running' ? (
              <RefreshCw size={13} className="spin" />
            ) : (
              <Play size={13} />
            )}
            <span>{pipeline?.status === 'running' ? 'Verifying…' : 'Run Local Verification'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#35161c', border: '1px solid #7f1d1d', borderRadius: '8px', color: '#fca5a5', fontSize: '11px', marginBottom: '14px' }}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Overall Progress Bar */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
          <span>Overall Pipeline Progress</span>
          <b style={{ color: pipeline?.status === 'success' ? '#6ee7b7' : pipeline?.status === 'failed' ? '#fca5a5' : '#38bdf8', fontFamily: 'monospace' }}>
            {pipeline?.progress || 0}%
          </b>
        </div>
        <div style={{ height: '7px', background: '#1c2436', borderRadius: '99px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pipeline?.progress || 0}%`,
              background:
                pipeline?.status === 'failed'
                  ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                  : pipeline?.status === 'success'
                  ? 'linear-gradient(90deg, #059669, #34d399)'
                  : 'linear-gradient(90deg, #0284c7, #14b8a6)',
              borderRadius: '99px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Step-by-Step Progress Bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {pipeline?.steps.map((step, idx) => {
          const isRunning = step.status === 'running';
          const isSuccess = step.status === 'success';
          const isFailed = step.status === 'failed';

          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '11px 14px',
                borderRadius: '8px',
                background: isRunning ? '#111f32' : '#0d121c',
                border: isRunning ? '1px solid #14b8a6' : '1px solid #1f283a',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <b style={{ fontSize: '11px', color: isRunning ? '#f1f5f9' : '#cbd5e1' }}>{step.name}</b>
                  {getStatusBadge(step.status)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10px', color: '#718096' }}>
                  {step.durationMs > 0 && <span>{(step.durationMs / 1000).toFixed(2)}s</span>}
                  <span style={{ fontFamily: 'monospace', color: isSuccess ? '#6ee7b7' : isRunning ? '#38bdf8' : '#64748b' }}>
                    {step.progress}%
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '9px', color: '#8899b0', lineHeight: 1.5 }}>
                {step.description}
                {step.message && (
                  <div style={{ color: isSuccess ? '#86efac' : isFailed ? '#fca5a5' : '#38bdf8', marginTop: '2px', fontFamily: 'monospace' }}>
                    ↳ {step.message}
                  </div>
                )}
              </div>

              {/* Step Mini Progress Bar */}
              <div style={{ height: '4px', background: '#172033', borderRadius: '99px', overflow: 'hidden', marginTop: '2px' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${step.progress}%`,
                    background: isFailed
                      ? '#ef4444'
                      : isSuccess
                      ? '#10b981'
                      : isRunning
                      ? 'linear-gradient(90deg, #0284c7, #14b8a6)'
                      : '#334155',
                    borderRadius: '99px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      {pipeline && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #1e283b', fontSize: '10px', color: '#64748b' }}>
          <span>Verdict: <b style={{ color: pipeline.status === 'success' ? '#34d399' : '#f87171' }}>{pipeline.summary.verdict}</b></span>
          <span style={{ color: '#8999b0' }}>In-app local gates only (Typecheck, Tests, Build, Security). Live CI/CD executes on GitHub Actions.</span>
          <span>Verified At: {new Date(pipeline.verifiedAt).toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
}
