import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  WandSparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  ArrowUpRight,
  FileText,
  Copy,
  ExternalLink,
  Shield,
  Clock,
  Key,
} from 'lucide-react';
import { TruthKernel, type DetailedEvidenceRecord, type ClaimTruthCategory } from '../../lib/truth-kernel.ts';
import { createAuditEntry } from '../services/auditLedger';

export interface TruthVerificationBadgeProps {
  content: string;
  isAssistant?: boolean;
  recordAudit?: (action: string, detail: string) => Promise<void> | void;
  setToast?: (msg: string) => void;
}

export interface ContextMenuState {
  x: number;
  y: number;
  claimId: string;
  claimText: string;
  currentCategory: ClaimTruthCategory;
  record?: DetailedEvidenceRecord;
}

export function TruthVerificationBadge({
  content,
  isAssistant = true,
  recordAudit,
  setToast,
}: TruthVerificationBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ClaimTruthCategory>>({});
  const [claimToPromote, setClaimToPromote] = useState<{ id: string; text: string } | null>(null);
  const [evidenceDetailModal, setEvidenceDetailModal] = useState<DetailedEvidenceRecord | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [copiedSha, setCopiedSha] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setEvidenceDetailModal(null);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!isAssistant || !content || content.trim().length < 5) return null;

  const kernel = new TruthKernel();
  const result = kernel.processHardOutputGate(content, 'NATIVE');

  // Update records with user overrides
  const rawRecords = result.evidenceRecords;
  const records: DetailedEvidenceRecord[] = rawRecords.map(r => {
    const override = statusOverrides[r.claimId];
    if (override) {
      return {
        ...r,
        truthCategory: override,
        evidenceState: override === 'VERIFIED_FACT' ? 'VERIFIED' : override === 'CONTRADICTED' ? 'CONTRADICTED' : 'UNVERIFIED',
        confidence: override === 'VERIFIED_FACT' ? 1.0 : 0.5,
      };
    }
    return r;
  });

  const verifiedFacts = records.filter(r => r.truthCategory === 'VERIFIED_FACT');
  const proposedClaims = records.filter(r => r.truthCategory === 'PROPOSED');
  const assumptions = records.filter(r => r.truthCategory === 'ASSUMPTION');
  const contradicted = records.filter(r => r.truthCategory === 'CONTRADICTED');

  const primaryCategory: ClaimTruthCategory =
    contradicted.length > 0
      ? 'CONTRADICTED'
      : verifiedFacts.length > 0 && proposedClaims.length === 0 && assumptions.length === 0
      ? 'VERIFIED_FACT'
      : proposedClaims.length > 0
      ? 'PROPOSED'
      : 'ASSUMPTION';

  const badgeStyles: Record<
    ClaimTruthCategory,
    { bg: string; border: string; text: string; icon: any; label: string }
  > = {
    VERIFIED_FACT: {
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.35)',
      text: '#6ee7b7',
      icon: CheckCircle2,
      label: 'VERIFIED_FACT',
    },
    PROPOSED: {
      bg: 'rgba(56, 189, 248, 0.12)',
      border: 'rgba(56, 189, 248, 0.35)',
      text: '#7dd3fc',
      icon: WandSparkles,
      label: 'PROPOSED',
    },
    ASSUMPTION: {
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.35)',
      text: '#fcd34d',
      icon: HelpCircle,
      label: 'ASSUMPTION',
    },
    CONTRADICTED: {
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.35)',
      text: '#fca5a5',
      icon: AlertTriangle,
      label: 'CONTRADICTED',
    },
  };

  const currentStyle = badgeStyles[primaryCategory];
  const IconComponent = currentStyle.icon;

  const handleChangeClaimStatus = async (
    claimId: string,
    claimText: string,
    newCategory: ClaimTruthCategory,
    existingRecord?: DetailedEvidenceRecord
  ) => {
    setStatusOverrides(prev => ({ ...prev, [claimId]: newCategory }));

    const evidenceState = newCategory === 'VERIFIED_FACT' ? 'VERIFIED' : newCategory === 'CONTRADICTED' ? 'CONTRADICTED' : 'UNVERIFIED';
    const isProposal = newCategory === 'PROPOSED';

    const regRecord = kernel.registerClaim(claimText, 'runtime_behavior', {
      evidenceState,
      isProposal,
      source: 'UserVerificationToggle',
    });

    const actionName = newCategory === 'VERIFIED_FACT'
      ? 'TRUTH_FACT_PROMOTED_BY_HUMAN'
      : newCategory === 'ASSUMPTION'
      ? 'TRUTH_CLAIM_FLAGGED_ASSUMPTION'
      : newCategory === 'PROPOSED'
      ? 'TRUTH_CLAIM_SET_PROPOSED'
      : 'TRUTH_CLAIM_FLAGGED_CONTRADICTED';

    const auditDetail = `claimId=${claimId}; claimText="${claimText}"; newStatus=${newCategory}; sha256=${regRecord.sha256Digest}; updatedBy=UserToggle`;

    if (recordAudit) {
      await recordAudit(actionName, auditDetail);
    } else {
      createAuditEntry(actionName, auditDetail);
    }

    if (setToast) {
      setToast(`Updated claim status to ${newCategory} & logged to Audit Ledger ✅`);
    }
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    claimId: string,
    claimText: string,
    currentCategory: ClaimTruthCategory,
    rec?: DetailedEvidenceRecord
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Clamp coordinates inside window
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 200);

    setContextMenu({
      x,
      y,
      claimId,
      claimText,
      currentCategory,
      record: rec,
    });
  };

  const handleConfirmPromotion = async () => {
    if (!claimToPromote) return;
    const targetId = claimToPromote.id;
    const targetText = claimToPromote.text;

    await handleChangeClaimStatus(targetId, targetText, 'VERIFIED_FACT');
    setClaimToPromote(null);
  };

  const handleCopySha = async (sha: string) => {
    try {
      await navigator.clipboard.writeText(sha);
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
      if (setToast) setToast('SHA-256 digest copied to clipboard');
    } catch {
      /* ignore copy errors */
    }
  };

  // Render general claim badge if no specific file/test claims extracted
  if (records.length === 0) {
    const generalClaimId = 'claim-general-response';
    const activeCategory = statusOverrides[generalClaimId] || 'ASSUMPTION';
    const generalStyle = badgeStyles[activeCategory];
    const GeneralIcon = generalStyle.icon;

    const generalRecord: DetailedEvidenceRecord = {
      claimId: generalClaimId,
      category: 'runtime_behavior',
      claimText: content.slice(0, 100) + (content.length > 100 ? '…' : ''),
      source: 'CentralEvidenceRegistry',
      verificationMethod: 'truth_kernel_gate',
      verificationTimestamp: new Date().toISOString(),
      evidenceState: activeCategory === 'VERIFIED_FACT' ? 'VERIFIED' : 'UNVERIFIED',
      truthCategory: activeCategory,
      confidence: activeCategory === 'VERIFIED_FACT' ? 1.0 : 0.5,
      origin: 'NATIVE',
      sha256Digest: kernel.registerClaim(content.slice(0, 50), 'runtime_behavior').sha256Digest,
      prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    };

    return (
      <div style={{ marginTop: '8px', marginBottom: '4px', position: 'relative' }}>
        <div
          onContextMenu={e =>
            handleContextMenu(
              e,
              generalClaimId,
              content.slice(0, 80),
              activeCategory,
              generalRecord
            )
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '3px 10px',
            borderRadius: '6px',
            background: generalStyle.bg,
            border: `1px solid ${generalStyle.border}`,
            fontSize: '10px',
            color: generalStyle.text,
            fontWeight: 600,
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <GeneralIcon size={12} style={{ color: generalStyle.text }} />
            <span>Truth Status:</span>
          </div>

          {/* Quick status selector */}
          <select
            value={activeCategory}
            onChange={e =>
              handleChangeClaimStatus(
                generalClaimId,
                content.slice(0, 80),
                e.target.value as ClaimTruthCategory,
                generalRecord
              )
            }
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0a0f1d',
              color: generalStyle.text,
              border: `1px solid ${generalStyle.border}`,
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 4px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="VERIFIED_FACT" style={{ background: '#0d131f', color: '#6ee7b7' }}>
              VERIFIED_FACT
            </option>
            <option value="ASSUMPTION" style={{ background: '#0d131f', color: '#fcd34d' }}>
              ASSUMPTION
            </option>
            <option value="PROPOSED" style={{ background: '#0d131f', color: '#7dd3fc' }}>
              PROPOSED
            </option>
            <option value="CONTRADICTED" style={{ background: '#0d131f', color: '#fca5a5' }}>
              CONTRADICTED
            </option>
          </select>

          {/* View Evidence Link for general claim */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setEvidenceDetailModal(generalRecord);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38bdf8',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '0 2px',
              textDecoration: 'underline',
            }}
            title="View evidence timestamp, verification method, and SHA-256 digest"
          >
            <FileText size={11} /> View Evidence
          </button>

          {activeCategory === 'ASSUMPTION' && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setClaimToPromote({
                  id: generalClaimId,
                  text: content.slice(0, 80) + (content.length > 80 ? '…' : ''),
                });
              }}
              style={{
                background: 'rgba(20, 184, 166, 0.2)',
                border: '1px solid #14b8a6',
                color: '#2dd4bf',
                borderRadius: '4px',
                padding: '1px 5px',
                fontSize: '9px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                marginLeft: '4px',
              }}
              title="Promote assumption to verified fact"
            >
              <ArrowUpRight size={10} /> Promote
            </button>
          )}
        </div>

        {/* Floating Context Menu */}
        {renderContextMenu()}

        {/* Evidence Detail Modal */}
        {renderEvidenceModal()}

        {/* Promotion Modal */}
        {renderPromotionModal()}
      </div>
    );
  }

  return (
    <div style={{ marginTop: '8px', marginBottom: '4px', position: 'relative' }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        onContextMenu={e =>
          handleContextMenu(
            e,
            'primary-truth-badge',
            `Summary of ${records.length} claims in message`,
            primaryCategory
          )
        }
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 10px',
          borderRadius: '6px',
          background: currentStyle.bg,
          border: `1px solid ${currentStyle.border}`,
          color: currentStyle.text,
          fontSize: '10px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Click to expand claims breakdown; right-click for quick evidence options"
      >
        <ShieldCheck size={12} style={{ color: currentStyle.text }} />
        <span>Truth Status: <strong>{currentStyle.label}</strong></span>
        <span style={{ opacity: 0.85, fontSize: '9px' }}>
          ({verifiedFacts.length} verified, {proposedClaims.length} proposed, {assumptions.length} assumptions)
        </span>
        {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {expanded && (
        <div
          style={{
            marginTop: '6px',
            padding: '10px 12px',
            background: '#0d131f',
            border: `1px solid ${currentStyle.border}`,
            borderRadius: '8px',
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IconComponent size={14} style={{ color: currentStyle.text }} />
              <span>TruthKernel Claims Evidence Registry ({records.length} claim records evaluated)</span>
            </div>
            <span style={{ fontSize: '9px', color: '#64748b', fontStyle: 'italic' }}>
              Right-click any claim row for quick actions
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            {records.map(rec => {
              const isVerified = rec.truthCategory === 'VERIFIED_FACT';
              const recStyle = badgeStyles[rec.truthCategory];

              return (
                <div
                  key={rec.claimId}
                  onContextMenu={e =>
                    handleContextMenu(
                      e,
                      rec.claimId,
                      rec.claimText,
                      rec.truthCategory,
                      rec
                    )
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '6px 8px',
                    background: '#131b2c',
                    borderRadius: '6px',
                    border: '1px solid #233148',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                    {/* Status Toggle Selector */}
                    <select
                      value={rec.truthCategory}
                      onChange={e =>
                        handleChangeClaimStatus(
                          rec.claimId,
                          rec.claimText,
                          e.target.value as ClaimTruthCategory,
                          rec
                        )
                      }
                      onClick={e => e.stopPropagation()}
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '2px 5px',
                        borderRadius: '4px',
                        background: recStyle.bg,
                        color: recStyle.text,
                        border: `1px solid ${recStyle.border}`,
                        cursor: 'pointer',
                        outline: 'none',
                        flexShrink: 0,
                      }}
                      title="Click to toggle verification status between VERIFIED_FACT, ASSUMPTION, and PROPOSED"
                    >
                      <option value="VERIFIED_FACT" style={{ background: '#0d131f', color: '#6ee7b7' }}>
                        VERIFIED_FACT
                      </option>
                      <option value="ASSUMPTION" style={{ background: '#0d131f', color: '#fcd34d' }}>
                        ASSUMPTION
                      </option>
                      <option value="PROPOSED" style={{ background: '#0d131f', color: '#7dd3fc' }}>
                        PROPOSED
                      </option>
                      <option value="CONTRADICTED" style={{ background: '#0d131f', color: '#fca5a5' }}>
                        CONTRADICTED
                      </option>
                    </select>

                    <span style={{ color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '11px' }}>
                      {rec.claimText}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {/* View Evidence Link */}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setEvidenceDetailModal(rec);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isVerified ? '#6ee7b7' : '#38bdf8',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '1px 4px',
                      }}
                      title="View Evidence: Origin timestamp, verification method & SHA-256 digest"
                    >
                      <FileText size={11} />
                      <span style={{ textDecoration: 'underline' }}>View Evidence</span>
                    </button>

                    {rec.truthCategory === 'ASSUMPTION' && (
                      <button
                        type="button"
                        onClick={() => setClaimToPromote({ id: rec.claimId, text: rec.claimText })}
                        style={{
                          fontSize: '9px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(20, 184, 166, 0.15)',
                          border: '1px solid #14b8a6',
                          color: '#2dd4bf',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                        title="Promote assumption to verified fact"
                      >
                        <ArrowUpRight size={10} /> Promote
                      </button>
                    )}

                    <code style={{ fontSize: '9px', color: '#38bdf8', fontFamily: 'monospace' }}>
                      SHA: {rec.sha256Digest.slice(0, 8)}…
                    </code>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Context Menu */}
      {renderContextMenu()}

      {/* Evidence Detail Modal */}
      {renderEvidenceModal()}

      {/* Promotion Confirmation Modal */}
      {renderPromotionModal()}
    </div>
  );

  function renderContextMenu() {
    if (!contextMenu) return null;

    const { x, y, claimId, claimText, currentCategory, record } = contextMenu;

    return (
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          top: y,
          left: x,
          zIndex: 2000,
          background: '#0d131f',
          border: '1px solid #334155',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.8), 0 0 1px rgba(255,255,255,0.2)',
          padding: '6px',
          minWidth: '180px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          fontSize: '11px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            padding: '4px 8px',
            fontSize: '9px',
            fontWeight: 700,
            color: '#94a3b8',
            borderBottom: '1px solid #1e293b',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Claim Actions & Truth Audit
        </div>

        <button
          type="button"
          onClick={() => {
            setContextMenu(null);
            handleChangeClaimStatus(claimId, claimText, 'VERIFIED_FACT', record);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '6px 8px',
            background: currentCategory === 'VERIFIED_FACT' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: '#6ee7b7',
            cursor: 'pointer',
            textAlign: 'left',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={13} style={{ color: '#10b981' }} />
          <span>Promote to Fact (VERIFIED)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setContextMenu(null);
            handleChangeClaimStatus(claimId, claimText, 'ASSUMPTION', record);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '6px 8px',
            background: currentCategory === 'ASSUMPTION' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: '#fcd34d',
            cursor: 'pointer',
            textAlign: 'left',
            fontWeight: 600,
          }}
        >
          <HelpCircle size={13} style={{ color: '#f59e0b' }} />
          <span>Flag as Assumption</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setContextMenu(null);
            handleChangeClaimStatus(claimId, claimText, 'PROPOSED', record);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '6px 8px',
            background: currentCategory === 'PROPOSED' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: '#7dd3fc',
            cursor: 'pointer',
            textAlign: 'left',
            fontWeight: 600,
          }}
        >
          <WandSparkles size={13} style={{ color: '#38bdf8' }} />
          <span>Set as Proposed</span>
        </button>

        <div style={{ height: '1px', background: '#1e293b', margin: '4px 0' }} />

        <button
          type="button"
          onClick={() => {
            setContextMenu(null);
            if (record) {
              setEvidenceDetailModal(record);
            } else {
              setEvidenceDetailModal({
                claimId,
                category: 'runtime_behavior',
                claimText,
                source: 'CentralEvidenceRegistry',
                verificationMethod: 'truth_kernel_gate',
                verificationTimestamp: new Date().toISOString(),
                evidenceState: currentCategory === 'VERIFIED_FACT' ? 'VERIFIED' : 'UNVERIFIED',
                truthCategory: currentCategory,
                confidence: 1.0,
                origin: 'NATIVE',
                sha256Digest: kernel.registerClaim(claimText, 'runtime_behavior').sha256Digest,
                prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
              });
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '6px 8px',
            background: 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: '#38bdf8',
            cursor: 'pointer',
            textAlign: 'left',
            fontWeight: 600,
          }}
        >
          <FileText size={13} style={{ color: '#38bdf8' }} />
          <span>View Audit Evidence</span>
        </button>
      </div>
    );
  }

  function renderEvidenceModal() {
    if (!evidenceDetailModal) return null;

    const rec = evidenceDetailModal;
    const catStyle = badgeStyles[rec.truthCategory];

    return (
      <div
        className="modal-backdrop"
        onClick={() => setEvidenceDetailModal(null)}
        style={{ zIndex: 1300 }}
      >
        <div
          className="modal-card"
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: '520px',
            width: '90%',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            background: '#0a0f1d',
            boxShadow: '0 25px 50px rgba(0,0,0,0.85)',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #1e293b',
              paddingBottom: '12px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={22} style={{ color: '#38bdf8' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', fontWeight: 700 }}>
                  TruthKernel Evidence Record
                </h3>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                  Cryptographically immutable claim audit proof
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEvidenceDetailModal(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
            {/* Claim Text */}
            <div style={{ background: '#131b2c', padding: '10px 12px', borderRadius: '8px', border: '1px solid #233148' }}>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Evaluated Claim
              </span>
              <span style={{ color: '#f1f5f9', fontWeight: 600, lineHeight: 1.4 }}>
                "{rec.claimText}"
              </span>
            </div>

            {/* Categorization & Confidence */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#131b2c', padding: '8px 10px', borderRadius: '6px', border: '1px solid #233148' }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, display: 'block' }}>TRUTH CATEGORY</span>
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: '3px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: catStyle.bg,
                    color: catStyle.text,
                    border: `1px solid ${catStyle.border}`,
                    fontWeight: 700,
                    fontSize: '10px',
                  }}
                >
                  {rec.truthCategory}
                </span>
              </div>

              <div style={{ background: '#131b2c', padding: '8px 10px', borderRadius: '6px', border: '1px solid #233148' }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, display: 'block' }}>EVIDENCE STATE</span>
                <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '11px', display: 'block', marginTop: '3px' }}>
                  {rec.evidenceState} ({(rec.confidence * 100).toFixed(0)}% confidence)
                </span>
              </div>
            </div>

            {/* Origin Timestamp & Verification Method */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#131b2c', padding: '8px 10px', borderRadius: '6px', border: '1px solid #233148' }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={10} /> ORIGIN TIMESTAMP
                </span>
                <span style={{ color: '#cbd5e1', fontSize: '10px', fontFamily: 'monospace', display: 'block', marginTop: '3px' }}>
                  {rec.verificationTimestamp ? new Date(rec.verificationTimestamp).toLocaleString() : 'N/A'}
                </span>
              </div>

              <div style={{ background: '#131b2c', padding: '8px 10px', borderRadius: '6px', border: '1px solid #233148' }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Shield size={10} /> VERIFICATION METHOD
                </span>
                <span style={{ color: '#38bdf8', fontSize: '10px', fontWeight: 600, display: 'block', marginTop: '3px' }}>
                  {rec.verificationMethod} ({rec.source})
                </span>
              </div>
            </div>

            {/* Cryptographic SHA-256 Digest */}
            <div style={{ background: '#131b2c', padding: '10px 12px', borderRadius: '8px', border: '1px solid #233148' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Key size={10} /> CRYPTOGRAPHIC SHA-256 DIGEST
                </span>
                <button
                  type="button"
                  onClick={() => handleCopySha(rec.sha256Digest)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copiedSha ? '#6ee7b7' : '#38bdf8',
                    fontSize: '9px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  {copiedSha ? <Check size={10} /> : <Copy size={10} />}
                  {copiedSha ? 'Copied!' : 'Copy SHA'}
                </button>
              </div>
              <code style={{ fontSize: '10px', color: '#38bdf8', fontFamily: 'monospace', wordBreak: 'break-all', display: 'block' }}>
                {rec.sha256Digest}
              </code>
            </div>

            {rec.sourceRef && (
              <div style={{ background: '#131b2c', padding: '8px 10px', borderRadius: '6px', border: '1px solid #233148' }}>
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, display: 'block' }}>SOURCE REFERENCE</span>
                <code style={{ color: '#a7f3d0', fontSize: '10px', fontFamily: 'monospace' }}>
                  {rec.sourceRef}
                </code>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1e293b' }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => setEvidenceDetailModal(null)}
              style={{ background: '#38bdf8', borderColor: '#7dd3fc', color: '#030712', fontWeight: 700 }}
            >
              Close Evidence Modal
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderPromotionModal() {
    if (!claimToPromote) return null;

    return (
      <div
        className="modal-backdrop"
        onClick={() => setClaimToPromote(null)}
        style={{ zIndex: 1200 }}
      >
        <div
          className="modal-card"
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: '440px',
            border: '1px solid rgba(20, 184, 166, 0.4)',
            background: '#0d131f',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
          }}
        >
          <div
            className="modal-heading"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2dd4bf' }}
          >
            <ShieldCheck size={20} style={{ color: '#14b8a6' }} />
            <h3 style={{ margin: 0, fontSize: '15px', color: '#f1f5f9' }}>
              Promote Assumption to Verified Fact?
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5, margin: '10px 0' }}>
            You are about to verify claim:
            <br />
            <strong style={{ color: '#fcd34d', display: 'block', marginTop: '4px', fontStyle: 'italic' }}>
              "{claimToPromote.text}"
            </strong>
            This action will register the claim into the <code style={{ color: '#38bdf8' }}>TruthKernel</code> evidence registry as a <strong style={{ color: '#6ee7b7' }}>VERIFIED_FACT</strong> and append a cryptographic entry into the Audit Ledger.
          </p>
          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setClaimToPromote(null)}
            >
              <X size={13} /> Cancel
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleConfirmPromotion}
              style={{ background: '#14b8a6', borderColor: '#2dd4bf', color: '#080f1b', fontWeight: 700 }}
            >
              <Check size={13} /> Confirm Verification & Log
            </button>
          </div>
        </div>
      </div>
    );
  }
}
