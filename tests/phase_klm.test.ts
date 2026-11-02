import { describe, it, expect } from 'vitest';
import { RecoveryManagerFinal } from '../src/core/RecoveryManagerFinal';
import { CAPABILITY_REGISTRY, ExecMode, Avail } from '../src/capability/registry';
import { EvaluationLab } from '../src/evaluation/EvaluationLab';
import { PROVENANCE_REGISTRY, Ownership, isNativeModel } from '../src/provenance/TechnologyProvenanceRegistry';
import { MODEL_REGISTRY } from '../src/native/ModelIdentityRegistry';
import { ZyntheorTokenizerResearch } from '../src/native/TokenizerResearch';
import { NativeTrainingEngine } from '../src/native/TrainingEngine';

describe('PHASE K: Deterministic Recovery Final (WAL + Hashing + Ambiguity)', () => {
  it('saves and recovers checkpoint with sha256 integrity', async () => {
    const jobId = `test-klm-${Date.now()}`;
    const saved = await RecoveryManagerFinal.save({
      jobId,
      taskState: 'VERIFYING',
      taskGraph: { nodes: [] },
      approvedPlanDigest: '0xabc123',
      executionId: 'exec-klm-1',
      appliedChangeIds: ['package.json'],
      verificationResults: [],
      auditRef: 'ref-audit-klm',
    });

    expect(saved.sha256).toBeDefined();
    expect(saved.sha256.length).toBe(64);

    const rec = await RecoveryManagerFinal.recover(jobId);
    expect(rec.action).toBe('RESUME_SAFE');
    expect((rec as any).checkpoint.jobId).toBe(jobId);

    const isApp = await RecoveryManagerFinal.isApplied(jobId, 'package.json');
    expect(isApp).toBe(true);
  });
});

describe('PHASE L: Capability Registry (Single Source of Truth)', () => {
  it('contains verified capabilities and reports unavailable models honestly', () => {
    expect(CAPABILITY_REGISTRY.length).toBe(12);

    const thaiCoding = CAPABILITY_REGISTRY.find((c) => c.id === 'native-thai-coding');
    expect(thaiCoding).toBeDefined();
    expect(thaiCoding?.availability).toBe(Avail.UNAVAILABLE);
    expect(thaiCoding?.executionMode).toBe(ExecMode.NATIVE_MODEL);

    const semanticSearch = CAPABILITY_REGISTRY.find((c) => c.id === 'context-retrieval');
    expect(semanticSearch).toBeDefined();
    expect(semanticSearch?.availability).toBe(Avail.AVAILABLE);
    expect(semanticSearch?.verificationStatus).toBe('VERIFIED');
  });
});

describe('PHASE M: Evaluation Lab 12 Categories', () => {
  it('executes evaluation across 12 categories with honest native vs tool-assisted scoring', async () => {
    const results = await EvaluationLab.runAll();
    expect(results.length).toBe(12);
    expect(results.every((r) => typeof r.toolAssistedScore === 'number')).toBe(true);
    expect(results.every((r) => r.nativeScore === 0)).toBe(true); // Native pending GPU
  });
});

describe('P1–P5 Sovereign Architecture & Provenance', () => {
  it('tracks provenance ownership and verifies native model classification', () => {
    expect(PROVENANCE_REGISTRY.length).toBeGreaterThanOrEqual(8);
    const runtime = PROVENANCE_REGISTRY.find((r) => r.component === 'ZYNTHEOR Runtime');
    expect(runtime?.ownership).toBe(Ownership.ZYNTHEOR_OWNED);

    const qwen = PROVENANCE_REGISTRY.find((r) => r.component.includes('Qwen'));
    expect(qwen?.ownership).toBe(Ownership.OPEN_SOURCE);

    expect(isNativeModel('ZYNTHEOR Runtime')).toBe(false);
  });

  it('separates ADAPTED vs NATIVE in MODEL_REGISTRY', () => {
    expect(MODEL_REGISTRY.length).toBe(2);
    const native5m = MODEL_REGISTRY.find((m) => m.id === 'zyntheor-native-5m-cpu-001');
    expect(native5m?.method).toBe('FROM_SCRATCH');
    expect(native5m?.status).toBe('SPECIFICATION');
  });

  it('evaluates tokenizer research metrics', () => {
    const evalResult = ZyntheorTokenizerResearch.evaluate(['ระบบปัญญาประดิษฐ์', 'Autonomous AI']);
    expect(evalResult.tokensPerChar).toBeGreaterThan(0);
    expect(evalResult.thaiEfficiency).toBe(0.72);
  });

  it('performs real hardware check with 5M CPU readiness and 7B GPU blocked verdict', () => {
    const hw = NativeTrainingEngine.checkHardware();
    expect(hw.canTrain5M).toBe(true);
    expect(hw.hasGPU).toBe(false);
    expect(hw.canTrain7B_QLoRA).toBe(false);
  });
});
