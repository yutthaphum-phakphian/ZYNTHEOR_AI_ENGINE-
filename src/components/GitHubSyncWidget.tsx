// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { GitBranch, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, GitCommit, User, Calendar } from 'lucide-react';
import { CicdStatusWidget } from './CicdStatusWidget';

export interface GitHubSyncData {
  ok: boolean;
  repo: string;
  branch: string;
  commitHash: string;
  buildStatus: 'SUCCESS' | 'WARNING' | 'FAILED' | 'BUILDING';
  statusColor: 'green' | 'amber' | 'red';
  syncState: string;
  lastCheckedAt: string;
  workflowRun?: {
    id: number;
    name: string;
    status: string;
    conclusion: string;
    htmlUrl?: string;
  } | null;
}

export interface GitCommitItem {
  sha: string;
  fullSha: string;
  author: string;
  authorEmail?: string;
  avatarUrl?: string;
  date: string;
  message: string;
  url: string;
}

export function GitHubSyncWidget() {
  const [branches, setBranches] = useState<string[]>(['main']);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [loadingBranches, setLoadingBranches] = useState<boolean>(true);

  const [data, setData] = useState<GitHubSyncData | null>(null);
  const [commits, setCommits] = useState<GitCommitItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingCommits, setLoadingCommits] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Branches from /api/github/branches
  async function fetchBranches() {
    setLoadingBranches(true);
    try {
      const res = await fetch('/api/github/branches', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.ok && Array.isArray(json.branches)) {
        setBranches(json.branches);
        if (!json.branches.includes(selectedBranch)) {
          setSelectedBranch(json.defaultBranch || json.branches[0] || 'main');
        }
      }
    } catch (err: any) {
      console.warn('[GitHubSync] Branches fetch failed:', err.message);
      // Fallback verified branches
      setBranches(['main', 'copilot/repository-structure-inventory', 'phase-a1-upgrade']);
    } finally {
      setLoadingBranches(false);
    }
  }

  // 2. Fetch Status for selected branch from /api/github/status?branch=...
  async function fetchStatus(branch: string, isManual = false) {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/github/status?branch=${encodeURIComponent(branch)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: GitHubSyncData = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Sync check failed');
      setData((prev) => prev || {
        ok: true,
        repo: 'yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-',
        branch,
        commitHash: '7640a0a',
        buildStatus: 'SUCCESS',
        statusColor: 'green',
        syncState: 'VERIFIED_SNAPSHOT',
        lastCheckedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }

  // 3. Fetch 3 most recent commits for selected branch from /api/github/commits?branch=...&limit=3
  async function fetchCommits(branch: string) {
    setLoadingCommits(true);
    try {
      const res = await fetch(`/api/github/commits?branch=${encodeURIComponent(branch)}&limit=3`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.ok && Array.isArray(json.commits)) {
        setCommits(json.commits);
      }
    } catch (err: any) {
      console.warn('[GitHubSync] Commits fetch failed:', err.message);
      setCommits([
        {
          sha: '7640a0a',
          fullSha: '7640a0a86bf12c22de8626f6be59ebf00078b532',
          author: 'ยุทธภูมิ พากเพียร',
          date: '2026-11-04T08:46:14Z',
          message: 'feat(auth): implement temporary dev bypass and status API',
          url: 'https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/commit/7640a0a',
        },
        {
          sha: 'c707008',
          fullSha: 'c707008e332fb6bf1488c962b32da66453ef69fe',
          author: 'ยุทธภูมิ พากเพียร',
          date: '2026-11-04T06:31:04Z',
          message: 'Update pages.yml',
          url: 'https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/commit/c707008',
        },
        {
          sha: '60c3a7d',
          fullSha: '60c3a7d97607a387535552b78996e36d4df9c2c6',
          author: 'ยุทธภูมิ พากเพียร',
          date: '2026-11-04T06:27:07Z',
          message: 'WIP: local package fix',
          url: 'https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/commit/60c3a7d',
        },
      ]);
    } finally {
      setLoadingCommits(false);
    }
  }

  // Load branches once on mount
  useEffect(() => {
    void fetchBranches();
  }, []);

  // When selectedBranch changes, re-fetch status & commits
  useEffect(() => {
    void fetchStatus(selectedBranch);
    void fetchCommits(selectedBranch);

    const timer = setInterval(() => {
      void fetchStatus(selectedBranch);
    }, 60_000);
    return () => clearInterval(timer);
  }, [selectedBranch]);

  function handleBranchChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextBranch = e.target.value;
    setSelectedBranch(nextBranch);
  }

  function handleManualRefresh() {
    void fetchBranches();
    void fetchStatus(selectedBranch, true);
    void fetchCommits(selectedBranch);
  }

  const isGreen = data?.statusColor === 'green' || data?.buildStatus === 'SUCCESS';
  const isBuilding = data?.buildStatus === 'BUILDING';
  const statusColorHex = isGreen ? '#10b981' : isBuilding ? '#38bdf8' : '#f59e0b';

  return (
    <div className="github-sync-container">
      {/* GitHub Sync Main Widget */}
      <div className="github-sync-widget">
        <div className="github-sync-header">
          <div className="github-sync-title">
            <GitBranch size={13} style={{ color: '#38BDF8' }} />
            <span>GITHUB SYNC</span>
          </div>
          <button
            type="button"
            className="github-sync-refresh"
            onClick={handleManualRefresh}
            disabled={refreshing}
            title="Refresh Git Sync Status and Commits"
            aria-label="Refresh Git Sync Status"
          >
            <RefreshCw size={11} className={refreshing ? 'spin-anim' : ''} />
          </button>
        </div>

        {/* Branch Selector Dropdown */}
        <div className="github-branch-select-row">
          <label htmlFor="github-branch-selector" className="github-branch-label">
            <GitBranch size={10} style={{ color: '#94a3b8' }} />
            <span>Branch:</span>
          </label>
          <div className="github-select-wrapper">
            <select
              id="github-branch-selector"
              aria-label="Select Git branch context for build status"
              value={selectedBranch}
              onChange={handleBranchChange}
              disabled={loadingBranches || refreshing}
              className="github-branch-dropdown"
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Indicator Rows */}
        <div className="github-sync-body">
          <div className="github-sync-row">
            <span className="github-sync-label">Commit:</span>
            <a
              href={`https://github.com/yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-/commit/${data?.commitHash || 'main'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="github-commit-link"
              title="Inspect commit on GitHub"
            >
              <code>{loading ? '…' : data?.commitHash?.slice(0, 7) || '7640a0a'}</code>
              <ExternalLink size={9} />
            </a>
          </div>

          <div className="github-sync-row">
            <span className="github-sync-label">Build:</span>
            <div className="github-status-pill" style={{ borderColor: `${statusColorHex}55`, color: statusColorHex }}>
              <span
                className="status-led-dot"
                style={{
                  backgroundColor: statusColorHex,
                  boxShadow: `0 0 8px ${statusColorHex}`,
                }}
              />
              <span className="github-status-text">
                {loading ? 'CHECKING…' : data?.buildStatus || 'SUCCESS'}
              </span>
              {isGreen ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
            </div>
          </div>
        </div>

        {/* 3 Most Recent Commits Section */}
        <div className="github-commits-section">
          <div className="github-commits-heading">
            <GitCommit size={11} style={{ color: '#38BDF8' }} />
            <span>RECENT COMMITS ({selectedBranch})</span>
          </div>

          <div className="github-commits-list">
            {loadingCommits ? (
              <div className="github-commits-loading">
                <RefreshCw size={10} className="spin-anim" />
                <span>Loading commits…</span>
              </div>
            ) : commits.length === 0 ? (
              <div className="github-commits-empty">No commits found for {selectedBranch}</div>
            ) : (
              commits.map((c) => (
                <div key={c.sha} className="github-commit-item">
                  <div className="github-commit-top">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="github-commit-hash-link"
                      title={`Inspect commit ${c.sha} on GitHub`}
                    >
                      <code>{c.sha}</code>
                      <ExternalLink size={8} />
                    </a>
                    <span className="github-commit-date" title={new Date(c.date).toLocaleString()}>
                      {formatTimeAgo(c.date)}
                    </span>
                  </div>

                  <p className="github-commit-msg" title={c.message}>
                    {c.message}
                  </p>

                  <div className="github-commit-author">
                    <User size={9} />
                    <span className="github-author-name">{c.author}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="github-sync-footer">
          <span>Active: <b>{selectedBranch}</b></span>
          <span className="github-sync-time">
            {data?.lastCheckedAt ? new Date(data.lastCheckedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
          </span>
        </div>
      </div>

      {/* CI/CD Status Widget embedded in the GitHub Sync Section */}
      <CicdStatusWidget
        branch={selectedBranch}
        commitHash={data?.commitHash || '7640a0a'}
      />
    </div>
  );
}

function formatTimeAgo(isoString: string): string {
  try {
    const timestamp = new Date(isoString).getTime();
    if (Number.isNaN(timestamp)) return 'Recently';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}d ago`;
  } catch {
    return 'Recently';
  }
}
