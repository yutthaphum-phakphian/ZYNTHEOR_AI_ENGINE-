/**
 * ZYNTHEOR CORE — Native Model Runtime Adapter (Buffalo 0.13.0)
 *
 * Honest status machine for native weights / base model / unavailable runtime.
 * NEVER reports INFERENCE_READY unless a real checkpoint file exists,
 * checksum matches (when declared), and a load probe succeeds.
 *
 * Current node has no trained ZYNTHEOR weights → status stays non-ready.
 */

import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export type NativeRuntimeStatus =
  | 'MODEL_NOT_FOUND'
  | 'CHECKPOINT_UNVERIFIED'
  | 'RUNTIME_UNAVAILABLE'
  | 'INFERENCE_READY';

export type AnswerSource =
  | 'native'
  | 'local_base_model'
  | 'external_provider'
  | 'unavailable';

export interface NativeModelProbe {
  status: NativeRuntimeStatus;
  answerSource: AnswerSource;
  modelId: string | null;
  displayName: string | null;
  baseModel: string | null;
  baseModelRevision: string | null;
  checkpointPath: string | null;
  checkpointExists: boolean;
  checkpointSha256Declared: string | null;
  checkpointSha256Actual: string | null;
  checksumMatched: boolean | null;
  trainedWeightsExist: boolean;
  registryStatus: string;
  nativeIdentityModelId: string | null;
  nativeIdentityStatus: string | null;
  registryCrossCheck: 'MATCH' | 'MISMATCH' | 'UNAVAILABLE';
  runtime: {
    kind: 'none' | 'ollama_base' | 'native_weights';
    available: boolean;
    detail: string;
  };
  loadedRevision: string | null;
  inferenceTested: boolean;
  notes: string[];
  probedAt: string;
}

interface NativeIdentitySnapshot {
  modelId: string | null;
  status: string | null;
}

function sha256File(filePath: string): string | null {
  try {
    const buf = readFileSync(filePath);
    return createHash('sha256').update(buf).digest('hex');
  } catch {
    return null;
  }
}

function readRegistry(): {
  model: Record<string, unknown> | null;
  registryStatus: string;
  trainedWeightsExist: boolean;
  baseModel: string | null;
  baseRevision: string | null;
  checkpointDigest: string | null;
  modelId: string | null;
  displayName: string | null;
} {
  const regPath = path.join(rootDir, 'training/registry/model_registry.json');
  if (!existsSync(regPath)) {
    return {
      model: null,
      registryStatus: 'REGISTRY_MISSING',
      trainedWeightsExist: false,
      baseModel: null,
      baseRevision: null,
      checkpointDigest: null,
      modelId: null,
      displayName: null,
    };
  }
  try {
    const reg = JSON.parse(readFileSync(regPath, 'utf8'));
    const model = reg.models?.[0] || null;
    const base = model?.base_model || {};
    const ckpt = model?.checkpoints || {};
    return {
      model,
      registryStatus: model?.status || 'UNKNOWN',
      trainedWeightsExist: Boolean(model?.trained_weights_exist),
      baseModel: base?.name || null,
      baseRevision: base?.revision || null,
      checkpointDigest: ckpt?.checkpoint_digest_sha256 || null,
      modelId: model?.model_id || null,
      displayName: model?.display_name || null,
    };
  } catch {
    return {
      model: null,
      registryStatus: 'REGISTRY_PARSE_ERROR',
      trainedWeightsExist: false,
      baseModel: null,
      baseRevision: null,
      checkpointDigest: null,
      modelId: null,
      displayName: null,
    };
  }
}

function readNativeIdentity(): NativeIdentitySnapshot {
  const identityPath = path.join(rootDir, 'training/registry/native_model_identity.json');
  if (!existsSync(identityPath)) return { modelId: null, status: null };
  try {
    const registry = JSON.parse(readFileSync(identityPath, 'utf8'));
    const identity = Array.isArray(registry?.models)
      ? registry.models.find((item: Record<string, unknown>) => item?.identity === 'CORE_NATIVE')
      : registry;
    return {
      modelId: typeof identity?.model_id === 'string' ? identity.model_id : null,
      status: typeof identity?.status === 'string' ? identity.status : null,
    };
  } catch {
    return { modelId: null, status: 'IDENTITY_REGISTRY_PARSE_ERROR' };
  }
}

/** Candidate paths where a real checkpoint might live (none fabricated). */
function findCheckpointCandidates(): string[] {
  const dirs = [
    path.join(rootDir, 'training/checkpoints'),
    path.join(rootDir, 'models'),
    path.join(rootDir, 'weights'),
  ];
  const found: string[] = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    try {
      // shallow listing only
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        try {
          const st = statSync(full);
          if (st.isFile() && (name.endsWith('.gguf') || name.endsWith('.safetensors') || name.endsWith('.bin') || name.endsWith('.pt'))) {
            found.push(full);
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }
  return found;
}

/**
 * Probe native ZYNTHEOR CORE readiness without downloading large models.
 */
export function probeNativeModelRuntime(options: {
  allowBaseModelFallback?: boolean;
  ollamaReachable?: boolean;
} = {}): NativeModelProbe {
  const allowBase = options.allowBaseModelFallback !== false;
  const ollamaReachable = options.ollamaReachable === true;
  const reg = readRegistry();
  const nativeIdentity = readNativeIdentity();
  const registryCrossCheck: NativeModelProbe['registryCrossCheck'] = reg.modelId && nativeIdentity.modelId
    ? (reg.modelId === nativeIdentity.modelId ? 'MATCH' : 'MISMATCH')
    : 'UNAVAILABLE';
  const candidates = findCheckpointCandidates();
  const checkpointPath = candidates[0] || null;
  const checkpointExists = Boolean(checkpointPath && existsSync(checkpointPath));
  let actualSha: string | null = null;
  let checksumMatched: boolean | null = null;

  if (checkpointExists && checkpointPath) {
    actualSha = sha256File(checkpointPath);
    if (reg.checkpointDigest && actualSha) {
      checksumMatched = reg.checkpointDigest === actualSha;
    } else if (checkpointExists && !reg.checkpointDigest) {
      checksumMatched = null; // exists but registry has no digest to verify against
    }
  }

  const notes: string[] = [];
  if (registryCrossCheck === 'MISMATCH') {
    notes.push(`Registry identity mismatch: model_registry=${reg.modelId}; native_identity=${nativeIdentity.modelId}. Records are not treated as the same model.`);
  } else if (registryCrossCheck === 'UNAVAILABLE') {
    notes.push('Registry cross-check unavailable because one or both model identity records are missing or incomplete.');
  }
  let status: NativeRuntimeStatus;
  let answerSource: AnswerSource = 'unavailable';
  let runtimeKind: NativeModelProbe['runtime']['kind'] = 'none';
  let runtimeAvailable = false;
  let runtimeDetail = 'No native checkpoint and no verified local base runtime on this node.';
  let loadedRevision: string | null = null;
  const inferenceTested = false; // never claim tested without a real load+generate cycle

  if (checkpointExists && registryCrossCheck === 'MISMATCH') {
    status = 'CHECKPOINT_UNVERIFIED';
    notes.push('Checkpoint verification blocked until model_registry.json and native_model_identity.json identify the same model.');
  } else if (!reg.trainedWeightsExist && !checkpointExists) {
    status = 'MODEL_NOT_FOUND';
    notes.push('Registry reports trained_weights_exist=false and no checkpoint files were found under training/checkpoints, models/, or weights/.');
    notes.push(`Registry status: ${reg.registryStatus}`);
    if (allowBase && ollamaReachable && reg.baseModel) {
      // Base model via local Ollama is NOT native ZYNTHEOR-trained weights
      answerSource = 'local_base_model';
      runtimeKind = 'ollama_base';
      runtimeAvailable = true;
      runtimeDetail = `Local base model path available as fallback only (not ZYNTHEOR-trained). Base: ${reg.baseModel}`;
      notes.push('Base model fallback is explicitly labeled local_base_model — not native trained weights.');
    }
  } else if (checkpointExists && checksumMatched === false) {
    status = 'CHECKPOINT_UNVERIFIED';
    notes.push('Checkpoint file exists but SHA-256 does not match registry declaration.');
  } else if (checkpointExists && (checksumMatched === null || checksumMatched === true) && !reg.trainedWeightsExist) {
    // File present but registry still says untrained → do not trust
    status = 'CHECKPOINT_UNVERIFIED';
    notes.push('Checkpoint-like file present but registry trained_weights_exist is false; refusing INFERENCE_READY.');
  } else if (reg.trainedWeightsExist && checkpointExists && checksumMatched === true) {
    // Still need a successful load+inference test before INFERENCE_READY
    status = 'RUNTIME_UNAVAILABLE';
    notes.push('Weights present and checksum matched, but load/inference probe has not succeeded on this node.');
    runtimeDetail = 'Checksum OK; runtime load not verified.';
  } else if (reg.trainedWeightsExist && !checkpointExists) {
    status = 'MODEL_NOT_FOUND';
    notes.push('Registry claims trained weights but no checkpoint file found on disk.');
  } else {
    status = 'RUNTIME_UNAVAILABLE';
    notes.push('Native runtime conditions not satisfied.');
  }

  // Hard rule: never INFERENCE_READY without inferenceTested
  if ((status as NativeRuntimeStatus) === 'INFERENCE_READY' && !inferenceTested) {
    status = 'RUNTIME_UNAVAILABLE';
    notes.push('Refusing INFERENCE_READY because inference was not actually tested.');
  }

  return {
    status,
    answerSource,
    modelId: reg.modelId,
    displayName: reg.displayName,
    baseModel: reg.baseModel,
    baseModelRevision: reg.baseRevision,
    checkpointPath,
    checkpointExists,
    checkpointSha256Declared: reg.checkpointDigest,
    checkpointSha256Actual: actualSha,
    checksumMatched,
    trainedWeightsExist: reg.trainedWeightsExist,
    registryStatus: reg.registryStatus,
    nativeIdentityModelId: nativeIdentity.modelId,
    nativeIdentityStatus: nativeIdentity.status,
    registryCrossCheck,
    runtime: {
      kind: runtimeKind,
      available: runtimeAvailable,
      detail: runtimeDetail,
    },
    loadedRevision,
    inferenceTested,
    notes,
    probedAt: new Date().toISOString(),
  };
}

/**
 * Classify answer source for a given provider id without claiming native when it is not.
 */
export function classifyAnswerSource(providerId: string, native: NativeModelProbe): AnswerSource {
  if (native.status === 'INFERENCE_READY' && native.inferenceTested && providerId === 'zyntheor-native') {
    return 'native';
  }
  if (providerId === 'ollama' || providerId === 'local') {
    return 'local_base_model';
  }
  if (providerId === 'gemini' || providerId === 'openai') {
    return 'external_provider';
  }
  if (native.answerSource === 'local_base_model') return 'local_base_model';
  return 'unavailable';
}

export function assertNotReadyForNativeClaims(probe: NativeModelProbe): void {
  if (probe.status === 'INFERENCE_READY' && !probe.inferenceTested) {
    throw new Error('INVARIANT VIOLATION: INFERENCE_READY without inferenceTested');
  }
  if (probe.status === 'INFERENCE_READY' && !probe.trainedWeightsExist) {
    throw new Error('INVARIANT VIOLATION: INFERENCE_READY without trainedWeightsExist');
  }
}
