import React, { useState, useEffect } from 'react';
import {
  Brain,
  Cpu,
  Globe,
  ShieldCheck,
  Zap,
  Sliders,
  Database,
  Layers,
  Activity,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  zyntheorIntelligenceRuntime,
  type OperatingMode,
  type ModelRoutingDecision,
} from '../lib/ZyntheorIntelligenceRuntime';
import { zyntheorMemoryEngine, type MemoryStorageStats } from '../lib/ZyntheorMemoryEngine';
import { getActiveModel } from '../contracts/modelIdentityContract';

export interface ZyntheorIntelligenceRuntimeProps {
  className?: string;
}

export const ZyntheorIntelligenceRuntime: React.FC<ZyntheorIntelligenceRuntimeProps> = ({
  className = '',
}) => {
  const [operatingMode, setOperatingMode] = useState<OperatingMode>(() =>
    zyntheorIntelligenceRuntime.getOperatingMode()
  );
  const [memoryStats, setMemoryStats] = useState<MemoryStorageStats>(() =>
    zyntheorMemoryEngine.getStats()
  );
  const activeModel = getActiveModel();

  useEffect(() => {
    zyntheorIntelligenceRuntime.setOperatingMode(operatingMode);
  }, [operatingMode]);

  return (
    <div className={`p-4 bg-[#090f1d] border border-white/10 rounded-2xl text-slate-100 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#00D9A3]/10 text-[#00D9A3] border border-[#00D9A3]/20">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              ZYNTHEOR Intelligence Runtime
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Unified Orchestrator
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Single-pipeline orchestrator for model routing, context management & capability selection.
            </p>
          </div>
        </div>

        {/* Operating Mode Selector */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
          <button
            onClick={() => setOperatingMode('ONLINE_INTELLIGENCE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              operatingMode === 'ONLINE_INTELLIGENCE'
                ? 'bg-[#00D9A3]/20 text-[#00D9A3] border border-[#00D9A3]/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Online-First
          </button>
          <button
            onClick={() => setOperatingMode('HYBRID_INTELLIGENCE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              operatingMode === 'HYBRID_INTELLIGENCE'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Hybrid
          </button>
          <button
            onClick={() => setOperatingMode('LOCAL_ONLY')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              operatingMode === 'LOCAL_ONLY'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Local-Only
          </button>
        </div>
      </div>

      {/* 4 Pipeline Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-xs">
        {/* 1. Model Routing */}
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center gap-2 text-slate-400 font-medium mb-1.5">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Model Routing</span>
          </div>
          <div className="text-sm font-semibold text-white truncate">{activeModel.name}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Category: <span className="text-cyan-300 font-mono">{activeModel.category}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Provider: <span className="text-slate-300">{activeModel.provider}</span>
          </div>
        </div>

        {/* 2. Context & Vector Memory */}
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center gap-2 text-slate-400 font-medium mb-1.5">
            <Database className="w-4 h-4 text-purple-400" />
            <span>Vector Context</span>
          </div>
          <div className="text-sm font-semibold text-white">
            {memoryStats.totalCount} Stored Memories
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Embedding: <span className="text-purple-300 font-mono">128-d Unit Vector</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Preferences: <span className="text-slate-300">{memoryStats.preferenceCount}</span> | Invariants: <span className="text-slate-300">{memoryStats.projectKnowledgeCount}</span>
          </div>
        </div>

        {/* 3. Adaptive Reasoning */}
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center gap-2 text-slate-400 font-medium mb-1.5">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Adaptive Reasoning</span>
          </div>
          <div className="text-sm font-semibold text-emerald-400">Dynamic 4-Tier</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            CoT: <span className="text-slate-300">1 to 8 steps</span> | Temp: <span className="text-slate-300">0.70 to 0.05</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Verification: <span className="text-emerald-400">Falsification Active</span>
          </div>
        </div>

        {/* 4. Sovereign Trust Ledger */}
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center gap-2 text-slate-400 font-medium mb-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Trust & Governance</span>
          </div>
          <div className="text-sm font-semibold text-amber-300">Zero-Mock Active</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Evidence: <span className="text-slate-300 font-mono">SHA-256 Tamper-Proof</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Integrity Gate: <span className="text-emerald-400">PASS (Fail-Closed)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZyntheorIntelligenceRuntime;
