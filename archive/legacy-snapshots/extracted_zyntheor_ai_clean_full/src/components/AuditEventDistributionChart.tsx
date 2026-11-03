import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { BarChart3, Clock, Calendar, Activity, Zap } from 'lucide-react';
import type { AuditEntry } from '../services/auditLedger';

interface AuditEventDistributionChartProps {
  records: AuditEntry[];
  startDate?: string;
  endDate?: string;
}

export function AuditEventDistributionChart({ records, startDate, endDate }: AuditEventDistributionChartProps) {
  // Aggregate event counts dynamically based on filtered records timestamps
  const { chartData, timeUnitLabel, totalEvents, peakBucket, avgPerBucket } = useMemo(() => {
    if (!records || records.length === 0) {
      return {
        chartData: [],
        timeUnitLabel: 'Date',
        totalEvents: 0,
        peakBucket: 'None',
        avgPerBucket: 0,
      };
    }

    // Determine time span to choose appropriate grouping granularity (Hours vs Days)
    const timestamps = records
      .map((r) => new Date(r.at).getTime())
      .filter((t) => !isNaN(t))
      .sort((a, b) => a - b);

    const minTime = timestamps[0] || Date.now();
    const maxTime = timestamps[timestamps.length - 1] || Date.now();
    const rangeSpanDays = (maxTime - minTime) / (1000 * 60 * 60 * 24);

    const isIntraday = rangeSpanDays <= 2;
    const timeBucketMap = new Map<string, { label: string; count: number; actions: Record<string, number>; timestampMs: number }>();

    records.forEach((rec) => {
      const d = new Date(rec.at);
      if (isNaN(d.getTime())) return;

      let key: string;
      let label: string;

      if (isIntraday) {
        // Group by hour: "14:00"
        const hourStr = d.getHours().toString().padStart(2, '0');
        key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${hourStr}:00`;
        label = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        // Group by day: "Nov 01"
        key = d.toISOString().split('T')[0];
        label = d.toLocaleDateString([], { month: 'short', day: '2-digit' });
      }

      let bucket = timeBucketMap.get(key);
      if (!bucket) {
        bucket = { label, count: 0, actions: {}, timestampMs: d.getTime() };
        timeBucketMap.set(key, bucket);
      }
      bucket.count += 1;
      const actionKey = rec.action || 'GENERAL';
      bucket.actions[actionKey] = (bucket.actions[actionKey] || 0) + 1;
    });

    const sortedBuckets = Array.from(timeBucketMap.entries())
      .sort((a, b) => a[1].timestampMs - b[1].timestampMs)
      .map(([_, val]) => val);

    let maxCount = 0;
    let peakLabel = 'None';
    let totalCount = 0;

    sortedBuckets.forEach((b) => {
      totalCount += b.count;
      if (b.count > maxCount) {
        maxCount = b.count;
        peakLabel = `${b.label} (${b.count} events)`;
      }
    });

    const avg = sortedBuckets.length > 0 ? (totalCount / sortedBuckets.length).toFixed(1) : '0';

    return {
      chartData: sortedBuckets,
      timeUnitLabel: isIntraday ? 'Hour' : 'Day',
      totalEvents: totalCount,
      peakBucket: peakLabel,
      avgPerBucket: Number(avg),
    };
  }, [records]);

  return (
    <div
      style={{
        background: '#0a0f1d',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        padding: '18px 20px',
        marginBottom: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
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
          marginBottom: '14px',
          paddingBottom: '12px',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              display: 'grid',
              placeItems: 'center',
              color: '#38bdf8',
            }}
          >
            <BarChart3 size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <b style={{ fontSize: '13px', color: '#f1f5f9' }}>Audit Event Distribution Over Time</b>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: '#0284c7',
                  color: '#ffffff',
                }}
              >
                DYNAMIC RECHARTS
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
              Chronological frequency grouped by {timeUnitLabel.toLowerCase()} · Updates dynamically with date range filters
            </p>
          </div>
        </div>

        {(startDate || endDate) && (
          <div
            style={{
              fontSize: '10px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(2, 132, 199, 0.15)',
              border: '1px solid #0284c7',
              color: '#7dd3fc',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Calendar size={12} />
            <span>
              Active Filter Span: {startDate || 'Start'} → {endDate || 'Present'}
            </span>
          </div>
        )}
      </div>

      {/* Metric Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#111927', border: '1px solid #1e293b' }}>
          <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Total Filtered Events</span>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>{totalEvents}</div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#111927', border: '1px solid #1e293b' }}>
          <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Time Buckets ({timeUnitLabel})</span>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>{chartData.length}</div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#111927', border: '1px solid #1e293b' }}>
          <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Avg Events / {timeUnitLabel}</span>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#2dd4bf', marginTop: '2px' }}>{avgPerBucket}</div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#111927', border: '1px solid #1e293b' }}>
          <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Peak Activity</span>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {peakBucket}
          </div>
        </div>
      </div>

      {/* Recharts Area / Bar Chart */}
      <div style={{ width: '100%', height: 180 }}>
        {chartData.length === 0 ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#64748b', fontSize: '12px' }}>
            No audit records available within the selected date range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="auditEventGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#38bdf8" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#0d1828',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '11px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                }}
                formatter={(val: any) => [`${val} Recorded Events`, 'Frequency']}
                labelFormatter={(label: any) => `${timeUnitLabel}: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Audit Events"
                stroke="#38bdf8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#auditEventGradient)"
                dot={{ r: 3, fill: '#38bdf8', stroke: '#0284c7', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#60a5fa', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default AuditEventDistributionChart;
