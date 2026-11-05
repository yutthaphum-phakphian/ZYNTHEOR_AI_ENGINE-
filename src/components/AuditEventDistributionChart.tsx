import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { BarChart3, Calendar } from 'lucide-react';
import type { AuditEntry } from '../services/auditLedger';

interface Props {
  records: (AuditEntry | any)[];
  startDate?: string;
  endDate?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(v?: string, endOfDay = false): number | undefined {
  if (!v) return undefined;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(v);
  const d = isDateOnly ? new Date(`${v}T${endOfDay ? '23:59:59.999' : '00:00:00'}`) : new Date(v);
  const t = d.getTime();
  return Number.isFinite(t) ? t : undefined;
}

export function AuditEventDistributionChart({ records, startDate, endDate }: Props) {
  const { chartData, timeUnitLabel, totalEvents, peakBucket, avgPerBucket } = useMemo(() => {
    const start = parseDate(startDate);
    const end = parseDate(endDate, true);

    const filtered = (records ?? [])
      .map((r: any) => ({
        record: r,
        ts: new Date(r.at || r.timestamp || r.at).getTime(),
      }))
      .filter(({ ts }) => {
        if (!Number.isFinite(ts)) return false;
        if (start !== undefined && ts < start) return false;
        if (end !== undefined && ts > end) return false;
        return true;
      })
      .sort((a, b) => a.ts - b.ts);

    if (filtered.length === 0) {
      return { chartData: [] as any[], timeUnitLabel: 'Date', totalEvents: 0, peakBucket: 'None', avgPerBucket: 0 };
    }

    const minTime = filtered[0].ts;
    const maxTime = filtered[filtered.length - 1].ts;
    const rangeDays = (maxTime - minTime) / DAY_MS;
    const isIntraday = rangeDays <= 2;

    const buckets = new Map<string, { label: string; count: number; actions: Record<string, number>; ts: number }>();

    for (const { record, ts } of filtered) {
      const d = new Date(ts);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');

      const key = isIntraday ? `${y}-${m}-${day}-${h}` : `${y}-${m}-${day}`;
      const label = isIntraday
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString([], { month: 'short', day: '2-digit' });

      let b = buckets.get(key);
      if (!b) {
        b = { label, count: 0, actions: {}, ts };
        buckets.set(key, b);
      }
      b.count += 1;
      const action = record.action || record.eventType || 'GENERAL';
      b.actions[action] = (b.actions[action] || 0) + 1;
    }

    const sorted = Array.from(buckets.values()).sort((a, b) => a.ts - b.ts);
    const total = sorted.reduce((s, b) => s + b.count, 0);
    const peak = sorted.reduce<any>((h, b) => (!h || b.count > h.count ? b : h), undefined);
    const avg = sorted.length ? Number((total / sorted.length).toFixed(1)) : 0;

    return {
      chartData: sorted,
      timeUnitLabel: isIntraday ? 'Hour' : 'Day',
      totalEvents: total,
      peakBucket: peak ? `${peak.label} (${peak.count} events)` : 'None',
      avgPerBucket: avg,
    };
  }, [records, startDate, endDate]);

  return (
    <section style={{ background: '#0a0f1d', border: '1px solid #1e293b', borderRadius: '12px', padding: 'clamp(12px, 3vw, 20px)', marginBottom: '20px', minWidth: 0 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.35)', display: 'grid', placeItems: 'center', color: '#38bdf8' }}>
            <BarChart3 size={18} />
          </div>
          <div>
            <b style={{ fontSize: '13px', color: '#f1f5f9' }}>Audit Event Distribution Over Time</b>
            <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#94a3b8' }}>Chronological frequency grouped by {timeUnitLabel.toLowerCase()} - uses AuditEntry.at</p>
          </div>
        </div>
        {(startDate || endDate) && (
          <div style={{ fontSize: '10px', padding: '5px 9px', borderRadius: '6px', background: 'rgba(2, 132, 199, 0.15)', border: '1px solid #0284c7', color: '#7dd3fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={12} />
            <span>{startDate || 'Start'} → {endDate || 'Present'}</span>
          </div>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Total Filtered Events', value: totalEvents, color: '#f8fafc' },
          { label: `Time Buckets (${timeUnitLabel})`, value: chartData.length, color: '#38bdf8' },
          { label: `Avg Events / ${timeUnitLabel}`, value: avgPerBucket, color: '#2dd4bf' },
          { label: 'Peak Activity', value: peakBucket, color: '#a78bfa' },
        ].map((metric) => (
          <div key={metric.label} style={{ padding: '10px 12px', borderRadius: '8px', background: '#111927', border: '1px solid #1e293b', minWidth: 0 }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>{metric.label}</span>
            <div title={String(metric.value)} style={{ fontSize: typeof metric.value === 'number' ? '16px' : '12px', fontWeight: 700, color: metric.color, marginTop: '4px', overflowWrap: 'anywhere' }}>{metric.value}</div>
          </div>
        ))}
      </div>

      <div style={{ width: '100%', height: 200, minWidth: 0 }}>
        {chartData.length === 0 ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#64748b', fontSize: '12px' }}>No audit records within selected range.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs><linearGradient id="auditEventGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} /><stop offset="95%" stopColor="#0284c7" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} minTickGap={20} />
              <YAxis stroke="#38bdf8" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0d1828', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9', fontSize: '11px' }} formatter={(value) => [`${value ?? 0} Recorded Events`, 'Frequency']} labelFormatter={(label) => `${timeUnitLabel}: ${label}`} />
              <Area type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#auditEventGradient)" dot={{ r: 3, fill: '#38bdf8', stroke: '#0284c7', strokeWidth: 1.5 }} activeDot={{ r: 6, fill: '#60a5fa', stroke: '#ffffff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
export default AuditEventDistributionChart;
