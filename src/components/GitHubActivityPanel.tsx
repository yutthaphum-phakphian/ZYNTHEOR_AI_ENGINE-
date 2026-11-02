import React, { useEffect, useState } from 'react';
import { GitBranch, GitPullRequest, AlertCircle, CheckCircle2, Clock, RefreshCw, Send, ShieldAlert, Bot } from 'lucide-react';

interface GitHubActivity {
  id: string;
  type: 'issue_received' | 'branch_created' | 'pr_created' | 'issue_comment' | 'workflow_dispatched' | 'webhook_received';
  repo: string;
  issueNumber?: number;
  prNumber?: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'unverified';
  branch?: string;
  url?: string;
  detail?: string;
  timestamp: string;
}

interface GitHubBotStatus {
  configured: boolean;
  status: 'READY' | 'UNCONFIGURED' | 'ERROR';
  authenticatedUser?: string;
  hasWebhookSecret: boolean;
  message?: string;
}

export const GitHubActivityPanel: React.FC = () => {
  const [activities, setActivities] = useState<GitHubActivity[]>([]);
  const [status, setStatus] = useState<GitHubBotStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testIssueNum, setTestIssueNum] = useState('');
  const [testRepo, setTestRepo] = useState('yutthaphum-phakphian/ZYNTHEOR_AI_ENGINE-');
  const [testTitle, setTestTitle] = useState('Fix authentication token expiration');
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);

  const fetchStatusAndActivities = async () => {
    setLoading(true);
    try {
      const [statusRes, actRes] = await Promise.all([
        fetch('/api/github/status').then(r => r.json()),
        fetch('/api/github/activities').then(r => r.json()),
      ]);
      setStatus(statusRes);
      if (actRes.ok && Array.isArray(actRes.activities)) {
        setActivities(actRes.activities);
      }
    } catch (e: any) {
      console.error('Failed to fetch GitHub data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndActivities();
  }, []);

  const handleTriggerIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRepo || !testIssueNum || !testTitle) return;
    const parts = testRepo.split('/');
    if (parts.length !== 2) {
      setTriggerResult('Error: Repo must be in format owner/repo');
      return;
    }
    setTriggerLoading(true);
    setTriggerResult(null);
    try {
      const res = await fetch('/api/github/issue/auto-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: parts[0],
          repo: parts[1],
          issueNumber: Number(testIssueNum),
          title: testTitle,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTriggerResult(`Success: Issue #${testIssueNum} acknowledged. Branch: ${data.branchName || 'N/A'}`);
        fetchStatusAndActivities();
      } else {
        setTriggerResult(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setTriggerResult(`Network error: ${err.message}`);
    } finally {
      setTriggerLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bot Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg ${status?.configured ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-lg">ZYNTHEOR GitHub Autonomous Agent</h3>
                <span className={`px-2 py-0.5 text-xs font-mono rounded uppercase tracking-wider ${
                  status?.configured ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50' : 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                }`}>
                  {status?.status || 'UNKNOWN'}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {status?.configured
                  ? `Authenticated as @${status.authenticatedUser}. Listening for webhook events.`
                  : 'GITHUB_TOKEN is not configured on the server. Token is required for GitHub API operations.'}
              </p>
            </div>
          </div>
          <button
            onClick={fetchStatusAndActivities}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Webhook Endpoint Info */}
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-400">
            <span className="text-slate-500 block mb-1">WEBHOOK ENDPOINT URL:</span>
            <span className="text-slate-200 select-all">/api/github/webhook</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-400">
            <span className="text-slate-500 block mb-1">SIGNATURE VERIFICATION:</span>
            <span className={status?.hasWebhookSecret ? 'text-emerald-400' : 'text-amber-400'}>
              {status?.hasWebhookSecret ? 'Active (HMAC SHA-256 configured)' : 'Optional (No GITHUB_WEBHOOK_SECRET)'}
            </span>
          </div>
        </div>
      </div>

      {/* Manual Issue Automation Dispatch */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <h4 className="font-semibold text-slate-200 text-base mb-1 flex items-center gap-2">
          <GitPullRequest className="w-5 h-5 text-indigo-400" />
          Dispatch Autonomous Issue Resolution
        </h4>
        <p className="text-xs text-slate-400 mb-4">
          Directly instruct ZYNTHEOR to inspect an issue, create a dedicated branch, and prepare resolution.
        </p>

        <form onSubmit={handleTriggerIssue} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Repository (owner/repo)</label>
            <input
              type="text"
              value={testRepo}
              onChange={(e) => setTestRepo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              placeholder="owner/repo"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Issue #</label>
            <input
              type="number"
              value={testIssueNum}
              onChange={(e) => setTestIssueNum(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              placeholder="e.g. 42"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Issue Title</label>
            <input
              type="text"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              placeholder="Issue description"
              required
            />
          </div>
          <div className="md:col-span-3 flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500">
              Strict policy: Real GitHub API actions only when token is configured.
            </span>
            <button
              type="submit"
              disabled={triggerLoading || !status?.configured}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-medium rounded-lg transition"
            >
              <Send className="w-4 h-4" />
              {triggerLoading ? 'Triggering...' : 'Dispatch Action'}
            </button>
          </div>
        </form>

        {triggerResult && (
          <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300">
            {triggerResult}
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <h4 className="font-semibold text-slate-200 text-base mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-400" />
          Recorded GitHub Activity Log
        </h4>

        {activities.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No GitHub webhook operations or actions recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {activities.map((act) => (
              <div key={act.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {act.type}
                    </span>
                    <span className="text-sm font-medium text-slate-200">{act.title}</span>
                    {act.branch && (
                      <span className="flex items-center gap-1 text-xs text-indigo-400 font-mono bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800">
                        <GitBranch className="w-3 h-3" />
                        {act.branch}
                      </span>
                    )}
                  </div>
                  {act.detail && <p className="text-xs text-slate-400">{act.detail}</p>}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                  <span className={`px-2 py-0.5 rounded uppercase font-mono ${
                    act.status === 'completed' ? 'text-emerald-400 bg-emerald-950/60' :
                    act.status === 'in_progress' ? 'text-blue-400 bg-blue-950/60' :
                    act.status === 'failed' ? 'text-red-400 bg-red-950/60' : 'text-slate-400 bg-slate-800'
                  }`}>
                    {act.status}
                  </span>
                  <span>{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
