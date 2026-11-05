// @ts-nocheck
// src/components/DiagnosticsSystemErrorsTab.tsx
// ZYNTHEOR 0.3.1 — Diagnostics 'System Errors' tab integration with diagnosticReporter
// Shows viewport, storage, last 5 API codes when INVALID_ENDPOINT or streaming failure detected

import React, { useEffect, useState } from 'react';
import { generateDiagnosticSummary, type DiagnosticSummary } from '../services/diagnosticReporter';

export const DiagnosticsSystemErrorsTab: React.FC = () => {
  const [summary, setSummary] = useState<DiagnosticSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const s = await generateDiagnosticSummary();
      setSummary(s);
      setLoading(false);
    }
    load();
    // Refresh on resize
    const onResize = async () => {
      const s = await generateDiagnosticSummary();
      setSummary(s);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (loading) return <div className="p-3 text-xs text-zinc-500">Collecting diagnostic metadata...</div>;
  if (!summary) return <div className="p-3 text-xs text-zinc-500">No diagnostic data</div>;

  const showWarning = summary.systemErrors.hasInvalidEndpoint || summary.systemErrors.hasStreamingFailure;

  return (
    <div className="w-full space-y-3">
      {showWarning && (
        <div className="rounded border border-amber-800/50 bg-amber-900/20 p-2 text-xs text-amber-200">
          {summary.systemErrors.hasInvalidEndpoint && <div>⚠️ INVALID_ENDPOINT detected in recent API calls</div>}
          {summary.systemErrors.hasStreamingFailure && <div>⚠️ Streaming failure detected (status 0 or 5xx on /stream)</div>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-zinc-800/50 p-2">
          <div className="text-zinc-400">Viewport</div>
          <div className="mt-1 font-mono text-zinc-200">{summary.viewport.width}x{summary.viewport.height} @ {summary.viewport.dpr}x · {summary.viewport.orientation}</div>
        </div>
        <div className="rounded bg-zinc-800/50 p-2">
          <div className="text-zinc-400">Storage</div>
          <div className="mt-1 font-mono text-zinc-200">LS: {summary.storage.localStorageBytes} bytes / {summary.storage.localStorageKeys} keys · SS: {summary.storage.sessionStorageBytes} bytes</div>
          {summary.storage.quotaEstimate !== undefined && <div className="text-[11px] text-zinc-500">Quota usage: {summary.storage.quotaEstimate} bytes</div>}
        </div>
      </div>

      <div className="rounded border border-zinc-800 p-2">
        <div className="text-xs font-semibold text-zinc-300">Last 5 API Response Codes</div>
        <div className="mt-2 space-y-1">
          {summary.apiResponses.length === 0 && <div className="text-[11px] text-zinc-500">No recent API calls recorded — installDiagnosticInterceptor() at app startup to capture</div>}
          {summary.apiResponses.map((r, i) => (
            <div key={i} className="flex items-center justify-between rounded bg-zinc-800/30 px-2 py-1">
              <span className="font-mono text-[11px] text-zinc-300 truncate max-w-[200px]">{r.endpoint}</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${r.status >= 400 ? 'bg-red-900/40 text-red-300' : r.status === 0 ? 'bg-amber-900/40 text-amber-300' : 'bg-emerald-900/30 text-emerald-300'}`}>{r.status}</span>
              <span className="text-[10px] text-zinc-500">{r.durationMs ? `${r.durationMs}ms` : ''} · {new Date(r.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded bg-zinc-900/30 p-2 text-[11px] text-zinc-500">
        Env: {summary.environment.language} · Online: {summary.environment.online ? 'yes' : 'no'} · {new Date(summary.environment.timestamp).toLocaleString()}<br/>
        UA: {summary.environment.userAgent.slice(0,80)}...
      </div>
    </div>
  );
};

export default DiagnosticsSystemErrorsTab;
