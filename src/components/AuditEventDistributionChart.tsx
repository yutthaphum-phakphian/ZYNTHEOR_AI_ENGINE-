// @ts-nocheck
import React, { useId, useMemo } from 'react';
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
const HOUR_MS = 60 * 60 * 1000;

function parseDate(
  value?: string,
  endOfDay = false
): number | undefined {
  if (!value) return undefined;

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);

  const date = isDateOnly
    ? new Date(
        `${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`
      )
    : new Date(value);

  const timestamp = date.getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : undefined;
}

function getAction(record: any): string {
  const action = record?.action;

  return typeof action === 'string' && action.trim()
    ? action.trim()
    : 'GENERAL';
}

function formatHour(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDay(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: '2-digit',
  });
}

export function AuditEventDistributionChart({
  records,
  startDate,
  endDate,
}: Props) {
  const gradientId = useId().replace(/:/g, '');

  const {
    chartData,
    timeUnitLabel,
    totalEvents,
    peakBucket,
    avgPerBucket,
  } = useMemo(() => {
    const start = parseDate(startDate);
    const end = parseDate(endDate, true);

    const filtered = (Array.isArray(records) ? records : [])
      .map((record: any) => {
        // AuditEntry.at is the canonical timestamp.
        // timestamp remains supported for legacy records.
        const rawTimestamp = record?.at || record?.timestamp;

        const ts = rawTimestamp
          ? new Date(rawTimestamp).getTime()
          : NaN;

        return {
          record,
          ts,
        };
      })
      .filter(({ ts }) => {
        if (!Number.isFinite(ts)) return false;

        if (start !== undefined && ts < start) {
          return false;
        }

        if (end !== undefined && ts > end) {
          return false;
        }

        return true;
      })
      .sort((a, b) => a.ts - b.ts);

    if (filtered.length === 0) {
      return {
        chartData: [],
        timeUnitLabel: 'Date',
        totalEvents: 0,
        peakBucket: 'None',
        avgPerBucket: 0,
      };
    }

    const minTime = filtered[0].ts;
    const maxTime = filtered[filtered.length - 1].ts;

    const rangeDays = (maxTime - minTime) / DAY_MS;
    const isIntraday = rangeDays <= 2;

    const bucketDuration = isIntraday
      ? HOUR_MS
      : DAY_MS;

    const buckets = new Map<
      number,
      {
        timestamp: number;
        label: string;
        count: number;
        actions: Record<string, number>;
      }
    >();

    for (const { record, ts } of filtered) {
      const bucketTimestamp =
        Math.floor(ts / bucketDuration) * bucketDuration;

      let bucket = buckets.get(bucketTimestamp);

      if (!bucket) {
        bucket = {
          timestamp: bucketTimestamp,
          label: isIntraday
            ? formatHour(bucketTimestamp)
            : formatDay(bucketTimestamp),
          count: 0,
          actions: {},
        };

        buckets.set(bucketTimestamp, bucket);
      }

      bucket.count += 1;

      const action = getAction(record);

      bucket.actions[action] =
        (bucket.actions[action] || 0) + 1;
    }

    const sorted = Array.from(buckets.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    const total = sorted.reduce(
      (sum, bucket) => sum + bucket.count,
      0
    );

    const peak = sorted.reduce<any>(
      (highest, bucket) =>
        !highest || bucket.count > highest.count
          ? bucket
          : highest,
      undefined
    );

    const average = sorted.length
      ? Number((total / sorted.length).toFixed(1))
      : 0;

    return {
      chartData: sorted,
      timeUnitLabel: isIntraday ? 'Hour' : 'Day',
      totalEvents: total,
      peakBucket: peak
        ? `${peak.label} (${peak.count} events)`
        : 'None',
      avgPerBucket: average,
    };
  }, [records, startDate, endDate]);

  const metrics = [
    {
      label: 'Total Filtered Events',
      value: totalEvents,
      color: '#f8fafc',
    },
    {
      label: `Time Buckets (${timeUnitLabel})`,
      value: chartData.length,
      color: '#38bdf8',
    },
    {
      label: `Avg Events / ${timeUnitLabel}`,
      value: avgPerBucket,
      color: '#2dd4bf',
    },
    {
      label: 'Peak Activity',
      value: peakBucket,
      color: '#a78bfa',
    },
  ];

  return (
    <section
      style={{
        background: '#0a0f1d',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        padding: 'clamp(12px, 3vw, 20px)',
        marginBottom: '20px',
        minWidth: 0,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <header
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              flexShrink: 0,
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

          <div style={{ minWidth: 0 }}>
            <b
              style={{
                fontSize: '13px',
                color: '#f1f5f9',
              }}
            >
              Audit Event Distribution Over Time
            </b>

            <p
              style={{
                margin: '3px 0 0',
                fontSize: '11px',
                color: '#94a3b8',
              }}
            >
              Chronological frequency grouped by{' '}
              {timeUnitLabel.toLowerCase()} — AuditEntry.at
            </p>
          </div>
        </div>

        {(startDate || endDate) && (
          <div
            style={{
              fontSize: '10px',
              padding: '5px 9px',
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
              {startDate || 'Start'} → {endDate || 'Present'}
            </span>
          </div>
        )}
      </header>

      {/* Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(130px, 100%), 1fr))',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        {metrics.map((metric) => (
          <div
            key={metric.label}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: '#111927',
              border: '1px solid #1e293b',
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: '10px',
                color: '#94a3b8',
                textTransform: 'uppercase',
              }}
            >
              {metric.label}
            </span>

            <div
              title={String(metric.value)}
              style={{
                fontSize:
                  typeof metric.value === 'number'
                    ? '16px'
                    : '12px',
                fontWeight: 700,
                color: metric.color,
                marginTop: '4px',
                overflowWrap: 'anywhere',
              }}
            >
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div
        style={{
          width: '100%',
          height: 200,
          minWidth: 0,
        }}
      >
        {chartData.length === 0 ? (
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              height: '100%',
              color: '#64748b',
              fontSize: '12px',
              textAlign: 'center',
            }}
          >
            No audit records within selected range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: -20,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient
                  id={`auditEventGradient-${gradientId}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#38bdf8"
                    stopOpacity={0.45}
                  />

                  <stop
                    offset="95%"
                    stopColor="#0284c7"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e293b"
              />

              <XAxis
                dataKey="label"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                minTickGap={20}
              />

              <YAxis
                stroke="#38bdf8"
                fontSize={10}
                tickLine={false}
                allowDecimals={false}
              />

              <Tooltip
                contentStyle={{
                  background: '#0d1828',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '11px',
                }}
                formatter={(value) => [
                  `${value ?? 0} Recorded Events`,
                  'Frequency',
                ]}
                labelFormatter={(label) =>
                  `${timeUnitLabel}: ${label}`
                }
              />

              <Area
                type="monotone"
                dataKey="count"
                stroke="#38bdf8"
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#auditEventGradient-${gradientId})`}
                dot={{
                  r: 3,
                  fill: '#38bdf8',
                  stroke: '#0284c7',
                  strokeWidth: 1.5,
                }}
                activeDot={{
                  r: 6,
                  fill: '#60a5fa',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

export default AuditEventDistributionChart;
