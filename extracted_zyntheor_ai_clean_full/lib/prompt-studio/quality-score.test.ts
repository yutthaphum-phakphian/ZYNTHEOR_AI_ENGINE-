import { describe, it, expect } from 'vitest';
import { EvidenceBasedQualityScore } from './quality-score';

describe('Quality Score Evidence-Based 9 PASS', () => {
  it('1 clarity has evidence', () => {
    const q = new EvidenceBasedQualityScore();
    const res = q.audit('Write a clear blog about cats', false, false, 0);
    expect(res.find(r => r.name === 'clarity')?.evidence).toBeDefined();
  });

  it('2 method defined', () => {
    const q = new EvidenceBasedQualityScore();
    const res = q.audit('test prompt', false, false, 0);
    expect(res[0].method).toBeDefined();
  });

  it('3 6 dimensions', () => {
    const q = new EvidenceBasedQualityScore();
    expect(q.audit('test prompt', false, false, 0).length).toBe(6);
  });

  it('4 safety high when no injection', () => {
    const q = new EvidenceBasedQualityScore();
    const res = q.audit('test', false, false, 0);
    expect(res.find(r => r.name === 'safety')?.score).toBeGreaterThan(80);
  });

  it('5 safety low when injection', () => {
    const q = new EvidenceBasedQualityScore();
    const res = q.audit('test', false, false, 2);
    expect(res.find(r => r.name === 'safety')?.score).toBeLessThan(50);
  });

  it('6 evidence UNVERIFIED when no test', () => {
    const q = new EvidenceBasedQualityScore();
    const res = q.audit('test', false, false, 0);
    expect(res.find(r => r.name === 'evidence')?.state).toBe('UNVERIFIED');
  });

  it('7 evidence VERIFIED when tested', () => {
    const q = new EvidenceBasedQualityScore();
    const res = q.audit('test', true, false, 0);
    expect(res.find(r => r.name === 'evidence')?.state).toBe('VERIFIED');
  });

  it('8 efficiency estimated', () => {
    const q = new EvidenceBasedQualityScore();
    const res = q.audit('short', false, false, 0);
    const eff = res.find(r => r.name === 'efficiency');
    expect(eff?.evidence).toContain('Token');
  });

  it('9 score not hardcoded constant', () => {
    const q = new EvidenceBasedQualityScore();
    const r1 = q.audit('short', false, false, 0);
    const r2 = q.audit('a very long prompt '.repeat(100), false, false, 3);
    expect(r1.find(x => x.name === 'safety')?.score).not.toBe(r2.find(x => x.name === 'safety')?.score);
  });
});
