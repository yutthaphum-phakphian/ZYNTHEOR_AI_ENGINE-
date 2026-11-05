// @ts-nocheck
// P14 Benchmark Registry
import type { CategoryId } from './unifiedEngine';

export interface BenchmarkDefinition {
  benchmarkId: string;
  name: string;
  version: string;
  description: string;
  categories: CategoryId[];
  thresholds: {
    pass: number;
    warn: number;
  };
}

export const BENCHMARKS: BenchmarkDefinition[] = [
  {
    benchmarkId: 'bench-1.2.2-12cat',
    name: 'ZYNTHEOR 12-Category Sovereign Benchmark',
    version: '1.2.2',
    description: '12 categories covering security, type safety, zero-mock integrity, build reproducibility, and governance.',
    categories: [
      'SECURITY_FIRST',
      'SECRET_FIREWALL',
      'ZERO_MOCK_INTEGRITY',
      'TYPE_SAFETY',
      'CYCLE_PREVENTION',
      'STATE_TRANSITION_VALIDITY',
      'TEST_COVERAGE',
      'AUTONOMOUS_REASONING',
      'FILE_MANIFEST_INTEGRITY',
      'BUILD_REPRODUCIBILITY',
      'TOOL_ORCHESTRATION',
      'SOVEREIGN_COMPLIANCE',
    ],
    thresholds: {
      pass: 85,
      warn: 70,
    },
  },
];

export function getBenchmark(benchmarkId: string): BenchmarkDefinition | null {
  return BENCHMARKS.find((b) => b.benchmarkId === benchmarkId) || BENCHMARKS[0] || null;
}
