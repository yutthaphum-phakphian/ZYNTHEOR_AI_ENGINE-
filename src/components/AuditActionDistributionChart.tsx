// @ts-nocheck
import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { Activity, BarChart2, TrendingUp, Calendar, Zap, AlertCircle } from 'lucide-react';
import type { AuditEntry } from '../services/auditLedger';

interface AuditActionDistributionChartProps {
  records: AuditEntry[];
}

interface ChartBucket {
  time: string;
  total: number;
  [key: string]: string | number;
}

export function AuditActionDistributionChart({ records }: AuditActionDistributionChartProps) {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [timeBucket, setTimeBucket] = useState<'hour' | 'day'>('hour');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Identify top categories dynamically from records
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach(r => {
      const action = r.action || 'UNKNOWN_ACTION';
      counts[action] = (counts[action] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topCategories = sorted.slice(0, 5).map(([cat]) => cat);
    return { counts, sorted, topCategories };
  }, [records]);

  // Aggregate distribution data over time
  const chartData = useMemo<ChartBucket[]>(() => {
    if (!records || records.length === 0) return [];

    // Chronological order (oldest first for left-to-right timeline)
    const sortedRecords = [...records].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
    );

    const timeBuckets: Record<string, Record<string, number>> = {};

    sortedRecords.forEach(rec => {
      const date = new Date(rec.at);
      let timeKey = '';

      if (timeBucket === 'hour') {
        const iso = date.toISOString();
        timeKey = `${iso.slice(5, 10)} ${iso.slice(11, 13)}:00`;
      } else {
        timeKey = date.toISOString().slice(5, 10); // MM-DD
      }

      if (!timeBuckets[timeKey]) {
        timeBuckets[timeKey] = { total: 0 };
        categoryStats.topCategories.forEach(cat => {
          timeBuckets[timeKey][cat] = 0;
        });
        timeBuckets[timeKey]['OTHER'] = 0;
      }

      const action = rec.action || 'UNKNOWN';
      timeBuckets[timeKey].total = (timeBuckets[timeKey].total || 0) + 1;

      if (categoryStats.topCategories.includes(action)) {
        timeBuckets[timeKey][action] = (timeBuckets[timeKey][action] || 0) + 1;
      } else {
        timeBuckets[timeKey]['OTHER'] = (timeBuckets[timeKey]['OTHER'] || 0) + 1;
      }
    });

    return Object.entries(timeBuckets).map(([time, data]) => ({
      time,
      total: data.total || 0,
      ...data,
    }));
  }, [records, timeBucket, categoryStats.topCategories]);

  // Detect peak activity spikes
  const peakSpike = useMemo<ChartBucket | null>(() => {
    if (chartData.length === 0) return null;
    let maxBucket = chartData[0];
    chartData.forEach(bucket => {
      if ((bucket.total || 0) > (maxBucket.total || 0)) {
        maxBucket = bucket;
      }
    });
    return maxBucket;
  }, [chartData]);

  // Distinct color palette for action categories
  const categoryColors: Record<string, string> = {
    CHAT_REQUEST: '#3b82f6',
    PROJECT_CREATED: '#10b981',
    HUMAN_APPROVAL_GRANTED: '#a855f7',
    AUDIT_LEDGER_REPAIRED: '#ef4444',
    POLICY_SETTINGS_CHANGED: '#f59e0b',
    OTHER: '#64748b',
  };

  const getCategoryColor = (cat: string, idx: number) => {
    if (categoryColors[cat]) return categoryColors[cat];
    const palette = ['#06b6d4', '#ec4899', '#8b5cf6', '#84cc16', '#f97316'];
    return palette[idx % palette.length];
  };

  if (!records || records.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: '#0b0f19',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header & Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} style={{ color: '#38bdf8' }} />
          <div>
            <b style={{ fontSize: '13px', color: '#f8fafc' }}>
              Audit Action Distribution & Activity Timeline (Recharts)
            </b>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              Real-time trend analysis across {records.length} logged system audit actions
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Peak Spike Highlight Badge */}
          {peakSpike && (peakSpike.total || 0) > 1 && (
            <div
              style={{
                fontSize: '10px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: '#1e1b4b',
                border: '1px solid #6366f1',
                color: '#a5b4fc',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 600,
              }}
              title={`Peak activity detected at ${peakSpike.time} with ${peakSpike.total} actions`}
            >
              <Zap size={12} style={{ color: '#fbbf24' }} />
              <span>
                Peak Spike: {peakSpike.time} ({peakSpike.total} ops)
              </span>
            </div>
          )}

          {/* Time Bucket Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#070c18',
              border: '1px solid #1e293b',
              borderRadius: '6px',
              padding: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setTimeBucket('hour')}
              style={{
                padding: '3px 8px',
                fontSize: '10px',
                borderRadius: '4px',
                border: 'none',
                background: timeBucket === 'hour' ? '#1e293b' : 'transparent',
                color: timeBucket === 'hour' ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer',
                fontWeight: timeBucket === 'hour' ? 700 : 500,
              }}
            >
              Hourly
            </button>
            <button
              type="button"
              onClick={() => setTimeBucket('day')}
              style={{
                padding: '3px 8px',
                fontSize: '10px',
                borderRadius: '4px',
                border: 'none',
                background: timeBucket === 'day' ? '#1e293b' : 'transparent',
                color: timeBucket === 'day' ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer',
                fontWeight: timeBucket === 'day' ? 700 : 500,
              }}
            >
              Daily
            </button>
          </div>

          {/* Chart View Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#070c18',
              border: '1px solid #1e293b',
              borderRadius: '6px',
              padding: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setChartType('area')}
              style={{
                padding: '3px 8px',
                fontSize: '10px',
                borderRadius: '4px',
                border: 'none',
                background: chartType === 'area' ? '#1e293b' : 'transparent',
                color: chartType === 'area' ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Stacked Area View"
            >
              <TrendingUp size={12} />
              <span>Area</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              style={{
                padding: '3px 8px',
                fontSize: '10px',
                borderRadius: '4px',
                border: 'none',
                background: chartType === 'bar' ? '#1e293b' : 'transparent',
                color: chartType === 'bar' ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Stacked Bar View"
            >
              <BarChart2 size={12} />
              <span>Bar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recharts Render Container */}
      <div style={{ width: '100%', height: 220, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {categoryStats.topCategories.map((cat, idx) => (
                  <linearGradient key={cat} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getCategoryColor(cat, idx)} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={getCategoryColor(cat, idx)} stopOpacity={0.1} />
                  </linearGradient>
                ))}
                <linearGradient id="grad-other" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={9} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '10px',
                  color: '#f8fafc',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8', paddingTop: '6px' }} />
              {categoryStats.topCategories.map((cat, idx) => (
                <Area
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stackId="1"
                  stroke={getCategoryColor(cat, idx)}
                  fill={`url(#grad-${idx})`}
                  strokeWidth={1.5}
                />
              ))}
              <Area
                type="monotone"
                dataKey="OTHER"
                stackId="1"
                stroke="#64748b"
                fill="url(#grad-other)"
                strokeWidth={1.5}
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={9} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '10px',
                  color: '#f8fafc',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8', paddingTop: '6px' }} />
              {categoryStats.topCategories.map((cat, idx) => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={getCategoryColor(cat, idx)} />
              ))}
              <Bar dataKey="OTHER" stackId="a" fill="#64748b" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default AuditActionDistributionChart;
