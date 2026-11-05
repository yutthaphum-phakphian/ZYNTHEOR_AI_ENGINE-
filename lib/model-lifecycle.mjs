import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ZERO = '0'.repeat(64);
const LEDGER_REL = 'training/registry/model_lifecycle_ledger.json';
const REGISTRY_REL = 'training/registry/native_model_identity.json';
const CHECKPOINT_DIR = 'training/checkpoints/native_cpu';

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(value);
const atomicWrite = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  let fd;
  try {
    fd = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`);
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd = undefined;
    fs.renameSync(temp, file);
  } catch (error) {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch { /* cleanup */ } }
    try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch { /* preserve original error */ }
    throw error;
  }
};
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

function withLock(root, fn) {
  const ledgerPath = path.join(root, LEDGER_REL);
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const lockPath = `${ledgerPath}.lock`;
  let fd;
  try { fd = fs.openSync(lockPath, 'wx', 0o600); }
  catch (error) {
    if (error && error.code === 'EEXIST') throw new Error('LIFECYCLE_LEDGER_LOCKED_FAIL_CLOSED');
    throw error;
  }
  try {
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
    fs.fsyncSync(fd);
    return fn(ledgerPath);
  } finally {
    if (fd !== undefined) { try { fs.closeSync(fd); } catch { /* close best effort */ } }
    try { fs.unlinkSync(lockPath); } catch { /* preserve primary failure */ }
  }
}

function emptyLedger() { return { schemaVersion: '1.0.0', sequence: 0, headHash: ZERO, events: [] }; }

export function verifyLifecycleLedger(ledger) {
  if (!ledger || ledger.schemaVersion !== '1.0.0' || !Array.isArray(ledger.events)) return { valid: false, reason: 'LEDGER_SCHEMA_INVALID', verifiedEvents: 0 };
  let previous = ZERO;
  for (let i = 0; i < ledger.events.length; i++) {
    const event = ledger.events[i];
    const { hash, ...body } = event;
    if (event.sequence !== i + 1 || event.previousHash !== previous || sha256(canonical(body)) !== hash) {
      return { valid: false, reason: 'LEDGER_HASH_CHAIN_BROKEN', brokenIndex: i, verifiedEvents: i };
    }
    previous = hash;
  }
  if (ledger.sequence !== ledger.events.length || ledger.headHash !== previous) return { valid: false, reason: 'LEDGER_HEAD_MISMATCH', verifiedEvents: ledger.events.length };
  return { valid: true, verifiedEvents: ledger.events.length, headHash: previous };
}

function loadLedger(file) {
  if (!fs.existsSync(file)) return emptyLedger();
  const ledger = readJson(file);
  const result = verifyLifecycleLedger(ledger);
  if (!result.valid) throw new Error(result.reason);
  return ledger;
}

function append(root, type, modelId, actor, metadata = {}) {
  return withLock(root, file => {
    const ledger = loadLedger(file);
    const body = { sequence: ledger.sequence + 1, at: new Date().toISOString(), type, modelId, actor, metadata, previousHash: ledger.headHash };
    const event = { ...body, hash: sha256(canonical(body)) };
    ledger.events.push(event); ledger.sequence = event.sequence; ledger.headHash = event.hash;
    atomicWrite(file, ledger);
    return event;
  });
}

function getCandidate(root) {
  const identityPath = path.join(root, REGISTRY_REL);
  if (!fs.existsSync(identityPath)) throw new Error('NATIVE_IDENTITY_NOT_FOUND');
  const registry = readJson(identityPath);
  const identity = Array.isArray(registry.models)
    ? registry.models.find(item => item.model_id === 'zyntheor-native-cpu-001')
    : registry;
  if (!identity) throw new Error('NATIVE_IDENTITY_NOT_FOUND');
  if (identity.identity !== 'CORE_NATIVE' || identity.parent_model_id !== null) throw new Error('CANDIDATE_NOT_CORE_NATIVE');
  if (!identity.checkpoint || !identity.checkpoint_sha256) throw new Error('NATIVE_CHECKPOINT_NOT_AVAILABLE');
  const checkpoint = path.resolve(root, identity.checkpoint);
  const allowed = path.resolve(root, CHECKPOINT_DIR);
  if (!checkpoint.startsWith(`${allowed}${path.sep}`) || !fs.statSync(checkpoint).isFile()) throw new Error('CHECKPOINT_PATH_INVALID');
  const digest = sha256(fs.readFileSync(checkpoint));
  if (digest !== identity.checkpoint_sha256) throw new Error('CHECKPOINT_DIGEST_MISMATCH');
  return { identity, checkpoint: path.relative(root, checkpoint), digest };
}

function validateHumanApproval(approval, proposedBy) {
  if (!approval || approval.actorType !== 'human' || approval.role !== 'owner' || !approval.actorId || !approval.approvalId || !approval.reason) {
    throw new Error('HUMAN_OWNER_APPROVAL_REQUIRED');
  }
  if (proposedBy && proposedBy === approval.actorId) throw new Error('SELF_APPROVAL_FORBIDDEN');
  return { actorId: String(approval.actorId), approvalId: String(approval.approvalId), role: 'owner', actorType: 'human' };
}

function loadPromotionEvidence(root, p14ReportPath) {
  const reportPath = path.resolve(root, p14ReportPath || 'docs/audit/P14_EVALUATION_REPORT.json');
  if (!reportPath.startsWith(`${path.resolve(root)}${path.sep}`) || !fs.existsSync(reportPath)) throw new Error('P14_EVALUATION_EVIDENCE_MISSING');
  const report = readJson(reportPath);
  if (report.phase !== 'P14' || report.status !== 'PASS' || report.benchmarkRunId == null || report.datasetSha256 == null || !report.scores || typeof report.scores !== 'object') {
    throw new Error('P14_EVALUATION_EVIDENCE_NOT_ACCEPTANCE_GRADE');
  }
  const scores = Object.values(report.scores);
  if (!scores.length || scores.some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)) throw new Error('P14_EVALUATION_SCORES_INVALID');
  return { reportPath: path.relative(root, reportPath), reportDigest: sha256(fs.readFileSync(reportPath)), benchmarkRunId: report.benchmarkRunId, datasetSha256: report.datasetSha256 };
}

export function inspectLifecycle(root = process.cwd()) {
  const ledgerPath = path.join(root, LEDGER_REL);
  const ledger = loadLedger(ledgerPath);
  let activeModelId = null;
  for (const event of ledger.events) {
    if (event.type === 'PROMOTED') activeModelId = event.modelId;
    if (event.type === 'ROLLED_BACK') activeModelId = event.metadata?.toModelId || null;
  }
  return { phase: 'P18', status: 'PASS', ledger: verifyLifecycleLedger(ledger), eventCount: ledger.events.length,
    activeModelId, rollbackIsPointerOnly: true };
}

export function registerCandidate(root = process.cwd()) {
  const candidate = getCandidate(root);
  const event = append(root, 'CANDIDATE_REGISTERED', candidate.identity.model_id, 'system:verified-registry', {
    checkpoint: candidate.checkpoint, checkpointSha256: candidate.digest, identity: candidate.identity.identity,
    parameterCount: candidate.identity.parameter_count, status: candidate.identity.status,
  });
  return { phase: 'P18', status: 'REGISTERED_EXPERIMENTAL', event };
}

export function promoteCandidate({ root = process.cwd(), approval, proposedBy = null, p14ReportPath } = {}) {
  let modelId = 'unknown';
  try {
    const candidate = getCandidate(root); modelId = candidate.identity.model_id;
    const human = validateHumanApproval(approval, proposedBy);
    const evaluation = loadPromotionEvidence(root, p14ReportPath);
    const p16Path = path.join(root, 'docs/audit/P16_NATIVE_MODEL_EVALUATION.json');
    if (!fs.existsSync(p16Path)) throw new Error('P16_EVALUATION_MISSING');
    const p16 = readJson(p16Path);
    if (!['EVALUATED_EXPERIMENTAL', 'PASS'].includes(p16.status) || p16.checkpoint_sha256 !== candidate.digest) throw new Error('P16_CHECKPOINT_EVALUATION_MISMATCH');
    const runtime = JSON.parse((awaitlessProbe(root)));
    if (runtime.ready !== true || runtime.inference_ready !== true || runtime.generation_probe !== 'PASS') throw new Error('P17_RUNTIME_NOT_VERIFIED');
    const expectedDatasetDigest = candidate.identity.dataset_samples_sha256;
    if (!expectedDatasetDigest || p16.dataset_samples_sha256 !== expectedDatasetDigest || evaluation.datasetSha256 !== expectedDatasetDigest) throw new Error('P14_P16_DATASET_DIGEST_MISMATCH');
    const event = append(root, 'PROMOTED', modelId, human.actorId, { approvalId: human.approvalId, evaluation, checkpointSha256: candidate.digest, promotedBy: human.actorId });
    return { phase: 'P18', status: 'PROMOTED', event };
  } catch (error) {
    const event = append(root, 'PROMOTION_BLOCKED', modelId, 'system:release-gate', { reason: error.message });
    return { phase: 'P18', status: 'BLOCKED', reason: error.message, event };
  }
}

function awaitlessProbe(root) {
  // Promotion gate deliberately uses an injected, local process probe and does not call a provider.
  const result = spawnSync(process.env.ZYNTHEOR_PYTHON || 'python3', [path.join(root, 'training/native_cpu/native_runtime.py'), 'probe'], {
    cwd: root, encoding: 'utf8', timeout: 30000, shell: false,
    env: { PATH: process.env.PATH || '', HOME: process.env.HOME || '', PYTHONDONTWRITEBYTECODE: '1', PYTHONIOENCODING: 'utf-8' },
  });
  if (result.status !== 0) throw new Error('P17_RUNTIME_PROBE_FAILED');
  return result.stdout.trim();
}

export function rollbackActiveModel({ root = process.cwd(), approval, proposedBy = null } = {}) {
  try {
    const human = validateHumanApproval(approval, proposedBy);
    const ledger = loadLedger(path.join(root, LEDGER_REL));
    const promotions = ledger.events.filter(event => event.type === 'PROMOTED');
    if (!promotions.length) throw new Error('NO_PROMOTED_MODEL_TO_ROLLBACK');
    const rolledBack = new Set(ledger.events.filter(event => event.type === 'ROLLED_BACK').map(event => event.metadata?.promotionHash));
    const current = [...promotions].reverse().find(event => !rolledBack.has(event.hash));
    if (!current) throw new Error('NO_ACTIVE_PROMOTED_MODEL');
    const previous = [...promotions].reverse().find(event => event.sequence < current.sequence && !rolledBack.has(event.hash));
    const event = append(root, 'ROLLED_BACK', previous?.modelId || null, human.actorId, {
      fromModelId: current.modelId, toModelId: previous?.modelId || null,
      promotionHash: current.hash, approvalId: human.approvalId, pointerOnly: true,
    });
    return { phase: 'P18', status: 'ROLLED_BACK', activeModelId: previous?.modelId || null, event };
  } catch (error) {
    return { phase: 'P18', status: 'BLOCKED', reason: error.message };
  }
}
