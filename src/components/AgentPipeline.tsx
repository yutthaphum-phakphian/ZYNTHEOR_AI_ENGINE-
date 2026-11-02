import React from 'react';
import { Brain, Code2, ShieldCheck, TestTube2, Sparkles, ChevronRight } from 'lucide-react';
export default function AgentPipeline({ currentAgent }: { currentAgent: string }) {
  const steps = [
    { id:'PLANNER', icon:Brain, label:'Plan' },
    { id:'CODER', icon:Code2, label:'Code' },
    { id:'REVIEWER', icon:ShieldCheck, label:'Review' },
    { id:'TESTER', icon:TestTube2, label:'Test' },
    { id:'REFLECTOR', icon:Sparkles, label:'Learn' },
  ];
  return (
    <div className="flex items-center justify-center gap-2 p-3 bg-slate-900/50 border-b border-slate-800">
      {steps.map((s,idx)=>{
        const active = currentAgent===s.id;
        const Icon = s.icon;
        return (<React.Fragment key={s.id}>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${active?'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]':'bg-slate-800 text-slate-500 border border-transparent'}`}>
            <Icon className={`w-3.5 h-3.5 ${active?'animate-pulse':''}`} />{s.label}
          </div>
          {idx<steps.length-1 && <ChevronRight className="w-4 h-4 text-slate-600" />}
        </React.Fragment>);
      })}
    </div>
  );
}
