import { describe, it, expect } from 'vitest';
import { FullVerificationEngine, VStatus, VLevel } from '../src/core/FullVerificationEngine';
import { ProjectHealthAnalyzer, Priority } from '../src/intelligence/ProjectHealthAnalyzer';

describe('PHASE I: Full Verification L1-L8 Independent Layer', () => {
  it('executes individual verification check without self-reporting', async () => {
    const checkPass = await FullVerificationEngine.run(
      VLevel.L1_STRUCTURE,
      'Test node pass command',
      'node -e "process.exit(0)"',
      process.cwd()
    );
    expect(checkPass.status).toBe(VStatus.PASSED);
    expect(checkPass.exitCode).toBe(0);

    const checkFail = await FullVerificationEngine.run(
      VLevel.L2_STATIC,
      'Test fail command',
      'node -e "process.exit(1)"',
      process.cwd()
    );
    expect(checkFail.status).toBe(VStatus.FAILED);
    expect(checkFail.exitCode).toBe(1);
  });

  it('enforces fail-closed overall logic when checks fail', async () => {
    const report = await FullVerificationEngine.verifyAll(process.cwd(), 'task-verify-l1-l8');
    expect(report.evidences.length).toBe(8);
    expect(report.summary.passed + report.summary.failed + report.summary.skipped + report.summary.blocked + report.summary.unverified).toBe(8);

    if (report.summary.failed > 0 || report.summary.blocked > 0) {
      expect(report.overall).toBe(VStatus.FAILED);
    } else {
      expect(report.overall).toBe(VStatus.PASSED);
    }
  }, 120000);
});

describe('PHASE J: Project Evolution Intelligence (Health Analyzer)', () => {
  it('analyzes codebase health and strictly requires human approval for fixes', async () => {
    const report = await ProjectHealthAnalyzer.analyze(process.cwd());
    expect(report.requiresApproval).toBe(true);
    expect(Array.isArray(report.findings)).toBe(true);
    expect(report.scores).toBeDefined();
    expect(typeof report.scores.architecture).toBe('number');
    expect(typeof report.scores.techDebt).toBe('number');
    expect(typeof report.scores.security).toBe('number');

    if (report.findings.length > 0) {
      const first = report.findings[0];
      expect([Priority.P0, Priority.P1, Priority.P2, Priority.P3, Priority.P4]).toContain(first.priority);
      expect(typeof first.title).toBe('string');
      expect(typeof first.evidence).toBe('string');
    }
  }, 30000);
});
