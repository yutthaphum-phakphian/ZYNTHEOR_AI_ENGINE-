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
import type { AuditEvent } from '../services/auditLedger';

// รองรับทั้ง AuditEvent (timestamp) และ AuditEntry เก่า (at)
type AuditableRecord = AuditEvent & { at?: string };

interface AuditEventDistributionChartProps {
  records: AuditableRecord[];
  startDate?: string;
  endDate?: string;
}

interface ChartBucket {
  label: string;
  count: number;
  actions: Record<string, number>;
  timestampMs: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value?: string, endOfDay = false): number | undefined {
  if (!value) return undefined;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  // FIX: ใช้ template literal จริง ไม่ใส่ "" ครอบ
  const date = dateOnly
    ? new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`)
    : new Date(value);
  const ts = date.getTime();
  return Number.isFinite(ts) ? ts : undefined;
}

export function AuditEventDistributionChart({
  records,
  startDate,
  endDate,
}: AuditEventDistributionChartProps) {
  const { chartData, timeUnitLabel, totalEvents, peakBucket, avgPerBucket } = useMemo(() => {
    const start = parseDate(startDate);
    const end = parseDate(endDate, true);

    const filtered = (records ?? [])
      .map((r) => ({
        record: r,
        timestamp: new Date((r as any).at || r.timestamp).getTime(),
      }))
      .filter(({ timestamp }) => {
        if (!Number.isFinite(timestamp)) return false;
        if (start !== undefined && timestamp < start) return false;
        if (end !== undefined && timestamp > end) return false;
        return true;
      })
      .sort((a, b) => a.timestamp - b.timestamp); // เก่า -> ใหม่ สำหรับกราฟ

    if (filtered.length === 0) {
      return { chartData: [] as ChartBucket[], timeUnitLabel: 'Date', totalEvents: 0, peakBucket: 'None', avgPerBucket: 0 };
    }

    const minTime = filtered[0].timestamp;
    const maxTime = filtered[filtered.length - 1].timestamp;
    const rangeSpanDays = (maxTime - minTime) / DAY_MS;
    const isIntraday = rangeSpanDays <= 2;

    const buckets = new Map<string, ChartBucket>();
    for (const { record, timestamp } of filtered) {
      const d = new Date(timestamp);
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
        b = { label, count: 0, actions: {}, timestampMs: timestamp };
        buckets.set(key, b);
      }
      b.count += 1;
      const action = (record as any).action || record.eventType || 'GENERAL';
      b.actions[action] = (b.actions[action] || 0) + 1;
    }

    const sorted = Array.from(buckets.values()).sort((a, b) => a.timestampMs - b.timestampMs);
    const total = sorted.reduce((s, b) => s + b.count, 0);
    const peak = sorted.reduce<ChartBucket | undefined>((h, b) => (!h || b.count > h.count ? b : h), undefined);
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
      {/* header + metrics + AreaChart เหมือนเดิมของคุณ - ไม่ได้แก้ */}
      {/* ... เอา JSX เดิมของคุณมาวางต่อได้เลย ใช้ chartData, timeUnitLabel, totalEvents ฯลฯ */}
      <div style={{ width: '100%', height: 200 }}>
        {chartData.length === 0 ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#64748b', fontSize: '12px' }}>No audit records within selected range.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs><linearGradient id="auditEventGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} /><stop offset="95%" stopColor="#0284c7" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} minTickGap={20} />
              <YAxis stroke="#38bdf8" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0d1828', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9', fontSize: '11px' }} formatter={(v) => [`${v ?? 0} Recorded Events`, 'Frequency']} labelFormatter={(l) => `${timeUnitLabel}: ${l}`} />
              <Area type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#auditEventGradient)" dot={{ r: 3, fill: '#38bdf8', stroke: '#0284c7', strokeWidth: 1.5 }} activeDot={{ r: 6, fill: '#60a5fa', stroke: '#ffffff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
