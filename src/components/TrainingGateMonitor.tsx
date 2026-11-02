import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  UserCheck,
  FileCode,
  Layers,
  Award
} from 'lucide-react';

export type GateStatus = 'PASSED' | 'WAITING' | 'BLOCKED' | 'FAILED' | 'PENDING';

export type GateFlagName =
  | 'FOUNDATION_READY'
  | 'DATASET_READY'
  | 'TRAINING_CONFIG_READY'
  | 'GPU_RUNTIME_READY'
  | 'TRAINING_RUNNING'
  | 'TRAINING_COMPLETED'
  | 'BASELINE_EVALUATION_PASSED'
  | 'FINETUNED_EVALUATION_PASSED'
  | 'PRODUCTION_APPROVAL_PENDING'
  | 'PRODUCTION_APPROVED';

export interface TrainingGateFlag {
  flag: GateFlagName;
  stageIndex: number;
  status: GateStatus;
  timestamp: string;
  operator: string;
  evidenceSummary: string;
  evidenceHashSha256: string;
  passingCondition: string;
  failureReason?: string;
}

export interface GateStateReport {
  timestamp: string;
  currentStage: GateFlagName;
  overallReadyForProduction: boolean;
  flags: Record<GateFlagName, TrainingGateFlag>;
  gpuRuntime?: any;
  auditHashChainDigest: string;
}

const GATE_TITLES: Record<GateFlagName, string> = {
  FOUNDATION_READY: '1. Foundation Target Provenance & License',
  DATASET_READY: '2. Domain Dataset Verification (0% Leakage)',
  TRAINING_CONFIG_READY: '3. Hyperparameter Specification Lock',
  GPU_RUNTIME_READY: '4. Remote CUDA GPU Runtime Pre-flight',
  TRAINING_RUNNING: '5. Gradient Backpropagation Active',
  TRAINING_COMPLETED: '6. Checkpoint Weights Serialization',
  BASELINE_EVALUATION_PASSED: '7. Baseline Model 8-Category Benchmark',
  FINETUNED_EVALUATION_PASSED: '8. Fine-Tuned Model Regression Benchmark',
  PRODUCTION_APPROVAL_PENDING: '9. Production Promotion Review Ready',
  PRODUCTION_APPROVED: '10. Human Operator Signed Production Gate',
};

export function TrainingGateMonitor() {
  const [report, setReport] = useState<GateStateReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [promoting, setPromoting] = useState<boolean>(false);
  const [promoteNotes, setPromoteNotes] = useState<string>('Production promotion ratified after full audit');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState<boolean>(false);

  async function fetchGateStatus() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/training/gates');
      const data = await res.json();
      if (res.ok && data.ok && data.state) {
        setReport(data.state);
      } else {
        setError(data.message || 'Failed to fetch training gate state report');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to training gate state API');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGateStatus();
  }, []);

  async function handlePromoteProduction() {
    setPromoting(true);
    setError(null);
    try {
      const res = await fetch('/api/training/gates/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isHumanApproved: true,
          operatorNotes: promoteNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setShowPromoteModal(false);
        fetchGateStatus();
      } else {
        setError(data.message || 'Promotion rejected by governance policy');
      }
    } catch (err: any) {
      setError(err.message || 'Error executing promotion sign-off');
    } finally {
      setPromoting(false);
    }
  }

  function handleCopyHash(hash: string) {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  }

  function getStatusStyle(status: GateStatus) {
    switch (status) {
      case 'PASSED':
        return {
          bg: '#064e3b',
          color: '#34d399',
          border: '#059669',
          icon: CheckCircle2,
          label: 'PASSED',
        };
      case 'WAITING':
        return {
          bg: '#362305',
          color: '#fbbf24',
          border: '#d97706',
          icon: Clock,
          label: 'WAITING',
        };
      case 'BLOCKED':
      case 'FAILED':
        return {
          bg: '#3b1219',
          color: '#f87171',
          border: '#ef4444',
          icon: AlertTriangle,
          label: status,
        };
      case 'PENDING':
      default:
        return {
          bg: '#1e1b4b',
          color: '#a78bfa',
          border: '#6366f1',
          icon: Lock,
          label: 'PENDING',
        };
    }
  }

  const flagsList = report?.flags ? (Object.values(report.flags) as TrainingGateFlag[]) : [];

  return (
    <div className="surface-card" style={{ padding: '20px', borderRadius: '12px', marginTop: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0f9ff' }}>
            <Award size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <b style={{ fontSize: '15px', color: '#f8fafc' }}>10-Stage Training Gate Lifecycle Monitor</b>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontWeight: 700,
                  background: report?.overallReadyForProduction ? '#064e3b' : '#1e1b4b',
                  color: report?.overallReadyForProduction ? '#34d399' : '#c7d2fe',
                  border: `1px solid ${report?.overallReadyForProduction ? '#059669' : '#6366f1'}`,
                }}
              >
                {report?.overallReadyForProduction ? 'PRODUCTION APPROVED' : `ACTIVE STAGE: ${report?.currentStage || 'FOUNDATION'}`}
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Cryptographically enforced quality gates with SHA-256 evidence digests
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="secondary-button"
            onClick={fetchGateStatus}
            disabled={loading}
            style={{ fontSize: '11px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Evaluating…' : 'Re-Evaluate Gates'}
          </button>

          <button
            type="button"
            onClick={() => setShowPromoteModal(true)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              background: '#0284c7',
              color: '#ffffff',
              border: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 12px rgba(2,132,199,0.3)',
            }}
          >
            <UserCheck size={13} /> Human Approval Sign-Off
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px', borderRadius: '8px', background: '#3b1219', border: '1px solid #ef4444', color: '#fee2e2', fontSize: '12px', marginBottom: '16px' }}>
          <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px' }} />
          {error}
        </div>
      )}

      {loading && flagsList.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block' }} />
          Evaluating 10-stage state machine and SHA-256 evidence digests…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {flagsList.map((flag) => {
            const style = getStatusStyle(flag.status);
            const StatusIcon = style.icon;
            const title = GATE_TITLES[flag.flag] || flag.flag;

            return (
              <div
                key={flag.flag}
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  background: '#0b1120',
                  border: `1px solid ${style.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {/* Flag Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <b style={{ fontSize: '12px', color: '#f1f5f9' }}>{title}</b>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      background: style.bg,
                      color: style.color,
                      border: `1px solid ${style.border}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <StatusIcon size={12} />
                    {style.label}
                  </span>
                </div>

                {/* Evidence Summary */}
                <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1', lineHeight: 1.4 }}>
                  {flag.evidenceSummary}
                </p>

                {flag.failureReason && (
                  <div style={{ fontSize: '10px', color: '#f87171', background: '#3b1219', padding: '4px 8px', borderRadius: '4px' }}>
                    Reason: {flag.failureReason}
                  </div>
                )}

                {/* Passing Condition */}
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  <b>Passing Rule:</b> {flag.passingCondition}
                </div>

                {/* SHA-256 Digest Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px dashed #1e293b', marginTop: '2px' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#38bdf8' }}>
                    SHA-256: {flag.evidenceHashSha256 ? flag.evidenceHashSha256.slice(0, 14) : 'PENDING'}…
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyHash(flag.evidenceHashSha256)}
                    style={{ background: 'transparent', border: 0, color: '#94a3b8', cursor: 'pointer', fontSize: '10px', padding: 0 }}
                    title="Copy full SHA-256 Digest"
                  >
                    {copiedHash === flag.evidenceHashSha256 ? <Check size={11} style={{ color: '#10b981' }} /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Human Approval Modal */}
      {showPromoteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              borderRadius: '12px',
              background: '#0f172a',
              border: '1px solid #0284c7',
              padding: '20px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <UserCheck size={18} />
              </div>
              <div>
                <b style={{ fontSize: '14px', color: '#f8fafc' }}>Flag 10: Human Operator Promotion Gate</b>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                  Sign off to promote fine-tuned model weights to production
                </p>
              </div>
            </div>

            <div style={{ padding: '10px', borderRadius: '6px', background: '#091322', border: '1px solid #1e3a5f', fontSize: '11px', color: '#cbd5e1', marginBottom: '14px' }}>
              <b>Governance Requirement:</b> Flag 10 strictly requires manual human operator sign-off. It will verify that Flags 1-9 (including real trained weights and fine-tuned benchmark evaluation) are satisfied before unlocking production deployment.
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                Operator Signature Notes
              </label>
              <textarea
                value={promoteNotes}
                onChange={(e) => setPromoteNotes(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: '#030712',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowPromoteModal(false)}
                style={{ fontSize: '11px', padding: '6px 12px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePromoteProduction}
                disabled={promoting}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: '#10b981',
                  color: '#ffffff',
                  border: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {promoting ? 'Promoting…' : 'Sign & Promote Model'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrainingGateMonitor;
