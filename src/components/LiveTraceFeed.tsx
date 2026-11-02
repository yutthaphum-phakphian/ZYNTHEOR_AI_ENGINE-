import React from 'react';
import { Brain, Code2, ShieldCheck, TestTube2, Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle, Check, X } from 'lucide-react';
const getAgentConfig = (a:string) => {
  switch(a){
    case 'PLANNER': return { icon:Brain, color:'text-purple-400', bg:'bg-purple-500/10', border:'border-purple-500/30', label:'PLANNER' };
    case 'CODER': return { icon:Code2, color:'text-blue-400', bg:'bg-blue-500/10', border:'border-blue-500/30', label:'CODER' };
    case 'REVIEWER': return { icon:ShieldCheck, color:'text-amber-400', bg:'bg-amber-500/10', border:'border-amber-500/30', label:'REVIEWER' };
    case 'TESTER': return { icon:TestTube2, color:'text-emerald-400', bg:'bg-emerald-500/10', border:'border-emerald-500/30', label:'TESTER' };
    case 'REFLECTOR': return { icon:Sparkles, color:'text-pink-400', bg:'bg-pink-500/10', border:'border-pink-500/30', label:'REFLECTOR' };
    default: return { icon:Loader2, color:'text-slate-400', bg:'bg-slate-800', border:'border-slate-700', label:'SYSTEM' };
  }
};
export default function LiveTraceFeed({ logs, sessionId }: { logs:any[], sessionId:string }) {
  const approve = async (ok:boolean) => {
    await fetch('/api/agent/approve', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sessionId, approved: ok }) });
  };
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {logs.map((log,idx)=>{
        if (log.type==='require_approval') return (
          <div key={idx} className="flex justify-center my-6">
            <div className="bg-amber-500/10 border-2 border-amber-500/50 p-6 rounded-xl max-w-md w-full">
              <div className="flex items-center gap-3 mb-4 text-amber-400"><AlertTriangle className="w-6 h-6" /><h3 className="font-bold">Human Approval Required</h3></div>
              <p className="text-sm text-slate-300 mb-6">Agent will execute in sandbox<br/><code className="text-xs bg-black/50 p-1 mt-2 block rounded text-amber-300">{log.filepath}</code></p>
              <div className="flex gap-3">
                <button onClick={()=>approve(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2"><Check className="w-4 h-4"/>Approve</button>
                <button onClick={()=>approve(false)} className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"><X className="w-4 h-4"/>Reject</button>
              </div>
            </div>
          </div>
        );
        if (log.type==='graph_start' || log.type==='final') return (<div key={idx} className="flex justify-center my-4"><span className="text-xs font-mono bg-slate-800 text-slate-400 px-4 py-1 rounded-full border border-slate-700">{log.content}</span></div>);
        if (log.type==='agent_thought' || log.type==='agent_start') {
          const cfg = getAgentConfig(log.agent); const Icon = cfg.icon;
          return (<div key={idx} className="flex gap-4"><div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${cfg.bg} ${cfg.border}`}><Icon className={`w-5 h-5 ${cfg.color} ${log.type==='agent_start'?'animate-pulse':''}`} /></div><div className={`flex-1 p-4 rounded-lg border ${cfg.border} bg-[#0f172a]`}><div className={`text-xs font-bold ${cfg.color} mb-2`}>{cfg.label}</div><div className="text-slate-300 text-sm whitespace-pre-wrap font-mono">{log.content}</div></div></div>);
        }
        if (log.type==='tool_call' || log.type==='tool_result') {
          const isErr = log.status==='error';
          return (<div key={idx} className="flex gap-4 ml-14"><div className={`flex-1 border rounded-lg overflow-hidden ${isErr?'border-red-500/50 bg-red-500/5':'border-slate-700 bg-slate-800/50'}`}><div className="px-4 py-2 border-b flex justify-between"><span className="font-mono text-xs text-slate-200">{log.name} {log.args?.filepath||log.args?.command||''}</span>{log.status==='running'?<Loader2 className="w-3 h-3 animate-spin text-blue-400"/>:log.status==='success'?<CheckCircle2 className="w-3 h-3 text-emerald-400"/>:<XCircle className="w-3 h-3 text-red-400"/>}</div>{log.output&&<pre className={`p-3 text-[11px] whitespace-pre-wrap ${isErr?'text-red-300':'text-slate-300'}`}>{log.output}</pre>}</div></div>);
        }
        return null;
      })}
    </div>
  );
    }
