// @ts-nocheck
// P14 UI - Real-time Latency Badge with Warning - 300ms ease
import React, { useState, useEffect, useRef } from 'react';

export interface LatencyMetrics {
  current: number;
  average: number;
  p95: number;
  threshold: { warn: number; error: number };
  status: 'ok' | 'warn' | 'error';
}

interface LatencyBadgeProps {
  warnThreshold?: number;
  errorThreshold?: number;
  className?: string;
}

export const LatencyBadge: React.FC<LatencyBadgeProps> = ({
  warnThreshold = 100,
  errorThreshold = 300,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<LatencyMetrics>({
    current: 0,
    average: 0,
    p95: 0,
    threshold: { warn: warnThreshold, error: errorThreshold },
    status: 'ok'
  });

  const historyRef = useRef<number[]>([]);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    let lastTime = performance.now();
    const measure = () => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;
      const latency = delta;
      historyRef.current.push(latency);
      if (historyRef.current.length > 60) historyRef.current.shift();
      const avg = historyRef.current.reduce((a, b) => a + b, 0) / historyRef.current.length;
      const sorted = [...historyRef.current].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || avg;
      let status: 'ok' | 'warn' | 'error' = 'ok';
      if (latency >= errorThreshold || avg >= errorThreshold) status = 'error';
      else if (latency >= warnThreshold || avg >= warnThreshold) status = 'warn';
      setMetrics({ current: Math.round(latency), average: Math.round(avg), p95: Math.round(p95), threshold: { warn: warnThreshold, error: errorThreshold }, status });
      frameRef.current = requestAnimationFrame(measure);
    };
    frameRef.current = requestAnimationFrame(measure);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [warnThreshold, errorThreshold]);

  return (
    <span className={`latency-badge ${metrics.status} ${className}`} style={{ transition: 'all 300ms ease' }}>
      <span className={`status-led ${metrics.status === 'ok' ? 'verified' : metrics.status === 'warn' ? 'experimental' : 'fail'}`} />
      <span>{metrics.current}ms</span>
      <span style={{ opacity: 0.6 }}>avg {metrics.average}ms</span>
      {metrics.status !== 'ok' && <span style={{ fontWeight: 800 }}>{metrics.status === 'warn' ? '⚠' : '⚠ SLOW'}</span>}
    </span>
  );
};

export default LatencyBadge;
