import React from 'react';
import { Brain, Code2, ShieldCheck, TestTube2, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const getAgentConfig = (agentName: string) => {
  switch (agentName) {
    case 'PLANNER': return { icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', label: 'PLANNER (Architect)' };
    case 'CODER': return { icon: Code2, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'CODER (Engineer)' };
    case 'REVIEWER': return { icon: ShieldCheck, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'REVIEWER (QA)' };
    case 'TESTER': return { icon: TestTube2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'TESTER (Sandbox)' };
    default: return { icon: Loader2, color: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-700', label: 'SYSTEM' };
  }
};

export default function LiveTraceFeed({ logs }: { logs: any[] }) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans">
      {logs.map((log, idx) => {
        if (log.type === 'graph_start' || log.type === 'final') {
          return (
            <div key={idx} className="flex justify-center my-4">
              <span className="text-xs font-mono bg-slate-800 text-slate-400 px-4 py-1 rounded-full border border-slate-700">
                {log.content}
              </span>
            </div>
          );
        }
        if (log.type === 'agent_thought' || log.type === 'agent_start') {
          const config = getAgentConfig(log.agent);
          const Icon = config.icon;
          return (
            <div key={idx} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${config.bg} ${config.border}`}>
                <Icon className={`w-5 h-5 ${config.color} ${log.type === 'agent_start' ? 'animate-pulse' : ''}`} />
              </div>
              <div className={`flex-1 p-4 rounded-lg border ${config.border} bg-[#0f172a] shadow-lg`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs font-bold tracking-wider ${config.color}`}>{config.label}</span>
                  {log.type === 'agent_start' && <span className="text-[10px] text-slate-500 animate-pulse">Working...</span>}
                </div>
                <div className="text-slate-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">{log.content}</div>
              </div>
            </div>
          );
        }
        if (log.type === 'tool_call' || log.type === 'tool_result') {
          const isError = log.status === 'error';
          return (
            <div key={idx} className="flex gap-4 ml-14">
               <div className={`flex-1 border rounded-lg overflow-hidden ${isError ? 'border-red-500/50 bg-red-500/5' : 'border-slate-700 bg-slate-800/50'}`}>
                  <div className="px-4 py-2 border-b border-inherit flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-slate-400">Tool:</span>
                      <span className="font-bold text-slate-200">{log.name}</span>
                      {log.args?.command && <span className="text-slate-500">$ {log.args.command}</span>}
                      {log.args?.filepath && <span className="text-slate-500">📄 {log.args.filepath}</span>}
                    </div>
                    {log.status === 'running' && <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />}
                    {log.status === 'success' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    {log.status === 'error' && <XCircle className="w-3 h-3 text-red-400" />}
                  </div>
                  {log.output && <div className={`p-3 font-mono text-[11px] overflow-x-auto ${isError ? 'text-red-300' : 'text-slate-300'}`}><pre className="whitespace-pre-wrap">{log.output}</pre></div>}
               </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
              }
