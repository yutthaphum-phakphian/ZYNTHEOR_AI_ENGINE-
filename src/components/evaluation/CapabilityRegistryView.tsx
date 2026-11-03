// P14 CapabilityRegistryView - FIXED TYPES
import React, { useMemo } from 'react';
import type { UnifiedEvaluation } from '../../evaluation/unifiedEngine';
import { buildCapabilityRegistry } from '../../evaluation/capabilityRegistry';
import type { Capability } from '../../evaluation/capabilityRegistry';

interface CapabilityViewProps { evaluation: UnifiedEvaluation; filter?: 'all' | 'verified' | 'experimental' | 'unavailable'; }

export const CapabilityRegistryView: React.FC<CapabilityViewProps> = ({ evaluation, filter = 'all' }) => {
  const registry: Capability[] = useMemo(() => buildCapabilityRegistry(evaluation), [evaluation]);
  const filtered: Capability[] = useMemo(() => {
    switch (filter) {
      case 'verified': return registry.filter(c => c.status === 'Verified');
      case 'experimental': return registry.filter(c => c.status === 'Experimental');
      case 'unavailable': return registry.filter(c => c.status === 'Unavailable');
      default: return registry;
    }
  }, [registry, filter]);

  const grouped = { Verified: filtered.filter(c => c.status === 'Verified'), Experimental: filtered.filter(c => c.status === 'Experimental'), Unavailable: filtered.filter(c => c.status === 'Unavailable') };

  return (
    <div style={{ background: '#0b0d12', color: '#e5e7eb', padding: '20px' }}>
      <h2 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>Capability Registry - REAL<span style={{ fontSize: '11px', background: '#151821', padding: '4px 8px', borderRadius: '6px' }}>{registry.length} from {evaluation.evaluationId}</span></h2>
      {(Object.entries(grouped) as [string, Capability[]][]).map(([status, caps]) => (
        <div key={status} style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><span className={`status-led ${status === 'Verified' ? 'verified' : status === 'Experimental' ? 'experimental' : 'unavailable'}`} />{status} ({caps.length})</h3>
          <div className="dashboard-grid">{caps.map(cap => (<div key={cap.capabilityId} className={`evaluation-card ${cap.status === 'Verified' ? 'verified' : cap.status === 'Experimental' ? 'experimental' : 'unavailable'}`}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}><strong style={{ fontSize: '13px' }}>{cap.name}</strong><span style={{ fontSize: '11px' }}>{cap.score}</span></div><div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '8px' }}>{cap.description}</div><div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '8px' }}>Ref: {cap.categoryRef} | Gate: {cap.gate}</div><div style={{ fontSize: '10px' }}><div style={{ fontWeight: 600, marginBottom: '4px' }}>Evidence (REAL):</div>{cap.evidence.map((ev, idx) => (<div key={idx} style={{ opacity: 0.8, marginBottom: '2px' }}>• {ev}</div>))}</div>{cap.dependencies.length > 0 && (<div style={{ fontSize: '10px', marginTop: '8px', opacity: 0.6 }}>Dependencies: {cap.dependencies.join(', ')}</div>)}</div>))}</div>
        </div>
      ))}
    </div>
  );
};
export default CapabilityRegistryView;
