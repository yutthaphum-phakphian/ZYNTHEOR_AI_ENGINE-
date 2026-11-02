import React from 'react';
import type { ExecutionResult } from '../types/execution.ts';

interface SandboxTerminalProps {
  execResult: (ExecutionResult & { jobId?: string; command?: string }) | null;
  onClear?: () => void;
}

export function SandboxTerminal({ execResult, onClear }: SandboxTerminalProps) {
  if (!execResult) {
    return (
      <div className="bg-[#0B132B]/80 border border-slate-800 rounded-xl p-5 font-mono text-xs text-slate-500 text-center">
        No sandbox execution recorded in this session. Execute code through the Isolated Execution Gateway to inspect telemetry.
      </div>
    );
  }

  const isSuccess = execResult.status === 'COMPLETED';
  const isViolation = execResult.status === 'SECURITY_VIOLATION';
  const isUnavailable = execResult.status === 'SANDBOX_UNAVAILABLE';
  const isTimeout = execResult.status === 'TIMEOUT';

  let badgeColor = 'bg-red-500/20 text-red-400 border-red-500/30';
  if (isSuccess) badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  else if (isViolation) badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  else if (isUnavailable) badgeColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
  else if (isTimeout) badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';

  return (
    <div className="bg-[#080F1B] border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 shadow-xl">
      <div className="flex flex-wrap justify-between items-center mb-4 pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-teal-400 font-bold">Job: {execResult.jobId || 'interactive'}</span>
          {execResult.containerId && execResult.containerId !== 'UNKNOWN' && (
            <span className="text-slate-500 text-[10px]">({execResult.containerId.substring(0, 12)})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${badgeColor}`}>
            {execResult.status} {execResult.exitCode !== undefined && `(Exit: ${execResult.exitCode})`}
          </span>
          {onClear && (
            <button
              onClick={onClear}
              className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded border border-slate-700 bg-slate-800/40"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Configured Limits */}
        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
          <h4 className="text-slate-400 font-bold mb-2 text-[10px] uppercase tracking-wider">Configured Limits</h4>
          <ul className="text-[11px] space-y-1 text-slate-400">
            <li>CPU Limit: <span className="text-slate-200">0.5 Core (500M NanoCpus)</span></li>
            <li>RAM Limit: <span className="text-slate-200">256 MB (Swap Disabled)</span></li>
            <li>Timeout Limit: <span className="text-slate-200">15,000 ms</span></li>
            <li>Network: <span className="text-rose-400 font-semibold">DISABLED (NetworkMode: none)</span></li>
            <li>Root Filesystem: <span className="text-emerald-400 font-semibold">READ-ONLY</span></li>
          </ul>
        </div>

        {/* Measured Usage */}
        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
          <h4 className="text-slate-400 font-bold mb-2 text-[10px] uppercase tracking-wider">Measured Usage</h4>
          <ul className="text-[11px] space-y-1 text-blue-300">
            <li>Peak RAM: <span className="text-slate-200">{execResult.measuredUsage?.memoryMB || 'UNKNOWN'} MB</span></li>
            <li>CPU Usage: <span className="text-slate-200">{execResult.measuredUsage?.cpuUsage || 'UNKNOWN'}</span></li>
            <li>Execution Duration: <span className="text-slate-200">{execResult.durationMs} ms</span></li>
            <li>Sandbox Cleanup: <span className="text-slate-200">{execResult.cleanupStatus || 'UNKNOWN'}</span></li>
          </ul>
        </div>
      </div>

      <div className="mt-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Output Stream</span>
          <span className="text-[10px] text-slate-500">Standard Out & Error</span>
        </div>
        <pre className="whitespace-pre-wrap text-slate-200 bg-slate-950 p-3 rounded-lg max-h-64 overflow-y-auto border border-slate-800/80 leading-relaxed font-mono text-[11px]">
          {execResult.stdout || execResult.stderr || (execResult.message ? `Status note: ${execResult.message}` : 'No output produced.')}
        </pre>
      </div>
    </div>
  );
}

export default SandboxTerminal;
