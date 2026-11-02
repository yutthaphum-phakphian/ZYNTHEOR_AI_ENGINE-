import { useState, useEffect } from 'react';
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  GitBranch,
  FileCode,
  ExternalLink,
  RefreshCw,
  Search,
} from 'lucide-react';

export interface AutonomousPR {
  id: string;
  issueNumber: number;
  title: string;
  body?: string;
  branch: string;
  baseBranch: string;
  repo: string;
  owner: string;
  draft: true;
  status: 'WAITING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'MERGED';
  createdAt: string;
  updatedAt: string;
  diffSummary: string;
  changedFiles: string[];
  htmlUrl?: string;
  prNumber?: number;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  auditDigest: string;
}

export function PullRequestsView() {
  const [prs, setPrs] = useState<AutonomousPR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filterQuery, setFilterQuery] = useState('');

  const fetchPRs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agent/prs');
      const data = await res.json();
      if (data.ok && Array.isArray(data.prs)) {
        setPrs(data.prs);
      } else {
        setError(data.error || 'Failed to fetch pull requests');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error fetching pull requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPRs();
  }, []);

  const handleApprove = async (prId: string) => {
    setActionLoading(prId);
    try {
      const res = await fetch(`/api/agent/prs/${prId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.ok) {
        await fetchPRs();
      } else {
        alert(data.error || 'Failed to approve pull request');
      }
    } catch (err: any) {
      alert(err?.message || 'Network error approving pull request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModalId) return;
    setActionLoading(rejectModalId);
    try {
      const res = await fetch(`/api/agent/prs/${rejectModalId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (data.ok) {
        setRejectModalId(null);
        setRejectReason('');
        await fetchPRs();
      } else {
        alert(data.error || 'Failed to reject pull request');
      }
    } catch (err: any) {
      alert(err?.message || 'Network error rejecting pull request');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredPrs = prs.filter((pr) => {
    const q = filterQuery.toLowerCase();
    return (
      pr.title.toLowerCase().includes(q) ||
      pr.branch.toLowerCase().includes(q) ||
      pr.repo.toLowerCase().includes(q) ||
      String(pr.issueNumber).includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-zinc-100">
      {/* Top Banner: Security Boundary Notice */}
      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs md:text-sm text-zinc-300">
          <p className="font-semibold text-amber-300">
            P14 Autonomous Development Pipeline — Cryptographic Human Approval Boundary
          </p>
          <p className="mt-1 text-zinc-400">
            Strict Zero-Mock Enforcement: All autonomously formulated code patches are created in Draft status (
            <code className="text-amber-300 bg-amber-900/40 px-1 py-0.5 rounded font-mono text-xs">draft: true</code>).
            Auto-merge is strictly prohibited. Production code modification requires an explicit Human Approval Gate event
            anchored into the cryptographic audit ledger.
          </p>
        </div>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-indigo-400" />
            Autonomous Pull Requests
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Review and govern AI-generated pull requests before merging into main branches.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter by issue, title, branch..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={fetchPRs}
            disabled={loading}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PR Cards */}
      {loading && prs.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 text-sm">Loading pull requests...</div>
      ) : filteredPrs.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl">
          <GitPullRequest className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-400">No Pull Requests found</p>
          <p className="text-xs text-zinc-500 mt-1">
            Webhook listener is active on <code className="text-zinc-400">/api/webhooks/github</code>. Newly opened issues will create draft PRs here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPrs.map((pr) => {
            const isWaiting = pr.status === 'WAITING_APPROVAL';
            const isApproved = pr.status === 'APPROVED';
            const isRejected = pr.status === 'REJECTED';

            return (
              <div
                key={pr.id}
                className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-colors space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-indigo-400">
                        {pr.owner}/{pr.repo} #{pr.issueNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        DRAFT (NO AUTO-MERGE)
                      </span>
                      {isWaiting && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                          WAITING APPROVAL
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          APPROVED
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          REJECTED
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-100">{pr.title}</h3>
                  </div>

                  <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(pr.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Diff summary and details */}
                <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <GitBranch className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="font-mono text-zinc-300">{pr.branch}</span>
                    <span className="text-zinc-600">→</span>
                    <span className="font-mono text-zinc-400">{pr.baseBranch}</span>
                  </div>

                  <p className="text-zinc-300 text-xs leading-relaxed">{pr.diffSummary}</p>

                  {pr.changedFiles && pr.changedFiles.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <FileCode className="w-3 h-3" /> Changed files:
                      </span>
                      {pr.changedFiles.map((file, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400"
                        >
                          {file}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Audit hash */}
                  <div className="pt-1 text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span>Cryptographic Audit Digest: {pr.auditDigest?.slice(0, 24)}...</span>
                  </div>
                </div>

                {/* Status metadata if approved or rejected */}
                {isApproved && (
                  <div className="text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 rounded p-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      Approved by <strong className="font-semibold">{pr.approvedBy || 'Human Reviewer'}</strong> at{' '}
                      {pr.approvedAt ? new Date(pr.approvedAt).toLocaleString() : 'recently'}. Ready for manual repository merge.
                    </span>
                  </div>
                )}
                {isRejected && (
                  <div className="text-xs text-rose-400 bg-rose-950/20 border border-rose-500/20 rounded p-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Rejection reason: {pr.rejectionReason}</span>
                  </div>
                )}

                {/* Human Approval Gate Action Buttons */}
                {isWaiting && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800">
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      Human authorization required to promote code
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setRejectModalId(pr.id);
                          setRejectReason('');
                        }}
                        disabled={actionLoading === pr.id}
                        className="px-3 py-1.5 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-700/40 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        Reject PR
                      </button>
                      <button
                        onClick={() => handleApprove(pr.id)}
                        disabled={actionLoading === pr.id}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                      >
                        {actionLoading === pr.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Authorize & Approve Merge
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              Reject Pull Request
            </h3>
            <p className="text-xs text-zinc-400">
              Provide a rationale for rejecting this autonomous code proposal. The decision will be logged to the audit chain.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Code modifies security boundary without required unit tests..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 h-24"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectModalId(null)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading === rejectModalId}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
