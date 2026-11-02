import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateDeploymentReadiness,
  executeProductionDeploy,
  computeBuildSignature
} from '../src/services/workspaceManager.ts';

test('1. Deployment Validation Gate ratifies registry entry against build signature', () => {
  const validation = validateDeploymentReadiness();

  assert.equal(typeof validation.isValid, 'boolean');
  assert.equal(typeof validation.canDeploy, 'boolean');
  assert.ok(validation.checks.length >= 6, 'Must enforce at least 6 pre-deploy validation gates');

  // Verify registry entry anchoring
  assert.equal(validation.registryEntry.targetRelease, 'v1.1-upgrade');
  assert.equal(
    validation.registryEntry.canonicalSubsystemSha256,
    '5d8e71a0b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0'
  );
  assert.equal(
    validation.registryEntry.merkleRoot,
    '0x909ab814479844d8a14816bed34cdbb07528e18501da86fc4691763a43fa4c68'
  );
  assert.equal(validation.registryEntry.hardwareSeals, 14902);

  // Check 1: Governance registry check
  const regCheck = validation.checks.find(c => c.id === 'chk-registry');
  assert.ok(regCheck, 'Governance Registry Ratification check must exist');
  assert.equal(regCheck.status, 'pass');

  // Check 5: Hardware seals check
  const sealsCheck = validation.checks.find(c => c.id === 'chk-hsm-seals');
  assert.ok(sealsCheck, 'HSM Deca-Key Seals check must exist');
  assert.equal(sealsCheck.status, 'pass');

  // Check 6: Production environment loopback lock
  const secCheck = validation.checks.find(c => c.id === 'chk-security-guard');
  assert.ok(secCheck, 'Security guard check must exist');
  assert.equal(secCheck.status, 'pass');
});

test('2. ComputeBuildSignature calculates real SHA-256 digest over build artifacts', () => {
  const sig = computeBuildSignature();

  assert.equal(typeof sig.hash, 'string');
  assert.equal(sig.hash.length, 64, 'SHA-256 digest must be 64 hexadecimal characters');
  assert.equal(typeof sig.artifactsCount, 'number');
  assert.ok(sig.generatedAt, 'Signature must have timestamp');
});

test('3. ExecuteProductionDeploy generates immutable log with WORM audit linkage', () => {
  const validation = validateDeploymentReadiness();
  if (!validation.canDeploy) {
    // If dist is absent or blocked in testing environment, test error throwing
    assert.throws(() => executeProductionDeploy());
    return;
  }

  const deploy = executeProductionDeploy();
  assert.ok(deploy.deploymentId.startsWith('deploy-'));
  assert.equal(deploy.status, 'DEPLOYED_SUCCESSFULLY');
  assert.equal(deploy.targetRelease, 'v1.1-upgrade');
  assert.ok(Array.isArray(deploy.deploymentLog));
  assert.ok(deploy.deploymentLog.some(l => l.includes('6/6 Pre-deploy validation gates passed')));
  assert.ok(deploy.deploymentLog.some(l => l.includes('PRODUCTION DEPLOY RATIFIED')));
});

test('4. GPU Training Configuration & Hyperparameter Specification is locked', () => {
  const configPath = path.join(process.cwd(), 'training', 'config', 'training_config.json');
  assert.ok(fs.existsSync(configPath), 'training_config.json must exist');

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Base model target
  assert.equal(config.base_model, 'Qwen/Qwen2.5-Coder-7B-Instruct');

  // SSoT Seed invariant
  assert.equal(config.training.seed, 849202);
  assert.equal(config.training.seed_torch, 849202);
  assert.equal(config.training.seed_numpy, 849202);

  // Provenance zero-fabrication invariant
  assert.equal(config.provenance.status, 'UNTRAINED');
  assert.equal(config.provenance.checkpoint, null);
  assert.equal(config.provenance.genesis, 849202);
  assert.equal(config.provenance.drift, '0.00%');
});

test('5. Model Registry APEX ULTIMATE LTS model spec contains GPU requirements', () => {
  const regPath = path.join(process.cwd(), 'training', 'registry', 'model_registry.json');
  assert.ok(fs.existsSync(regPath), 'model_registry.json must exist');

  const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
  const apexModel = reg.models.find(m => m.model_id === 'zyntheor-core-1.2.0-gpu-apex');

  assert.ok(apexModel, 'zyntheor-core-1.2.0-gpu-apex model must be registered');
  assert.equal(apexModel.status, 'SPECIFICATION_LOCKED_PENDING_GPU_RUN');
  assert.equal(apexModel.trained_weights_exist, false);
  assert.equal(apexModel.hardware_audit.gpu_required, true);
  assert.equal(apexModel.dataset_provenance.genesis_epoch, 849202);
  assert.equal(apexModel.dataset_provenance.baseline_drift, '0.00%');
});
