import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  Clock,
  RefreshCw,
  Zap,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Split,
  Eye,
  EyeOff,
  ShieldAlert,
  Layers,
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

export interface ChatSessionTokenRollingChartProps {
  activeModel?: string;
  selectedModel?: string;
  providerId?: string;
  contextWindowLimit?: number;
  warningThresholdRatio?: number;
  data?: RollingMetricPoint[];
  records?: RollingMetricPoint[];
  refreshIntervalMs?: number;
  sessionId?: string;
  initialShowIndividualTokens?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onThresholdExceeded?: (point: RollingMetricPoint, limit: number, threshold: number) => void;
}

/**
 * Recommended Context Window Limits by Model Family.
 * Models default to realistic limits so the 80% threshold calculation reflects real memory budgets.
 */
export const RECOMMENDED_CONTEXT_LIMITS: Record<string, number> = {
  // Gemini models
  'gemini-3.8-flash': 1_000_000,
  'gemini-2.5-flash': 1_000_000,
  'gemini-1.5-flash': 1_000_000,
  'gemini-1.5-pro': 2_000_000,
  'gemini-flash': 1_000_000,
  'gemini-pro': 1_000_000,

  // Qwen models (frequently configured in local Ollama runtimes)
  'qwen2.5-coder:7b': 32_768,
  'qwen2.5-coder': 32_768,
  'qwen2.5:7b': 32_768,
  'qwen2.5': 32_768,

  // Llama models
  'llama3.1': 128_000,
  'llama-3.1': 128_000,
  'llama3': 8_192,
  'llama3:8b': 8_192,

  // OpenAI models
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-4-turbo': 128_000,
  'gpt-4': 8_192,
  'gpt-3.5-turbo': 16_385,

  // Claude models
  'claude-3-5-sonnet': 200_000,
  'claude-3-opus': 200_000,
  'claude-3-haiku': 200_000,

  // Zyntheor Native Core models
  'zyntheor-core-1.1': 8_192,
  'zyntheor-core': 8_192,
  'buffalo-0.14.0': 8_192,
  'buffalo': 8_192,
  'buffalo-sovereign': 8_192,
};

/**
 * Resolves the recommended context window limit for a given model name.
 */
export function getRecommendedContextLimit(modelName?: string): number {
  if (!modelName) return 8_192;
  const normalized = modelName.toLowerCase().trim();

  for (const [key, limit] of Object.entries(RECOMMENDED_CONTEXT_LIMITS)) {
    if (normalized === key || normalized.includes(key)) {
      return limit;
    }
  }

  if (normalized.includes('gemini')) return 1_000_000;
  if (normalized.includes('qwen')) return 32_768;
  if (normalized.includes('llama3.1') || normalized.includes('llama-3.1')) return 128_000;
  if (normalized.includes('claude')) return 200_000;
  if (normalized.includes('gpt-4')) return 128_000;

  return 8_192;
}

export function ChatSessionTokenRollingChart({
  activeModel: propActiveModel,
  selectedModel: propSelectedModel,
  providerId = 'ollama',
  contextWindowLimit: propContextLimit,
  warningThresholdRatio = 0.8,
  data: propData,
  records: propRecords,
  refreshIntervalMs = 5000,
  sessionId,
  initialShowIndividualTokens = true,
  className = '',
  style = {},
  onThresholdExceeded,
}: ChatSessionTokenRollingChartProps) {
  const activeModel = propActiveModel || propSelectedModel || 'qwen2.5-coder:7b';
  const externalData = propData || propRecords;

  const [data, setData] = useState<RollingMetricPoint[]>(() => {
    return externalData || [];
  });
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState<'both' | 'latency' | 'tokens'>('both');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Toggle control: Hide/show individual prompt token counts versus completion token counts
  const [showIndividualTokens, setShowIndividualTokens] = useState<boolean>(initialShowIndividualTokens);

  // Recommended context window limit and 80% threshold
  const recommendedLimit = useMemo(() => {
    return propContextLimit || getRecommendedContextLimit(activeModel);
  }, [propContextLimit, activeModel]);

  const thresholdLimit = useMemo(() => {
    return Math.floor(recommendedLimit * warningThresholdRatio);
  }, [recommendedLimit, warningThresholdRatio]);

  const fetchRollingData = useCallback(async () => {
    if (externalData) {
      setData(externalData);
      setLastUpdated(new Date().toLocaleTimeString());
      return;
    }

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
  }, [activeModel, externalData]);

  useEffect(() => {
    if (externalData) {
      setData(externalData);
      setLastUpdated(new Date().toLocaleTimeString());
    } else {
      void fetchRollingData();
    }
  }, [externalData, fetchRollingData]);

  // Polling timer if autoRefresh is enabled and no static external data is passed
  useEffect(() => {
    if (!autoRefresh || externalData) return;
    const interval = setInterval(() => {
      void fetchRollingData();
    }, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [autoRefresh, externalData, fetchRollingData, refreshIntervalMs]);

  // Derived metrics and threshold evaluations
  const latestPt = data[data.length - 1] || data[0];
  const avgLatency = Math.round(data.reduce((acc, p) => acc + p.latencyMs, 0) / (data.length || 1));
  const maxLatency = Math.max(...data.map(p => p.latencyMs), 0);
  const avgTokens = Math.round(data.reduce((acc, p) => acc + p.totalTokens, 0) / (data.length || 1));
  const peakTokens = Math.max(...data.map(p => p.totalTokens), 0);

  // Check if any point or the peak exceeds the 80% threshold
  const exceededPoints = useMemo(() => {
    return data.filter(p => p.totalTokens > thresholdLimit);
  }, [data, thresholdLimit]);

  const hasExceededThreshold = exceededPoints.length > 0;
  const latestPointExceeded = latestPt ? latestPt.totalTokens > thresholdLimit : false;

  useEffect(() => {
    if (hasExceededThreshold && onThresholdExceeded && exceededPoints[0]) {
      onThresholdExceeded(exceededPoints[0], recommendedLimit, thresholdLimit);
    }
  }, [hasExceededThreshold, exceededPoints, recommendedLimit, thresholdLimit, onThresholdExceeded]);

  if (data.length === 0) {
    return (
      <div
        className={`chat-session-token-rolling-chart-empty ${className}`}
        style={{
          background: '#090e17',
          border: '1px solid #1e293b',
          borderRadius: '14px',
          padding: '20px',
          marginBottom: '22px',
          color: '#94a3b8',
          fontSize: '13px',
          ...style,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <BarChart3 size={16} style={{ color: '#38bdf8' }} />
          <b style={{ color: '#f1f5f9' }}>Chat Session Token Rolling Chart</b>
        </div>
        <p style={{ margin: 0 }}>
          No recorded token events yet for active model <code style={{ color: '#38bdf8' }}>{activeModel}</code>. Metrics appear once chat or model requests are recorded.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`chat-session-token-rolling-chart ${className}`}
      data-testid="chat-session-token-rolling-chart"
      style={{
        background: '#090e17',
        border: hasExceededThreshold ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid #1e293b',
        borderRadius: '14px',
        padding: '20px',
        marginBottom: '22px',
        boxShadow: hasExceededThreshold
          ? '0 10px 30px rgba(239, 68, 68, 0.12)'
          : '0 10px 30px rgba(0, 0, 0, 0.4)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        ...style,
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
              background: hasExceededThreshold
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(220, 38, 38, 0.15))'
                : 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(16, 185, 129, 0.15))',
              border: hasExceededThreshold
                ? '1px solid rgba(239, 68, 68, 0.45)'
                : '1px solid rgba(56, 189, 248, 0.35)',
              display: 'grid',
              placeItems: 'center',
              color: hasExceededThreshold ? '#ef4444' : '#38bdf8',
            }}
          >
            {hasExceededThreshold ? <AlertTriangle size={22} /> : <BarChart3 size={22} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <b style={{ fontSize: '15px', color: '#f8fafc' }}>
                Chat Session Token & Performance Monitor
              </b>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: hasExceededThreshold ? '#ef4444' : '#10b981',
                  color: hasExceededThreshold ? '#ffffff' : '#022c22',
                  letterSpacing: '0.05em',
                }}
              >
                {hasExceededThreshold ? 'THRESHOLD WARNING (>80%)' : 'RECORDED REQUESTS'}
              </span>
            </div>
            <div style={{ marginTop: '3px', fontSize: '11px', color: '#94a3b8' }}>
              Model: <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{activeModel}</span> · Recommended Limit: {recommendedLimit.toLocaleString()} tok · 80% Threshold: {thresholdLimit.toLocaleString()} tok
            </div>
          </div>
        </div>

        {/* View Mode Controls, Breakdown Toggle, & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Individual Prompt vs Completion Breakdown Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={showIndividualTokens}
            aria-label="Toggle prompt and completion token breakdown"
            data-testid="toggle-token-breakdown"
            onClick={() => setShowIndividualTokens(prev => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: '8px',
              cursor: 'pointer',
              border: showIndividualTokens
                ? '1px solid rgba(59, 130, 246, 0.5)'
                : '1px solid #334155',
              background: showIndividualTokens
                ? 'rgba(59, 130, 246, 0.15)'
                : '#0f172a',
              color: showIndividualTokens ? '#60a5fa' : '#94a3b8',
              transition: 'all 0.15s ease',
            }}
            title={
              showIndividualTokens
                ? 'Currently showing individual prompt and completion token counts. Click to hide breakdown and simplify view.'
                : 'Currently showing total token count only. Click to show prompt and completion breakdown.'
            }
          >
            {showIndividualTokens ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>{showIndividualTokens ? 'Prompt vs Completion: Shown' : 'Simplified (Total Only)'}</span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: '4px',
                background: showIndividualTokens ? '#2563eb' : '#334155',
                color: '#ffffff',
              }}
            >
              {showIndividualTokens ? 'BREAKDOWN' : 'COMBINED'}
            </span>
          </button>

          {/* View Mode (Dual / Latency / Tokens) */}
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
              Dual
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
              Latency
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

          {!externalData && (
            <>
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
                title={autoRefresh ? 'Polling every 5s' : 'Polling paused'}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: autoRefresh ? '#34d399' : '#64748b',
                    display: 'inline-block',
                    marginRight: '4px',
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
            </>
          )}
        </div>
      </div>

      {/* Threshold Warning Banner if token usage exceeds 80% of context limit */}
      {hasExceededThreshold && (
        <div
          role="alert"
          data-testid="threshold-warning"
          className="threshold-warning"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            fontSize: '12px',
            marginBottom: '16px',
          }}
        >
          <AlertTriangle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#ef4444' }}>
              Threshold Warning: Context Window Exceeded 80% Limit!
            </div>
            <div style={{ fontSize: '11px', color: '#fca5a5', marginTop: '2px' }}>
              Token usage reached <strong>{peakTokens.toLocaleString()} tokens</strong> (
              {((peakTokens / recommendedLimit) * 100).toFixed(1)}% of {recommendedLimit.toLocaleString()} tok limit for {activeModel}
              ). Bars exceeding the 80% threshold ({thresholdLimit.toLocaleString()} tokens) are highlighted in <strong>RED</strong>.
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
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
            background: latestPointExceeded ? 'rgba(239, 68, 68, 0.1)' : '#0f172a',
            border: latestPointExceeded ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #1e293b',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <span style={{ fontSize: '10px', color: latestPointExceeded ? '#fca5a5' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Zap size={12} style={{ color: latestPointExceeded ? '#ef4444' : '#10b981' }} /> Latest Token Usage
          </span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: latestPointExceeded ? '#ef4444' : '#10b981', marginTop: '4px' }}>
            {latestPt?.totalTokens || 0} <span style={{ fontSize: '11px', color: '#94a3b8' }}>tok</span>
          </div>
          <span style={{ fontSize: '9px', color: latestPointExceeded ? '#ef4444' : '#64748b' }}>
            {showIndividualTokens
              ? `${latestPt?.promptTokens || 0} in / ${latestPt?.completionTokens || 0} out`
              : `${(( (latestPt?.totalTokens || 0) / recommendedLimit) * 100).toFixed(1)}% of Context Limit`}
          </span>
        </div>

        <div
          style={{
            background: hasExceededThreshold ? 'rgba(239, 68, 68, 0.1)' : '#0f172a',
            border: hasExceededThreshold ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #1e293b',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <span style={{ fontSize: '10px', color: hasExceededThreshold ? '#fca5a5' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ShieldAlert size={12} style={{ color: hasExceededThreshold ? '#ef4444' : '#c084fc' }} /> Context Limit & Threshold
          </span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: hasExceededThreshold ? '#ef4444' : '#c084fc', marginTop: '4px' }}>
            {thresholdLimit.toLocaleString()} <span style={{ fontSize: '11px', color: '#94a3b8' }}>80% limit</span>
          </div>
          <span style={{ fontSize: '9px', color: hasExceededThreshold ? '#ef4444' : '#64748b' }}>
            Peak: {peakTokens.toLocaleString()} / {recommendedLimit.toLocaleString()} tok
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
            {hasExceededThreshold ? `${exceededPoints.length} points exceeded 80%` : 'All points within 80% budget'}
          </span>
        </div>
      </div>

      {/* Recharts Composed Chart Component */}
      <div
        style={{
          width: '100%',
          height: 270,
          marginTop: '8px',
        }}
      >
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 270 }}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="sessionLatencyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
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
                stroke={hasExceededThreshold ? '#ef4444' : '#10b981'}
                fontSize={10}
                tickLine={false}
                unit="t"
                domain={[0, (dataMax: number) => Math.max(dataMax, Math.round(thresholdLimit * 1.05))]}
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
              formatter={(value: any, name: any, item: any) => {
                const total = item?.payload?.totalTokens || 0;
                const isOver = total > thresholdLimit;
                if (name === 'latencyMs' || name === 'Latency (ms)') return [`${value} ms`, 'Inference Latency'];
                if (name === 'promptTokens' || name === 'Prompt Tokens') {
                  return [`${value} tokens${isOver ? ' (Over 80% Threshold)' : ''}`, 'Prompt Tokens'];
                }
                if (name === 'completionTokens' || name === 'Completion Tokens') {
                  return [`${value} tokens${isOver ? ' (Over 80% Threshold)' : ''}`, 'Completion Tokens'];
                }
                if (name === 'totalTokens' || name === 'Total Tokens') {
                  return [
                    `${value} tokens (${((value / recommendedLimit) * 100).toFixed(1)}% of limit)${isOver ? ' ⚠️ >80% THRESHOLD' : ''}`,
                    'Total Tokens',
                  ];
                }
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                const item = payload && payload[0]?.payload;
                const total = item?.totalTokens || 0;
                const warningStr = total > thresholdLimit ? ' ⚠️ [EXCEEDED 80% CONTEXT]' : '';
                return item ? `Point #${label} (${item.timeLabel})${warningStr}` : `Point #${label}`;
              }}
            />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
            />

            {/* 80% Context Limit Threshold Reference Line */}
            {(viewMode === 'both' || viewMode === 'tokens') && (
              <ReferenceLine
                yAxisId="tokens"
                y={thresholdLimit}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `80% Context Limit (${thresholdLimit.toLocaleString()})`,
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />
            )}

            {/* Latency Area */}
            {(viewMode === 'both' || viewMode === 'latency') && (
              <Area
                yAxisId="latency"
                type="monotone"
                dataKey="latencyMs"
                name="Latency (ms)"
                stroke="#38bdf8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#sessionLatencyGradient)"
              />
            )}

            {/* Individual Prompt Tokens Bar (rendered if showIndividualTokens is TRUE) */}
            {(viewMode === 'both' || viewMode === 'tokens') && showIndividualTokens && (
              <Bar
                yAxisId="tokens"
                dataKey="promptTokens"
                name="Prompt Tokens"
                stackId="tokens"
                radius={[0, 0, 0, 0]}
                barSize={18}
              >
                {data.map((entry, index) => {
                  const isExceeded = entry.totalTokens > thresholdLimit;
                  return (
                    <Cell
                      key={`prompt-cell-${index}`}
                      fill={isExceeded ? '#ef4444' : '#3b82f6'}
                    />
                  );
                })}
              </Bar>
            )}

            {/* Individual Completion Tokens Bar (rendered if showIndividualTokens is TRUE) */}
            {(viewMode === 'both' || viewMode === 'tokens') && showIndividualTokens && (
              <Bar
                yAxisId="tokens"
                dataKey="completionTokens"
                name="Completion Tokens"
                stackId="tokens"
                radius={[4, 4, 0, 0]}
                barSize={18}
              >
                {data.map((entry, index) => {
                  const isExceeded = entry.totalTokens > thresholdLimit;
                  return (
                    <Cell
                      key={`comp-cell-${index}`}
                      fill={isExceeded ? '#dc2626' : '#10b981'}
                    />
                  );
                })}
              </Bar>
            )}

            {/* Combined Total Tokens Bar (rendered if showIndividualTokens is FALSE, simplifying the chart view) */}
            {(viewMode === 'both' || viewMode === 'tokens') && !showIndividualTokens && (
              <Bar
                yAxisId="tokens"
                dataKey="totalTokens"
                name="Total Tokens"
                radius={[4, 4, 0, 0]}
                barSize={18}
              >
                {data.map((entry, index) => {
                  const isExceeded = entry.totalTokens > thresholdLimit;
                  return (
                    <Cell
                      key={`total-cell-${index}`}
                      fill={isExceeded ? '#ef4444' : '#10b981'}
                    />
                  );
                })}
              </Bar>
            )}

            {/* Total Tokens Line Indicator */}
            {viewMode === 'tokens' && (
              <Line
                yAxisId="tokens"
                type="monotone"
                dataKey="totalTokens"
                name="Total Tokens"
                stroke={hasExceededThreshold ? '#ef4444' : '#c084fc'}
                strokeWidth={2}
                dot={{
                  r: 3,
                  fill: hasExceededThreshold ? '#ef4444' : '#c084fc',
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Mini Visual Token Distribution & Diagnostic Bar Strip */}
      <div
        className="token-distribution-strip"
        data-testid="token-distribution-strip"
        style={{
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={12} />
            <span>Rolling Token Distribution ({data.length} Points)</span>
          </span>
          <span style={{ fontSize: '10px' }}>
            {showIndividualTokens ? 'Breakdown: Prompt (Blue) + Output (Green) | Exceeded (Red)' : 'Simplified View: Total Tokens | Exceeded (Red)'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {data.map((pt, idx) => {
            const isExceeded = pt.totalTokens > thresholdLimit;
            const pctOfLimit = Math.min(100, Math.round((pt.totalTokens / recommendedLimit) * 100));
            return (
              <div
                key={pt.id || idx}
                data-testid={`token-bar-point-${pt.point}`}
                style={{
                  flex: 1,
                  minWidth: '72px',
                  background: isExceeded ? 'rgba(239, 68, 68, 0.12)' : '#0f172a',
                  border: isExceeded ? '1px solid #ef4444' : '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '10px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '9px' }}>
                  <span>P{pt.point}</span>
                  <span style={{ color: isExceeded ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                    {isExceeded ? 'OVER 80%' : `${pctOfLimit}%`}
                  </span>
                </div>

                {/* Visual Bar representation */}
                <div style={{ height: '6px', background: '#1e293b', borderRadius: '3px', margin: '4px 0', overflow: 'hidden', display: 'flex' }}>
                  {isExceeded ? (
                    <div
                      data-testid="token-bar-exceeded"
                      style={{ width: `${Math.min(100, (pt.totalTokens / recommendedLimit) * 100)}%`, background: '#ef4444', height: '100%' }}
                      title="Exceeds 80% recommended context window limit"
                    />
                  ) : showIndividualTokens ? (
                    <>
                      <div
                        data-testid="token-bar-prompt"
                        style={{ width: `${(pt.promptTokens / pt.totalTokens) * pctOfLimit}%`, background: '#3b82f6', height: '100%' }}
                        title={`Prompt tokens: ${pt.promptTokens}`}
                      />
                      <div
                        data-testid="token-bar-completion"
                        style={{ width: `${(pt.completionTokens / pt.totalTokens) * pctOfLimit}%`, background: '#10b981', height: '100%' }}
                        title={`Completion tokens: ${pt.completionTokens}`}
                      />
                    </>
                  ) : (
                    <div
                      data-testid="token-bar-total"
                      style={{ width: `${pctOfLimit}%`, background: '#10b981', height: '100%' }}
                      title={`Total tokens: ${pt.totalTokens}`}
                    />
                  )}
                </div>

                <div style={{ fontWeight: 600, color: isExceeded ? '#ef4444' : '#f8fafc', fontSize: '10px' }}>
                  {pt.totalTokens} <span style={{ fontSize: '8px', color: '#64748b' }}>tok</span>
                </div>

                {showIndividualTokens && (
                  <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '2px' }}>
                    <span style={{ color: isExceeded ? '#ef4444' : '#60a5fa' }}>{pt.promptTokens} in</span> /{' '}
                    <span style={{ color: isExceeded ? '#ef4444' : '#34d399' }}>{pt.completionTokens} out</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ChatSessionTokenRollingChart;
