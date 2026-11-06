import { describe, it, expect } from 'vitest';
import { CompetitiveScorecard, INITIAL_SCORECARD_METRICS } from '../components/CompetitiveScorecard';

describe('CompetitiveScorecard — Phase 8 Evaluation Suite', () => {
  it('exports CompetitiveScorecard component cleanly', () => {
    expect(CompetitiveScorecard).toBeDefined();
    expect(typeof CompetitiveScorecard).toBe('function');
  });

  it('contains metrics across all 4 mandatory categories: General, Knowledge, Language, Technical', () => {
    const categories = new Set(INITIAL_SCORECARD_METRICS.map(m => m.category));
    expect(categories.has('General')).toBe(true);
    expect(categories.has('Knowledge')).toBe(true);
    expect(categories.has('Language')).toBe(true);
    expect(categories.has('Technical')).toBe(true);
  });

  it('correctly includes metrics with NOT_EVALUATED state and null measured score', () => {
    const notEvaluatedMetrics = INITIAL_SCORECARD_METRICS.filter(
      m => m.status === 'NOT_EVALUATED' || m.measuredScore === null
    );

    expect(notEvaluatedMetrics.length).toBeGreaterThan(0);
    for (const metric of notEvaluatedMetrics) {
      expect(metric.status).toBe('NOT_EVALUATED');
      expect(metric.measuredScore).toBeNull();
    }
  });

  it('maintains non-simulated verified scores for evaluated metrics', () => {
    const verified = INITIAL_SCORECARD_METRICS.filter(m => m.status === 'VERIFIED');
    expect(verified.length).toBeGreaterThan(0);
    for (const metric of verified) {
      expect(typeof metric.measuredScore).toBe('number');
      expect(metric.measuredScore).toBeGreaterThan(0);
    }
  });
});
