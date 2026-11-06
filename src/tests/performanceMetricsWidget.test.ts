import { describe, it, expect } from 'vitest';
import { PerformanceMetricsWidget } from '../components/PerformanceMetricsWidget';
import { zyntheorIntelligenceRuntime } from '../lib/ZyntheorIntelligenceRuntime.ts';

describe('PerformanceMetricsWidget & Telemetry Pipeline', () => {
  it('exports PerformanceMetricsWidget component cleanly', () => {
    expect(PerformanceMetricsWidget).toBeDefined();
    expect(typeof PerformanceMetricsWidget).toBe('function');
  });

  it('queries ZYNTHEOR intelligence runtime status accurately', () => {
    const status = zyntheorIntelligenceRuntime.getStatus();
    expect(status).toHaveProperty('operatingMode');
    expect(status).toHaveProperty('totalRequestsProcessed');
    expect(status).toHaveProperty('pipelineReady');
    expect(status.pipelineReady).toBe(true);
  });
});
