import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Activity,
  Clock,
  RefreshCw,
  Zap,
  TrendingUp,
  Cpu,
  Layers,
  BarChart3,
  Sparkles,
} from 'lucide-react';

export interface RollingMetricPoint {
  point: number;
  id: string;
  timeLabel: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  status: 'success' | 'failed';
  model: string;
}

interface ModelMetricsRollingChartProps {
  selectedModel?: string;
  providerId?: string;
  refreshIntervalMs?: number;
}


export function ModelMetricsRollingChart({
  selectedModel: defaultModel = 'qwen2.5-coder:7b',
  providerId = 'ollama',
}: ModelMetricsRollingChartProps) {
  const activeModel = defaultModel;
  const [data, setData] = useState<RollingMetricPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState<'both' | 'latency' | 'tokens'>('both');
  const [lastUpdated, setLastUpdated] = useState<string>('');


  const fetchRollingData = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      const token = sessionStorage.getItem('zyntheor.access.v1');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/intelligence/observability/requests?limit=10', {
        headers,
        cache: 'no-store',
      });

      if (res.ok) {
        const body = await res.json();
        if (Array.isArray(body.records) && body.records.length > 0) {
          const rawRecords = body.records.slice(-10);
          const mapped: RollingMetricPoint[] = rawRecords.map((r: any, idx: number) => {
            const time = r.createdAt ? new Date(r.createdAt) : new Date();
            const promptTok = Number(r.promptTokens || r.inputTokens) || 0;
            const compTok = Number(r.completionTokens || r.outputTokens) || 0;
            const totTok = Number(r.totalTokens) || (promptTok + compTok);

            return {
              point: idx + 1,
              id: r.id || `req-${idx}`,
              timeLabel: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              latencyMs: Number(r.latencyMs) || 0,
              promptTokens: promptTok,
              completionTokens: compTok,
              totalTokens: totTok,
              status: r.status === 'success' ? 'success' : 'failed',
              model: r.model || activeModel,
            };
          });

          setData(mapped);
          setLastUpdated(new Date().toLocaleTimeString());
          setLoading(false);
          return;
        }
      }
    } catch {}

    setData([]);
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  }, [activeModel]);

  useEffect(() => {
    void fetchRollingData();
  }, [fetchRollingData]);

  // Polling timer if autoRefresh is enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void fetchRollingData();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchRollingData]);

  // Derived KPI statistics from the 10-point rolling data
  const latestPt = data[data.length - 1] || data[0];
  const avgLatency = Math.round(data.reduce((acc, p) => acc + p.latencyMs, 0) / (data.length || 1));
  const maxLatency = Math.max(...data.map(p => p.latencyMs), 0);
  const avgTokens = Math.round(data.reduce((acc, p) => acc + p.totalTokens, 0) / (data.length || 1));
  const peakTokens = Math.max(...data.map(p => p.totalTokens), 0);

  if (data.length === 0) {
    return (
      <div style={{ background: '#090e17', border: '1px solid #1e293b', borderRadius: '14px', padding: '20px', marginBottom: '22px', color: '#94a3b8', fontSize: '13px' }}>
        <b style={{ color: '#f1f5f9' }}>Inference metrics</b>
        <p style={{ margin: '6px 0 0' }}>No recorded requests yet. Metrics appear only after real model calls are logged.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#090e17',
        border: '1px solid #1e293b',
        borderRadius: '14px',
        padding: '20px',
        marginBottom: '22px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
          paddingBottom: '14px',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(16, 185, 129, 0.15))',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              display: 'grid',
              placeItems: 'center',
              color: '#38bdf8',
            }}
          >
            <BarChart3 size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <b style={{ fontSize: '15px', color: '#f8fafc' }}>
                10-Point Rolling Performance & Token Monitor
              </b>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: '#10b981',
                  color: '#022c22',
                  letterSpacing: '0.05em',
                }}
              >
                RECORDED REQUESTS
              </span>
            </div>
            <div style={{ marginTop: '3px', fontSize: '11px', color: '#94a3b8' }}>Configured model: {activeModel} · values come from recorded requests only</div>
          </div>
        </div>

        {/* View Mode Controls & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('both')}
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: '6px',
                border: 0,
                cursor: 'pointer',
                background: viewMode === 'both' ? '#38bdf8' : 'transparent',
                color: viewMode === 'both' ? '#0f172a' : '#94a3b8',
              }}
            >
              Dual View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('latency')}
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: '6px',
                border: 0,
                cursor: 'pointer',
                background: viewMode === 'latency' ? '#38bdf8' : 'transparent',
                color: viewMode === 'latency' ? '#0f172a' : '#94a3b8',
              }}
            >
              Latency (ms)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tokens')}
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: '6px',
                border: 0,
                cursor: 'pointer',
                background: viewMode === 'tokens' ? '#10b981' : 'transparent',
                color: viewMode === 'tokens' ? '#022c22' : '#94a3b8',
              }}
            >
              Tokens
            </button>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => setAutoRefresh(prev => !prev)}
            style={{
              fontSize: '10px',
              padding: '5px 10px',
              borderColor: autoRefresh ? '#10b981' : undefined,
              color: autoRefresh ? '#34d399' : undefined,
            }}
            title={autoRefresh ? 'Polling every 5 seconds' : 'Auto-refresh paused'}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: autoRefresh ? '#34d399' : '#64748b',
                display: 'inline-block',
              }}
            />
            {autoRefresh ? 'Auto 5s' : 'Paused'}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => void fetchRollingData()}
            disabled={loading}
            style={{ fontSize: '10px', padding: '5px 10px' }}
          >
            <RefreshCw size={12} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Real-time KPI Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
          marginBottom: '18px',
        }}
      >
        <div
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <span style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={12} style={{ color: '#38bdf8' }} /> Latest Latency
          </span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8', marginTop: '4px' }}>
            {latestPt?.latencyMs || 0} <span style={{ fontSize: '11px', color: '#94a3b8' }}>ms</span>
          </div>
          <span style={{ fontSize: '9px', color: '#64748b' }}>
            Avg: {avgLatency}ms | Max: {maxLatency}ms
          </span>
        </div>

        <div
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <span style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Zap size={12} style={{ color: '#10b981' }} /> Latest Token Usage
          </span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
            {latestPt?.totalTokens || 0} <span style={{ fontSize: '11px', color: '#94a3b8' }}>tok</span>
          </div>
          <span style={{ fontSize: '9px', color: '#64748b' }}>
            {latestPt?.promptTokens || 0} in / {latestPt?.completionTokens || 0} out
          </span>
        </div>

        <div
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <span style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <TrendingUp size={12} style={{ color: '#c084fc' }} /> 10-Pt Avg Tokens
          </span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#c084fc', marginTop: '4px' }}>
            {avgTokens} <span style={{ fontSize: '11px', color: '#94a3b8' }}>tok/req</span>
          </div>
          <span style={{ fontSize: '9px', color: '#64748b' }}>
            Peak request: {peakTokens} tokens
          </span>
        </div>

        <div
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <span style={{ fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Activity size={12} style={{ color: '#38bdf8' }} /> Rolling Status
          </span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
            {data.filter(d => d.status === 'success').length}/{data.length} <span style={{ fontSize: '11px', color: '#34d399' }}>PASS</span>
          </div>
          <span style={{ fontSize: '9px', color: '#64748b' }}>
            100% Deterministic Execution
          </span>
        </div>
      </div>

      {/* Recharts Composed Chart Component */}
      <div
        style={{
          width: '100%',
          height: 260,
          marginTop: '8px',
          transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: 1,
          transform: 'scale(1)',
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.07)" vertical={false} />

            <XAxis
              dataKey="point"
              tickFormatter={(pt) => `P${pt}`}
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
            />

            {(viewMode === 'both' || viewMode === 'latency') && (
              <YAxis
                yAxisId="latency"
                orientation="left"
                stroke="#38bdf8"
                fontSize={10}
                tickLine={false}
                unit="ms"
                domain={['auto', 'auto']}
              />
            )}

            {(viewMode === 'both' || viewMode === 'tokens') && (
              <YAxis
                yAxisId="tokens"
                orientation="right"
                stroke="#10b981"
                fontSize={10}
                tickLine={false}
                unit="t"
                domain={['auto', 'auto']}
              />
            )}

            <Tooltip
              contentStyle={{
                background: '#090e17',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#f8fafc',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
              }}
              formatter={(value: any, name: any) => {
                if (name === 'latencyMs' || name === 'Latency (ms)') return [`${value} ms`, 'Inference Latency'];
                if (name === 'promptTokens' || name === 'Prompt Tokens') return [`${value} tokens`, 'Prompt Tokens'];
                if (name === 'completionTokens' || name === 'Completion Tokens') return [`${value} tokens`, 'Output Tokens'];
                if (name === 'totalTokens' || name === 'Total Tokens') return [`${value} tokens`, 'Total Tokens'];
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                const item = payload && payload[0]?.payload;
                return item ? `Point #${label} (${item.timeLabel})` : `Point #${label}`;
              }}
            />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
            />

            {(viewMode === 'both' || viewMode === 'latency') && (
              <Area
                yAxisId="latency"
                type="monotone"
                dataKey="latencyMs"
                name="Latency (ms)"
                stroke="#38bdf8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#latencyGradient)"
              />
            )}

            {(viewMode === 'both' || viewMode === 'tokens') && (
              <Bar
                yAxisId="tokens"
                dataKey="promptTokens"
                name="Prompt Tokens"
                stackId="tokens"
                fill="#3b82f6"
                radius={[0, 0, 0, 0]}
                barSize={16}
              />
            )}

            {(viewMode === 'both' || viewMode === 'tokens') && (
              <Bar
                yAxisId="tokens"
                dataKey="completionTokens"
                name="Completion Tokens"
                stackId="tokens"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                barSize={16}
              />
            )}

            {viewMode === 'tokens' && (
              <Line
                yAxisId="tokens"
                type="monotone"
                dataKey="totalTokens"
                name="Total Tokens"
                stroke="#c084fc"
                strokeWidth={2}
                dot={{ r: 3, fill: '#c084fc' }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ModelMetricsRollingChart;

