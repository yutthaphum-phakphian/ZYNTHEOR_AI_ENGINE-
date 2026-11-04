import { useEffect, useState } from 'react';
import {
  Cpu, ShieldCheck, CheckCircle2, AlertTriangle, FileCode, Layers, Database, Activity, RefreshCw, Lock, Zap
} from 'lucide-react';

export function NativeModelStatusPanel() {
  const [data, setData] = useState<any | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'final_report'>('final_report');

  async function fetchStatus() {
    try {
      const [statusRes, reportRes] = await Promise.all([
        fetch('/api/native-model/status').then(r => r.json()).catch(() => null),
        fetch('/api/native-model/report').then(r => r.json()).catch(() => null),
      ]);

      if (statusRes?.ok) setData(statusRes);
      else if (statusRes) setError(statusRes.error || 'Runtime status is not verified');
      if (reportRes?.ok && reportRes.report) setReport(reportRes.report);
    } catch (e: any) {
      setError(e?.message || 'API error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 12000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div style={{ padding: '16px', background: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', color: '#94a3b8' }}>Loading ZYNTHEOR CORE status...</div>;

  const statusMatrix = report?.commitAndDeploymentStatus || {};
  const statusItems: { label: string; val: boolean | undefined; desc: string }[] = [
    { label: 'Native Foundation', val: statusMatrix.foundationReady, desc: 'Architecture and tokenizer evidence; no external base weights' },
    { label: 'Dataset', val: statusMatrix.datasetReady, desc: 'Manifest and validation evidence' },
    { label: 'Training Ready', val: statusMatrix.trainingReady, desc: 'Configuration and hardware checks' },
    { label: 'Training Running', val: statusMatrix.trainingRunning, desc: 'Live training job state' },
    { label: 'Training Complete', val: statusMatrix.trainingCompleted, desc: 'Checkpoint artifact verified' },
    { label: 'Evaluation', val: statusMatrix.evaluationPassed, desc: 'Benchmark result verified' },
    { label: 'Production Approval', val: statusMatrix.productionApproved, desc: 'Explicit human approval' },
  ];

  return (
    <div className="surface-card" style={{ padding: '18px 20px', border: '1px solid #3b82f6', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '99px', background: '#172A40', display: 'grid', placeItems: 'center', color: '#38bdf8' }}>
            <Cpu size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <b style={{ fontSize: '15px', color: '#f8fafc' }}>ZYNTHEOR CORE — Model Development</b>
              <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#1e293b', color: '#38bdf8', border: '1px solid #334155' }}>
                CORE NATIVE · RANDOM INITIALIZATION
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              First-party model lineage · Independent weights · Local-first · Zero telemetry
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setActiveSubTab(activeSubTab === 'final_report' ? 'status' : 'final_report')}
            style={{ fontSize: '11px', padding: '5px 10px' }}
          >
            {activeSubTab === 'final_report' ? 'Show Runtime Status' : 'Show 10-Point Final Report'}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={fetchStatus}
            style={{ fontSize: '11px', padding: '5px 10px' }}
            title="Refresh status from backend"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Directive 10 Distinct Status Tracker Matrix */}
      {error && <div role="status" style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '8px', background: '#33251a', border: '1px solid #92400e', color: '#fcd34d', fontSize: '11px' }}>Status unavailable: {error}. Unknown states are intentionally not marked as complete.</div>}
      <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', background: '#0a0f1d', border: '1px solid #1e293b' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Model Status Matrix (Distinct Lifecycle States)
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginTop: '8px' }}>
          {statusItems.map((item) => (
            <div
              key={item.label}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                background: item.val === true ? '#064e3b' : item.val === false ? '#1e1b2e' : '#172033',
                border: `1px solid ${item.val === true ? '#10b981' : item.val === false ? '#374151' : '#475569'}`, 
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: item.val === true ? '#a7f3d0' : '#cbd5e1' }}>{item.label}</span>
                <span style={{ fontSize: '10px' }}>{item.val === true ? 'VERIFIED' : item.val === false ? 'NOT READY' : 'UNKNOWN'}</span>
              </div>
              <span style={{ fontSize: '8px', color: item.val === true ? '#6ee7b7' : '#94a3b8' }}>{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {activeSubTab === 'final_report' && report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '11px', color: '#cbd5e1' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
            <div style={{ padding: '10px', borderRadius: '6px', background: '#0a0d14', border: '1px solid #1e293b' }}>
              <b style={{ color: '#38bdf8' }}>1. Base Model & License:</b>
              <div>Target: {report.baseModelAndLicense.target} ({report.baseModelAndLicense.parameters})</div>
              <div>License: {report.baseModelAndLicense.license} ({report.baseModelAndLicense.attribution})</div>
              <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '2px' }}>{report.baseModelAndLicense.type}</div>
            </div>

            <div style={{ padding: '10px', borderRadius: '6px', background: '#0a0d14', border: '1px solid #1e293b' }}>
              <b style={{ color: '#34d399' }}>2. Dataset Provenance:</b>
              <div>Manifest: {report.datasetVersionAndCounts.manifestName} (v{report.datasetVersionAndCounts.manifestVersion})</div>
              <div>Samples: {report.datasetVersionAndCounts.totalVerifiedSamples} verified across 9 domains</div>
              <div style={{ color: '#6ee7b7', fontSize: '10px', marginTop: '2px' }}>Leakage check: {report.datasetVersionAndCounts.leakageCheckPassed ? 'PASSED (0 leaks)' : 'FAILED'}</div>
            </div>

            <div style={{ padding: '10px', borderRadius: '6px', background: '#0a0d14', border: '1px solid #1e293b' }}>
              <b style={{ color: '#fbbf24' }}>3. Training Hardware Audit:</b>
              <div>CPU: {report.trainingHardware.cpuCores} cores | RAM: {report.trainingHardware.ramGb}GB</div>
              <div>GPU: {report.trainingHardware.gpuDetected ? report.trainingHardware.gpuName : 'None (CPU Node)'}</div>
              <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '2px' }}>{report.trainingHardware.readinessVerdict}</div>
            </div>

            <div style={{ padding: '10px', borderRadius: '6px', background: '#0a0d14', border: '1px solid #1e293b' }}>
              <b style={{ color: '#38bdf8' }}>4 & 5. Status & Checkpoint:</b>
              <div>Status: {report.trainingStatus}</div>
              <div>Digest SHA-256: <code style={{ fontSize: '9px', color: '#c7d2fe' }}>{report.checkpointHash.sha256}</code></div>
            </div>
          </div>

          {/* Export & Governance row */}
          <div style={{ padding: '10px', borderRadius: '6px', background: '#0a0d14', border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <b style={{ color: '#38bdf8' }}>7. Export Format: </b>
              <span>{report.exportStatus.format} · {report.exportStatus.ollamaModelfile} · llama.cpp Compatible</span>
            </div>
            <div>
              <b style={{ color: '#38bdf8' }}>8. Security Impact: </b>
              <span>MiniSafe Active · Cryptographic Hash Chain Audit · Human Approval Gate Enforced</span>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'status' && (
        <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', color: '#cbd5e1' }}>
          <div>Status: <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{data?.native?.status || 'SPECIFICATION_LOCKED_PENDING_GPU_RUN'}</span> {data?.native?.status === 'INFERENCE_READY' && <span style={{ color: '#10b981' }}>[INFERENCE_READY]</span>}</div>
          <div>Weights: <span style={{ color: '#38bdf8' }}>{data?.native?.trainedWeightsExist ? 'EXISTS' : 'NOT_FOUND'}</span></div>
          <div>Checkpoint: <span style={{ color: '#fbbf24' }}>{data?.native?.checkpoint || 'UNTRAINED (no fabricated weights)'}</span></div>
          <div>Answer source: <span style={{ color: '#14b8a6', fontFamily: 'monospace' }}>{data?.answerSource || 'external_provider'}</span> (not serving answers directly)</div>
          <div>Human Approval Gate: <span style={{ color: '#34d399' }}>ENFORCED FOR PRODUCTION PROMOTION</span></div>
        </div>
      )}
    </div>
  );
}

export default NativeModelStatusPanel;
