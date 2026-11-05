// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Lock, Key, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import type { AuditEntry } from '../services/auditLedger';

export interface EvidenceProvenancePanelProps {
  records: AuditEntry[];
  onNavigateToAuditLedger?: () => void;
  tenantId?: string;
}

export interface ProvenanceStatusState {
  isStructurallyValid: boolean;
  isAuthentic: boolean;
  verifiedCount: number;
  totalCount: number;
  activeKeyId: string;
  signerIdentity: string;
  failedEntryId?: string;
  reason?: string;
}

export function EvidenceProvenancePanel({
  records,
  onNavigateToAuditLedger,
  tenantId = 'default-tenant',
}: EvidenceProvenancePanelProps) {
  const [loading, setLoading] = useState(false);
  const [provenance, setProvenance] = useState<ProvenanceStatusState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runServerVerification = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/evidence/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, tenantId }),
      });

      if (res.ok) {
        const data = await res.json();
        setProvenance(data.provenance);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.message || 'Verification endpoint returned error');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect to verification endpoint');
    } finally {
      setLoading(false);
    }
  }, [records, tenantId]);

  useEffect(() => {
    runServerVerification();
  }, [runServerVerification]);

  const isFullyVerified = provenance?.isStructurallyValid && provenance?.isAuthentic;

  return (
    <div
      style={{
        background: '#0d1828',
        border: `1px solid ${isFullyVerified ? '#10b981' : provenance ? '#ef4444' : '#1e293b'}`,
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: isFullyVerified
          ? '0 4px 20px rgba(16, 185, 129, 0.08)'
          : '0 4px 20px rgba(239, 68, 68, 0.08)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: isFullyVerified ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${isFullyVerified ? '#10b981' : '#ef4444'}`,
            }}
          >
            {isFullyVerified ? (
              <ShieldCheck size={20} style={{ color: '#34d399' }} />
            ) : (
              <ShieldAlert size={20} style={{ color: '#f87171' }} />
            )}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
              Cryptographic Evidence & Provenance Verification Status
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Dual-Layer Security: Structural Hash Continuity + Server-Signed Ed25519 Digital Signatures
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="secondary-button"
            onClick={runServerVerification}
            disabled={loading}
            style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Verify Provenance</span>
          </button>

          {onNavigateToAuditLedger && (
            <button
              type="button"
              className="primary-button"
              onClick={onNavigateToAuditLedger}
              style={{
                fontSize: '11px',
                padding: '4px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'linear-gradient(120deg, #14b8a6, #0d9488)',
                color: '#ffffff',
                fontWeight: 600,
              }}
            >
              <span>View Audit Ledger</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: '12px', color: '#94a3b8', padding: '8px' }}>Evaluating cryptographic signatures...</div>
      ) : errorMsg ? (
        <div style={{ fontSize: '11px', color: '#f87171', padding: '8px 12px', background: '#2a0a0f', borderRadius: '6px' }}>
          ⚠️ {errorMsg}
        </div>
      ) : provenance ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {/* Structural Hash Chain Integrity */}
          <div style={{ padding: '10px 12px', background: '#070c18', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              1. Structural Hash Continuity
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px', color: provenance.isStructurallyValid ? '#34d399' : '#f87171' }}>
              {provenance.isStructurallyValid ? '✓ SHA-256 INTACT' : '⚠ CHAIN BROKEN'}
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
              Sequential parent pointer links valid
            </div>
          </div>

          {/* Cryptographic Evidence Authenticity */}
          <div style={{ padding: '10px 12px', background: '#070c18', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              2. Cryptographic Authenticity
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px', color: provenance.isAuthentic ? '#38bdf8' : '#f87171' }}>
              {provenance.isAuthentic ? '✓ Ed25519 SIGNED' : '⚠ UNVERIFIED'}
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
              Verified: {provenance.verifiedCount} / {provenance.totalCount} entries
            </div>
          </div>

          {/* Active Key ID Metadata */}
          <div style={{ padding: '10px 12px', background: '#070c18', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              3. Server Signing Key ID
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '2px', color: '#a78bfa', fontFamily: 'monospace' }}>
              {provenance.activeKeyId}
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
              Algorithm: Ed25519 Asymmetric
            </div>
          </div>

          {/* Signer Identity */}
          <div style={{ padding: '10px 12px', background: '#070c18', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              4. Verified Signer Identity
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '2px', color: '#f1f5f9' }}>
              {provenance.signerIdentity}
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
              Tenant: {tenantId}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default EvidenceProvenancePanel;
