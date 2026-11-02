// src/components/ModelsPage.tsx
// ZYNTHEOR 0.3.1 — Enhanced with 60-minute rolling latency & error chart
// Displays Connected / Degraded / Failed states from observability endpoint

import React from 'react';
import ModelMetricsRollingChart from './ModelMetricsRollingChart';

type ModelStatus = {
  id: string;
  name: string;
  provider: string;
  status: 'Connected' | 'Degraded' | 'Failed' | 'Unknown';
  latencyMs?: number;
  lastChecked: string;
};

export const ModelsPage: React.FC = () => {
  const [models, setModels] = React.useState<ModelStatus[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/models/status');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setModels(json.models || []);
      } catch {
        // fallback mock if endpoint not ready — do not block chart
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="w-full space-y-6 p-4">
      <h1 className="text-lg font-semibold text-zinc-100">Models — Status & Metrics</h1>

      {/* Rolling Chart — NEW in 0.3.1 */}
      <ModelMetricsRollingChart refreshIntervalMs={15000} />

      {/* Existing models list */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-sm font-semibold text-zinc-100">Model Providers</h2>
        {loading ? (
          <div className="mt-2 text-xs text-zinc-500">Loading models...</div>
        ) : (
          <div className="mt-3 grid gap-2">
            {models.length === 0 && <div className="text-xs text-zinc-500">No models configured — chart above shows aggregated latency/error from /api/observability/model-metrics</div>}
            {models.map(m => (
              <div key={m.id} className="flex items-center justify-between rounded bg-zinc-800/50 px-3 py-2">
                <div>
                  <div className="text-xs font-semibold text-zinc-200">{m.name} <span className="text-zinc-500">· {m.provider}</span></div>
                  <div className="text-[11px] text-zinc-500">Last checked: {new Date(m.lastChecked).toLocaleString()}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-semibold ${m.status === 'Connected' ? 'bg-emerald-900/40 text-emerald-300' : m.status === 'Degraded' ? 'bg-amber-900/40 text-amber-300' : m.status === 'Failed' ? 'bg-red-900/40 text-red-300' : 'bg-zinc-700 text-zinc-300'}`}>
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-[11px] text-zinc-500">
        Chart pulls from server-side observability endpoint /api/observability/model-metrics?window=60m — helps distinguish Connected (&lt;10% errors), Degraded (&gt;10% errors or P95 &gt;5s), Failed (&gt;50% errors). No secrets logged.
      </div>
    </div>
  );
};

export default ModelsPage;
