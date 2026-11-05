import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { verifyLifecycleLedger } from './model-lifecycle.mjs';

const ORDER = ['PASS','SKIPPED','NOT_VERIFIED','BLOCKED','ERROR','FAIL'];
const worse = statuses => statuses.reduce((a,b) => ORDER.indexOf(a)>=ORDER.indexOf(b)?a:b, 'PASS');
const exists = (root, rel) => fs.existsSync(path.join(root, rel));
const json = (root, rel) => { try { return JSON.parse(fs.readFileSync(path.join(root, rel),'utf8')); } catch { return null; } };

function phase(status, evidence, note) { return { status, evidence, note }; }

export function inspectCoreX(root = process.cwd()) {
  const phases = {};
  const foundations = {
    P11: ['lib/intelligence-core.ts','lib/intelligence-orchestrator.ts'],
    P12: ['src/services/taskMemory.ts','src/services/workspaceMemory.ts','src/services/tenantScopedStorage.ts','src/services/tenantIsolation.ts'],
    P13: ['lib/agent-orchestrator.ts','lib/multi-agent-coordinator.mjs','src/services/safeExecutor.ts'],
    P14: ['src/services/selfImprovementEngine.ts','tests/self-improvement-and-learning.test.mjs'],
    P15: ['src/services/selfImprovementEngine.ts','src/services/auditLedger.ts','src/services/patchApplier.ts'],
  };
  for (const [id, files] of Object.entries(foundations)) {
    const missing = files.filter(file => !exists(root,file));
    phases[id] = phase(missing.length ? 'BLOCKED' : 'NOT_VERIFIED', files.filter(file => exists(root,file)),
      missing.length ? `Missing source paths: ${missing.join(', ')}` : 'Source foundation exists; current end-to-end and security acceptance evidence is not attached to this run.');
  }
  const p16 = json(root,'docs/audit/P16_TRAINING_REPORT.json') || {};
  const identityRegistry = json(root,'training/registry/native_model_identity.json') || {};
  const identity = Array.isArray(identityRegistry.models)
    ? (identityRegistry.models.find(item => item.model_id === 'zyntheor-native-cpu-001') || {})
    : identityRegistry;
  phases.P16 = phase(p16.status === 'TRAINED_EXPERIMENTAL' && p16.training_executed === true ? 'PASS' :
    (p16.status === 'BLOCKED' || p16.status === 'ERROR' ? p16.status : 'BLOCKED'),
    ['training/native_cpu/train_native_cpu.py','training/native_cpu/native_cpu_model.py','training/dataset/manifest.json'],
    p16.training_executed === true ? 'A real training report exists; production qualification remains separate.' :
      `Training is not evidenced as executed. Dataset gate: ${identity.status || 'NOT_TRAINED'}.`);

  const probe = spawnSync(process.env.ZYNTHEOR_PYTHON || 'python3', [path.join(root,'training/native_cpu/native_runtime.py'),'probe'], {
    cwd:root,encoding:'utf8',timeout:30000,shell:false,
    env:{PATH:process.env.PATH||'',HOME:process.env.HOME||'',PYTHONDONTWRITEBYTECODE:'1',PYTHONIOENCODING:'utf-8'}
  });
  let p17 = null;
  try { p17 = JSON.parse(probe.stdout.trim()); } catch {}
  const p17Ready = p17?.ready === true && p17?.inference_ready === true && p17?.generation_probe === 'PASS';
  phases.P17 = phase(p17Ready ? 'PASS' : 'BLOCKED', ['training/native_cpu/native_runtime.py','lib/native-model-gateway.mjs'],
    p17Ready ? 'Registered checkpoint loaded and one-token greedy inference probe passed.' : `Native inference is not ready: ${p17?.reason || 'checkpoint/generation probe unavailable'}; ${probe.stderr?.trim() || ''}`.trim());

  const ledger = json(root,'training/registry/model_lifecycle_ledger.json');
  const lifecycle = ledger ? verifyLifecycleLedger(ledger) : { valid: true, verifiedEvents: 0 };
  phases.P18 = phase(lifecycle.valid ? (lifecycle.verifiedEvents > 0 ? 'PASS' : 'NOT_VERIFIED') : 'FAIL',
    ['lib/model-lifecycle.mjs','training/registry/model_lifecycle_ledger.json'].filter(file => exists(root,file)),
    lifecycle.valid ? (lifecycle.verifiedEvents ? 'Lifecycle event chain verifies.' : 'Lifecycle code exists; no model lifecycle event chain has been established yet.') : lifecycle.reason);

  const infraPolicy = json(root,'infra/sovereign/sovereign-policy.json') || {};
  const localOnly = ['1','true','yes'].includes(String(process.env.ZYNTHEOR_LOCAL_ONLY||'').toLowerCase());
  phases.P19 = phase(localOnly ? 'NOT_VERIFIED' : 'BLOCKED',
    ['infra/sovereign/sovereign-policy.json','scripts/sovereign_infra.py'],
    localOnly ? 'Local-only flag is enabled for this process; air-gap, backup/restore drill and deployment isolation still need runtime evidence.' : 'Set ZYNTHEOR_LOCAL_ONLY=1 for this process to exercise local-only mode. Air-gap is not inferred from configuration.');

  const dependencies = Object.entries(phases).filter(([id]) => id !== 'P20').map(([,value]) => value.status);
  const overall = worse(dependencies);
  phases.P20 = phase(overall === 'PASS' ? 'PASS' : overall, ['lib/corex-platform-gate.mjs','docs/audit/P11_P20_INTEGRATION_STATUS.json'],
    overall === 'PASS' ? 'All mandatory phase gates passed.' : 'Integrated release is gated by one or more upstream phases; no production-ready claim is permitted.');
  return { schemaVersion:'1.0.0', phase:'P20', product:'ZYNTHEOR CORE X', generatedAt:new Date().toISOString(),
    status:phases.P20.status, phases, releaseApproved:false,
    invariants:{ missingEvidenceIsPass:false, agentSelfApprovalAllowed:false, silentCloudFallback:false,
      localOnlyRequiresExplicitEnvironmentFlag:true, nativeIdentityMustBeCoreNative:true,
      modelPromotionRequiresHumanOwnerApproval:true },
    notes:['This report measures source/evidence present in the current project tree.','Source presence is not an implementation acceptance test.','P11-P15 prior reports were not treated as current proof unless current run evidence was available.'] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const report=inspectCoreX(process.cwd());
  console.log(JSON.stringify(report,null,2));
  process.exitCode = report.status === 'PASS' ? 0 : 2;
}
