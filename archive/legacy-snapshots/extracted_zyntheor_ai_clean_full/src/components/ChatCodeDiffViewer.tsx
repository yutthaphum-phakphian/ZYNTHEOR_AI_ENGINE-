import { useState, useMemo, useEffect } from 'react';
import {
  Check,
  X,
  RotateCcw,
  Copy,
  ClipboardCheck,
  FileCode2,
  Split,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Sparkles,
  GitCommit,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { FileDiffProposal, DiffHunk } from '../../lib/diff-parser';
import { buildAcceptedUnifiedDiff } from '../../lib/diff-parser';

export type HunkDecision = 'pending' | 'accepted' | 'discarded';

export interface ChatCodeDiffViewerProps {
  proposal: FileDiffProposal;
  onApplyProposal?: (proposal: FileDiffProposal, acceptedHunksCount: number, patch: string) => Promise<void> | void;
  recordAudit?: (action: string, detail: string) => Promise<void> | void;
  setToast?: (msg: string) => void;
  initialCollapsed?: boolean;
}

async function computeSha256(str: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // fallback
  }
  return 'digest_local_' + Math.abs(str.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString(16);
}

export function ChatCodeDiffViewer({
  proposal,
  onApplyProposal,
  recordAudit,
  setToast,
  initialCollapsed = false,
}: ChatCodeDiffViewerProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified' | 'raw'>('side-by-side');
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [digest, setDigest] = useState<string>('computing...');

  // Track state of each hunk: 'pending' | 'accepted' | 'discarded'
  const [hunkStates, setHunkStates] = useState<Record<string, HunkDecision>>(() => {
    const initial: Record<string, HunkDecision> = {};
    for (const hunk of proposal.hunks) {
      initial[hunk.id] = 'pending';
    }
    return initial;
  });

  useEffect(() => {
    void computeSha256(proposal.rawDiff).then(setDigest);
  }, [proposal.rawDiff]);

  const stats = useMemo(() => {
    let accepted = 0;
    let discarded = 0;
    let pending = 0;

    for (const h of proposal.hunks) {
      const st = hunkStates[h.id] || 'pending';
      if (st === 'accepted') accepted++;
      else if (st === 'discarded') discarded++;
      else pending++;
    }

    return {
      total: proposal.hunks.length,
      accepted,
      discarded,
      pending,
      allDecided: pending === 0,
    };
  }, [proposal.hunks, hunkStates]);

  const handleSetHunk = (hunkId: string, decision: HunkDecision) => {
    setHunkStates(prev => ({ ...prev, [hunkId]: decision }));
    if (applied) setApplied(false);
  };

  const handleAcceptAll = () => {
    const updated: Record<string, HunkDecision> = {};
    for (const h of proposal.hunks) {
      updated[h.id] = 'accepted';
    }
    setHunkStates(updated);
    if (applied) setApplied(false);
  };

  const handleDiscardAll = () => {
    const updated: Record<string, HunkDecision> = {};
    for (const h of proposal.hunks) {
      updated[h.id] = 'discarded';
    }
    setHunkStates(updated);
    if (applied) setApplied(false);
  };

  const handleResetAll = () => {
    const updated: Record<string, HunkDecision> = {};
    for (const h of proposal.hunks) {
      updated[h.id] = 'pending';
    }
    setHunkStates(updated);
    setApplied(false);
  };

  const handleCopyPatch = async () => {
    const patch = buildAcceptedUnifiedDiff(proposal, hunkStates) || proposal.rawDiff;
    try {
      await navigator.clipboard.writeText(patch);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (setToast) setToast('Unified patch copied to clipboard');
    } catch {
      // ignore
    }
  };

  const handleApply = async () => {
    if (stats.accepted === 0) {
      if (setToast) setToast('Please accept at least one hunk before applying');
      return;
    }

    setApplying(true);
    const patch = buildAcceptedUnifiedDiff(proposal, hunkStates);

    try {
      // 1. Propose to server if available
      try {
        await fetch('/api/editing/propose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: proposal.filePath, diff: patch }),
        });
      } catch {
        // Fallback gracefully
      }

      // 2. Trigger parent callback if provided
      if (onApplyProposal) {
        await onApplyProposal(proposal, stats.accepted, patch);
      }

      // 3. Record Audit
      if (recordAudit) {
        await recordAudit(
          'CODE_DIFF_HUNKS_APPLIED',
          `file=${proposal.filePath}; accepted_hunks=${stats.accepted}/${stats.total}; digest=${digest.slice(0, 12)}`
        );
      }

      setApplied(true);
      if (setToast) {
        setToast(`Applied ${stats.accepted} accepted hunk(s) to ${proposal.filePath}`);
      }
    } catch (err: any) {
      if (setToast) setToast(`Failed to apply changes: ${err.message || String(err)}`);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className="code-diff-card"
      style={{
        margin: '12px 0',
        borderRadius: '10px',
        border: applied ? '1px solid #10b981' : '1px solid #283348',
        background: '#0c1017',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
        overflow: 'hidden',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}
      data-testid="chat-code-diff-viewer"
    >
      {/* File & Actions Topbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px 12px',
          background: '#131924',
          borderBottom: collapsed ? 'none' : '1px solid #20293a',
        }}
      >
        {/* Left: File Title & Hunk Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8b9bb4',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            title={collapsed ? 'Expand Diff' : 'Collapse Diff'}
            aria-label="Toggle diff expand"
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          </button>

          <FileCode2 size={15} style={{ color: '#38bdf8', flexShrink: 0 }} />

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minWidth: 0 }}>
            <span
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '11px',
                fontWeight: 600,
                color: '#e2e8f0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '260px',
              }}
              title={proposal.filePath}
            >
              {proposal.filePath}
            </span>

            <span style={{ fontSize: '9px', color: '#64748b' }}>
              ({proposal.hunks.length} {proposal.hunks.length === 1 ? 'hunk' : 'hunks'})
            </span>
          </div>

          {/* Additions / Deletions count */}
          <div style={{ display: 'flex', gap: '4px', fontSize: '9px', fontWeight: 600 }}>
            <span style={{ color: '#86efac', background: '#064e3b33', padding: '1px 5px', borderRadius: '4px' }}>
              +{proposal.totalAdded}
            </span>
            <span style={{ color: '#fca5a5', background: '#7f1d1d33', padding: '1px 5px', borderRadius: '4px' }}>
              -{proposal.totalRemoved}
            </span>
          </div>

          {applied && (
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: '#10b981',
                background: '#064e3b44',
                border: '1px solid #059669',
                padding: '1px 6px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <CheckCircle2 size={11} /> APPLIED
            </span>
          )}
        </div>

        {/* Right: Quick Review Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div
            style={{
              display: 'flex',
              background: '#090d14',
              borderRadius: '6px',
              padding: '2px',
              border: '1px solid #1e2638',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('side-by-side')}
              style={{
                background: viewMode === 'side-by-side' ? '#1e293b' : 'transparent',
                color: viewMode === 'side-by-side' ? '#38bdf8' : '#64748b',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 7px',
                fontSize: '9px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Side-by-Side (Split) View"
            >
              <Split size={11} /> Split
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              style={{
                background: viewMode === 'unified' ? '#1e293b' : 'transparent',
                color: viewMode === 'unified' ? '#38bdf8' : '#64748b',
                border: 'none',
                borderRadius: '4px',
                padding: '3px 7px',
                fontSize: '9px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Unified (Inline) View"
            >
              <FileText size={11} /> Unified
            </button>
          </div>

          {/* Accept / Discard All Quick Buttons */}
          <button
            type="button"
            onClick={handleAcceptAll}
            style={{
              background: '#064e3b22',
              color: '#86efac',
              border: '1px solid #065f46',
              borderRadius: '5px',
              padding: '3px 7px',
              fontSize: '9px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
            title="Accept all hunks in this file"
          >
            <Check size={11} /> Accept All
          </button>

          <button
            type="button"
            onClick={handleDiscardAll}
            style={{
              background: '#7f1d1d22',
              color: '#fca5a5',
              border: '1px solid #991b1b',
              borderRadius: '5px',
              padding: '3px 7px',
              fontSize: '9px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
            title="Discard all hunks in this file"
          >
            <X size={11} /> Discard All
          </button>

          <button
            type="button"
            onClick={handleCopyPatch}
            style={{
              background: '#1e293b',
              color: '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '5px',
              padding: '3px 7px',
              fontSize: '9px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
            title="Copy patch to clipboard"
          >
            {copied ? <ClipboardCheck size={11} style={{ color: '#86efac' }} /> : <Copy size={11} />}
            <span>{copied ? 'Copied' : 'Patch'}</span>
          </button>
        </div>
      </div>

      {/* Main Diff Content Area */}
      {!collapsed && (
        <div>
          {/* Hunks List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
            {proposal.hunks.map((hunk) => {
              const state = hunkStates[hunk.id] || 'pending';
              const isAccepted = state === 'accepted';
              const isDiscarded = state === 'discarded';

              return (
                <div
                  key={hunk.id}
                  style={{
                    borderRadius: '8px',
                    border: isAccepted
                      ? '1px solid #059669'
                      : isDiscarded
                      ? '1px solid #334155'
                      : '1px solid #1e293b',
                    background: isAccepted
                      ? '#022c2222'
                      : isDiscarded
                      ? '#0b0f1777'
                      : '#080c14',
                    overflow: 'hidden',
                    opacity: isDiscarded ? 0.6 : 1,
                    transition: 'all 0.15s ease-in-out',
                  }}
                  data-testid={`hunk-card-${hunk.id}`}
                >
                  {/* Hunk Header & Per-Hunk Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '6px',
                      padding: '5px 10px',
                      background: isAccepted
                        ? '#064e3b33'
                        : isDiscarded
                        ? '#141a24'
                        : '#0f1520',
                      borderBottom: '1px solid #1a2233',
                      fontSize: '10px',
                    }}
                  >
                    {/* Hunk Metadata */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: isAccepted ? '#86efac' : isDiscarded ? '#94a3b8' : '#38bdf8',
                        }}
                      >
                        Hunk #{hunk.index}
                      </span>

                      <code
                        style={{
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: '9px',
                          color: '#64748b',
                          background: '#05080f',
                          padding: '1px 5px',
                          borderRadius: '3px',
                        }}
                      >
                        @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                      </code>

                      {hunk.contextHeader && (
                        <span style={{ fontSize: '9px', color: '#94a3b8', fontStyle: 'italic' }}>
                          {hunk.contextHeader}
                        </span>
                      )}

                      {/* State Badge */}
                      <span
                        style={{
                          fontSize: '8px',
                          fontWeight: 700,
                          padding: '2px 5px',
                          borderRadius: '3px',
                          textTransform: 'uppercase',
                          background: isAccepted
                            ? '#064e3b'
                            : isDiscarded
                            ? '#334155'
                            : '#78350f',
                          color: isAccepted
                            ? '#86efac'
                            : isDiscarded
                            ? '#cbd5e1'
                            : '#fde047',
                        }}
                      >
                        {state}
                      </span>
                    </div>

                    {/* Per-Hunk Accept / Discard Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleSetHunk(hunk.id, 'accepted')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: isAccepted ? '1px solid #10b981' : '1px solid #065f46',
                          background: isAccepted ? '#059669' : '#064e3b33',
                          color: isAccepted ? '#ffffff' : '#86efac',
                          fontSize: '9px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Accept this code hunk"
                        data-testid={`btn-accept-${hunk.id}`}
                      >
                        <Check size={11} /> Accept
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetHunk(hunk.id, 'discarded')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: isDiscarded ? '1px solid #ef4444' : '1px solid #475569',
                          background: isDiscarded ? '#b91c1c' : '#1e293b33',
                          color: isDiscarded ? '#ffffff' : '#fca5a5',
                          fontSize: '9px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Discard this code hunk"
                        data-testid={`btn-discard-${hunk.id}`}
                      >
                        <X size={11} /> Discard
                      </button>

                      {state !== 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleSetHunk(hunk.id, 'pending')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            padding: '3px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Reset decision to Pending"
                        >
                          <RotateCcw size={10} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Diff View: Side-by-Side (Split) or Unified */}
                  {viewMode === 'side-by-side' ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                        overflowX: 'auto',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '9.5px',
                        lineHeight: '1.5',
                        background: '#070a10',
                      }}
                    >
                      {/* Left Column Header (Original) */}
                      <div
                        style={{
                          padding: '3px 8px',
                          background: '#0d121c',
                          borderBottom: '1px solid #1a2233',
                          borderRight: '1px solid #1a2233',
                          color: '#64748b',
                          fontSize: '8px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        Original (Baseline)
                      </div>

                      {/* Right Column Header (Proposed) */}
                      <div
                        style={{
                          padding: '3px 8px',
                          background: '#0d121c',
                          borderBottom: '1px solid #1a2233',
                          color: '#64748b',
                          fontSize: '8px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        Proposed (Suggested)
                      </div>

                      {/* Side by side rows */}
                      {hunk.sideBySideRows.map((row, rIdx) => {
                        const isLeftRemoved = row.leftType === 'removed';
                        const isRightAdded = row.rightType === 'added';

                        return (
                          <div
                            key={rIdx}
                            style={{
                              gridColumn: '1 / -1',
                              display: 'grid',
                              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                              borderBottom: '1px solid #0e1420',
                            }}
                          >
                            {/* Left Cell */}
                            <div
                              style={{
                                display: 'flex',
                                borderRight: '1px solid #1a2233',
                                background: isLeftRemoved
                                  ? '#351820'
                                  : row.leftType === 'empty'
                                  ? '#06080e'
                                  : 'transparent',
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  width: '34px',
                                  flexShrink: 0,
                                  textAlign: 'right',
                                  paddingRight: '6px',
                                  paddingTop: '1px',
                                  color: isLeftRemoved ? '#f87171' : '#475569',
                                  userSelect: 'none',
                                  fontSize: '8.5px',
                                }}
                              >
                                {row.leftNum ?? ''}
                              </span>
                              <span
                                style={{
                                  width: '14px',
                                  textAlign: 'center',
                                  color: isLeftRemoved ? '#f87171' : '#475569',
                                  userSelect: 'none',
                                  fontWeight: 700,
                                }}
                              >
                                {isLeftRemoved ? '-' : ''}
                              </span>
                              <pre
                                style={{
                                  margin: 0,
                                  padding: '1px 4px',
                                  overflowX: 'auto',
                                  color: isLeftRemoved ? '#fca5a5' : '#94a3b8',
                                  whiteSpace: 'pre',
                                  flex: 1,
                                }}
                              >
                                {row.leftText ?? ''}
                              </pre>
                            </div>

                            {/* Right Cell */}
                            <div
                              style={{
                                display: 'flex',
                                background: isRightAdded
                                  ? '#113322'
                                  : row.rightType === 'empty'
                                  ? '#06080e'
                                  : 'transparent',
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  width: '34px',
                                  flexShrink: 0,
                                  textAlign: 'right',
                                  paddingRight: '6px',
                                  paddingTop: '1px',
                                  color: isRightAdded ? '#4ade80' : '#475569',
                                  userSelect: 'none',
                                  fontSize: '8.5px',
                                }}
                              >
                                {row.rightNum ?? ''}
                              </span>
                              <span
                                style={{
                                  width: '14px',
                                  textAlign: 'center',
                                  color: isRightAdded ? '#4ade80' : '#475569',
                                  userSelect: 'none',
                                  fontWeight: 700,
                                }}
                              >
                                {isRightAdded ? '+' : ''}
                              </span>
                              <pre
                                style={{
                                  margin: 0,
                                  padding: '1px 4px',
                                  overflowX: 'auto',
                                  color: isRightAdded ? '#86efac' : '#94a3b8',
                                  whiteSpace: 'pre',
                                  flex: 1,
                                }}
                              >
                                {row.rightText ?? ''}
                              </pre>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Unified View */
                    <div
                      style={{
                        padding: '4px 0',
                        overflowX: 'auto',
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: '9.5px',
                        lineHeight: '1.5',
                        background: '#070a10',
                      }}
                    >
                      {hunk.lines.map((ln, lIdx) => {
                        const isAdd = ln.type === 'added';
                        const isRem = ln.type === 'removed';
                        return (
                          <div
                            key={lIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              background: isAdd ? '#113322' : isRem ? '#351820' : 'transparent',
                              color: isAdd ? '#86efac' : isRem ? '#fca5a5' : '#94a3b8',
                              padding: '0 8px',
                            }}
                          >
                            <span style={{ width: '28px', color: '#475569', textAlign: 'right', paddingRight: '4px', userSelect: 'none' }}>
                              {ln.oldLineNum ?? ''}
                            </span>
                            <span style={{ width: '28px', color: '#475569', textAlign: 'right', paddingRight: '8px', userSelect: 'none' }}>
                              {ln.newLineNum ?? ''}
                            </span>
                            <span style={{ width: '12px', userSelect: 'none', fontWeight: 700 }}>
                              {isAdd ? '+' : isRem ? '-' : ' '}
                            </span>
                            <pre style={{ margin: 0, whiteSpace: 'pre', overflowX: 'auto', flex: 1 }}>
                              {ln.text}
                            </pre>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Bar: Review Summary & Apply Action */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '8px 12px',
              background: '#0e141f',
              borderTop: '1px solid #1c2436',
              fontSize: '10px',
            }}
          >
            {/* Review Status Breakdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: '#94a3b8' }}>
                Review Progress: <b>{stats.accepted + stats.discarded}/{stats.total} hunks</b>
              </span>
              <span style={{ color: '#86efac' }}>({stats.accepted} accepted)</span>
              {stats.discarded > 0 && <span style={{ color: '#fca5a5' }}>({stats.discarded} discarded)</span>}
              {stats.pending > 0 && <span style={{ color: '#fbbf24' }}>({stats.pending} pending)</span>}
            </div>

            {/* Apply Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handleResetAll}
                style={{
                  background: 'transparent',
                  color: '#64748b',
                  border: '1px solid #263145',
                  borderRadius: '5px',
                  padding: '4px 8px',
                  fontSize: '9.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Reset all hunk decisions to Pending"
              >
                <RotateCcw size={11} /> Reset
              </button>

              <button
                type="button"
                onClick={handleApply}
                disabled={applying || stats.accepted === 0}
                style={{
                  background: applied
                    ? '#059669'
                    : stats.accepted > 0
                    ? '#10b981'
                    : '#1e293b',
                  color: stats.accepted > 0 ? '#ffffff' : '#64748b',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: stats.accepted > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: stats.accepted > 0 ? '0 2px 10px rgba(16, 185, 129, 0.3)' : 'none',
                }}
                data-testid="apply-hunks-btn"
              >
                {applying ? (
                  <>Applying...</>
                ) : applied ? (
                  <>
                    <CheckCircle2 size={13} /> Applied ({stats.accepted} Hunks)
                  </>
                ) : (
                  <>
                    <Check size={13} /> Apply {stats.accepted} Accepted {stats.accepted === 1 ? 'Hunk' : 'Hunks'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
