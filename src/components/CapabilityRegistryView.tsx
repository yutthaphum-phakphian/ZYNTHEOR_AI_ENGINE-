import React, { useEffect, useState } from 'react';
import { Cpu, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Layers } from 'lucide-react';
import { type Capability, ExecMode, Avail } from '../capability/registry';

export default function CapabilityRegistryView() {
  const [caps, setCaps] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<string>('ALL');

  const fetchCapabilities = () => {
    setLoading(true);
    fetch('/api/capabilities')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCaps(data);
      })
      .catch(() => setCaps([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCapabilities();
  }, []);

  const filtered = caps.filter((c) => {
    if (filterMode === 'ALL') return true;
    if (filterMode === 'AVAILABLE') return c.availability === Avail.AVAILABLE;
    if (filterMode === 'UNAVAILABLE') return c.availability === Avail.UNAVAILABLE;
    if (filterMode === 'NATIVE') return c.executionMode === ExecMode.NATIVE_MODEL;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#080F1B] text-slate-100 overflow-y-auto p-6 font-mono">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-cyan-950/50">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  CAPABILITY REGISTRY (PHASE L)
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  SINGLE SOURCE OF TRUTH
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live backend capability telemetry: Honest reporting of available vs unavailable system components.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchCapabilities}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs text-slate-300 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 text-xs">
          {['ALL', 'AVAILABLE', 'UNAVAILABLE', 'NATIVE'].map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterMode === mode
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800/60'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Capability Table */}
        <div className="overflow-x-auto border border-slate-800/80 rounded-2xl bg-slate-900/60 shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5">Capability ID & Name</th>
                <th className="p-3.5">Execution Mode</th>
                <th className="p-3.5">Availability</th>
                <th className="p-3.5">Verification</th>
                <th className="p-3.5">Evidence & Limitations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-950/40 transition-colors">
                  <td className="p-3.5">
                    <span className="font-bold text-white block">{c.name}</span>
                    <span className="text-[11px] text-cyan-400">{c.id}</span>
                    <span className="block text-[11px] text-slate-400 mt-1">{c.description}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 font-semibold">
                      {c.executionMode}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        c.availability === Avail.AVAILABLE
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : c.availability === Avail.UNAVAILABLE
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {c.availability}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        c.verificationStatus === 'VERIFIED'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {c.verificationStatus}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-300 max-w-sm">
                    <div className="truncate text-cyan-300 text-[11px]">Evidence: {c.evidence}</div>
                    {c.knownLimitations && (
                      <div className="text-[10px] text-amber-400/90 mt-0.5">
                        Limit: {c.knownLimitations}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
